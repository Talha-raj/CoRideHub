import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTSIZES, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import api from '../../config/api';

// ─── config ───────────────────────────────────────────────────────────────────

const REQUEST_STATUS = {
  Pending:  { color: COLORS.warning, bg: COLORS.warning + '15', label: 'Pending',   icon: 'clock-outline', desc: 'Waiting for driver to respond' },
  Approved: { color: COLORS.success, bg: COLORS.success + '15', label: 'Approved',  icon: 'check-circle',  desc: 'Driver has accepted your request' },
  Rejected: { color: COLORS.error,   bg: COLORS.error   + '15', label: 'Rejected',  icon: 'close-circle',  desc: 'Driver declined this request' },
};

const RIDE_STATUS = {
  OnTheWay:   { color: COLORS.accent,  bg: COLORS.accent  + '15', label: 'On The Way',  icon: 'car-arrow-right',   desc: 'Driver is on the way' },
  InProgress: { color: COLORS.warning, bg: COLORS.warning + '15', label: 'In Progress', icon: 'car-speed-limiter', desc: 'Your trip is in progress' },
  Completed:  { color: COLORS.success, bg: COLORS.success + '15', label: 'Completed',   icon: 'check-all',         desc: 'Trip completed' },
};

// ─── screen ───────────────────────────────────────────────────────────────────

const RideDetails = ({ route: navRoute, navigation }) => {
  const [ride, setRide] = useState(navRoute.params.ride);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get(`/rides/${ride._id}`);
      if (res.data.success) setRide(res.data.ride);
    } catch (err) {
      Alert.alert('Error', 'Could not refresh ride details');
    } finally {
      setIsRefreshing(false);
    }
  }, [ride._id]);

  const reqCfg  = REQUEST_STATUS[ride.rideRequestStatus];
  const rideCfg = RIDE_STATUS[ride.rideStatus];

  const steps = ['OnTheWay', 'InProgress', 'Completed'];
  const currentStep = steps.indexOf(ride.rideStatus);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh} disabled={isRefreshing}>
          {isRefreshing
            ? <ActivityIndicator size="small" color={COLORS.accent} />
            : <MaterialDesignIcons name="refresh" size={22} color={COLORS.accent} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Status hero card */}
        <View style={[styles.heroCard, { borderColor: rideCfg.color + '40', backgroundColor: rideCfg.bg }]}>
          <MaterialDesignIcons name={rideCfg.icon} size={36} color={rideCfg.color} />
          <View style={styles.heroText}>
            <Text style={[styles.heroStatus, { color: rideCfg.color }]}>{rideCfg.label}</Text>
            <Text style={styles.heroDesc}>{rideCfg.desc}</Text>
          </View>
        </View>

        {/* Ride status stepper */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Progress</Text>
          <View style={styles.stepperRow}>
            {steps.map((s, i) => {
              const done = i <= currentStep;
              const cfg = RIDE_STATUS[s];
              return (
                <React.Fragment key={s}>
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle, done && { backgroundColor: cfg.color }]}>
                      <MaterialDesignIcons
                        name={done ? 'check' : 'circle-small'}
                        size={14}
                        color={done ? COLORS.white : COLORS.textMuted}
                      />
                    </View>
                    <Text style={[styles.stepLabel, done && { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </View>
                  {i < 2 && (
                    <View style={[styles.stepLine, done && i < currentStep && { backgroundColor: RIDE_STATUS[steps[i + 1]].color }]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Request status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Request Status</Text>
          <View style={[styles.requestBadge, { backgroundColor: reqCfg.bg }]}>
            <MaterialDesignIcons name={reqCfg.icon} size={18} color={reqCfg.color} />
            <View style={styles.requestBadgeText}>
              <Text style={[styles.requestBadgeLabel, { color: reqCfg.color }]}>{reqCfg.label}</Text>
              <Text style={styles.requestBadgeDesc}>{reqCfg.desc}</Text>
            </View>
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

        {/* Your stops */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Stops</Text>
          <View style={[styles.stopPill, styles.stopPillPickup]}>
            <MaterialDesignIcons name="map-marker" size={18} color={COLORS.accent} />
            <View>
              <Text style={styles.stopPillLabel}>Pickup</Text>
              <Text style={[styles.stopName, { color: COLORS.accent }]}>{ride.pickupStop}</Text>
            </View>
          </View>
          <View style={styles.stopConnector}>
            <View style={styles.stopConnectorLine} />
          </View>
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
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <MaterialDesignIcons name="account" size={24} color={COLORS.white} />
              </View>
              <View>
                <Text style={styles.driverName}>{ride.driverId.name}</Text>
                {ride.driverId.phone && (
                  <Text style={styles.driverPhone}>{ride.driverId.phone}</Text>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  headerTitle: { flex: 1, fontSize: FONTSIZES.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  refreshBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SIZES.lg, gap: SIZES.md },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    borderWidth: 1,
  },
  heroText: { flex: 1 },
  heroStatus: { fontSize: FONTSIZES.xl, fontWeight: '700', marginBottom: 2 },
  heroDesc: { fontSize: FONTSIZES.sm, color: COLORS.textSecondary },

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
  stepItem: { alignItems: 'center', width: 70 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepLabel: { fontSize: FONTSIZES.xs, color: COLORS.textMuted, textAlign: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginBottom: 16 },

  requestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    borderRadius: RADIUS.md,
    padding: SIZES.md,
  },
  requestBadgeText: { flex: 1 },
  requestBadgeLabel: { fontSize: FONTSIZES.md, fontWeight: '700' },
  requestBadgeDesc: { fontSize: FONTSIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

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
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  connectorWrap: { paddingLeft: 4, marginVertical: 2 },
  connectorLine: { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
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
  stopName: { fontSize: FONTSIZES.md, fontWeight: '600' },
  stopConnector: { paddingLeft: SIZES.md, marginVertical: 3 },
  stopConnectorLine: { width: 2, height: 12, backgroundColor: COLORS.border, marginLeft: 6 },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.text },
  driverPhone: { fontSize: FONTSIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
});

export default RideDetails;
