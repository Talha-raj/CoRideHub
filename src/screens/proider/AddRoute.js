import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
  COLORS,
  FONTSIZES,
  SIZES,
  RADIUS,
  SHADOWS,
} from '../../constants/theme';
import api from '../../config/api';
import { useSession } from '../../store/useSession';
import MapPickerModal from '../../components/MapPickerModal';

const validationSchema = Yup.object().shape({
  routeName: Yup.string()
    .required('Route name is required')
    .min(3, 'Route name must be at least 3 characters')
    .max(50, 'Route name must not exceed 50 characters'),
});

const AddRouteScreen = ({ navigation }) => {
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [stops, setStops] = useState([]);
  const [showStopInput, setShowStopInput] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [stopSuggestions, setStopSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapFor, setMapFor] = useState(null); // 'from' | 'to'
  const userCurrentLocation = useSession(state => state.currentLocation);

  // ── Stops ──────────────────────────────────────────────────────────────────

  const handleSearchStops = async query => {
    setNewStopName(query);
    if (query.trim().length === 0) {
      setStopSuggestions([]);
      return;
    }
    try {
      const response = await api.get(`/stops/search?query=${query}`);
      if (response.data.success) setStopSuggestions(response.data.stops);
    } catch (error) {
      console.log('Error searching stops:', error);
    }
  };

  const handleAddStop = stopName => {
    if (stopName.trim() && !stops.includes(stopName)) {
      setStops([...stops, stopName]);
    }
    setNewStopName('');
    setStopSuggestions([]);
  };

  const handleRemoveStop = index => {
    setStops(stops.filter((_, i) => i !== index));
  };

  // ── Map picker ─────────────────────────────────────────────────────────────

  const handleLocationConfirm = location => {
    if (mapFor === 'from') setFromLocation(location);
    else setToLocation(location);
    setShowMapModal(false);
    setMapFor(null);
  };

  // ── Save route ─────────────────────────────────────────────────────────────

  const handleSaveRoute = async (values, { setFieldError }) => {
    if (!fromLocation) {
      Alert.alert('Error', 'Please select a from destination');
      return;
    }
    if (!toLocation) {
      Alert.alert('Error', 'Please select a to destination');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/routes', {
        routeName: values.routeName.trim(),
        from: fromLocation,
        to: toLocation,
        stops: stops || [],
      });

      if (response.data.success) {
        Alert.alert('Success', 'Route created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to create route');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create route',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Route</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Formik
        initialValues={{ routeName: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSaveRoute}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
          <ScrollView contentContainerStyle={styles.scrollContent}>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Route Name</Text>
              <TextInput
                style={[
                  styles.input,
                  touched.routeName && errors.routeName && styles.inputError,
                ]}
                placeholder="Enter route name"
                placeholderTextColor={COLORS.textMuted}
                value={values.routeName}
                onChangeText={handleChange('routeName')}
                onBlur={handleBlur('routeName')}
              />
              {touched.routeName && errors.routeName && (
                <Text style={styles.errorText}>{errors.routeName}</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>From Destination</Text>
              <TouchableOpacity
                style={[styles.locationButton, fromLocation && styles.locationButtonSelected]}
                onPress={() => { setMapFor('from'); setShowMapModal(true); }}
              >
                <MaterialDesignIcons
                  name="map-marker"
                  size={20}
                  color={fromLocation ? COLORS.accent : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.locationButtonText,
                    fromLocation && styles.locationButtonTextSelected,
                  ]}
                >
                  {fromLocation ? fromLocation.name : 'Select from destination'}
                </Text>
                <MaterialDesignIcons name="chevron-right" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>To Destination</Text>
              <TouchableOpacity
                style={[styles.locationButton, toLocation && styles.locationButtonSelected]}
                onPress={() => { setMapFor('to'); setShowMapModal(true); }}
              >
                <MaterialDesignIcons
                  name="map-marker"
                  size={20}
                  color={toLocation ? COLORS.accent : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.locationButtonText,
                    toLocation && styles.locationButtonTextSelected,
                  ]}
                >
                  {toLocation ? toLocation.name : 'Select to destination'}
                </Text>
                <MaterialDesignIcons name="chevron-right" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Stops</Text>
                {!showStopInput && (
                  <TouchableOpacity
                    style={styles.addStopButton}
                    onPress={() => setShowStopInput(true)}
                  >
                    <MaterialDesignIcons name="plus" size={16} color={COLORS.accent} />
                    <Text style={styles.addStopButtonText}>Add Stop</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showStopInput && (
                <View style={styles.stopInputContainer}>
                  <TextInput
                    style={styles.stopInput}
                    placeholder="Enter stop name"
                    placeholderTextColor={COLORS.textMuted}
                    value={newStopName}
                    onChangeText={handleSearchStops}
                    onSubmitEditing={() => handleAddStop(newStopName)}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.addStopConfirmButton}
                    onPress={() => handleAddStop(newStopName)}
                  >
                    <MaterialDesignIcons name="check" size={20} color={COLORS.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelStopButton}
                    onPress={() => {
                      setShowStopInput(false);
                      setNewStopName('');
                      setStopSuggestions([]);
                    }}
                  >
                    <MaterialDesignIcons name="close" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              {stopSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {stopSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleAddStop(suggestion)}
                    >
                      <MaterialDesignIcons
                        name="map-marker"
                        size={16}
                        color={COLORS.textMuted}
                      />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {stops.length > 0 && (
                <View style={styles.stopsList}>
                  {stops.map((stop, index) => (
                    <View key={index} style={styles.stopItem}>
                      <View style={styles.stopDot} />
                      <Text style={styles.stopText}>{stop}</Text>
                      <TouchableOpacity
                        style={styles.removeStopButton}
                        onPress={() => handleRemoveStop(index)}
                      >
                        <MaterialDesignIcons name="close" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Save Route</Text>
                  <MaterialDesignIcons name="check" size={20} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </Formik>

      <MapPickerModal
        visible={showMapModal}
        title={`Select ${mapFor === 'from' ? 'From' : 'To'} Location`}
        initialCoordinate={userCurrentLocation}
        onClose={() => { setShowMapModal(false); setMapFor(null); }}
        onConfirm={handleLocationConfirm}
      />
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
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SIZES.sm,
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
  scrollContent: {
    padding: SIZES.lg,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  sectionLabel: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SIZES.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: FONTSIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: FONTSIZES.sm,
    color: COLORS.error,
    marginTop: SIZES.xs,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SIZES.sm,
  },
  locationButtonSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '10',
  },
  locationButtonText: {
    flex: 1,
    fontSize: FONTSIZES.md,
    color: COLORS.textMuted,
  },
  locationButtonTextSelected: {
    color: COLORS.text,
    fontWeight: '500',
  },
  addStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  addStopButtonText: {
    fontSize: FONTSIZES.md,
    color: COLORS.accent,
    fontWeight: '500',
  },
  stopInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stopInput: {
    flex: 1,
    paddingVertical: SIZES.md,
    fontSize: FONTSIZES.md,
    color: COLORS.text,
  },
  addStopConfirmButton: {
    padding: SIZES.sm,
    marginLeft: SIZES.sm,
  },
  cancelStopButton: {
    padding: SIZES.sm,
    marginLeft: SIZES.xs,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionText: {
    fontSize: FONTSIZES.md,
    color: COLORS.text,
  },
  stopsList: {
    gap: SIZES.sm,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  stopText: {
    flex: 1,
    fontSize: FONTSIZES.md,
    color: COLORS.text,
  },
  removeStopButton: {
    padding: SIZES.xs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SIZES.md,
    gap: SIZES.sm,
    marginTop: SIZES.lg,
    ...SHADOWS.medium,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default AddRouteScreen;
