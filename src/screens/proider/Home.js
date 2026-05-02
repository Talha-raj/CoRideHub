import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTSIZES, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import api from '../../config/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const timeAgo = iso => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const REQUEST_STATUS = {
  Pending:  { color: COLORS.warning, bg: COLORS.warning + '15', label: 'Pending'  },
  Approved: { color: COLORS.success, bg: COLORS.success + '15', label: 'Approved' },
  Rejected: { color: COLORS.error,   bg: COLORS.error   + '15', label: 'Rejected' },
};

// ─── Provider Dashboard ───────────────────────────────────────────────────────

const ProviderDashboard = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  const handleLogout = () => {
    logout();
    navigation.replace('Login');
  };

  const fetchRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await api.get('/rides/requests');
      if (res.data.success) setRequests(res.data.rides);
    } catch (err) {
      console.log('Error fetching ride requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const stats = [
    { label: 'Earnings', value: '$0', icon: 'cash',  color: COLORS.success },
    { label: 'Rides',    value: '48',     icon: 'car',   color: COLORS.accent  },
    { label: 'Rating',   value: '4.9',    icon: 'star',  color: COLORS.warning },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <MaterialDesignIcons name="car" size={28} color={COLORS.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.greeting}>Driver Mode</Text>
            <Text style={styles.userName}>{user?.name || 'Provider'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: stat.color + '15' }]}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '25' }]}>
                <MaterialDesignIcons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* My Routes compact card */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.myRoutesCard}
            onPress={() => navigation.navigate('ProviderRoutes')}
          >
            <View style={styles.myRoutesLeft}>
              <View style={styles.myRoutesIcon}>
                <MaterialDesignIcons name="routes" size={22} color={COLORS.accent} />
              </View>
              <View>
                <Text style={styles.myRoutesTitle}>My Routes</Text>
                <Text style={styles.myRoutesSub}>Manage routes & departures</Text>
              </View>
            </View>
            <MaterialDesignIcons name="chevron-right" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Ride Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ride Requests</Text>
            <TouchableOpacity onPress={fetchRequests}>
              <MaterialDesignIcons name="refresh" size={20} color={COLORS.accent} />
            </TouchableOpacity>
          </View>

          {isLoadingRequests ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialDesignIcons name="car-off" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Requests Yet</Text>
              <Text style={styles.emptyText}>Ride requests from passengers will appear here</Text>
            </View>
          ) : (
            requests.map(ride => {
              const cfg = REQUEST_STATUS[ride.rideRequestStatus] || REQUEST_STATUS.Pending;
              return (
                <TouchableOpacity
                  key={ride._id}
                  style={styles.requestCard}
                  onPress={() => navigation.navigate('RequestDetails', { ride })}
                >
                  <View style={[styles.riderAvatar, { backgroundColor: cfg.color + '20' }]}>
                    <MaterialDesignIcons name="account" size={22} color={cfg.color} />
                  </View>

                  <View style={styles.requestInfo}>
                    <Text style={styles.riderName}>{ride.userId?.name || 'Rider'}</Text>
                    <Text style={styles.requestRoute} numberOfLines={1}>
                      {ride.routeId?.from?.name} → {ride.routeId?.to?.name}
                    </Text>
                    <View style={styles.requestMeta}>
                      <MaterialDesignIcons name="map-marker" size={12} color={COLORS.accent} />
                      <Text style={styles.requestStop} numberOfLines={1}>
                        {ride.pickupStop} → {ride.dropoffStop}
                      </Text>
                      <Text style={styles.requestTime}>{timeAgo(ride.createdAt)}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Vehicle card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Vehicle</Text>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIconContainer}>
              <MaterialDesignIcons name="car-side" size={32} color={COLORS.accent} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>{user?.vehicle?.model || 'Toyota Camry'}</Text>
              <Text style={styles.vehiclePlate}>{user?.vehicle?.plateNumber || 'ABC-1234'}</Text>
              <View style={styles.vehicleType}>
                <MaterialDesignIcons name="car-seat" size={14} color={COLORS.textSecondary} />
                <Text style={styles.vehicleTypeText}>4 Seats • Comfort</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <MaterialDesignIcons name="pencil" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialDesignIcons name="logout" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { marginLeft: SIZES.md },
  greeting: { fontSize: FONTSIZES.sm, color: COLORS.textSecondary, marginBottom: 2 },
  userName: { fontSize: FONTSIZES.lg, fontWeight: '600', color: COLORS.text },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: RADIUS.full,
    gap: SIZES.xs,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  onlineText: { fontSize: FONTSIZES.sm, color: COLORS.success, fontWeight: '500' },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  statCard: { flex: 1, borderRadius: RADIUS.lg, padding: SIZES.md, alignItems: 'center' },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  statValue: { fontSize: FONTSIZES.xl, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: FONTSIZES.sm, color: COLORS.textSecondary },

  section: { paddingHorizontal: SIZES.lg, marginBottom: SIZES.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitle: { fontSize: FONTSIZES.lg, fontWeight: '600', color: COLORS.text },
  loadingContainer: { paddingVertical: SIZES.xl, alignItems: 'center' },

  myRoutesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
    ...SHADOWS.small,
  },
  myRoutesLeft: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  myRoutesIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRoutesTitle: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  myRoutesSub: { fontSize: FONTSIZES.sm, color: COLORS.textSecondary },

  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.xl,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  emptyTitle: { fontSize: FONTSIZES.lg, fontWeight: '600', color: COLORS.text, marginTop: SIZES.md, marginBottom: SIZES.xs },
  emptyText: { fontSize: FONTSIZES.md, color: COLORS.textSecondary, textAlign: 'center' },

  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    gap: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  riderAvatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: { flex: 1 },
  riderName: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  requestRoute: { fontSize: FONTSIZES.sm, color: COLORS.textSecondary, marginBottom: 4 },
  requestMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  requestStop: { fontSize: FONTSIZES.xs, color: COLORS.textMuted, flex: 1 },
  requestTime: { fontSize: FONTSIZES.xs, color: COLORS.textMuted },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: { fontSize: FONTSIZES.xs, fontWeight: '600' },

  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  vehicleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  vehiclePlate: { fontSize: FONTSIZES.sm, color: COLORS.textSecondary, marginBottom: 4 },
  vehicleType: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vehicleTypeText: { fontSize: FONTSIZES.xs, color: COLORS.textSecondary },
  editButton: { padding: SIZES.sm },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
    paddingVertical: SIZES.md,
    gap: SIZES.sm,
  },
  logoutText: { fontSize: FONTSIZES.md, color: COLORS.error, fontWeight: '500' },
});

export default ProviderDashboard;
