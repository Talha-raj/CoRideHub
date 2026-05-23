import React, { useState, useCallback, useRef } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTSIZES, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import api from '../../config/api';

// ─── Config ───────────────────────────────────────────────────────────────────

const REQUEST_STATUS = {
  Pending:  { color: COLORS.warning, bg: COLORS.warning + '15', label: 'Pending',  icon: 'clock-outline'   },
  Approved: { color: COLORS.success, bg: COLORS.success + '15', label: 'Approved', icon: 'check-circle'    },
  Rejected: { color: COLORS.error,   bg: COLORS.error   + '15', label: 'Rejected', icon: 'close-circle'    },
};

const RIDE_STATUS = {
  OnTheWay:   { color: COLORS.accent,  bg: COLORS.accent  + '15', label: 'On The Way',  icon: 'car-arrow-right'   },
  InProgress: { color: COLORS.warning, bg: COLORS.warning + '15', label: 'In Progress', icon: 'car-speed-limiter' },
  Completed:  { color: COLORS.success, bg: COLORS.success + '15', label: 'Completed',   icon: 'check-all'         },
};

const isPollingNeeded = ride =>
  ride.rideRequestStatus === 'Approved' && ride.rideStatus !== 'Completed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = dateStr => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ cfg }) => (
  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
    <MaterialDesignIcons name={cfg.icon} size={14} color={cfg.color} />
    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
  </View>
);

