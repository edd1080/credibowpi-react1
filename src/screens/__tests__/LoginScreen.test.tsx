import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';

// Mock the auth store
jest.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    login: jest.fn(),
    isLoading: false,
    error: null,
    clearError: jest.fn(),
  }),
}));

describe('LoginScreen', () => {
  it('renders correctly', () => {
    const { getByText, getByTestId } = render(<LoginScreen />);
    
    expect(getByText('CrediBowpi')).toBeTruthy();
    expect(getByText('Ingresa tus credenciales para continuar')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('shows validation errors for empty fields', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    
    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByText('El correo electrónico es requerido')).toBeTruthy();
      expect(getByText('La contraseña es requerida')).toBeTruthy();
    });
  });

  it('shows validation error for invalid email', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    
    const emailInput = getByTestId('email-input');
    const loginButton = getByTestId('login-button');
    
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(getByText('Ingresa un correo electrónico válido')).toBeTruthy();
    });
  });

  it('shows forgot password alert', () => {
    const { getByTestId } = render(<LoginScreen />);
    
    const forgotPasswordButton = getByTestId('forgot-password-button');
    fireEvent.press(forgotPasswordButton);
    
    // Alert should be shown (mocked in test setup)
  });
});