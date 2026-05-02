import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  startLocationSharing,
  stopLocationSharing,
  isLocationSharingActive,
  setLocationCallback,
  setErrorCallback,
  setupLocationListeners,
} from '../../utils/locationService';

/**
 * Example Component: Location Tracking
 * Demonstrates how to use the location service with start/stop functionality
 * Uses native modules for both Android and iOS
 */
const LocationTrackingExample = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Set up location callback
    setLocationCallback((location) => {
      console.log('Location update received:', location);
      setCurrentLocation(location);
      setLocationHistory((prev) => [
        {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date().toISOString(),
          speed: location.speed,
          accuracy: location.accuracy,
        },
        ...prev,
      ].slice(0, 50)); // Keep last 50 locations
    });

    // Set up error callback
    setErrorCallback((err) => {
      console.log('Location error:', err);
      setError(err.message || 'An error occurred');
      Alert.alert('Location Error', err.message || 'An error occurred');
    });

    // Set up event listeners for native module
    const cleanupListeners = setupLocationListeners();

    // Check initial tracking state
    const checkTrackingState = async () => {
      const active = isLocationSharingActive();
      setIsTracking(active);
    };
    checkTrackingState();

    // Cleanup on unmount
    return () => {
      setLocationCallback(null);
      setErrorCallback(null);
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, []);

  /**
   * Handle Start Location Sharing
   */
  const handleStartTracking = async () => {
    setError(null);
    const success = await startLocationSharing();
    if (success) {
      setIsTracking(true);
      Alert.alert('Success', 'Location tracking started');
    } else {
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  /**
   * Handle Stop Location Sharing
   */
  const handleStopTracking = async () => {
    setError(null);
    const success = await stopLocationSharing();
    if (success) {
      setIsTracking(false);
      Alert.alert('Success', 'Location tracking stopped');
    } else {
      Alert.alert('Error', 'Failed to stop location tracking');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Tracking Example</Text>

      {/* Status Section */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Tracking Status:</Text>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: isTracking ? '#4CAF50' : '#9E9E9E' },
            ]}
          />
          <Text style={styles.statusText}>
            {isTracking ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.startButton]}
          onPress={handleStartTracking}
          disabled={isTracking}
        >
          <Text style={styles.buttonText}>Start Tracking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={handleStopTracking}
          disabled={!isTracking}
        >
          <Text style={styles.buttonText}>Stop Tracking</Text>
        </TouchableOpacity>
      </View>

      {/* Current Location Display */}
      {currentLocation && (
        <View style={styles.locationContainer}>
          <Text style={styles.sectionTitle}>Current Location</Text>
          <View style={styles.locationDetails}>
            <Text style={styles.locationText}>
              Latitude: {currentLocation.latitude?.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Longitude: {currentLocation.longitude?.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Accuracy: {currentLocation.accuracy?.toFixed(2)} meters
            </Text>
            <Text style={styles.locationText}>
              Speed: {currentLocation.speed?.toFixed(2)} m/s
            </Text>
            <Text style={styles.locationText}>
              Timestamp: {new Date(currentLocation.timestamp).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* Location History */}
      {locationHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>
            Location History ({locationHistory.length} points)
          </Text>
          <ScrollView style={styles.historyScroll}>
            {locationHistory.map((loc, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyText}>
                  {index + 1}. {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                </Text>
                <Text style={styles.historySubtext}>
                  {new Date(loc.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Instructions:</Text>
        <Text style={styles.instructionsText}>
          1. Tap "Start Tracking" to begin location sharing
        </Text>
        <Text style={styles.instructionsText}>
          2. Grant location permissions when prompted
        </Text>
        <Text style={styles.instructionsText}>
          3. Location updates will appear in real-time
        </Text>
        <Text style={styles.instructionsText}>
          4. Tap "Stop Tracking" to stop and save battery
        </Text>
        <Text style={styles.instructionsText}>
          5. Works in foreground, background, and app killed (Android)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  locationDetails: {
    marginLeft: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  historyContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    maxHeight: 200,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyScroll: {
    maxHeight: 150,
  },
  historyItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  historyText: {
    fontSize: 13,
    color: '#333',
  },
  historySubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  instructionsContainer: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
});

export default LocationTrackingExample;
