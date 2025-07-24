import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing } from '../constants/spacing';

// Import screens (we'll create these)
import { HomeScreen } from '../screens/HomeScreen';
import { SolicitudesScreen } from '../screens/SolicitudesScreen';
import { AjustesScreen } from '../screens/AjustesScreen';

export type TabParamList = {
  HomeTab: undefined;
  SolicitudesTab: undefined;
  AjustesTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Simple icon components (in a real app, you'd use react-native-vector-icons or similar)
const HomeIcon = ({ focused }: { focused: boolean }) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
    <Text style={[styles.iconText, focused && styles.iconTextFocused]}>🏠</Text>
  </View>
);

const SolicitudesIcon = ({ focused }: { focused: boolean }) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
    <Text style={[styles.iconText, focused && styles.iconTextFocused]}>📋</Text>
  </View>
);

const AjustesIcon = ({ focused }: { focused: boolean }) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
    <Text style={[styles.iconText, focused && styles.iconTextFocused]}>⚙️</Text>
  </View>
);

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary.deepBlue,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tab.Screen
        name="SolicitudesTab"
        component={SolicitudesScreen}
        options={{
          title: 'Solicitudes',
          tabBarIcon: SolicitudesIcon,
        }}
      />
      <Tab.Screen
        name="AjustesTab"
        component={AjustesScreen}
        options={{
          title: 'Ajustes',
          tabBarIcon: AjustesIcon,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
    paddingTop: spacing.space8,
    paddingBottom: spacing.space8,
    height: 60,
  },
  
  tabBarLabel: {
    fontSize: typography.fontSize.caption,
    fontFamily: typography.fontFamily.medium,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.space4,
  },
  
  tabBarItem: {
    paddingVertical: spacing.space4,
  },
  
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  iconContainerFocused: {
    // Add any focused state styling if needed
  },
  
  iconText: {
    fontSize: 20,
  },
  
  iconTextFocused: {
    // Add any focused state styling if needed
  },
});