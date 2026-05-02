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
  title: Yup.string()
    .required('Title is required')
    .min(2, 'Title must be at least 2 characters')
    .max(50, 'Title must not exceed 50 characters'),
  streetAddress: Yup.string().max(
    100,
    'Address must not exceed 100 characters',
  ),
});

const SavePlaceScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const userCurrentLocation = useSession(state => state.currentLocation);

  const handleLocationConfirm = loc => {
    setLocation(loc);
    setShowMapModal(false);
  };

  const handleSavePlace = async (values, { setFieldError }) => {
    if (!location) {
      Alert.alert('Error', 'Please select a location');
      return;
    }

    setIsLoading(true);
    try {
      const placeData = {
        title: values.title.trim(),
        location,
        streetAddress: values.streetAddress?.trim() || '',
      };

      const response = await api.post('/places', placeData);

      if (response.data.success) {
        Alert.alert('Success', 'Place saved successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save place');
      }
    } catch (error) {
      console.log('Error saving place:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to save place',
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
        <Text style={styles.title}>Save Place</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Formik
        initialValues={{ title: '', streetAddress: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSavePlace}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={[
                  styles.input,
                  touched.title && errors.title && styles.inputError,
                ]}
                placeholder="e.g., Home, Work, Gym"
                placeholderTextColor={COLORS.textMuted}
                value={values.title}
                onChangeText={handleChange('title')}
                onBlur={handleBlur('title')}
              />
              {touched.title && errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Location</Text>
              <TouchableOpacity
                style={[styles.locationButton, location && styles.locationButtonSelected]}
                onPress={() => setShowMapModal(true)}
              >
                <MaterialDesignIcons
                  name="map-marker"
                  size={20}
                  color={location ? COLORS.accent : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.locationButtonText,
                    location && styles.locationButtonTextSelected,
                  ]}
                >
                  {location ? location.name : 'Select location on map'}
                </Text>
                <MaterialDesignIcons name="chevron-right" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Street Address (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  touched.streetAddress && errors.streetAddress && styles.inputError,
                ]}
                placeholder="Apartment, Suite, etc."
                placeholderTextColor={COLORS.textMuted}
                value={values.streetAddress}
                onChangeText={handleChange('streetAddress')}
                onBlur={handleBlur('streetAddress')}
              />
              {touched.streetAddress && errors.streetAddress && (
                <Text style={styles.errorText}>{errors.streetAddress}</Text>
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
                  <Text style={styles.saveButtonText}>Save Place</Text>
                  <MaterialDesignIcons name="check" size={20} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </Formik>

      <MapPickerModal
        visible={showMapModal}
        title="Select Location"
        initialCoordinate={userCurrentLocation}
        onClose={() => setShowMapModal(false)}
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
  scrollContent: {
    padding: SIZES.lg,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  label: {
    fontSize: FONTSIZES.md,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SIZES.sm,
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
    backgroundColor: COLORS.border,
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default SavePlaceScreen;
