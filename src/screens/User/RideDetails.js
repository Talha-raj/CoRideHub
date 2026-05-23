import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LiveRideMap from '../../components/LiveRideMap';
import api from '../../config/api';
import { COLORS, FONTSIZES, RADIUS, SHADOWS, SIZES } from '../../constants/theme';
import { connectSocket } from '../../services/socketService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── ETA helpers ──────────────────────────────────────────────────────────────

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Returns a human-readable ETA string or null if it can't be computed
const calcEta = (driverLoc, pickupCoords) => {
  if (!driverLoc || !pickupCoords || pickupCoords.length < 2) return null;
  const [pickupLng, pickupLat] = pickupCoords; // GeoJSON [lng, lat]
  const distKm = haversineKm(driverLoc.latitude, driverLoc.longitude, pickupLat, pickupLng);
  const speedKmh = Math.max((driverLoc.speed || 0) * 3.6, 20); // floor at 20 km/h
  const minutes = (distKm / speedKmh) * 60;
  if (minutes < 1) return '< 1 min';
  if (minutes > 180) return null;
  return `~${Math.round(minutes)} min`;
};

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS = {
  // Request statuses
  Pending:  { color: COLORS.warning, bg: COLORS.warning + '15', label: 'Pending',     icon: 'clock-outline',    desc: 'Waiting for driver response' },
  Approved: { color: COLORS.success, bg: COLORS.success + '15', label: 'Accepted',    icon: 'check-circle',     desc: 'Driver accepted your request' },
  Rejected: { color: COLORS.error,   bg: COLORS.error   + '15', label: 'Rejected',    icon: 'close-circle',     desc: 'Driver declined this request' },
  // Ride statuses
  OnTheWay:   { color: COLORS.accent,  bg: COLORS.accent  + '15', label: 'On The Way',  icon: 'car-arrow-right',   desc: 'Driver is heading your way' },
  InProgress: { color: COLORS.warning, bg: COLORS.warning + '15', label: 'In Progress', icon: 'car-speed-limiter', desc: 'Your trip is in progress' },
  Completed:  { color: COLORS.success, bg: COLORS.success + '15', label: 'Completed',   icon: 'check-all',         desc: 'Trip completed' },
};

// ─── Derives the highest-priority status to show the user ─────────────────────
// Priority: Completed > InProgress > OnTheWay (isLeaving) > Approved > Pending/Rejected

const deriveDisplayStatus = ride => {
  if (ride.rideStatus   === 'Completed')  return STATUS.Completed;
  if (ride.rideStatus   === 'InProgress') return STATUS.InProgress;
  if (ride.routeId?.isLeaving || ride.rideStatus === 'OnTheWay') return STATUS.OnTheWay;
  if (ride.rideRequestStatus === 'Approved') return STATUS.Approved;
  if (ride.rideRequestStatus === 'Rejected') return STATUS.Rejected;
  return STATUS.Pending;
};

// Whether to show the live map for this ride
const isLiveMapActive = ride =>
  ride.rideRequestStatus === 'Approved' &&
  (ride.routeId?.isLeaving || ride.rideStatus === 'InProgress') &&
  ride.rideStatus !== 'Completed';


// ─── Floating ride info card (shows on top of the map) ────────────────────────

