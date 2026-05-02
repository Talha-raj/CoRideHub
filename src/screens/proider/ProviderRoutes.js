import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTSIZES, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import api from '../../config/api';

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

// ─── Departure Modal ─────────────────────────────────────────────────────────

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

  const changeDay = delta =>
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });

  const changeHour = delta => setHour(h => (h + delta + 24) % 24);
  const changeMinute = delta => setMinute(m => (m + delta + 60) % 60);

  const handleConfirm = () =>
    onConfirm({ date: toDateStr(selectedDate), time: `${pad(hour)}:${pad(minute)}` });

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
                <View style={mStyles.todayPill}>
                  <Text style={mStyles.todayText}>Today</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={mStyles.arrowBtn} onPress={() => changeDay(1)}>
              <MaterialDesignIcons name="chevron-right" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={mStyles.sectionLabel}>Time</Text>
          <View style={mStyles.timePicker}>
            <View style={mStyles.timeColumn}>
              <TouchableOpacity style={mStyles.timeArrow} onPress={() => changeHour(1)}>
                <MaterialDesignIcons name="chevron-up" size={28} color={COLORS.accent} />
              </TouchableOpacity>
              <View style={mStyles.timeBox}>
                <Text style={mStyles.timeValue}>{pad(hour)}</Text>
              </View>
              <TouchableOpacity style={mStyles.timeArrow} onPress={() => changeHour(-1)}>
                <MaterialDesignIcons name="chevron-down" size={28} color={COLORS.accent} />
              </TouchableOpacity>
            </View>

            <Text style={mStyles.colon}>:</Text>

            <View style={mStyles.timeColumn}>
              <TouchableOpacity style={mStyles.timeArrow} onPress={() => changeMinute(5)}>
                <MaterialDesignIcons name="chevron-up" size={28} color={COLORS.accent} />
              </TouchableOpacity>
              <View style={mStyles.timeBox}>
                <Text style={mStyles.timeValue}>{pad(minute)}</Text>
              </View>
              <TouchableOpacity style={mStyles.timeArrow} onPress={() => changeMinute(-5)}>
                <MaterialDesignIcons name="chevron-down" size={28} color={COLORS.accent} />
              </TouchableOpacity>
            </View>

            <View style={mStyles.periodBox}>
              <Text style={mStyles.periodText}>{hour >= 12 ? 'PM' : 'AM'}</Text>
            </View>
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
                  <MaterialDesignIcons name="check" size={18} color={COLORS.white} />
                  <Text style={mStyles.confirmText}>Confirm</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── screen ───────────────────────────────────────────────────────────────────

