import Geolocation from '@react-native-community/geolocation';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from './src/store/authStore';
import { COLORS } from './src/constants/theme';

import LoginScreen from './src/screens/Auth/Login';
import SignupScreen from './src/screens/Auth/Signup';
import UserDashboard from './src/screens/User/Home';
import ProviderDashboard from './src/screens/proider/Home';
import VehicleScreen from './src/screens/proider/vechicle';
import AddRouteScreen from './src/screens/proider/AddRoute';
import SavePlaceScreen from './src/screens/User/SavePlace';
import ViewAllPlacesScreen from './src/screens/User/ViewAllPlaces';
import BookRideScreen from './src/screens/User/BookRide';
import RideDetailsScreen from './src/screens/User/RideDetails';
import RequestDetailsScreen from './src/screens/proider/RequestDetails';
import ProviderRoutesScreen from './src/screens/proider/ProviderRoutes';
import { useSession } from './src/store/useSession';

const Stack = createNativeStackNavigator();

// ─── Navigation ───────────────────────────────────────────────────────────────

function Navigation() {
  const { isAuthenticated, user } = useAuthStore(state => state);

  const initialRoute = isAuthenticated
    ? user?.role === 'provider'
      ? 'ProviderDashboard'
      : 'UserDashboard'
    : 'Login';

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Vehicle" component={VehicleScreen} />
        <Stack.Screen name="ProviderDashboard" component={ProviderDashboard} />
        <Stack.Screen name="AddRoute" component={AddRouteScreen} />
        <Stack.Screen name="UserDashboard" component={UserDashboard} />
        <Stack.Screen name="SavePlace" component={SavePlaceScreen} />
        <Stack.Screen name="ViewAllPlaces" component={ViewAllPlacesScreen} />
        <Stack.Screen name="BookRide" component={BookRideScreen} />
        <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
        <Stack.Screen name="RequestDetails" component={RequestDetailsScreen} />
        <Stack.Screen name="ProviderRoutes" component={ProviderRoutesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());
  const setCurrentLocation = useSession(state => state.setCurrentLocation);
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    const timeout = setTimeout(() => setHydrated(true), 1000);
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      ({ coords }) => setCurrentLocation([coords.longitude, coords.latitude]),
      error => console.log(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, []);

  if (!hydrated) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: COLORS.background,
          }}
        >
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Navigation />
    </SafeAreaProvider>
  );
}
