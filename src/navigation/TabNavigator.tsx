import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing } from '../constants/spacing';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import { HomeScreen, AjustesScreen } from '../screens';
import { FormTestScreen } from '../screens/FormTestScreen';
import { SolicitudesStackNavigator } from './SolicitudesStackNavigator';

export type TabParamList = {
  HomeTab: undefined;
  SolicitudesTab: undefined;
  FormTestTab: undefined;
  AjustesTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Tab icon components using reliable Expo Vector Icons
const HomeIcon = ({ focused }: { focused: boolean }) => {
  const iconColor = focused ? colors.primary.deepBlue : colors.text.tertiary;
  return <Ionicons name="home" size={24} color={iconColor} />;
};

const SolicitudesIcon = ({ focused }: { focused: boolean }) => {
  const iconColor = focused ? colors.primary.deepBlue : colors.text.tertiary;
  return <Ionicons name="document-text" size={24} color={iconColor} />;
};

const FormTestIcon = ({ focused }: { focused: boolean }) => {
  const iconColor = focused ? colors.primary.deepBlue : colors.text.tertiary;
  return <Ionicons name="clipboard" size={24} color={iconColor} />;
};

const AjustesIcon = ({ focused }: { focused: boolean }) => {
  const iconColor = focused ? colors.primary.deepBlue : colors.text.tertiary;
  return <Ionicons name="settings" size={24} color={iconColor} />;
};

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
        tabBarHideOnKeyboard: true,
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
        component={SolicitudesStackNavigator}
        options={{
          title: 'Solicitudes',
          tabBarIcon: SolicitudesIcon,
        }}
      />
      <Tab.Screen
        name="FormTestTab"
        component={FormTestScreen}
        options={{
          title: 'Form Test',
          tabBarIcon: FormTestIcon,
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
});
