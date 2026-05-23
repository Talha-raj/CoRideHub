import CoreLocation
import Foundation
import React

@objc(LocationModule)
final class LocationModule: RCTEventEmitter, CLLocationManagerDelegate {

    // MARK: - Constants

    private static let eventLocationUpdate = "onLocationUpdate"
    private static let eventLocationError  = "onLocationError"
    private static let httpIntervalSec: TimeInterval = 5.0

    // MARK: - State

    private var locationManager: CLLocationManager?
    private var hasListeners = false
    private var lastHttpPostSec: TimeInterval = 0

    // Pending one-shot promise (getCurrentLocation)
    private var pendingResolve: RCTPromiseResolveBlock?
    private var pendingReject:  RCTPromiseRejectBlock?

    // MARK: - Init

    override init() {
        super.init()
        DispatchQueue.main.async { [weak self] in
            self?.configureLocationManager()
        }
    }

    private func configureLocationManager() {
        let lm = CLLocationManager()
        lm.delegate = self
        lm.desiredAccuracy = kCLLocationAccuracyBest
        lm.distanceFilter   = kCLDistanceFilterNone
        lm.allowsBackgroundLocationUpdates  = true
        lm.pausesLocationUpdatesAutomatically = false
        lm.showsBackgroundLocationIndicator  = true
        locationManager = lm
    }

    // MARK: - RCTEventEmitter

    override func supportedEvents() -> [String]! {
        [LocationModule.eventLocationUpdate, LocationModule.eventLocationError]
    }

    override func startObserving() { hasListeners = true }
    override func stopObserving()  { hasListeners = false }

    override static func requiresMainQueueSetup() -> Bool { true }

    // MARK: - JS API

    @objc func startTracking() {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard self.isAuthorized else {
                self.emitError("Location permission not granted — call requestLocationPermission() first")
                return
            }
            self.locationManager?.startUpdatingLocation()
        }
    }

    @objc func stopTracking() {
        DispatchQueue.main.async { [weak self] in
            self?.locationManager?.stopUpdatingLocation()
        }
    }

    @objc func getCurrentLocation(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard self.isAuthorized else {
                reject("PERMISSION_DENIED", "Location permission not granted", nil)
                return
            }
            // Store promise — resolved on next delegate callback
            self.pendingResolve = resolve
            self.pendingReject  = reject
            self.locationManager?.requestLocation()
        }
    }

    @objc func saveTrackingInfo(_ routeId: String, token: String, serverUrl: String) {
        let ud = UserDefaults.standard
        ud.set(routeId,   forKey: "coridehub_routeId")
        ud.set(token,     forKey: "coridehub_token")
        ud.set(serverUrl, forKey: "coridehub_serverUrl")
    }

    @objc func clearTrackingInfo() {
        let ud = UserDefaults.standard
        ud.removeObject(forKey: "coridehub_routeId")
        ud.removeObject(forKey: "coridehub_token")
        ud.removeObject(forKey: "coridehub_serverUrl")
    }

    // MARK: - CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }

        let payload = locationPayload(from: loc)

        // Resolve one-shot promise if pending
        if let resolve = pendingResolve {
            resolve(payload)
            pendingResolve = nil
            pendingReject  = nil
        }

        // Broadcast to JS listeners (works in foreground + background while JS is active)
        if hasListeners {
            sendEvent(withName: LocationModule.eventLocationUpdate, body: payload)
        }

        // HTTP fallback — posts directly when JS thread is suspended in background
        let now = Date().timeIntervalSince1970
        if now - lastHttpPostSec >= LocationModule.httpIntervalSec {
            lastHttpPostSec = now
            postToBackend(loc)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let message = error.localizedDescription

        if let reject = pendingReject {
            reject("LOCATION_ERROR", message, error)
            pendingResolve = nil
            pendingReject  = nil
        }

        emitError(message)
    }

    // No-op — permission changes are handled by the JS permissions layer
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {}

    // MARK: - HTTP fallback (background)

    private func postToBackend(_ loc: CLLocation) {
        let ud = UserDefaults.standard
        guard
            let routeId   = ud.string(forKey: "coridehub_routeId"),
            let token     = ud.string(forKey: "coridehub_token"),
            let serverUrl = ud.string(forKey: "coridehub_serverUrl"),
            let url       = URL(string: "\(serverUrl)/api/location/update")
        else { return }

        var body: [String: Any] = [
            "routeId":   routeId,
            "latitude":  loc.coordinate.latitude,
            "longitude": loc.coordinate.longitude,
            "accuracy":  loc.horizontalAccuracy,
            "timestamp": loc.timestamp.timeIntervalSince1970 * 1_000,
        ]
        if loc.speed  >= 0 { body["speed"]   = loc.speed }
        if loc.course >= 0 { body["heading"]  = loc.course }

        guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)",  forHTTPHeaderField: "Authorization")
        request.httpBody = bodyData
        request.timeoutInterval = 8

        URLSession.shared.dataTask(with: request) { _, response, _ in
            if let code = (response as? HTTPURLResponse)?.statusCode, code != 200 {
                NSLog("[LocationModule] HTTP post returned %d", code)
            }
        }.resume()
    }

    // MARK: - Helpers

    private var isAuthorized: Bool {
        let status = locationManager?.authorizationStatus ?? .notDetermined
        return status == .authorizedAlways || status == .authorizedWhenInUse
    }

    private func locationPayload(from loc: CLLocation) -> [String: Any] {
        [
            "latitude":  loc.coordinate.latitude,
            "longitude": loc.coordinate.longitude,
            "altitude":  loc.altitude,
            "accuracy":  loc.horizontalAccuracy,
            "speed":     loc.speed   >= 0 ? loc.speed   : 0,
            "heading":   loc.course  >= 0 ? loc.course  : 0,
            "timestamp": loc.timestamp.timeIntervalSince1970 * 1_000,
        ]
    }

    private func emitError(_ message: String) {
        guard hasListeners else { return }
        sendEvent(withName: LocationModule.eventLocationError, body: ["message": message])
    }
}
