import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { COLORS, FONTSIZES, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import api from '../../config/api';

const ViewAllPlacesScreen = ({ navigation }) => {
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    try {
      const response = await api.get('/places');
      if (response.data.success) {
        setPlaces(response.data.places);
      }
    } catch (error) {
      console.log('Error fetching places:', error);
      Alert.alert('Error', 'Failed to load places');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlace = async (placeId) => {
    Alert.alert(
      'Delete Place',
      'Are you sure you want to delete this place?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/places/${placeId}`);
              setPlaces(places.filter((place) => place._id !== placeId));
            } catch (error) {
              console.log('Error deleting place:', error);
              Alert.alert('Error', 'Failed to delete place');
            }
          },
        },
      ],
    );
  };

  const handleEditPlace = (place) => {
    // TODO: Implement edit functionality
    Alert.alert('Edit', 'Edit functionality coming soon');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Saved Places</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Places</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('SavePlace')}
        >
          <MaterialDesignIcons name="plus" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {places.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialDesignIcons
              name="map-marker-off"
              size={64}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>No Saved Places</Text>
            <Text style={styles.emptySubtitle}>
              Save your favorite locations for quick access
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('SavePlace')}
            >
              <MaterialDesignIcons name="plus" size={20} color={COLORS.white} />
              <Text style={styles.emptyButtonText}>Add Your First Place</Text>
            </TouchableOpacity>
          </View>
        ) : (
          places.map((place) => (
            <View key={place._id} style={styles.placeCard}>
              <View style={styles.placeIcon}>
                <MaterialDesignIcons name="map-marker" size={24} color={COLORS.accent} />
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeTitle}>{place.title}</Text>
                <Text style={styles.placeAddress} numberOfLines={2}>
                  {place.location.name}
                </Text>
                {place.streetAddress && (
                  <Text style={styles.streetAddress} numberOfLines={1}>
                    {place.streetAddress}
                  </Text>
                )}
              </View>
              <View style={styles.placeActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditPlace(place)}
                >
                  <MaterialDesignIcons name="pencil" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeletePlace(place._id)}
                >
                  <MaterialDesignIcons name="delete" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONTSIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SIZES.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyTitle: {
    fontSize: FONTSIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.lg,
    marginBottom: SIZES.xs,
  },
  emptySubtitle: {
    fontSize: FONTSIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: RADIUS.md,
    gap: SIZES.sm,
    ...SHADOWS.medium,
  },
  emptyButtonText: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    ...SHADOWS.small,
  },
  placeIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  placeInfo: {
    flex: 1,
  },
  placeTitle: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  streetAddress: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textMuted,
  },
  placeActions: {
    flexDirection: 'row',
    gap: SIZES.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ViewAllPlacesScreen;
