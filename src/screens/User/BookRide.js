import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import {
  COLORS,
  FONTSIZES,
  SIZES,
  RADIUS,
  SHADOWS,
} from '../../constants/theme';
import api from '../../config/api';
import { GOOGLE_MAPS_API_KEY } from '../../utils/Creds';
import { useSession } from '../../store/useSession';

// ─── helpers ──────────────────────────────────────────────────────────────────

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatKm = km =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

const todayDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const format12h = time => {
  const [h, min] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
};

// ─── sub-components ──────────────────────────────────────────────────────────

const LocationRow = ({
  icon,
  iconColor,
  label,
  value,
  loading,
  onPress,
  isMatch,
}) => (
  <TouchableOpacity
    style={[styles.locationRow, isMatch && styles.locationRowMatch]}
    onPress={onPress}
    disabled={!onPress || loading}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.locationDot, { backgroundColor: iconColor }]}>
      <MaterialDesignIcons name={icon} size={14} color={COLORS.white} />
    </View>
    <View style={styles.locationInfo}>
      <Text style={styles.locationLabel}>{label}</Text>
      {loading ? (
        <View style={styles.locatingRow}>
          <ActivityIndicator
            size="small"
            color={COLORS.accent}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.locatingText}>Detecting location…</Text>
        </View>
      ) : (
        <Text style={styles.locationValue} numberOfLines={1}>
          {value || (onPress ? 'Tap to select destination' : '—')}
        </Text>
      )}
    </View>
    {isMatch && (
      <View style={styles.matchBadge}>
        <MaterialDesignIcons
          name="check-circle"
          size={16}
          color={COLORS.success}
        />
      </View>
    )}
    {onPress && !loading && (
      <MaterialDesignIcons
        name="chevron-right"
        size={20}
        color={COLORS.textMuted}
      />
    )}
  </TouchableOpacity>
);

const StopChip = ({ name, isPickup, isDropoff }) => (
  <View
    style={[
      styles.stopChip,
      isPickup && styles.stopChipPickup,
      isDropoff && styles.stopChipDropoff,
    ]}
  >
    {(isPickup || isDropoff) && (
      <MaterialDesignIcons
        name={isPickup ? 'map-marker' : 'flag-checkered'}
        size={12}
        color={isPickup ? COLORS.accent : COLORS.success}
        style={{ marginRight: 3 }}
      />
    )}
    <Text
      style={[
        styles.stopChipText,
        isPickup && styles.stopChipTextPickup,
        isDropoff && styles.stopChipTextDropoff,
      ]}
    >
      {name}
    </Text>
  </View>
);

