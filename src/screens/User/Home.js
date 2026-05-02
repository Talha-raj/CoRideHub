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
import { useFocusEffect } from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useAuthStore } from '../../store/authStore';
import {
  COLORS,
  FONTSIZES,
  SIZES,
  RADIUS,
  SHADOWS,
} from '../../constants/theme';
import api from '../../config/api';
import { responsiveFont } from '../../utils/responsive';

const RIDE_STATUS_CFG = {
  OnTheWay: {
    color: COLORS.accent,
    icon: 'car-arrow-right',
    label: 'Driver On The Way',
  },
  InProgress: {
    color: COLORS.warning,
    icon: 'car-speed-limiter',
    label: 'Trip In Progress',
  },
};

const UserDashboard = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const [places, setPlaces] = useState([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [activeRides, setActiveRides] = useState([]);

  const fetchActiveRides = useCallback(async () => {
    try {
      const res = await api.get('/rides/user');
      if (res.data.success) {
        const active = res.data.rides.filter(
          r =>
            r.rideRequestStatus !== 'Rejected' && r.rideStatus !== 'Completed',
        );
        setActiveRides(active);
      }
    } catch (err) {
      console.log('Error fetching rides:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActiveRides();
    }, [fetchActiveRides]),
  );

  useFocusEffect(
    useCallback(() => {
      // 1. Logic to run when screen gains focus (e.g., fetch data)
      fetchPlaces();

      return () => {
        // 2. Optional cleanup when screen loses focus or unmounts
      };
    }, []), // Dependencies for your effect
  );
  const fetchPlaces = async () => {
    try {
      const response = await api.get('/places');
      if (response.data.success) {
        setPlaces(response.data.places);
      }
    } catch (error) {
      console.log('Error fetching places:', error);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigation.replace('Login');
  };

  const recentRides = [
    { id: 1, from: 'Downtown', to: 'Airport', date: 'Today', price: '$24' },
    { id: 2, from: 'Home', to: 'Office', date: 'Yesterday', price: '$12' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <MaterialDesignIcons
              name="account"
              size={28}
              color={COLORS.white}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.greeting}>Good Morning</Text>
            <Text style={styles.userName}>{user?.name || 'Rider'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialDesignIcons
            name="bell-outline"
            size={24}
            color={COLORS.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Active ride cards */}
        {activeRides.map(ride => {
          const cfg =
            RIDE_STATUS_CFG[ride.rideStatus] || RIDE_STATUS_CFG.OnTheWay;
          console.log(ride);
          return (
            <TouchableOpacity
              key={ride._id}
              style={[styles.activeRideCard, { borderColor: cfg.color + '40' }]}
              onPress={() => navigation.navigate('RideDetails', { ride })}
            >
              <View
                style={[
                  styles.activeRideIcon,
                  { backgroundColor: cfg.color + '15' },
                ]}
              >
                <MaterialDesignIcons
                  name={cfg.icon}
                  size={22}
                  color={cfg.color}
                />
              </View>
              <View style={styles.activeRideInfo}>
                <Text style={[styles.activeRideStatus, { color: cfg.color }]}>
                  {ride?.rideRequestStatus === 'Pending'
                    ? 'Trip Request Send'
                    : cfg.label}
                </Text>
                <Text style={styles.activeRideRoute} numberOfLines={1}>
                  {ride.routeId?.from?.name} → {ride.routeId?.to?.name}
                </Text>
                <Text style={styles.activeRideStop}>
                  Stop: {ride.selectedStop}
                </Text>
              </View>
              <MaterialDesignIcons
                name="chevron-right"
                size={20}
                color={cfg.color}
              />
            </TouchableOpacity>
          );
        })}

        <View style={styles.actionCards}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('BookRide')}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: COLORS.accent + '15' },
              ]}
            >
              <MaterialDesignIcons
                name="map-marker"
                size={28}
                color={COLORS.accent}
              />
            </View>
            <Text style={styles.actionTitle}>Book a Ride</Text>
            <Text style={styles.actionSubtitle}>Find nearby drivers</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: COLORS.success + '15' },
              ]}
            >
              <MaterialDesignIcons
                name="calendar"
                size={28}
                color={COLORS.success}
              />
            </View>
            <Text style={styles.actionTitle}>Schedule</Text>
            <Text style={styles.actionSubtitle}>Plan ahead</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Rides</Text>
          {recentRides.map(ride => (
            <View key={ride.id} style={styles.rideCard}>
              <View style={styles.rideIconContainer}>
                <MaterialDesignIcons
                  name="car"
                  size={20}
                  color={COLORS.accent}
                />
              </View>
              <View style={styles.rideInfo}>
                <View style={styles.rideRoute}>
                  <Text style={styles.locationText}>{ride.from}</Text>
                  <MaterialDesignIcons
                    name="arrow-right"
                    size={16}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.locationText}>{ride.to}</Text>
                </View>
                <Text style={styles.rideDate}>{ride.date}</Text>
              </View>
              <Text style={styles.ridePrice}>{ride.price}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved Places</Text>
            <TouchableOpacity
              style={styles.addPlaceButton}
              onPress={() => navigation.navigate('SavePlace')}
            >
              <MaterialDesignIcons
                name="plus"
                size={20}
                color={COLORS.accent}
              />
            </TouchableOpacity>
          </View>

          {isLoadingPlaces ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          ) : places.length > 0 ? (
            <>
              <View style={styles.savedPlaces}>
                {places.slice(0, 2).map(place => (
                  <TouchableOpacity
                    key={place._id}
                    style={styles.savedPlaceItem}
                    onPress={() => navigation.navigate('ViewAllPlaces')}
                  >
                    <View style={styles.savedPlaceIcon}>
                      <MaterialDesignIcons
                        name="map-marker"
                        size={20}
                        color={COLORS.accent}
                      />
                    </View>
                    <View style={styles.savedPlaceInfo}>
                      <Text style={styles.savedPlaceTitle}>{place.title}</Text>
                      <Text style={styles.savedPlaceAddress} numberOfLines={1}>
                        {place.location.name}
                      </Text>
                    </View>
                    <MaterialDesignIcons
                      name="chevron-right"
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {places.length > 2 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('ViewAllPlaces')}
                >
                  <Text style={styles.viewAllText}>
                    View All ({places.length})
                  </Text>
                  <MaterialDesignIcons
                    name="chevron-right"
                    size={16}
                    color={COLORS.accent}
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={styles.saveLocationButton}
              onPress={() => navigation.navigate('SavePlace')}
            >
              <MaterialDesignIcons
                name="map-marker-plus"
                size={24}
                color={COLORS.accent}
              />
              <Text style={styles.saveLocationText}>Save Location</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialDesignIcons name="logout" size={20} color={COLORS.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: SIZES.md,
  },
  greeting: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: FONTSIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  actionCards: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.lg,
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.lg,
    ...SHADOWS.small,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  actionTitle: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: FONTSIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  addPlaceButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingVertical: SIZES.lg,
    alignItems: 'center',
  },
  rideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    ...SHADOWS.small,
  },
  rideIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  rideInfo: {
    flex: 1,
  },
  rideRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    marginBottom: 4,
  },
  locationText: {
    fontSize: FONTSIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  rideDate: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
  },
  ridePrice: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.accent,
  },
  savedPlaces: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  savedPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  savedPlaceIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  savedPlaceInfo: {
    flex: 1,
  },
  savedPlaceTitle: {
    fontSize: FONTSIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  savedPlaceAddress: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
  },
  savedPlaceText: {
    flex: 1,
    fontSize: FONTSIZES.md,
    color: COLORS.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    marginTop: SIZES.sm,
    gap: SIZES.xs,
  },
  viewAllText: {
    fontSize: FONTSIZES.md,
    color: COLORS.accent,
    fontWeight: '500',
  },
  saveLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.xl,
    gap: SIZES.sm,
    borderWidth: 2,
    borderColor: COLORS.accent + '30',
    borderStyle: 'dashed',
  },
  saveLocationText: {
    fontSize: FONTSIZES.md,
    color: COLORS.accent,
    fontWeight: '500',
  },
  activeRideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    gap: SIZES.md,
    borderWidth: 1,
    ...SHADOWS.small,
    marginBottom: responsiveFont(10),
  },
  activeRideIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRideInfo: { flex: 1 },
  activeRideStatus: {
    fontSize: FONTSIZES.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  activeRideRoute: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  activeRideStop: { fontSize: FONTSIZES.xs, color: COLORS.textMuted },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
    paddingVertical: SIZES.md,
    gap: SIZES.sm,
  },
  logoutText: {
    fontSize: FONTSIZES.md,
    color: COLORS.error,
    fontWeight: '500',
  },
});

export default UserDashboard;
