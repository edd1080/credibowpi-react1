// Test setup for CrediBowpi mobile app
// This file is loaded before each test file

import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array(32))),
  digestStringAsync: jest.fn(() => Promise.resolve('mock-hash')),
}));

// Mock crypto-js for Bowpi services
jest.mock('crypto-js', () => ({
  default: {
    SHA256: jest.fn(() => ({ toString: () => 'mock-hash' })),
    AES: {
      encrypt: jest.fn(() => ({ toString: () => 'encrypted-data' })),
      decrypt: jest.fn(() => ({ toString: () => 'decrypted-data' })),
    },
    enc: {
      Utf8: {
        parse: jest.fn(),
        stringify: jest.fn(() => 'utf8-string'),
      },
      Hex: {
        parse: jest.fn(),
        stringify: jest.fn(() => 'hex-string'),
      },
    },
    lib: {
      WordArray: {
        random: jest.fn(() => ({ toString: () => 'random-bytes' })),
      },
    },
  },
  SHA256: jest.fn(() => ({ toString: () => 'mock-hash' })),
  AES: {
    encrypt: jest.fn(() => ({ toString: () => 'encrypted-data' })),
    decrypt: jest.fn(() => ({ toString: () => 'decrypted-data' })),
  },
  enc: {
    Utf8: {
      parse: jest.fn(),
      stringify: jest.fn(() => 'utf8-string'),
    },
    Hex: {
      parse: jest.fn(),
      stringify: jest.fn(() => 'hex-string'),
    },
  },
  lib: {
    WordArray: {
      random: jest.fn(() => ({ toString: () => 'random-bytes' })),
    },
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock network info
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock Zustand
jest.mock('zustand', () => ({
  create: jest.fn((fn) => fn),
}));

// Global test utilities - suppress console.log in tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'debug').mockImplementation(() => {});
jest.spyOn(console, 'info').mockImplementation(() => {});
