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
} from 'react-native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import { useAuthStore } from '../../store/authStore';
import {
  COLORS,
  FONTSIZES,
  SIZES,
  RADIUS,
  SHADOWS,
} from '../../constants/theme';

const SignupScreen = ({ navigation }) => {
  const [role, setRole] = useState('user');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [focusedInput, setFocusedInput] = useState(null);

  const { signup, isLoading } = useAuthStore();

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else {
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (!formData.name || !formData.email || !formData.password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      if (role === 'provider') {
        navigation.navigate('Vehicle', {
          userData: { ...formData, role },
        });
      } else {
        const result = await signup({ ...formData, role });
        if (result.success) {
          navigation.replace('UserDashboard');
        } else {
          Alert.alert('Error', result.error || 'Signup failed');
        }
      }
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>I want to...</Text>
      <Text style={styles.stepSubtitle}>Select your role to continue</Text>

      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[styles.roleCard, role === 'user' && styles.roleCardActive]}
          onPress={() => setRole('user')}
        >
          <View
            style={[
              styles.iconContainer,
              role === 'user' && styles.iconContainerActive,
            ]}
          >
            <MaterialDesignIcons
              name="account"
              size={32}
              color={role === 'user' ? COLORS.white : COLORS.accent}
            />
          </View>
          <Text
            style={[
              styles.roleTitle,
              role === 'user' && styles.roleTitleActive,
            ]}
          >
            User
          </Text>
          <Text style={styles.roleDescription}>Book rides and travel</Text>
          {role === 'user' && (
            <View style={styles.checkmark}>
              <MaterialDesignIcons
                name="check-circle"
                size={24}
                color={COLORS.accent}
              />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleCard,
            role === 'provider' && styles.roleCardActive,
          ]}
          onPress={() => setRole('provider')}
        >
          <View
            style={[
              styles.iconContainer,
              role === 'provider' && styles.iconContainerActive,
            ]}
          >
            <MaterialDesignIcons
              name="car"
              size={32}
              color={role === 'provider' ? COLORS.white : COLORS.accent}
            />
          </View>
          <Text
            style={[
              styles.roleTitle,
              role === 'provider' && styles.roleTitleActive,
            ]}
          >
            Driver
          </Text>
          <Text style={styles.roleDescription}>Offer rides and earn</Text>
          {role === 'provider' && (
            <View style={styles.checkmark}>
              <MaterialDesignIcons
                name="check-circle"
                size={24}
                color={COLORS.accent}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Account</Text>
      <Text style={styles.stepSubtitle}>Fill in your details</Text>

      <View style={styles.form}>
        <View
          style={[
            styles.inputContainer,
            focusedInput === 'name' && styles.inputFocused,
          ]}
        >
          <MaterialDesignIcons
            name="account-outline"
            size={20}
            color={focusedInput === 'name' ? COLORS.accent : COLORS.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={COLORS.textMuted}
            value={formData.name}
            onChangeText={text => setFormData({ ...formData, name: text })}
            onFocus={() => setFocusedInput('name')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        <View
          style={[
            styles.inputContainer,
            focusedInput === 'email' && styles.inputFocused,
          ]}
        >
          <MaterialDesignIcons
            name="email-outline"
            size={20}
            color={focusedInput === 'email' ? COLORS.accent : COLORS.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={formData.email}
            onChangeText={text => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        <View
          style={[
            styles.inputContainer,
            focusedInput === 'phone' && styles.inputFocused,
          ]}
        >
          <MaterialDesignIcons
            name="phone-outline"
            size={20}
            color={focusedInput === 'phone' ? COLORS.accent : COLORS.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor={COLORS.textMuted}
            value={formData.phone}
            onChangeText={text => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
            onFocus={() => setFocusedInput('phone')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        <View
          style={[
            styles.inputContainer,
            focusedInput === 'password' && styles.inputFocused,
          ]}
        >
          <MaterialDesignIcons
            name="lock-outline"
            size={20}
            color={
              focusedInput === 'password' ? COLORS.accent : COLORS.textMuted
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textMuted}
            value={formData.password}
            onChangeText={text => setFormData({ ...formData, password: text })}
            secureTextEntry
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        <View
          style={[
            styles.inputContainer,
            focusedInput === 'confirmPassword' && styles.inputFocused,
          ]}
        >
          <MaterialDesignIcons
            name="lock-check-outline"
            size={20}
            color={
              focusedInput === 'confirmPassword'
                ? COLORS.accent
                : COLORS.textMuted
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={COLORS.textMuted}
            value={formData.confirmPassword}
            onChangeText={text =>
              setFormData({ ...formData, confirmPassword: text })
            }
            secureTextEntry
            onFocus={() => setFocusedInput('confirmPassword')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (step === 1 ? navigation.goBack() : setStep(1))}
          >
            <MaterialDesignIcons
              name="arrow-left"
              size={24}
              color={COLORS.text}
            />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                step >= 1 && styles.progressBarActive,
              ]}
            />
            <View
              style={[
                styles.progressBar,
                step >= 2 && styles.progressBarActive,
              ]}
            />
            {role === 'provider' && <View style={styles.progressBar} />}
          </View>
        </View>

        {step === 1 ? renderStep1() : renderStep2()}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading
              ? 'Creating Account...'
              : step === 1
              ? 'Continue'
              : role === 'provider'
              ? 'Next: Add Vehicle'
              : 'Create Account'}
          </Text>
          {!isLoading && (
            <MaterialDesignIcons
              name="arrow-right"
              size={20}
              color={COLORS.white}
            />
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  stepContainer: {
    marginBottom: SIZES.xl,
  },
  stepTitle: {
    fontSize: FONTSIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.xs,
  },
  stepSubtitle: {
    fontSize: FONTSIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
  },
  roleContainer: {
    gap: SIZES.md,
  },
  roleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SIZES.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  roleCardActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainerActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  roleTitle: {
    fontSize: FONTSIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  roleTitleActive: {
    color: COLORS.accent,
  },
  roleDescription: {
    fontSize: FONTSIZES.sm,
    color: COLORS.textSecondary,
    marginHorizontal: 5,
  },
  checkmark: {
    marginLeft: 'auto',
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
  input: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: FONTSIZES.md,
    color: COLORS.text,
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
    backgroundColor: COLORS.textMuted,
    opacity: 0.7,
  },
  buttonText: {
    fontSize: FONTSIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.xs,
    paddingTop: SIZES.lg,
  },
  footerText: {
    fontSize: FONTSIZES.md,
    color: COLORS.textSecondary,
  },
  footerLink: {
    fontSize: FONTSIZES.md,
    color: COLORS.accent,
    fontWeight: '600',
  },
});

export default SignupScreen;
