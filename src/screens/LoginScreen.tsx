import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Button, TextInput, Icon } from '../components/atoms';
import { NetworkStatusIndicator, AuthErrorDisplay } from '../components/molecules';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useNetworkAwareAuth } from '../hooks/useNetworkAwareAuth';
import { authIntegration } from '../services/AuthIntegrationService';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);
  const [authError, setAuthError] = useState<any>(null);

  const { login, isLoading, error, clearError } = useAuthStore();
  const { networkStatus, canLogin, isInitialized } = useNetworkAwareAuth();

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

    // Check network connectivity before attempting login
    if (!networkStatus.isConnected) {
      Alert.alert(
        'Sin Conexión a Internet',
        'Se requiere conexión a internet para iniciar sesión. Por favor verifica tu conexión y vuelve a intentar.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    // Check if login is possible with current network conditions
    if (!canLogin) {
      Alert.alert(
        'Conexión Insuficiente',
        'La calidad de tu conexión a internet no es suficiente para iniciar sesión. Por favor verifica tu conexión.',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }

    try {
      setAuthError(null); // Clear previous auth errors
      await login(email, password);
    } catch (err) {
      console.error('Login error:', err);

      // Set the error for display in AuthErrorDisplay component
      setAuthError(err);

      // Handle the error using the enhanced error handling system
      await authIntegration.handleAuthError(err, 'login');
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
            {/* Bowpi Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/bowpi-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
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

          {/* Network Status Indicator */}
          {isInitialized ? (
            <NetworkStatusIndicator
              isConnected={networkStatus.isConnected}
              quality={networkStatus.quality}
              style={styles.networkStatus}
            />
          ) : (
            <View style={styles.networkStatus}>
              <Typography variant="bodyS" color="secondary">
                Verificando conexión...
              </Typography>
            </View>
          )}

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

            {/* Enhanced Error Display */}
            {authError && (
              <AuthErrorDisplay
                error={authError}
                onRetry={() => {
                  setAuthError(null);
                  handleLogin();
                }}
                onDismiss={() => {
                  setAuthError(null);
                  clearError();
                }}
                style={styles.errorDisplay}
              />
            )}

            {/* Fallback for store errors */}
            {error && !authError && (
              <View style={styles.errorContainer}>
                <Typography variant="bodyS" color="error">
                  {error}
                </Typography>
              </View>
            )}

            <Button
              title={
                !networkStatus.isConnected
                  ? "Sin Conexión"
                  : !canLogin
                    ? "Conexión Insuficiente"
                    : "Iniciar Sesión"
              }
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading || !networkStatus.isConnected || !canLogin}
              style={[
                styles.loginButton,
                (!networkStatus.isConnected || !canLogin) ? styles.loginButtonDisabled : null
              ]}
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
    width: 120,
    height: 80,
    marginBottom: spacing.space16,
  },

  logoImage: {
    width: '100%',
    height: '100%',
  },

  title: {
    marginBottom: spacing.space4,
    textAlign: 'left',
  },

  subtitle: {
    textAlign: 'left',
  },

  networkStatus: {
    marginBottom: spacing.space16,
  },

  form: {
    width: '100%',
  },

  errorDisplay: {
    marginBottom: spacing.space16,
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

  loginButtonDisabled: {
    opacity: 0.6,
  },

  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: spacing.space12,
  },
});
