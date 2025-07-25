import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing } from '../constants/spacing';
import { MaterialIcons, Feather } from '@expo/vector-icons';

// Import screens
import { HomeScreen } from '../screens/HomeScreen';
import { SolicitudesScreen } from '../screens/SolicitudesScreen';
import { AjustesScreen } from '../screens/AjustesScreen';

export type TabParamList = {
  HomeTab: undefined;
  SolicitudesTab: undefined;
  AjustesTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Tab icon components using Expo Vector Icons
const HomeIcon = ({ focused }: { focused: boolean }) => (
  <MaterialIcons
    name="home"
    size={24}
    color={focused ? colors.primary.deepBlue : colors.text.tertiary}
  />
);

const SolicitudesIcon = ({ focused }: { focused: boolean }) => (
  <Feather
    name="file-text"
    size={24}
    color={focused ? colors.primary.deepBlue : colors.text.tertiary}
  />
);

const AjustesIcon = ({ focused }: { focused: boolean }) => (
  <Feather
    name="settings"
    size={24}
    color={focused ? colors.primary.deepBlue : colors.text.tertiary}
  />
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