const ProviderRoutes = ({ navigation }) => {
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState({});
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/routes');
      if (res.data.success) {
        setRoutes(res.data.routes);
        const leavingState = {};
        res.data.routes.forEach(r => { leavingState[r._id] = r.isLeaving; });
        setIsLeaving(leavingState);
      }
    } catch (err) {
      console.log('Error fetching routes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const handleStartLeaving = routeId => {
    setActiveRouteId(routeId);
    setShowDepartureModal(true);
  };

  const handleConfirmDeparture = async ({ date, time }) => {
    if (!activeRouteId) return;
    setIsConfirming(true);
    try {
      const res = await api.post(`/routes/${activeRouteId}/departure`, { date, time });
      if (res.data.success) {
        setRoutes(prev => prev.map(r => r._id === activeRouteId ? res.data.route : r));
        setIsLeaving(prev => ({ ...prev, [activeRouteId]: true }));
        setShowDepartureModal(false);
        setActiveRouteId(null);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to schedule departure. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelLeaving = async routeId => {
    try {
      const res = await api.patch(`/routes/${routeId}/leaving`);
      if (res.data.success) {
        setIsLeaving(prev => ({ ...prev, [routeId]: res.data.route.isLeaving }));
        setRoutes(prev => prev.map(r => r._id === routeId ? res.data.route : r));
      }
    } catch (err) {
      console.log('Error updating leaving status:', err);
    }
  };

  const todayStr = toDateStr(new Date());

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Routes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddRoute')}>
          <MaterialDesignIcons name="plus" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

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
            <TouchableOpacity
              style={styles.addRouteButton}
              onPress={() => navigation.navigate('AddRoute')}
            >
              <MaterialDesignIcons name="plus" size={20} color={COLORS.white} />
              <Text style={styles.addRouteButtonText}>Add Route</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routes.map(route => {
            const leaving = isLeaving[route._id];
            const todayDepartures = (route.departures || []).filter(d => d.date === todayStr);
            return (
              <View key={route._id} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <Text style={styles.routeName}>{route.routeName}</Text>
                  <View style={[styles.statusBadge, leaving ? styles.statusLeaving : styles.statusActive]}>
                    <View style={[styles.statusDot, leaving ? styles.statusDotLeaving : styles.statusDotActive]} />
                    <Text style={[styles.statusText, leaving ? styles.statusTextLeaving : styles.statusTextActive]}>
                      {leaving ? 'Leaving' : 'Active'}
                    </Text>
                  </View>
                </View>

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

                <TouchableOpacity
                  style={[styles.leavingButton, leaving && styles.leavingButtonActive]}
                  onPress={() =>
                    leaving ? handleCancelLeaving(route._id) : handleStartLeaving(route._id)
                  }
                >
                  <MaterialDesignIcons
                    name={leaving ? 'car' : 'car-side'}
                    size={18}
                    color={COLORS.white}
                  />
                  <Text style={styles.leavingButtonText}>
                    {leaving ? 'On the Way (Cancel)' : 'Start Leaving'}
                  </Text>
                </TouchableOpacity>
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
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
  statusActive: { backgroundColor: COLORS.success + '15' },
  statusLeaving: { backgroundColor: COLORS.warning + '15' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: COLORS.success },
  statusDotLeaving: { backgroundColor: COLORS.warning },
  statusText: { fontSize: FONTSIZES.sm, fontWeight: '500' },
  statusTextActive: { color: COLORS.success },
  statusTextLeaving: { color: COLORS.warning },

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
  departureLabel: { fontSize: FONTSIZES.sm, fontWeight: '600', color: COLORS.accent },
  departureValues: { fontSize: FONTSIZES.sm, color: COLORS.text, fontWeight: '500', flex: 1 },
  departureNone: { fontSize: FONTSIZES.sm, color: COLORS.textMuted, flex: 1 },

  leavingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
  },
  leavingButtonActive: { backgroundColor: COLORS.warning },
  leavingButtonText: { color: COLORS.white, fontSize: FONTSIZES.sm, fontWeight: '600' },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────

const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
  },
  sheet: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    padding: SIZES.lg,
    ...SHADOWS.large,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.lg },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FONTSIZES.xl, fontWeight: '700', color: COLORS.text },
  sectionLabel: {
    fontSize: FONTSIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SIZES.sm,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
  },
  dateDisplay: { alignItems: 'center', flex: 1 },
  dateText: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.text },
  todayPill: {
    marginTop: 3,
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  todayText: { fontSize: FONTSIZES.xs, color: COLORS.accent, fontWeight: '600' },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  timeColumn: { alignItems: 'center', gap: SIZES.xs },
  timeArrow: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent + '10',
  },
  timeBox: {
    width: 72,
    height: 60,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: { fontSize: FONTSIZES.xxxl, fontWeight: '700', color: COLORS.text },
  colon: { fontSize: FONTSIZES.xxxl, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8 },
  periodBox: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'center',
  },
  periodText: { fontSize: FONTSIZES.sm, fontWeight: '700', color: COLORS.white },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
  },
  previewText: { flex: 1, fontSize: FONTSIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  previewHighlight: { fontWeight: '600', color: COLORS.text },
  actions: { flexDirection: 'row', gap: SIZES.md },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: FONTSIZES.md, color: COLORS.textSecondary, fontWeight: '500' },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.xs,
    ...SHADOWS.small,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: FONTSIZES.md, fontWeight: '600', color: COLORS.white },
});

export default ProviderRoutes;
