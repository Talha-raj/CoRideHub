/**
 * src/components/LiveRideMap.js
 *
 * Full-screen live map used in Ride Details (user) and Request Details (driver).
 *
 * Props
 * ─────
 *   driverLocation   { latitude, longitude } | null   live driver position
 *   riderCoords      [longitude, latitude]   | null   user's GPS (GeoJSON order)
 *   initialCoords    [longitude, latitude]            first center (fallback)
 *   showBothMarkers  boolean                          default true
 *   style            ViewStyle
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { Access_Token_MapBox } from '../utils/Creds';

MapboxGL.setAccessToken(Access_Token_MapBox);

// ── Pulsing animation ─────────────────────────────────────────────────────────

const PulseMarker = React.memo(({ color = COLORS.accent }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={styles.pulseWrapper}>
      <Animated.View style={[styles.pulseRing, { borderColor: color, transform: [{ scale: pulse }] }]} />
      <View style={[styles.pulseCore, { backgroundColor: color }]}>
        <MaterialDesignIcons name="car" size={16} color={COLORS.white} />
      </View>
    </View>
  );
});

const RiderMarker = React.memo(() => (
  <View style={styles.riderMarker}>
    <MaterialDesignIcons name="account" size={18} color={COLORS.white} />
  </View>
));

// ── Component ─────────────────────────────────────────────────────────────────

const LiveRideMap = ({
  driverLocation,
  riderCoords,
  initialCoords,
  showBothMarkers = true,
  style,
}) => {
  const driverCoords = driverLocation
    ? [driverLocation.longitude, driverLocation.latitude]
    : null;

  const centerCoordinate = driverCoords ?? riderCoords ?? initialCoords ?? [67.0099, 24.8607];

  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        style={StyleSheet.absoluteFill}
        logoEnabled={false}
        scaleBarEnabled={false}
        styleURL={MapboxGL.StyleURL.Dark}
        rotateEnabled={false}
      >
        <MapboxGL.Camera
          zoomLevel={15}
          centerCoordinate={centerCoordinate}
          animationMode="flyTo"
          animationDuration={800}
        />

        {/* Driver marker with pulsing animation */}
        {driverCoords && (
          <MapboxGL.PointAnnotation id="driver" coordinate={driverCoords}>
            <PulseMarker color={COLORS.accent} />
          </MapboxGL.PointAnnotation>
        )}

        {/* Rider / user marker */}
        {/* {showBothMarkers && riderCoords && (
          <MapboxGL.PointAnnotation id="rider" coordinate={driverCoords}>
            <RiderMarker />
          </MapboxGL.PointAnnotation>
        )} */}
      </MapboxGL.MapView>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  pulseWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  pulseRing: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    opacity: 0.4,
  },
  pulseCore: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white,
    ...SHADOWS.medium,
  },
  riderMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.white,
    ...SHADOWS.medium,
  },
});

export default LiveRideMap;
