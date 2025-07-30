import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Button, TextInput, Icon } from '../components/atoms';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('El correo electrónico es requerido');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Ingresa un correo electrónico válido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('La contraseña es requerida');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    setHasAttemptedLogin(true);
    clearError();

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      // Error is handled by the store
      console.error('Login error:', err);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Recuperar Contraseña',
      'Por favor contacta a tu supervisor para recuperar tu contraseña.',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            {/* Logo placeholder */}
            <View style={styles.logoContainer}>
              <Typography variant="h1" color="primary" weight="bold">
                CB
              </Typography>
            </View>

            <Typography
              variant="h2"
              color="primary"
              weight="bold"
              style={styles.title}
            >
              CrediBowpi
            </Typography>

            <Typography
              variant="bodyM"
              color="secondary"
              style={styles.subtitle}
            >
              Ingresa tus credenciales para continuar
            </Typography>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              onBlur={() => hasAttemptedLogin && validateEmail(email)}
              error={hasAttemptedLogin ? emailError : ''}
              placeholder="ejemplo@credibowpi.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="email-input"
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              onBlur={() => hasAttemptedLogin && validatePassword(password)}
              error={hasAttemptedLogin ? passwordError : ''}
              placeholder="Ingresa tu contraseña"
              secureTextEntry={!showPassword}
              rightIcon={
                <Icon
                  name={showPassword ? 'view-off-02' : 'view-02'}
                  size={20}
                  color={colors.text.tertiary}
                />
              }
              onRightIconPress={togglePasswordVisibility}
              testID="password-input"
            />

            {error && (
              <View style={styles.errorContainer}>
                <Typography variant="bodyS" color="error">
                  {error}
                </Typography>
              </View>
            )}

            <Button
              title="Iniciar Sesión"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              testID="login-button"
            />

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotPasswordButton}
              testID="forgot-password-button"
            >
              <Typography variant="bodyM" color="primary">
                ¿Olvidaste tu contraseña?
              </Typography>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.space24,
    paddingVertical: spacing.space32,
  },

  header: {
    alignItems: 'flex-start',
    marginBottom: spacing.space32,
  },

  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.space12,
  },

  title: {
    marginBottom: spacing.space4,
    textAlign: 'left',
  },

  subtitle: {
    textAlign: 'left',
  },

  form: {
    width: '100%',
  },

  errorContainer: {
    marginBottom: spacing.space16,
    padding: spacing.space12,
    backgroundColor: colors.error + '10', // 10% opacity
    borderRadius: spacing.borderRadius.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },

  loginButton: {
    marginBottom: spacing.space24,
  },

  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: spacing.space12,
  },
});
