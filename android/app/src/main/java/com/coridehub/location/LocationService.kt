package com.coridehub.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class LocationService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val httpExecutor = Executors.newSingleThreadExecutor()

    companion object {
        private const val TAG = "LocationService"
        const val NOTIFICATION_ID = 1001
        const val CHANNEL_ID      = "coridehub_location"
        const val CHANNEL_NAME    = "Location Tracking"

        // Broadcast action + extras
        const val ACTION_LOCATION_UPDATE = "com.coridehub.LOCATION_UPDATE"
        const val EXTRA_LATITUDE  = "latitude"
        const val EXTRA_LONGITUDE = "longitude"
        const val EXTRA_ACCURACY  = "accuracy"
        const val EXTRA_ALTITUDE  = "altitude"
        const val EXTRA_SPEED     = "speed"
        const val EXTRA_HEADING   = "heading"
        const val EXTRA_TIMESTAMP = "timestamp"

        // Update intervals — short so the JS layer receives fresh coords quickly
        private const val UPDATE_INTERVAL_MS     = 2_000L
        private const val MIN_UPDATE_INTERVAL_MS = 1_000L
        private const val MAX_UPDATE_DELAY_MS    = 3_000L

        // HTTP throttle — don't hammer the server on every GPS tick
        private const val HTTP_INTERVAL_MS = 5_000L
    }

    private var lastHttpPostMs = 0L

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        startLocationUpdates()
        return START_STICKY // Restart automatically if the OS kills the process
    }

    override fun onDestroy() {
        super.onDestroy()
        stopLocationUpdates()
        httpExecutor.shutdown()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Notification ──────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Keeps location tracking active in the background"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        else PendingIntent.FLAG_UPDATE_CURRENT

        val openApp = packageManager
            .getLaunchIntentForPackage(packageName)
            ?.let { PendingIntent.getActivity(this, 0, it, flags) }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("CoRideHub")
            .setContentText("Tracking your location")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setSilent(true)
            .setContentIntent(openApp)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    // ── Location ──────────────────────────────────────────────────────────────

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
            .setMinUpdateIntervalMillis(MIN_UPDATE_INTERVAL_MS)
            .setMaxUpdateDelayMillis(MAX_UPDATE_DELAY_MS)
            .setWaitForAccurateLocation(false)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { handleLocation(it) }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(
                request,
                locationCallback,
                Looper.getMainLooper(),
            )
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission not granted: ${e.message}")
        }
    }

    private fun stopLocationUpdates() {
        if (::locationCallback.isInitialized) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
    }

    private fun handleLocation(location: Location) {
        // 1. Broadcast to JS via BroadcastReceiver (works when app is in foreground / JS active)
        broadcastLocation(location)

        // 2. HTTP fallback — posts directly to backend, bypassing the JS thread entirely.
        //    This covers background mode + kill-state restart (START_STICKY).
        val now = System.currentTimeMillis()
        if (now - lastHttpPostMs >= HTTP_INTERVAL_MS) {
            lastHttpPostMs = now
            postLocationToBackend(location)
        }
    }

    private fun broadcastLocation(location: Location) {
        val intent = Intent(ACTION_LOCATION_UPDATE).apply {
            `package` = packageName
            putExtra(EXTRA_LATITUDE,  location.latitude)
            putExtra(EXTRA_LONGITUDE, location.longitude)
            putExtra(EXTRA_ACCURACY,  location.accuracy.toDouble())
            putExtra(EXTRA_ALTITUDE,  location.altitude)
            putExtra(EXTRA_SPEED,     if (location.hasSpeed())   location.speed.toDouble()   else 0.0)
            putExtra(EXTRA_HEADING,   if (location.hasBearing()) location.bearing.toDouble() else 0.0)
            putExtra(EXTRA_TIMESTAMP, location.time.toDouble())
        }
        sendBroadcast(intent)
    }

    // ── HTTP fallback (background / kill-state) ────────────────────────────────

    private fun postLocationToBackend(location: Location) {
        val prefs     = getSharedPreferences(LocationModule.PREFS_NAME, Context.MODE_PRIVATE)
        val routeId   = prefs.getString("routeId",   null) ?: return
        val token     = prefs.getString("token",     null) ?: return
        val serverUrl = prefs.getString("serverUrl", null) ?: return

        httpExecutor.execute {
            try {
                val url  = URL("$serverUrl/api/location/update")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod     = "POST"
                    connectTimeout    = 8_000
                    readTimeout       = 8_000
                    doOutput          = true
                    setRequestProperty("Content-Type",  "application/json")
                    setRequestProperty("Authorization", "Bearer $token")
                }

                val body = JSONObject().apply {
                    put("routeId",   routeId)
                    put("latitude",  location.latitude)
                    put("longitude", location.longitude)
                    put("accuracy",  if (location.hasAccuracy())  location.accuracy.toDouble()  else 0.0)
                    put("speed",     if (location.hasSpeed())     location.speed.toDouble()     else 0.0)
                    put("heading",   if (location.hasBearing())   location.bearing.toDouble()   else 0.0)
                    put("timestamp", location.time)
                }.toString()

                OutputStreamWriter(conn.outputStream).use { it.write(body) }

                val code = conn.responseCode
                if (code != 200) Log.w(TAG, "HTTP location post returned $code")
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "HTTP location post failed: ${e.message}")
            }
        }
    }
}
