package com.coridehub.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.Location
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.LocationServices

class LocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "LocationModule"
        const val NAME = "LocationModule"
        const val EVENT_LOCATION_UPDATE = "onLocationUpdate"
        const val EVENT_LOCATION_ERROR  = "onLocationError"
        const val PREFS_NAME            = "CoRideHubTracking"
    }

    private var locationReceiver: BroadcastReceiver? = null

    // ── Module name ────────────────────────────────────────────────────────────

    override fun getName(): String = NAME

    // ── JS-exposed API ─────────────────────────────────────────────────────────

    @ReactMethod
    fun startTracking() {
        registerReceiver()
        val intent = Intent(reactContext, LocationService::class.java)
        ContextCompat.startForegroundService(reactContext, intent)
    }

    @ReactMethod
    fun stopTracking() {
        unregisterReceiver()
        reactContext.stopService(Intent(reactContext, LocationService::class.java))
    }

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        val client = LocationServices.getFusedLocationProviderClient(reactContext)
        try {
            client.lastLocation
                .addOnSuccessListener { location: Location? ->
                    if (location != null) {
                        promise.resolve(locationToMap(location))
                    } else {
                        promise.reject("NO_LOCATION", "No cached location — start tracking first")
                    }
                }
                .addOnFailureListener { e ->
                    promise.reject("LOCATION_ERROR", e.message ?: "Unknown error")
                }
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted")
        }
    }

    /**
     * Persist tracking metadata to SharedPreferences so LocationService can
     * read routeId + token on restart (START_STICKY after process kill).
     */
    @ReactMethod
    fun saveTrackingInfo(routeId: String, token: String, serverUrl: String) {
        reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString("routeId",   routeId)
            .putString("token",     token)
            .putString("serverUrl", serverUrl)
            .apply()
        Log.d(TAG, "Tracking info saved: routeId=$routeId serverUrl=$serverUrl")
    }

    /** Clear persisted tracking metadata (call on Complete / stop). */
    @ReactMethod
    fun clearTrackingInfo() {
        reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().clear().apply()
        Log.d(TAG, "Tracking info cleared")
    }

    // Required stubs for NativeEventEmitter on the JS side
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ── BroadcastReceiver ──────────────────────────────────────────────────────

    private fun registerReceiver() {
        if (locationReceiver != null) return

        locationReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action != LocationService.ACTION_LOCATION_UPDATE) return

                val params = Arguments.createMap().apply {
                    putDouble("latitude",  intent.getDoubleExtra(LocationService.EXTRA_LATITUDE,  0.0))
                    putDouble("longitude", intent.getDoubleExtra(LocationService.EXTRA_LONGITUDE, 0.0))
                    putDouble("accuracy",  intent.getDoubleExtra(LocationService.EXTRA_ACCURACY,  0.0))
                    putDouble("altitude",  intent.getDoubleExtra(LocationService.EXTRA_ALTITUDE,  0.0))
                    putDouble("speed",     intent.getDoubleExtra(LocationService.EXTRA_SPEED,     0.0))
                    putDouble("heading",   intent.getDoubleExtra(LocationService.EXTRA_HEADING,   0.0))
                    putDouble("timestamp", intent.getDoubleExtra(LocationService.EXTRA_TIMESTAMP, 0.0))
                }
                sendEvent(EVENT_LOCATION_UPDATE, params)
            }
        }

        val filter = IntentFilter(LocationService.ACTION_LOCATION_UPDATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(locationReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            reactContext.registerReceiver(locationReceiver, filter)
        }
    }

    private fun unregisterReceiver() {
        locationReceiver?.let {
            try { reactContext.unregisterReceiver(it) }
            catch (e: Exception) { Log.w(TAG, "Receiver already unregistered: ${e.message}") }
            locationReceiver = null
        }
    }

    // ── Event emission ─────────────────────────────────────────────────────────

    private fun sendEvent(name: String, params: WritableMap?) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private fun locationToMap(location: Location): WritableMap =
        Arguments.createMap().apply {
            putDouble("latitude",  location.latitude)
            putDouble("longitude", location.longitude)
            putDouble("accuracy",  location.accuracy.toDouble())
            putDouble("altitude",  location.altitude)
            putDouble("speed",     if (location.hasSpeed())   location.speed.toDouble()   else 0.0)
            putDouble("heading",   if (location.hasBearing()) location.bearing.toDouble() else 0.0)
            putDouble("timestamp", location.time.toDouble())
        }

    override fun onCatalystInstanceDestroy() {
        unregisterReceiver()
    }
}
