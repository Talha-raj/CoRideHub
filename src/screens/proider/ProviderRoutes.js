import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTSIZES, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import api from '../../config/api';
import { useSession } from '../../store/useSession';
import {
  startLocationSharing,
  stopLocationSharing,
  saveTrackingInfo,
  clearTrackingInfo,
} from '../../services/locationService';
import { startTracking, stopTracking, isTracking } from '../../services/trackingService';

// ─── helpers ──────────────────────────────────────────────────────────────────

const pad = n => String(n).padStart(2, '0');

const toDateStr = date => {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
};

const formatDateDisplay = date =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const isToday = date => toDateStr(date) === toDateStr(new Date());

const format12h = time => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${period}`;
};

// ─── Departure Modal ──────────────────────────────────────────────────────────

const DepartureModal = ({ visible, onCancel, onConfirm, isConfirming }) => {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(now);
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(Math.round(now.getMinutes() / 5) * 5 % 60);

useEffect(() => {
    if (visible) {
      const n = new Date();
      setSelectedDate(n);
      setHour(n.getHours());
      setMinute(Math.round(n.getMinutes() / 5) * 5 % 60);
    }
  }, [visible]);

  const changeDay    = delta => setSelectedDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + delta); return d; });
  const changeHour   = delta => setHour(h => (h + delta + 24) % 24);
  const changeMinute = delta => setMinute(m => (m + delta + 60) % 60);
  const handleConfirm = () => onConfirm({ date: toDateStr(selectedDate), time: `${pad(hour)}:${pad(minute)}` });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.header}>
            <View style={mStyles.headerIcon}>
              <MaterialDesignIcons name="clock-outline" size={22} color={COLORS.accent} />
            </View>
            <Text style={mStyles.title}>Schedule Departure</Text>
          </View>

          <Text style={mStyles.sectionLabel}>Date</Text>
          <View style={mStyles.datePicker}>
            <TouchableOpacity style={mStyles.arrowBtn} onPress={() => changeDay(-1)}>
              <MaterialDesignIcons name="chevron-left" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <View style={mStyles.dateDisplay}>
              <Text style={mStyles.dateText}>{formatDateDisplay(selectedDate)}</Text>
              {isToday(selectedDate) && (
                <View style={mStyles.todayPill}><Text style={mStyles.todayText}>Today</Text></View>
              )}
            </View>
            <TouchableOpacity style={mStyles.arrowBtn} onPress={() => changeDay(1)}>
              <MaterialDesignIcons name="chevron-right" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={mStyles.sectionLabel}>Time</Text>
          <View style={mStyles.timePicker}>
            <View style={mStyles.timeColumn}>
              <TouchableOpacity style={mStyles.timeArrow} onPress={() => changeHour(1)}><MaterialDesignIcons name="chevron-up" size={28} color={COLORS.accent} /></TouchableOpacity>
              <View style={mStyles.timeBox}><Text style={mStyles.timeValue}>{pad(hour)}</Text></View>
              <TouchableOpacity style={mStyles.timeArrow} onPress={() => changeHour(-1)}><MaterialDesignIcons name="chevron-down" size={28} color={COLORS.accent} /></TouchableOpacity>
            </View>
            <Text style={mStyles.colon}>:</Text>
            <View style={mStyles.timeColumn}>
              <TouchableOpacity style={mStyles.timeArrow} onPress={() => changeMinute(5)}><MaterialDesignIcons name="chevron-up" size={28} color={COLORS.accent} /></TouchableOpacity>
              <View style={mStyles.timeBox}><Text style={mStyles.timeValue}>{pad(minute)}</Text></View>
              <TouchableOpacity style={mStyles.timeArrow} onPress={() => changeMinute(-5)}><MaterialDesignIcons name="chevron-down" size={28} color={COLORS.accent} /></TouchableOpacity>
            </View>
            <View style={mStyles.periodBox}><Text style={mStyles.periodText}>{hour >= 12 ? 'PM' : 'AM'}</Text></View>
          </View>

          <View style={mStyles.preview}>
            <MaterialDesignIcons name="information-outline" size={15} color={COLORS.textMuted} />
            <Text style={mStyles.previewText}>
              Departing on{' '}
              <Text style={mStyles.previewHighlight}>{formatDateDisplay(selectedDate)}</Text>
              {' '}at{' '}
              <Text style={mStyles.previewHighlight}>{format12h(`${pad(hour)}:${pad(minute)}`)}</Text>
            </Text>
          </View>

          <View style={mStyles.actions}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={onCancel} disabled={isConfirming}>
              <Text style={mStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[mStyles.confirmBtn, isConfirming && mStyles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <MaterialDesignIcons name="car-arrow-right" size={18} color={COLORS.white} />
                  <Text style={mStyles.confirmText}>Start Leaving</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const ProviderRoutes = ({ navigation }) => {
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completingRouteId, setCompletingRouteId] = useState(null);

  const { activeTrackingRouteId, setActiveTrackingRouteId } = useSession();

  // ── Fetch routes ─────────────────────────────────────────────────────────────

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/routes');
      if (res.data.success) setRoutes(res.data.routes);
    } catch (err) {
      console.log('Error fetching routes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRoutes();
    }, [fetchRoutes]),
  );

  // Reset stale tracking state that survived an app restart (GPS is not running)
  useFocusEffect(
    useCallback(() => {
      if (activeTrackingRouteId && !isTracking()) {
        setActiveTrackingRouteId(null);
      }
    }, [activeTrackingRouteId, setActiveTrackingRouteId]),
  );

  // ── Start Leaving ────────────────────────────────────────────────────────────

  const handleStartLeaving = routeId => {
    // Guard: only one active departure at a time
    if (activeTrackingRouteId) {
      const activeRoute = routes.find(r => r._id === activeTrackingRouteId);
      Alert.alert(
        'Route Already Active',
        `"${activeRoute?.routeName || 'Another route'}" is currently active. Complete it before starting a new departure.`,
      );
      return;
    }
    setActiveRouteId(routeId);
    setShowDepartureModal(true);
  };

  const handleConfirmDeparture = async ({ date, time }) => {
    if (!activeRouteId) return;
    setIsConfirming(true);
    try {
      const res = await api.post(`/routes/${activeRouteId}/departure`, {
        date,
        time,
        isLeaving: true,
      });
      if (!res.data.success) throw new Error('Server returned failure');

      const updatedRoute = res.data.route;
      setRoutes(prev => prev.map(r => r._id === activeRouteId ? updatedRoute : r));
      setShowDepartureModal(false);

      // Register module-level callbacks + connect socket first, then start GPS
      await startTracking(activeRouteId);
      const granted = await startLocationSharing();
      if (!granted) {
        stopTracking(activeRouteId);
        Alert.alert(
          'Permission Required',
          'Location permission is required to share your live position with riders.',
        );
        return;
      }

      // Persist routeId + token to native storage so the foreground service
      // (Android) / background CLLocationManager (iOS) can POST directly to the
      // backend even when the JS thread is suspended or the process is killed.
      try {
        const raw   = await AsyncStorage.getItem('auth-storage');
        const token = raw ? JSON.parse(raw)?.state?.user?.token : null;
        const host  = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
        if (token) saveTrackingInfo(activeRouteId, token, `http://${host}:5000`);
      } catch (_) {}

      setActiveTrackingRouteId(activeRouteId);
      setActiveRouteId(null);

      Alert.alert(
        'Departure Started',
        'Live location tracking is now active. Riders can see your position.',
        [{ text: 'OK' }],
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to start departure. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  // ── Complete Departure ────────────────────────────────────────────────────────

  const handleCompleteRoute = useCallback(routeId => {
    Alert.alert(
      'Complete Route',
      'This will stop live location tracking and mark the departure as completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            setCompletingRouteId(routeId);
            try {
              await stopLocationSharing();
              stopTracking(routeId);
              clearTrackingInfo();

              const res = await api.patch(`/routes/${routeId}/departure/complete`);
              if (!res.data.success) throw new Error('Server returned failure');

              setActiveTrackingRouteId(null);
              setRoutes(prev => prev.map(r => r._id === routeId ? res.data.route : r));
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to complete route.');
              // Restore tracking state if backend call failed
            } finally {
              setCompletingRouteId(null);
            }
          },
        },
      ],
    );
  }, [setActiveTrackingRouteId]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const todayStr = toDateStr(new Date());

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Routes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddRoute')}>
          <MaterialDesignIcons name="plus" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Active tracking banner */}
      {activeTrackingRouteId && (
        <View style={styles.trackingBanner}>
          <View style={styles.trackingDot} />
          <Text style={styles.trackingBannerText}>Live tracking active</Text>
          <MaterialDesignIcons name="broadcast" size={16} color={COLORS.white} />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : routes.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialDesignIcons name="route" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Routes Yet</Text>
            <Text style={styles.emptyText}>Create your first route to start offering rides</Text>
            <TouchableOpacity style={styles.addRouteButton} onPress={() => navigation.navigate('AddRoute')}>
              <MaterialDesignIcons name="plus" size={20} color={COLORS.white} />
              <Text style={styles.addRouteButtonText}>Add Route</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routes.map(route => {
            const isThisLeaving = route._id === activeTrackingRouteId || route.isLeaving;
            const isCompleting  = completingRouteId === route._id;
            const todayDepartures = (route.departures || []).filter(d => d.date === todayStr);
            const activeDeparture = todayDepartures.find(d => d.isLeaving);
            const isCompleted     = activeDeparture?.isCompleted;

            return (
              <View
                key={route._id}
                style={[styles.routeCard, isThisLeaving && styles.routeCardActive]}
              >
                {/* Route header */}
                <View style={styles.routeHeader}>
                  <Text style={styles.routeName}>{route.routeName}</Text>
                  <View style={[
                    styles.statusBadge,
                    isCompleted   ? styles.statusCompleted :
                    isThisLeaving ? styles.statusLeaving   :
                                    styles.statusActive,
                  ]}>
                    <View style={[
                      styles.statusDot,
                      isCompleted   ? styles.statusDotCompleted :
                      isThisLeaving ? styles.statusDotLeaving   :
                                      styles.statusDotActive,
                    ]} />
                    <Text style={[
                      styles.statusText,
                      isCompleted   ? styles.statusTextCompleted :
                      isThisLeaving ? styles.statusTextLeaving   :
                                      styles.statusTextActive,
                    ]}>
                      {isCompleted ? 'Completed' : isThisLeaving ? 'Leaving' : 'Active'}
                    </Text>
                  </View>
                </View>

                {/* Route path */}
                <View style={styles.routePath}>
                  <View style={styles.routeIndicator}>
                    <View style={styles.dot} />
                    <View style={styles.line} />
                    <View style={[styles.dot, styles.dotDestination]} />
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.locationText}>{route.from.name}</Text>
                    <Text style={styles.locationText}>{route.to.name}</Text>
                  </View>
                </View>

                {/* Today's departures */}
                {todayDepartures.length > 0 ? (
                  <View style={styles.departureRow}>
                    <MaterialDesignIcons name="clock-fast" size={14} color={COLORS.accent} />
                    <Text style={styles.departureLabel}>Today: </Text>
                    <Text style={styles.departureValues}>
                      {todayDepartures.map(d => format12h(d.time)).join('  •  ')}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.departureRow}>
                    <MaterialDesignIcons name="clock-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.departureNone}>No departure scheduled today</Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.buttonRow}>
                  {!isThisLeaving && !isCompleted && (
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() => handleStartLeaving(route._id)}
                    >
                      <MaterialDesignIcons name="car-arrow-right" size={18} color={COLORS.white} />
                      <Text style={styles.startButtonText}>Start Leaving</Text>
                    </TouchableOpacity>
                  )}

                  {isThisLeaving && !isCompleted && (
                    <TouchableOpacity
                      style={[styles.completeButton, isCompleting && styles.buttonDisabled]}
                      onPress={() => handleCompleteRoute(route._id)}
                      disabled={isCompleting}
                    >
                      {isCompleting ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <>
                          <MaterialDesignIcons name="flag-checkered" size={18} color={COLORS.white} />
                          <Text style={styles.completeButtonText}>Complete</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <MaterialDesignIcons name="check-decagram" size={18} color={COLORS.success} />
                      <Text style={styles.completedBadgeText}>Departure Completed</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <DepartureModal
        visible={showDepartureModal}
        onCancel={() => { setShowDepartureModal(false); setActiveRouteId(null); }}
        onConfirm={handleConfirmDeparture}
        isConfirming={isConfirming}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    opacity: 0.9,
  },
  trackingBannerText: { flex: 1, fontSize: FONTSIZES.sm, fontWeight: '600', color: COLORS.white },

  content: { padding: SIZES.lg, gap: SIZES.md },
  loadingContainer: { paddingVertical: SIZES.xxl, alignItems: 'center' },

  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.xl,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  emptyTitle: { fontSize: FONTSIZES.lg, fontWeight: '600', color: COLORS.text, marginTop: SIZES.md, marginBottom: SIZES.xs },
  emptyText: { fontSize: FONTSIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SIZES.lg },
  addRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: RADIUS.md,
    gap: SIZES.sm,
  },
  addRouteButtonText: { color: COLORS.white, fontSize: FONTSIZES.md, fontWeight: '600' },

  routeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  routeCardActive: {
    borderColor: COLORS.accent + '60',
    // backgroundColor: COLORS.accent + '06',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  routeName: { fontSize: FONTSIZES.lg, fontWeight: '600', color: COLORS.text, flex: 1 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: RADIUS.full,
    gap: SIZES.xs,
  },
  statusActive:    { backgroundColor: COLORS.success   + '15' },
  statusLeaving:   { backgroundColor: COLORS.warning   + '15' },
  statusCompleted: { backgroundColor: COLORS.success   + '15' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive:    { backgroundColor: COLORS.success },
  statusDotLeaving:   { backgroundColor: COLORS.warning },
  statusDotCompleted: { backgroundColor: COLORS.success },
  statusText: { fontSize: FONTSIZES.sm, fontWeight: '500' },
  statusTextActive:    { color: COLORS.success },
  statusTextLeaving:   { color: COLORS.warning },
  statusTextCompleted: { color: COLORS.success },

  routePath: { flexDirection: 'row', marginBottom: SIZES.sm },
  routeIndicator: { alignItems: 'center', marginRight: SIZES.sm, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  dotDestination: { backgroundColor: COLORS.success },
  line: { width: 2, height: 24, backgroundColor: COLORS.border, marginVertical: 4 },
  routeInfo: { flex: 1, gap: SIZES.md },
  locationText: { fontSize: FONTSIZES.md, fontWeight: '500', color: COLORS.text },

  departureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 6,
    marginBottom: SIZES.md,
  },
  departureLabel:  { fontSize: FONTSIZES.sm, fontWeight: '600', color: COLORS.accent },
  departureValues: { fontSize: FONTSIZES.sm, color: COLORS.text, fontWeight: '500', flex: 1 },
  departureNone:   { fontSize: FONTSIZES.sm, color: COLORS.textMuted, flex: 1 },

  buttonRow: { gap: SIZES.sm },

  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
  },
  startButtonText: { color: COLORS.white, fontSize: FONTSIZES.sm, fontWeight: '600' },

  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
    ...SHADOWS.small,
  },
  completeButtonText: { color: COLORS.white, fontSize: FONTSIZES.sm, fontWeight: '700' },

  buttonDisabled: { opacity: 0.6 },

  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.success + '12',
    borderRadius: RADIUS.md,
    paddingVertical: SIZES.sm,
  },
  completedBadgeText: { fontSize: FONTSIZES.sm, fontWeight: '600', color: COLORS.success },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: SIZES.lg },
  sheet: { width: '100%', backgroundColor: COLORS.background, borderRadius: RADIUS.xl, padding: SIZES.lg, ...SHADOWS.large },
  header: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.lg },
  headerIcon: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONTSIZES.xl, fontWeight: '700', color: COLORS.text },
  sectionLabel: { fontSize: FONTSIZES.sm, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SIZES.sm },
  datePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SIZES.sm, paddingHorizontal: SIZES.sm, marginBottom: SIZES.lg },
  arrowBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm, backgroundColor: COLORS.border },
  dateDisplay: { alignItems: 'center', flex: 1 },
  dateText: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.text },
  todayPill: { marginTop: 3, backgroundColor: COLORS.accent + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  todayText: { fontSize: FONTSIZES.xs, color: COLORS.accent, fontWeight: '600' },
  timePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.md, marginBottom: SIZES.lg },
  timeColumn: { alignItems: 'center', gap: SIZES.xs },
  timeArrow: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm, backgroundColor: COLORS.accent + '10' },
  timeBox: { width: 72, height: 60, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  timeValue: { fontSize: FONTSIZES.xxxl, fontWeight: '700', color: COLORS.text },
  colon: { fontSize: FONTSIZES.xxxl, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8 },
  periodBox: { backgroundColor: COLORS.accent, paddingHorizontal: SIZES.sm, paddingVertical: SIZES.xs, borderRadius: RADIUS.sm, alignSelf: 'center' },
  periodText: { fontSize: FONTSIZES.sm, fontWeight: '700', color: COLORS.white },
  preview: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SIZES.md, marginBottom: SIZES.lg },
  previewText: { flex: 1, fontSize: FONTSIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  previewHighlight: { fontWeight: '600', color: COLORS.text },
  actions: { flexDirection: 'row', gap: SIZES.md },
  cancelBtn: { flex: 1, height: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: FONTSIZES.md, color: COLORS.textSecondary, fontWeight: '500' },
  confirmBtn: { flex: 2, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.xs, ...SHADOWS.small },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.white },
});

export default ProviderRoutes;
