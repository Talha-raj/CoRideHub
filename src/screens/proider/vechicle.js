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
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTSIZES, SIZES, RADIUS, SHADOWS } from '../../constants/theme';
import api from '../../config/api';

const vehicleTypes = [
  { id: 'sedan', name: 'Sedan', icon: 'car-side', seats: '4' },
  { id: 'suv', name: 'SUV', icon: 'car-estate', seats: '6' },
  { id: 'hatchback', name: 'Hatchback', icon: 'car-back', seats: '4' },
  { id: 'van', name: 'Van', icon: 'van-passenger', seats: '8' },
];

const VehicleScreen = ({ route, navigation }) => {
  const { userData } = route.params || {};
  const [selectedType, setSelectedType] = useState('sedan');
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const { signup, updateUser } = useAuthStore();

  const handleSubmit = async () => {
    if (!model.trim() || !plateNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      // First, signup the user without vehicle data
      const signupData = {
        ...userData,
      };

      const signupResult = await signup(signupData);

      if (!signupResult.success) {
        Alert.alert('Error', signupResult.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Then, create the vehicle using the vehicle API
      const vehicleData = {
        type: selectedType,
        model: model.trim(),
        plateNumber: plateNumber.trim().toUpperCase(),
        year: year.trim(),
        color: color.trim(),
      };

      try {
        const vehicleResponse = await api.post('/vehicle', vehicleData);
        
        if (vehicleResponse.data.success) {
          updateUser({ vehicle: vehicleResponse.data.vehicle });
          navigation.replace('ProviderDashboard');
        } else {
          Alert.alert('Error', 'Failed to save vehicle information');
        }
      } catch (vehicleError) {
        console.log('Vehicle API error:', vehicleError);
        Alert.alert('Error', vehicleError.response?.data?.message || 'Failed to save vehicle information');
      }
    } catch (error) {
      console.log('Signup error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialDesignIcons name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, styles.progressBarActive]} />
            <View style={[styles.progressBar, styles.progressBarActive]} />
            <View style={[styles.progressBar, styles.progressBarActive]} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Add Your Vehicle</Text>
          <Text style={styles.subtitle}>Complete your driver profile</Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Vehicle Type</Text>
            <View style={styles.typeGrid}>
              {vehicleTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeCard,
                    selectedType === type.id && styles.typeCardActive,
                  ]}
                  onPress={() => setSelectedType(type.id)}
                >
                  <View
                    style={[
                      styles.typeIcon,
                      selectedType === type.id && styles.typeIconActive,
                    ]}
                  >
                    <MaterialDesignIcons
                      name={type.icon}
                      size={24}
                      color={selectedType === type.id ? COLORS.white : COLORS.accent}
                    />
                  </View>
                  <Text
                    style={[
                      styles.typeName,
                      selectedType === type.id && styles.typeNameActive,
                    ]}
                  >
                    {type.name}
                  </Text>
                  <Text style={styles.typeSeats}>{type.seats} seats</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Vehicle Details</Text>
            <View style={styles.form}>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'model' && styles.inputFocused,
                ]}
              >
                <MaterialDesignIcons
                  name="car-info"
                  size={20}
                  color={focusedInput === 'model' ? COLORS.accent : COLORS.textMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Model (e.g., Toyota Camry)"
                  placeholderTextColor={COLORS.textMuted}
                  value={model}
                  onChangeText={setModel}
                  onFocus={() => setFocusedInput('model')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'plate' && styles.inputFocused,
                ]}
              >
                <MaterialDesignIcons
                  name="card-text-outline"
                  size={20}
                  color={focusedInput === 'plate' ? COLORS.accent : COLORS.textMuted}
                />
                <TextInput
                  style={styles.input}
                  placeholder="License Plate"
                  placeholderTextColor={COLORS.textMuted}
                  value={plateNumber}
                  onChangeText={(text) => setPlateNumber(text.toUpperCase())}
                  autoCapitalize="characters"
                  onFocus={() => setFocusedInput('plate')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              <View style={styles.rowInputs}>
                <View
                  style={[
                    styles.inputContainer,
                    styles.halfInput,
                    focusedInput === 'year' && styles.inputFocused,
                  ]}
                >
                  <MaterialDesignIcons
                    name="calendar-outline"
                    size={20}
                    color={focusedInput === 'year' ? COLORS.accent : COLORS.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Year"
                    placeholderTextColor={COLORS.textMuted}
                    value={year}
                    onChangeText={setYear}
                    keyboardType="numeric"
                    maxLength={4}
                    onFocus={() => setFocusedInput('year')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>

                <View
                  style={[
                    styles.inputContainer,
                    styles.halfInput,
                    focusedInput === 'color' && styles.inputFocused,
                  ]}
                >
                  <MaterialDesignIcons
                    name="palette-outline"
                    size={20}
                    color={focusedInput === 'color' ? COLORS.accent : COLORS.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Color"
                    placeholderTextColor={COLORS.textMuted}
                    value={color}
                    onChangeText={setColor}
                    onFocus={() => setFocusedInput('color')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialDesignIcons
              name="shield-check"
              size={24}
              color={COLORS.success}
            />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Safety First</Text>
              <Text style={styles.infoText}>
                All vehicles are verified for safety and compliance before going active.
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.buttonText}>Complete Registration</Text>
              <MaterialDesignIcons name="check" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  backButton: {
    padding: SIZES.sm,
    marginRight: SIZES.md,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
  },
  progressBarActive: {
    backgroundColor: COLORS.accent,
  },
  content: {
    marginBottom: SIZES.xl,
  },
  title: {
    fontSize: FONTSIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: FONTSIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
  },
  typeCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  typeCardActive: {
    borderColor: COLORS.accent,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  typeIconActive: {
    backgroundColor: COLORS.accent,
  },
  typeName: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  typeNameActive: {
    color: COLORS.accent,
  },
  typeSeats: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
  },
  form: {
    gap: SIZES.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SIZES.md,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  inputFocused: {
    borderColor: COLORS.accent,
  },
  halfInput: {
    flex: 1,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  input: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: FONTSIZES.md,
    color: COLORS.text,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.success + '10',
    borderRadius: RADIUS.lg,
    padding: SIZES.md,
    gap: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.success + '20',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    height: 56,
    gap: SIZES.sm,
    marginTop: 'auto',
    ...SHADOWS.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default VehicleScreen;