const InfoCard = ({ icon, title, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <MaterialDesignIcons name={icon} size={18} color={COLORS.accent} />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const RequestDetails = ({ route: navRoute, navigation }) => {
  const [ride, setRide]       = useState(navRoute.params.ride);
  const [isLoading, setIsLoading] = useState(false);
  const rideIdRef = useRef(ride._id);

  // ── Auto-poll when ride is active ──────────────────────────────────────────

  const refreshSilent = useCallback(async () => {
    try {
      const res = await api.get(`/rides/${rideIdRef.current}`);
      if (res.data.success) setRide(res.data.ride);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isPollingNeeded(ride)) return;
      refreshSilent();
      const interval = setInterval(refreshSilent, 5_000);
      return () => clearInterval(interval);
    }, [ride.rideRequestStatus, ride.rideStatus, refreshSilent]),
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleRequestStatus = useCallback(status => {
    Alert.alert(
      `${status} Request`,
      `Are you sure you want to ${status.toLowerCase()} this request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status,
          style: status === 'Rejected' ? 'destructive' : 'default',
          onPress: async () => {
            setIsLoading(true);
            try {
              const res = await api.patch(`/rides/${ride._id}/request-status`, { status });
              if (res.data.success) setRide(res.data.ride);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to update');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  }, [ride._id]);

  const handleRideStatus = useCallback(async status => {
    setIsLoading(true);
    try {
      const res = await api.patch(`/rides/${ride._id}/ride-status`, { status });
      if (res.data.success) setRide(res.data.ride);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update');
    } finally {
      setIsLoading(false);
    }
  }, [ride._id]);

  const reqCfg  = REQUEST_STATUS[ride.rideRequestStatus];
  const rideCfg = RIDE_STATUS[ride.rideStatus];

  // ── Scrollable mode ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Request</Text>
        <Text style={styles.headerTime}>{timeAgo(ride.createdAt)}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        <View style={styles.statusRow}>
          <StatusBadge cfg={reqCfg} />
          <StatusBadge cfg={rideCfg} />
        </View>

        <InfoCard icon="account-circle" title="Rider">
          <Text style={styles.riderNameLarge}>{ride.userId?.name}</Text>
          {ride.userId?.email && (
            <View style={styles.infoRow}>
              <MaterialDesignIcons name="email-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{ride.userId.email}</Text>
            </View>
          )}
          {ride.userId?.phone && (
            <View style={styles.infoRow}>
              <MaterialDesignIcons name="phone-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{ride.userId.phone}</Text>
            </View>
          )}
        </InfoCard>

        <InfoCard icon="routes" title={ride.routeId?.routeName || 'Route'}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.routeLocation} numberOfLines={1}>{ride.routeId?.from?.name}</Text>
          </View>
          <View style={styles.routeConnector}><View style={styles.connectorLine} /></View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.routeLocation} numberOfLines={1}>{ride.routeId?.to?.name}</Text>
          </View>
        </InfoCard>

        <InfoCard icon="bus-stop" title="Stops">
          <View style={styles.stopRow}>
            <View style={[styles.stopPill, styles.stopPillPickup]}>
              <MaterialDesignIcons name="map-marker" size={16} color={COLORS.accent} />
              <View>
                <Text style={styles.stopPillLabel}>Pickup</Text>
                <Text style={[styles.stopName, { color: COLORS.accent }]}>{ride.pickupStop}</Text>
              </View>
            </View>
          </View>
          <View style={styles.stopConnector}><View style={styles.stopConnectorLine} /></View>
          <View style={styles.stopRow}>
            <View style={[styles.stopPill, styles.stopPillDropoff]}>
              <MaterialDesignIcons name="flag-checkered" size={16} color={COLORS.success} />
              <View>
                <Text style={[styles.stopPillLabel, { color: COLORS.success + 'AA' }]}>Drop-off</Text>
                <Text style={[styles.stopName, { color: COLORS.success }]}>{ride.dropoffStop}</Text>
              </View>
            </View>
          </View>
        </InfoCard>

        {/* Accept / Reject */}
        {ride.rideRequestStatus === 'Pending' && (
          <View style={styles.actionSection}>
            <Text style={styles.actionLabel}>Respond to Request</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleRequestStatus('Rejected')}
                disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator color={COLORS.error} size="small" />
                  : <><MaterialDesignIcons name="close" size={18} color={COLORS.error} /><Text style={[styles.actionBtnText, { color: COLORS.error }]}>Reject</Text></>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleRequestStatus('Approved')}
                disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <><MaterialDesignIcons name="check" size={18} color={COLORS.white} /><Text style={[styles.actionBtnText, { color: COLORS.white }]}>Approve</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Ride status controls */}
        {ride.rideRequestStatus === 'Approved' && (
          <View style={styles.actionSection}>
            <Text style={styles.actionLabel}>Update Ride Status</Text>

            {ride.rideStatus === 'OnTheWay' && (
              <TouchableOpacity
                style={[styles.rideStatusBtn, { backgroundColor: COLORS.warning }]}
                onPress={() => handleRideStatus('InProgress')}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color={COLORS.white} /> : <><MaterialDesignIcons name="play-circle" size={20} color={COLORS.white} /><Text style={styles.rideStatusBtnText}>Start Ride</Text></>}
              </TouchableOpacity>
            )}

            {ride.rideStatus === 'InProgress' && (
              <TouchableOpacity
                style={[styles.rideStatusBtn, { backgroundColor: COLORS.success }]}
                onPress={() => handleRideStatus('Completed')}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color={COLORS.white} /> : <><MaterialDesignIcons name="flag-checkered" size={20} color={COLORS.white} /><Text style={styles.rideStatusBtnText}>Complete Ride</Text></>}
              </TouchableOpacity>
            )}

            {ride.rideStatus === 'Completed' && (
              <View style={styles.completedBanner}>
                <MaterialDesignIcons name="check-decagram" size={22} color={COLORS.success} />
                <Text style={styles.completedText}>Ride Completed</Text>
              </View>
            )}

            {/* Progress */}
            <View style={styles.progressRow}>
              {['OnTheWay', 'InProgress', 'Completed'].map((s, i) => {
                const steps = ['OnTheWay', 'InProgress', 'Completed'];
                const done  = i <= steps.indexOf(ride.rideStatus);
                return (
                  <React.Fragment key={s}>
                    <View style={[styles.progressStep, done && styles.progressStepDone]}>
                      <MaterialDesignIcons name={done ? 'check' : 'circle-small'} size={14} color={done ? COLORS.white : COLORS.textMuted} />
                    </View>
                    {i < 2 && <View style={[styles.progressLine, done && i < steps.indexOf(ride.rideStatus) && styles.progressLineDone]} />}
                  </React.Fragment>
                );
              })}
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>On Way</Text>
              <Text style={styles.progressLabel}>In Progress</Text>
              <Text style={styles.progressLabel}>Done</Text>
            </View>
          </View>
        )}

        {ride.rideRequestStatus === 'Rejected' && (
          <View style={styles.rejectedBanner}>
            <MaterialDesignIcons name="close-circle" size={20} color={COLORS.error} />
            <Text style={styles.rejectedText}>This request has been rejected</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Static header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  headerTitle: { flex: 1, fontSize: FONTSIZES.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  headerTime:  { fontSize: FONTSIZES.sm, color: COLORS.textMuted, width: 56, textAlign: 'right' },
  content:     { padding: SIZES.lg, gap: SIZES.md },

  // Shared card styles
  statusRow:  { flexDirection: 'row', gap: SIZES.sm },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs + 2,
    borderRadius: RADIUS.full,
  },
  statusText: { fontSize: FONTSIZES.sm, fontWeight: '600' },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.sm },
  cardTitle:  { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.text },

  riderNameLarge: { fontSize: FONTSIZES.lg, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.xs },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoText:  { fontSize: FONTSIZES.sm, color: COLORS.textSecondary },

  routeRow:      { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  routeConnector: { paddingLeft: 5, marginVertical: 2 },
  connectorLine:  { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 4 },
  dot:            { width: 10, height: 10, borderRadius: 5 },
  routeLocation:  { fontSize: FONTSIZES.md, fontWeight: '500', color: COLORS.text, flex: 1 },

  stopRow: { marginTop: SIZES.xs },
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
  stopName:       { fontSize: FONTSIZES.md, fontWeight: '600' },
  stopConnector:  { paddingLeft: SIZES.md, marginVertical: 3 },
  stopConnectorLine: { width: 2, height: 12, backgroundColor: COLORS.border, marginLeft: 6 },

  actionSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  actionLabel: {
    fontSize: FONTSIZES.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SIZES.md,
  },
  actionRow: { flexDirection: 'row', gap: SIZES.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.xs,
    height: 48,
    borderRadius: RADIUS.md,
  },
  rejectBtn:     { backgroundColor: COLORS.error + '10', borderWidth: 1, borderColor: COLORS.error + '30' },
  approveBtn:    { backgroundColor: COLORS.accent, ...SHADOWS.small },
  actionBtnText: { fontSize: FONTSIZES.md, fontWeight: '600' },

  rideStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    height: 52,
    borderRadius: RADIUS.md,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  rideStatusBtnText: { fontSize: FONTSIZES.md, fontWeight: '700', color: COLORS.white },

  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.success + '12',
    borderRadius: RADIUS.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  completedText: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.success },

  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: SIZES.sm },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepDone: { backgroundColor: COLORS.success },
  progressLine:     { flex: 1, height: 2, backgroundColor: COLORS.border },
  progressLineDone: { backgroundColor: COLORS.success },
  progressLabels:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressLabel:    { fontSize: FONTSIZES.xs, color: COLORS.textMuted, textAlign: 'center', flex: 1 },

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

export default RequestDetails;
