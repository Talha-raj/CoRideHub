import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTSIZES, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import api from '../../config/api';

const STATUS_CFG = {
  Pending:    { color: COLORS.warning, bg: COLORS.warning + '15', icon: 'clock-outline',    label: 'Pending'     },
  Approved:   { color: COLORS.success, bg: COLORS.success + '15', icon: 'check-circle',     label: 'Approved'    },
  Rejected:   { color: COLORS.error,   bg: COLORS.error   + '15', icon: 'close-circle',     label: 'Rejected'    },
  OnTheWay:   { color: COLORS.accent,  bg: COLORS.accent  + '15', icon: 'car-arrow-right',  label: 'On The Way'  },
  InProgress: { color: COLORS.warning, bg: COLORS.warning + '15', icon: 'car-speed-limiter',label: 'In Progress' },
  Completed:  { color: COLORS.success, bg: COLORS.success + '15', icon: 'check-all',        label: 'Completed'   },
};

const deriveStatus = ride => {
  if (ride.rideStatus === 'Completed')              return STATUS_CFG.Completed;
  if (ride.rideStatus === 'InProgress')             return STATUS_CFG.InProgress;
  if (ride.rideRequestStatus === 'Rejected')        return STATUS_CFG.Rejected;
  if (ride.rideRequestStatus === 'Approved')        return STATUS_CFG.Approved;
  if (ride.routeId?.isLeaving)                      return STATUS_CFG.OnTheWay;
  return STATUS_CFG.Pending;
};

const formatDate = iso => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const RideItem = ({ ride, onPress }) => {
  const cfg = deriveStatus(ride);
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(ride)} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <MaterialDesignIcons name={cfg.icon} size={20} color={cfg.color} />
      </View>

      <View style={styles.info}>
        <Text style={styles.route} numberOfLines={1}>
          {ride.routeId?.from?.name ?? '—'} → {ride.routeId?.to?.name ?? '—'}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.stop} numberOfLines={1}>
            {ride.pickupStop} → {ride.dropoffStop}
          </Text>
        </View>
        <Text style={styles.date}>{formatDate(ride.createdAt)}</Text>
      </View>

      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const AllRides = ({ navigation }) => {
  const [rides, setRides]       = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRides = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/rides/user');
      if (res.data.success) setRides(res.data.rides);
    } catch (err) {
      console.log('AllRides fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchRides(); }, [fetchRides]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Rides</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.center}>
          <MaterialDesignIcons name="car-off" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Rides Yet</Text>
          <Text style={styles.emptyText}>Your ride history will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={r => r._id}
          renderItem={({ item }) => (
            <RideItem ride={item} onPress={ride => navigation.navigate('RideDetails', { ride })} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

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
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  headerTitle: { flex: 1, fontSize: FONTSIZES.lg, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SIZES.sm },
  emptyTitle: { fontSize: FONTSIZES.lg, fontWeight: '600', color: COLORS.text, marginTop: SIZES.sm },
  emptyText:  { fontSize: FONTSIZES.md, color: COLORS.textSecondary },

  list: { padding: SIZES.lg, gap: SIZES.sm },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SIZES.md,
    gap: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info:  { flex: 1, gap: 3 },
  route: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.text },
  meta:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stop:  { fontSize: FONTSIZES.sm, color: COLORS.textSecondary, flex: 1 },
  date:  { fontSize: FONTSIZES.xs, color: COLORS.textMuted },

  badge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeText: { fontSize: FONTSIZES.xs, fontWeight: '600' },
});

export default AllRides;