const RouteCard = ({ route, onJoin }) => {
  const pickupMatch = route.pickupDistance !== undefined;
  const dropoffMatch = route.dropoffDistance !== undefined;

  const today = todayDateStr();
  const todayDepartures = (route.departures || []).filter(d => d.date === today);

  return (
    <View style={styles.routeCard}>
      {/* Route name + status */}
      <View style={styles.routeCardHeader}>
        <View style={styles.routeNameBadge}>
          <MaterialDesignIcons name="routes" size={14} color={COLORS.accent} />
          <Text style={styles.routeNameText} numberOfLines={1}>
            {route.routeName}
          </Text>
        </View>
        {route.isLeaving && (
          <View style={styles.leavingBadge}>
            <View style={styles.leavingDot} />
            <Text style={styles.leavingText}>Leaving soon</Text>
          </View>
        )}
      </View>

      {/* From → To */}
      <View style={styles.routePath}>
        <View style={styles.routeEndpoint}>
          <View style={[styles.endpointDot, styles.endpointDotFrom]} />
          <View style={styles.endpointText}>
            <Text style={styles.endpointLabel}>FROM</Text>
            <Text style={styles.endpointName} numberOfLines={1}>
              {route.from.name}
            </Text>
          </View>
          {pickupMatch && (
            <View style={styles.distancePill}>
              <MaterialDesignIcons
                name="map-marker-radius"
                size={11}
                color={COLORS.accent}
              />
              <Text style={styles.distancePillText}>
                {formatKm(route.pickupDistance)} away
              </Text>
            </View>
          )}
        </View>

        <View style={styles.pathLine}>
          <View style={styles.pathDash} />
          <MaterialDesignIcons
            name="arrow-down"
            size={14}
            color={COLORS.border}
          />
          <View style={styles.pathDash} />
        </View>

        <View style={styles.routeEndpoint}>
          <View style={[styles.endpointDot, styles.endpointDotTo]} />
          <View style={styles.endpointText}>
            <Text style={styles.endpointLabel}>TO</Text>
            <Text style={styles.endpointName} numberOfLines={1}>
              {route.to.name}
            </Text>
          </View>
          {dropoffMatch && (
            <View style={[styles.distancePill, styles.distancePillGreen]}>
              <MaterialDesignIcons
                name="map-marker-radius"
                size={11}
                color={COLORS.success}
              />
              <Text
                style={[styles.distancePillText, styles.distancePillTextGreen]}
              >
                {formatKm(route.dropoffDistance)} away
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stops */}
      {route.stops && route.stops.length > 0 && (
        <View style={styles.stopsSection}>
          <Text style={styles.stopsLabel}>
            <MaterialDesignIcons
              name="map-marker-multiple"
              size={13}
              color={COLORS.textSecondary}
            />
            {'  '}Stops
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stopsScroll}
          >
            {route.stops.map((stop, idx) => (
              <StopChip
                key={stop._id || idx}
                name={stop.stopName}
                isPickup={idx === 0}
                isDropoff={idx === route.stops.length - 1}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Today's departure */}
      <View style={styles.departureRow}>
        <MaterialDesignIcons
          name={todayDepartures.length > 0 ? 'clock-fast' : 'clock-outline'}
          size={14}
          color={todayDepartures.length > 0 ? COLORS.accent : COLORS.textMuted}
        />
        {todayDepartures.length > 0 ? (
          <Text style={styles.departureText}>
            {'Today: '}
            <Text style={styles.departureTime}>
              {todayDepartures.map(d => format12h(d.time)).join('  •  ')}
            </Text>
          </Text>
        ) : (
          <Text style={styles.departureNone}>No departure scheduled today</Text>
        )}
      </View>

      {/* Join button */}
      <TouchableOpacity
        style={styles.joinButton}
        onPress={() => onJoin(route)}
      >
        <MaterialDesignIcons
          name="car-arrow-right"
          size={18}
          color={COLORS.white}
        />
        <Text style={styles.joinButtonText}>Join Ride</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── main screen ─────────────────────────────────────────────────────────────

const BookRideScreen = ({ navigation }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const userCurrentLocation = useSession(state => state.currentLocation);
  const [places, setPlaces] = useState([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showPlaceModal, setShowPlaceModal] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // stop selection + ride creation
  const [showStopModal, setShowStopModal] = useState(false);
  const [joiningRoute, setJoiningRoute] = useState(null);
  const [pickupStop, setPickupStop] = useState(null);
  const [dropoffStop, setDropoffStop] = useState(null);
  const [stopStep, setStopStep] = useState('pickup'); // 'pickup' | 'dropoff'
  const [isJoining, setIsJoining] = useState(false);

  // ── location ────────────────────────────────────────────────────────────────

  const requestAndGetLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);

    try {
      let name = `${userCurrentLocation[1].toFixed(
        5,
      )}, ${userCurrentLocation[0].toFixed(5)}`;
      try {
        const resp = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${userCurrentLocation[1]},${userCurrentLocation[0]}&key=${GOOGLE_MAPS_API_KEY}`,
        );
        const data = await resp.json();
        if (data.status === 'OK' && data.results?.length > 0) {
          name = data.results[0].formatted_address;
        }
      } catch (_) {}

      setCurrentLocation({
        lat: userCurrentLocation[1],
        lng: userCurrentLocation[0],
        name,
      });
      setIsLocating(false);
    } catch (err) {
      setLocationError('Location unavailable. Tap to retry.');
      setIsLocating(false);
    }
  }, []);

  // ── saved places ────────────────────────────────────────────────────────────

  const fetchPlaces = useCallback(async () => {
    setIsLoadingPlaces(true);
    try {
      const res = await api.get('/places');
      if (res.data.success) setPlaces(res.data.places);
    } catch (err) {
      console.log('Error fetching places:', err);
    } finally {
      setIsLoadingPlaces(false);
    }
  }, []);

  useEffect(() => {
    requestAndGetLocation();
    fetchPlaces();
  }, [requestAndGetLocation, fetchPlaces]);

  // ── route search ────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!currentLocation || !selectedPlace) return;

    setIsSearching(true);
    setHasSearched(false);

    try {
      const { lat: pLat, lng: pLng } = currentLocation;
      const { lat: dLat, lng: dLng } = selectedPlace.location.coordinates;

      const res = await api.get('/routes/search', {
        params: {
          pickup_lat: pLat,
          pickup_lng: pLng,
          dropoff_lat: dLat,
          dropoff_lng: dLng,
          radius: 10,
        },
      });

      if (res.data.success) {
        setRoutes(res.data.routes);
      }
    } catch (err) {
      console.log('Route search error:', err);
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to search routes',
      );
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  }, [currentLocation, selectedPlace]);

  // Auto-search when both locations are ready
  useEffect(() => {
    if (currentLocation && selectedPlace) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlace]);

  // ── join ────────────────────────────────────────────────────────────────────

  const handleJoinRide = route => {
    setJoiningRoute(route);
    setPickupStop(null);
    setDropoffStop(null);
    setStopStep('pickup');
    setShowStopModal(true);
  };

  const handleConfirmJoin = async () => {
    if (!joiningRoute || !pickupStop || !dropoffStop) return;
    setIsJoining(true);
    try {
      const res = await api.post('/rides', {
        routeId: joiningRoute._id,
        pickupStop,
        dropoffStop,
      });
      if (res.data.success) {
        setShowStopModal(false);
        setJoiningRoute(null);
        setPickupStop(null);
        setDropoffStop(null);
        navigation.navigate('RideDetails', { ride: res.data.ride });
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to join ride');
    } finally {
      setIsJoining(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  const canSearch = currentLocation && selectedPlace && !isLocating;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialDesignIcons
            name="arrow-left"
            size={24}
            color={COLORS.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Ride</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Location selector card */}
        <View style={styles.locationCard}>
          <View style={styles.locationConnector} />

          <LocationRow
            icon="crosshairs-gps"
            iconColor={COLORS.accent}
            label="Pickup"
            value={currentLocation?.name}
            loading={isLocating}
            onPress={locationError ? requestAndGetLocation : null}
          />

          {locationError && (
            <TouchableOpacity
              style={styles.retryRow}
              onPress={requestAndGetLocation}
            >
              <MaterialDesignIcons
                name="refresh"
                size={14}
                color={COLORS.error}
              />
              <Text style={styles.retryText}>{locationError}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <LocationRow
            icon="flag-checkered"
            iconColor={COLORS.success}
            label="Destination"
            value={
              selectedPlace
                ? `${selectedPlace.title} — ${selectedPlace.location.name}`
                : null
            }
            loading={false}
            onPress={() => setShowPlaceModal(true)}
          />
        </View>

        {/* Search button */}
        <TouchableOpacity
          style={[styles.searchBtn, !canSearch && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={!canSearch || isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <MaterialDesignIcons
                name="magnify"
                size={20}
                color={COLORS.white}
              />
              <Text style={styles.searchBtnText}>Find Rides</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Results */}
        {isSearching ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.stateText}>Searching for routes…</Text>
          </View>
        ) : hasSearched && routes.length === 0 ? (
          <View style={styles.centeredState}>
            <View style={styles.emptyIconWrap}>
              <MaterialDesignIcons
                name="car-off"
                size={48}
                color={COLORS.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>No routes found</Text>
            <Text style={styles.emptySubtitle}>
              No active rides pass through both your locations.{'\n'}Try
              adjusting your destination.
            </Text>
          </View>
        ) : routes.length > 0 ? (
          <View>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {routes.length} route{routes.length !== 1 ? 's' : ''} found
              </Text>
              <Text style={styles.resultsSub}>Sorted by nearest pickup</Text>
            </View>
            {routes.map(route => (
              <RouteCard
                key={route._id}
                route={route}
                onJoin={handleJoinRide}
              />
            ))}
          </View>
        ) : !hasSearched &&
          !isSearching &&
          canSearch ? null /* Idle state — waiting for inputs */ : !isLocating &&
          !currentLocation ? null : (
          <View style={styles.centeredState}>
            <MaterialDesignIcons
              name="map-search"
              size={48}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>Choose your destination</Text>
            <Text style={styles.emptySubtitle}>
              Select a saved place above to search for available rides.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Stop selector modal — pickup + dropoff tabs */}
      <Modal
        visible={showStopModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStopModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Stops</Text>
              <TouchableOpacity onPress={() => setShowStopModal(false)}>
                <MaterialDesignIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.stopTabs}>
              {[
                { key: 'pickup',  label: 'Pickup',  icon: 'map-marker',      color: COLORS.accent  },
                { key: 'dropoff', label: 'Drop-off', icon: 'flag-checkered', color: COLORS.success },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.stopTab, stopStep === tab.key && { borderBottomColor: tab.color, borderBottomWidth: 2 }]}
                  onPress={() => setStopStep(tab.key)}
                >
                  <MaterialDesignIcons
                    name={tab.icon}
                    size={16}
                    color={stopStep === tab.key ? tab.color : COLORS.textMuted}
                  />
                  <Text style={[styles.stopTabText, stopStep === tab.key && { color: tab.color }]}>
                    {tab.label}
                  </Text>
                  {(tab.key === 'pickup' ? pickupStop : dropoffStop) ? (
                    <View style={[styles.stopTabDot, { backgroundColor: tab.color }]} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>

            {/* Stop list for active tab */}
            <FlatList
              data={[
                { id: '__from', name: joiningRoute?.from?.name, isTerminus: true },
                ...(joiningRoute?.stops || []).map((s, i) => ({
                  id: s._id || `s${i}`,
                  name: s.stopName,
                  isTerminus: false,
                })),
                { id: '__to', name: joiningRoute?.to?.name, isTerminus: true },
              ]}
              keyExtractor={item => item.id}
              style={{ flexGrow: 0, maxHeight: 260 }}
              contentContainerStyle={{ paddingBottom: SIZES.sm }}
              renderItem={({ item }) => {
                const isPickupActive = stopStep === 'pickup' && pickupStop === item.name;
                const isDropoffActive = stopStep === 'dropoff' && dropoffStop === item.name;
                const isActive = isPickupActive || isDropoffActive;
                const activeColor = stopStep === 'pickup' ? COLORS.accent : COLORS.success;
                const isPickupMarked  = stopStep !== 'pickup'  && pickupStop  === item.name;
                const isDropoffMarked = stopStep !== 'dropoff' && dropoffStop === item.name;
                return (
                  <TouchableOpacity
                    style={[styles.placeItem, isActive && { backgroundColor: activeColor + '10' }]}
                    onPress={() => {
                      if (stopStep === 'pickup') {
                        setPickupStop(item.name);
                        setStopStep('dropoff');
                      } else {
                        setDropoffStop(item.name);
                      }
                    }}
                  >
                    <View style={[
                      styles.placeItemIcon,
                      isActive && { backgroundColor: activeColor },
                    ]}>
                      <MaterialDesignIcons
                        name={item.isTerminus ? 'map-marker' : 'bus-stop'}
                        size={18}
                        color={isActive ? COLORS.white : COLORS.accent}
                      />
                    </View>
                    <Text style={[styles.placeItemTitle, isActive && { color: activeColor }]}>
                      {item.name}
                    </Text>
                    {isActive && (
                      <MaterialDesignIcons name="check-circle" size={20} color={activeColor} />
                    )}
                    {/* Show a small tag if this stop is already chosen for the other slot */}
                    {(isPickupMarked || isDropoffMarked) && !isActive && (
                      <View style={[styles.otherStopTag, { backgroundColor: (isPickupMarked ? COLORS.accent : COLORS.success) + '20' }]}>
                        <Text style={[styles.otherStopTagText, { color: isPickupMarked ? COLORS.accent : COLORS.success }]}>
                          {isPickupMarked ? 'Pickup' : 'Drop-off'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {/* Selection summary */}
            <View style={styles.stopSummary}>
              <View style={styles.stopSummaryRow}>
                <View style={[styles.stopSummaryDot, { backgroundColor: COLORS.accent }]} />
                <Text style={styles.stopSummaryLabel}>Pickup:</Text>
                <Text style={[styles.stopSummaryValue, !pickupStop && styles.stopSummaryEmpty]}>
                  {pickupStop || 'Not selected'}
                </Text>
              </View>
              <View style={styles.stopSummaryConnector} />
              <View style={styles.stopSummaryRow}>
                <View style={[styles.stopSummaryDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.stopSummaryLabel}>Drop-off:</Text>
                <Text style={[styles.stopSummaryValue, !dropoffStop && styles.stopSummaryEmpty]}>
                  {dropoffStop || 'Not selected'}
                </Text>
              </View>
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[
                styles.searchBtn,
                { marginHorizontal: SIZES.lg, marginBottom: SIZES.lg, marginTop: SIZES.sm },
                (!pickupStop || !dropoffStop || isJoining) && styles.searchBtnDisabled,
              ]}
              onPress={handleConfirmJoin}
              disabled={!pickupStop || !dropoffStop || isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <MaterialDesignIcons name="car-arrow-right" size={20} color={COLORS.white} />
                  <Text style={styles.searchBtnText}>Confirm Ride</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Place selector modal */}
      <Modal
        visible={showPlaceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPlaceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Destination</Text>
              <TouchableOpacity onPress={() => setShowPlaceModal(false)}>
                <MaterialDesignIcons
                  name="close"
                  size={24}
                  color={COLORS.text}
                />
              </TouchableOpacity>
            </View>

            {isLoadingPlaces ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={COLORS.accent} />
              </View>
            ) : places.length === 0 ? (
              <View style={styles.modalEmpty}>
                <MaterialDesignIcons
                  name="map-marker-plus"
                  size={40}
                  color={COLORS.textMuted}
                />
                <Text style={styles.modalEmptyText}>No saved places yet.</Text>
                <Text style={styles.modalEmptySubText}>
                  Save places from the dashboard first.
                </Text>
              </View>
            ) : (
              <FlatList
                data={places}
                keyExtractor={item => item._id}
                contentContainerStyle={{ paddingBottom: SIZES.xl }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.placeItem,
                      selectedPlace?._id === item._id && styles.placeItemActive,
                    ]}
                    onPress={() => {
                      setSelectedPlace(item);
                      setShowPlaceModal(false);
                    }}
                  >
                    <View
                      style={[
                        styles.placeItemIcon,
                        selectedPlace?._id === item._id &&
                          styles.placeItemIconActive,
                      ]}
                    >
                      <MaterialDesignIcons
                        name="map-marker"
                        size={20}
                        color={
                          selectedPlace?._id === item._id
                            ? COLORS.white
                            : COLORS.accent
                        }
                      />
                    </View>
                    <View style={styles.placeItemInfo}>
                      <Text style={styles.placeItemTitle}>{item.title}</Text>
                      <Text style={styles.placeItemAddress} numberOfLines={1}>
                        {item.location.name}
                      </Text>
                    </View>
                    {selectedPlace?._id === item._id && (
                      <MaterialDesignIcons
                        name="check-circle"
                        size={20}
                        color={COLORS.accent}
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONTSIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xxl,
  },

  // ── location card
  locationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  locationConnector: {
    position: 'absolute',
    left: 31,
    top: 50,
    bottom: 50,
    width: 2,
    backgroundColor: COLORS.border,
    zIndex: 0,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    gap: SIZES.md,
  },
  locationRowMatch: {
    backgroundColor: COLORS.success + '08',
  },
  locationDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: FONTSIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  locationValue: {
    fontSize: FONTSIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  locatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locatingText: {
    fontSize: FONTSIZES.md,
    color: COLORS.textMuted,
  },
  matchBadge: {
    marginRight: SIZES.xs,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.sm,
  },
  retryText: {
    fontSize: FONTSIZES.sm,
    color: COLORS.error,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SIZES.md + 28 + SIZES.md,
  },

  // ── search button
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    height: 52,
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
    ...SHADOWS.medium,
  },
  searchBtnDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.6,
  },
  searchBtnText: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },

  // ── results header
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  resultsTitle: {
    fontSize: FONTSIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultsSub: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textMuted,
  },

  // ── route card
  routeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  routeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  routeNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    backgroundColor: COLORS.accent + '12',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    flexShrink: 1,
  },
  routeNameText: {
    fontSize: FONTSIZES.sm,
    fontWeight: '600',
    color: COLORS.accent,
    flexShrink: 1,
  },
  leavingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  leavingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.warning,
  },
  leavingText: {
    fontSize: FONTSIZES.xs,
    fontWeight: '600',
    color: COLORS.warning,
  },

  // path
  routePath: {
    marginBottom: SIZES.md,
  },
  routeEndpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  endpointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  endpointDotFrom: {
    backgroundColor: COLORS.accent,
  },
  endpointDotTo: {
    backgroundColor: COLORS.success,
  },
  endpointText: {
    flex: 1,
  },
  endpointLabel: {
    fontSize: FONTSIZES.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  endpointName: {
    fontSize: FONTSIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.accent + '12',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  distancePillGreen: {
    backgroundColor: COLORS.success + '12',
  },
  distancePillText: {
    fontSize: FONTSIZES.xs,
    fontWeight: '600',
    color: COLORS.accent,
  },
  distancePillTextGreen: {
    color: COLORS.success,
  },
  pathLine: {
    alignItems: 'center',
    paddingLeft: 5,
    marginVertical: 2,
  },
  pathDash: {
    width: 1,
    height: 6,
    backgroundColor: COLORS.border,
  },

  // stops
  stopsSection: {
    marginBottom: SIZES.md,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stopsLabel: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: SIZES.sm,
  },
  stopsScroll: {
    gap: SIZES.sm,
    paddingRight: SIZES.md,
  },
  stopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 5,
  },
  stopChipPickup: {
    backgroundColor: COLORS.accent + '15',
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  stopChipDropoff: {
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  stopChipText: {
    fontSize: FONTSIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  stopChipTextPickup: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  stopChipTextDropoff: {
    color: COLORS.success,
    fontWeight: '600',
  },

  // departure row
  departureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 7,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  departureText: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  departureTime: {
    fontWeight: '700',
    color: COLORS.accent,
  },
  departureNone: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textMuted,
    flex: 1,
  },

  // join button
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SIZES.sm + 2,
    gap: SIZES.sm,
    ...SHADOWS.small,
  },
  joinButtonText: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },

  // ── states
  centeredState: {
    alignItems: 'center',
    paddingVertical: SIZES.xxl,
    gap: SIZES.sm,
  },
  stateText: {
    fontSize: FONTSIZES.md,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: FONTSIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: FONTSIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SIZES.lg,
  },

  // ── place selector modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '75%',
    paddingBottom: SIZES.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    alignSelf: 'center',
    marginTop: SIZES.sm,
    marginBottom: SIZES.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SIZES.sm,
  },
  modalTitle: {
    fontSize: FONTSIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalLoading: {
    paddingVertical: SIZES.xxl,
    alignItems: 'center',
  },
  modalEmpty: {
    paddingVertical: SIZES.xxl,
    alignItems: 'center',
    gap: SIZES.sm,
  },
  modalEmptyText: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalEmptySubText: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    gap: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  placeItemActive: {
    backgroundColor: COLORS.accent + '08',
  },
  placeItemIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeItemIconActive: {
    backgroundColor: COLORS.accent,
  },
  placeItemInfo: {
    flex: 1,
  },
  placeItemTitle: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  placeItemAddress: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
  },

  // ── stop tab styles
  stopTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SIZES.xs,
  },
  stopTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SIZES.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  stopTabText: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stopTabDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // ── other-slot tag on stop list item
  otherStopTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  otherStopTagText: {
    fontSize: FONTSIZES.xs,
    fontWeight: '600',
  },

  // ── stop selection summary
  stopSummary: {
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
  },
  stopSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  stopSummaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stopSummaryConnector: {
    width: 2,
    height: 14,
    backgroundColor: COLORS.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  stopSummaryLabel: {
    fontSize: FONTSIZES.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    width: 58,
  },
  stopSummaryValue: {
    fontSize: FONTSIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  stopSummaryEmpty: {
    color: COLORS.textMuted,
    fontWeight: '400',
  },
});

export default BookRideScreen;