const RideInfoCard = ({ ride, displayStatus, eta }) => (
  <View style={styles.floatingCard}>
    {/* Status pill + ETA */}
    <View style={styles.statusEtaRow}>
      <View style={[styles.statusPill, { backgroundColor: displayStatus.bg }]}>
        <MaterialDesignIcons name={displayStatus.icon} size={14} color={displayStatus.color} />
        <Text style={[styles.statusPillText, { color: displayStatus.color }]}>
          {displayStatus.label}
        </Text>
        {isLiveMapActive(ride) && <View style={styles.liveDot} />}
      </View>
      {eta && (
        <View style={styles.etaChip}>
          <MaterialDesignIcons name="clock-fast" size={13} color={COLORS.accent} />
          <Text style={styles.etaText}>{eta}</Text>
        </View>
      )}
    </View>

    {/* Route summary */}
    <View style={styles.routeSummaryRow}>
      <View style={styles.routePoint}>
        <View style={[styles.routeDot, { backgroundColor: COLORS.accent }]} />
        <Text style={styles.routePointText} numberOfLines={1}>{ride.routeId?.from?.name}</Text>
      </View>
      <MaterialDesignIcons name="arrow-right" size={14} color={COLORS.textMuted} />
      <View style={styles.routePoint}>
        <View style={[styles.routeDot, { backgroundColor: COLORS.success }]} />
        <Text style={styles.routePointText} numberOfLines={1}>{ride.routeId?.to?.name}</Text>
      </View>
    </View>

    {/* Stops row */}
    <View style={styles.stopsRow}>
      <View style={styles.stopChip}>
        <MaterialDesignIcons name="map-marker" size={12} color={COLORS.accent} />
        <Text style={styles.stopChipText} numberOfLines={1}>{ride.pickupStop}</Text>
      </View>
      <MaterialDesignIcons name="chevron-right" size={14} color={COLORS.textMuted} />
      <View style={[styles.stopChip, styles.stopChipDrop]}>
        <MaterialDesignIcons name="flag-checkered" size={12} color={COLORS.success} />
        <Text style={[styles.stopChipText, { color: COLORS.success }]} numberOfLines={1}>{ride.dropoffStop}</Text>
      </View>
    </View>

    {/* Driver info (when approved) */}
    {ride.driverId && (
      <View style={styles.driverRow}>
        <View style={styles.driverAvatar}>
          <MaterialDesignIcons name="account" size={16} color={COLORS.white} />
        </View>
        <Text style={styles.driverName}>{ride.driverId.name}</Text>
        {ride.driverId.phone && (
          <Text style={styles.driverPhone}>{ride.driverId.phone}</Text>
        )}
      </View>
    )}
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const RideDetails = ({ route: navRoute, navigation }) => {
  const [ride, setRide] = useState(navRoute.params.ride);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Live driver position — seeded from DB, then updated in real-time via socket
  const [liveDriverLocation, setLiveDriverLocation] = useState(
    navRoute.params.ride.routeId?.driverLocation ?? null,
  );
  const rideIdRef = useRef(ride._id);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await api.get(`/rides/${rideIdRef.current}`);

      if (res.data.success) setRide(res.data.ride);
    } catch (err) {
      if (!silent) Alert.alert('Error', 'Could not refresh ride details');
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  const displayStatus = deriveDisplayStatus(ride);
  const showLiveMap   = isLiveMapActive(ride);
  const routeObjectId = ride.routeId?._id;

  // ETA from driver to user's pickup point (route origin as proxy)
  // from.coordinates is stored as { lat, lng } — convert to [lng, lat] array for calcEta
  const fromCoords   = ride.routeId?.from?.coordinates;
  const pickupCoords = fromCoords ? [fromCoords.lng, fromCoords.lat] : null;
  const eta = useMemo(
    () => calcEta(liveDriverLocation, pickupCoords),
    [liveDriverLocation, pickupCoords],
  );

  const locationHandlerRef   = useRef(null);
  const rideUpdateHandlerRef = useRef(null);

  // Socket effect — joins the route room once when routeObjectId is known.
  // Listens for both ride status updates AND driver GPS regardless of whether
  // the live map is currently visible, so no location events are dropped
  // during the transition when the driver starts leaving.
  useEffect(() => {
    if (!routeObjectId) return;

    let socket;
    let active = true;

    connectSocket().then(s => {
      if (!active) return;
      socket = s;
      socket.emit('join-route', { routeId: routeObjectId });

      // Real-time ride status updates (replaces polling)
      const rideHandler = ({ ride: updated }) => {
        if (active && updated?._id === rideIdRef.current) setRide(updated);
      };
      rideUpdateHandlerRef.current = rideHandler;
      socket.on('ride:update', rideHandler);

      // Driver GPS — always listen so updates are never missed at map-show moment
      const locHandler = loc => { if (active) setLiveDriverLocation(loc); };
      locationHandlerRef.current = locHandler;
      socket.on('driver-location', locHandler);
    });

    return () => {
      active = false;
      if (socket) {
        if (rideUpdateHandlerRef.current) {
          socket.off('ride:update', rideUpdateHandlerRef.current);
          rideUpdateHandlerRef.current = null;
        }
        if (locationHandlerRef.current) {
          socket.off('driver-location', locationHandlerRef.current);
          locationHandlerRef.current = null;
        }
        socket.emit('leave-route', { routeId: routeObjectId });
      }
    };
  }, [routeObjectId]);

  // ── Full-screen live map mode ─────────────────────────────────────────────────

  if (showLiveMap) {
    return (
      <View style={styles.liveContainer}>
        <LiveRideMap
          driverLocation={liveDriverLocation}
          initialCoords={
            liveDriverLocation
              ? [liveDriverLocation.longitude, liveDriverLocation.latitude]
              : undefined
          }
          showBothMarkers={false}
          style={StyleSheet.absoluteFill}
        />

        {/* Back button overlay */}
        <SafeAreaView style={styles.mapOverlayTop}>
          <TouchableOpacity style={styles.mapBackBtn} onPress={() => navigation.goBack()}>
            <MaterialDesignIcons name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.mapHeaderRight}>
            <TouchableOpacity style={styles.mapRefreshBtn} onPress={() => refresh(false)} disabled={isRefreshing}>
              {isRefreshing
                ? <ActivityIndicator size="small" color={COLORS.accent} />
                : <MaterialDesignIcons name="refresh" size={20} color={COLORS.accent} />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Floating ride info at bottom */}
        <RideInfoCard ride={ride} displayStatus={displayStatus} eta={eta} />
      </View>
    );
  }

  // ── Static scrollable mode (Pending / Accepted / Completed / Rejected) ────────

  const steps      = ['OnTheWay', 'InProgress', 'Completed'];
  const currentStep = steps.indexOf(ride.rideStatus);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refresh(false)} disabled={isRefreshing}>
          {isRefreshing
            ? <ActivityIndicator size="small" color={COLORS.accent} />
            : <MaterialDesignIcons name="refresh" size={22} color={COLORS.accent} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Status hero card */}
        <View style={[styles.heroCard, { borderColor: displayStatus.color + '40', backgroundColor: displayStatus.bg }]}>
          <MaterialDesignIcons name={displayStatus.icon} size={36} color={displayStatus.color} />
          <View style={styles.heroText}>
            <Text style={[styles.heroStatus, { color: displayStatus.color }]}>{displayStatus.label}</Text>
            <Text style={styles.heroDesc}>{displayStatus.desc}</Text>
          </View>
          {ride.rideRequestStatus === 'Pending' && (
            <ActivityIndicator size="small" color={displayStatus.color} />
          )}
        </View>

        {/* Trip progress stepper */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Progress</Text>
          <View style={styles.stepperRow}>
            {[
              { key: 'Pending',    label: 'Pending',    icon: 'clock-outline'  },
              { key: 'OnTheWay',   label: 'On The Way', icon: 'car-arrow-right' },
              { key: 'InProgress', label: 'In Progress',icon: 'car-speed-limiter' },
              { key: 'Completed',  label: 'Done',       icon: 'check-all'      },
            ].map((step, i, arr) => {
              const stepOrder = ['Pending', 'OnTheWay', 'InProgress', 'Completed'];
              const currentIdx = stepOrder.indexOf(
                ride.rideRequestStatus === 'Pending' ? 'Pending' :
                ride.rideStatus === 'Completed'      ? 'Completed' :
                ride.rideStatus === 'InProgress'     ? 'InProgress' :
                ride.routeId?.isLeaving              ? 'OnTheWay' : 'Pending',
              );
              const done = i <= currentIdx;
              const cfg  = STATUS[step.key] ?? STATUS.Pending;
              return (
                <React.Fragment key={step.key}>
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle, done && { backgroundColor: cfg.color }]}>
                      <MaterialDesignIcons
                        name={done ? 'check' : 'circle-small'}
                        size={13}
                        color={done ? COLORS.white : COLORS.textMuted}
                      />
                    </View>
                    <Text style={[styles.stepLabel, done && { color: cfg.color }]}>{step.label}</Text>
                  </View>
                  {i < arr.length - 1 && (
                    <View style={[styles.stepLine, done && i < currentIdx && { backgroundColor: cfg.color + 'AA' }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Route info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>
          <View style={styles.routeNameBadge}>
            <MaterialDesignIcons name="routes" size={14} color={COLORS.accent} />
            <Text style={styles.routeNameText}>{ride.routeId?.routeName}</Text>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.routeLocation} numberOfLines={1}>{ride.routeId?.from?.name}</Text>
          </View>
          <View style={styles.connectorWrap}>
            <View style={styles.connectorLine} />
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.routeLocation} numberOfLines={1}>{ride.routeId?.to?.name}</Text>
          </View>
        </View>

        {/* Stops */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Stops</Text>
          <View style={[styles.stopPill, styles.stopPillPickup]}>
            <MaterialDesignIcons name="map-marker" size={18} color={COLORS.accent} />
            <View>
              <Text style={styles.stopPillLabel}>Pickup</Text>
              <Text style={[styles.stopName, { color: COLORS.accent }]}>{ride.pickupStop}</Text>
            </View>
          </View>
          <View style={styles.stopConnector}><View style={styles.stopConnectorLine} /></View>
          <View style={[styles.stopPill, styles.stopPillDropoff]}>
            <MaterialDesignIcons name="flag-checkered" size={18} color={COLORS.success} />
            <View>
              <Text style={[styles.stopPillLabel, { color: COLORS.success + 'AA' }]}>Drop-off</Text>
              <Text style={[styles.stopName, { color: COLORS.success }]}>{ride.dropoffStop}</Text>
            </View>
          </View>
        </View>

        {/* Driver info */}
        {ride.driverId && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver</Text>
            <View style={styles.driverCard}>
              <View style={styles.driverAvatarLarge}>
                <MaterialDesignIcons name="account" size={28} color={COLORS.white} />
              </View>
              <View>
                <Text style={styles.driverNameLarge}>{ride.driverId.name}</Text>
                {ride.driverId.phone && (
                  <Text style={styles.driverPhoneLarge}>{ride.driverId.phone}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Completed banner */}
        {ride.rideStatus === 'Completed' && (
          <View style={styles.completedBanner}>
            <MaterialDesignIcons name="check-decagram" size={24} color={COLORS.success} />
            <Text style={styles.completedText}>Your trip has been completed. Thanks for riding!</Text>
          </View>
        )}

        {/* Rejected banner */}
        {ride.rideRequestStatus === 'Rejected' && (
          <View style={styles.rejectedBanner}>
            <MaterialDesignIcons name="close-circle" size={20} color={COLORS.error} />
            <Text style={styles.rejectedText}>Driver declined this request.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Base containers
  container:     { flex: 1, backgroundColor: COLORS.background },
  liveContainer: { flex: 1, backgroundColor: COLORS.background },

  // ── Static header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  headerTitle: { flex: 1, fontSize: FONTSIZES.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  refreshBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content:    { padding: SIZES.lg, gap: SIZES.md },

  // ── Map overlay header
  mapOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingTop: SIZES.sm,
    marginHorizontal:SIZES.md

  },
  mapBackBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  mapHeaderRight: { flexDirection: 'row', gap: SIZES.sm },
  mapRefreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },

  // ── Floating card (live map mode)
  floatingCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SIZES.lg,
    gap: SIZES.md,
    paddingBottom: SIZES.xxl,
    ...SHADOWS.large,
  },
  statusEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs + 2,
    borderRadius: RADIUS.full,
  },
  etaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent + '15',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs + 2,
    borderRadius: RADIUS.full,
  },
  etaText: { fontSize: FONTSIZES.sm, fontWeight: '600', color: COLORS.accent },
  statusPillText: { fontSize: FONTSIZES.sm, fontWeight: '700' },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accent,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  routeDot:   { width: 8, height: 8, borderRadius: 4 },
  routePointText: { fontSize: FONTSIZES.sm, fontWeight: '500', color: COLORS.text, flex: 1 },
  stopsRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  stopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    backgroundColor: COLORS.accent + '12',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 5,
  },
  stopChipDrop: { backgroundColor: COLORS.success + '12' },
  stopChipText: { fontSize: FONTSIZES.xs, fontWeight: '600', color: COLORS.accent, flex: 1 },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  driverAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName:  { fontSize: FONTSIZES.sm, fontWeight: '600', color: COLORS.text, flex: 1 },
  driverPhone: { fontSize: FONTSIZES.xs, color: COLORS.textSecondary },

  // ── Static view cards
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    borderWidth: 1,
  },
  heroText:   { flex: 1 },
  heroStatus: { fontSize: FONTSIZES.xl, fontWeight: '700', marginBottom: 2 },
  heroDesc:   { fontSize: FONTSIZES.sm, color: COLORS.textSecondary },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardTitle: {
    fontSize: FONTSIZES.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SIZES.md,
  },

  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepItem:   { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  stepLine:  { height: 2, backgroundColor: COLORS.border, marginBottom: 18, width: 20 },

  routeNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accent + '10',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: SIZES.md,
  },
  routeNameText: { fontSize: FONTSIZES.sm, fontWeight: '600', color: COLORS.accent },
  routeRow:      { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  connectorWrap: { paddingLeft: 4, marginVertical: 2 },
  connectorLine: { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 4 },
  dot:           { width: 10, height: 10, borderRadius: 5 },
  routeLocation: { fontSize: FONTSIZES.md, fontWeight: '500', color: COLORS.text, flex: 1 },

  stopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    borderRadius: RADIUS.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderWidth: 1,
  },
  stopPillPickup:  { backgroundColor: COLORS.accent  + '10', borderColor: COLORS.accent  + '25' },
  stopPillDropoff: { backgroundColor: COLORS.success + '10', borderColor: COLORS.success + '25' },
  stopPillLabel: {
    fontSize: FONTSIZES.xs,
    fontWeight: '600',
    color: COLORS.accent + 'AA',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  stopName:      { fontSize: FONTSIZES.md, fontWeight: '600' },
  stopConnector: { paddingLeft: SIZES.md, marginVertical: 3 },
  stopConnectorLine: { width: 2, height: 12, backgroundColor: COLORS.border, marginLeft: 6 },

  driverCard: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  driverAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverNameLarge:  { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.text },
  driverPhoneLarge: { fontSize: FONTSIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.success + '12',
    borderRadius: RADIUS.md,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.success + '25',
  },
  completedText: { flex: 1, fontSize: FONTSIZES.md, fontWeight: '500', color: COLORS.success },

  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.error + '10',
    borderRadius: RADIUS.md,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  rejectedText: { fontSize: FONTSIZES.md, fontWeight: '500', color: COLORS.error },
});

export default RideDetails;
