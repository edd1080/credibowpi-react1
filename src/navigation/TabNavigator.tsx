import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing } from '../constants/spacing';
import { MaterialIcons, Feather } from '@expo/vector-icons';

// Try to import HugeIcons with fallback handling
let Home01Icon: any = null;
let GoogleDocIcon: any = null;
let AccountSetting03Icon: any = null;

try {
  const HugeIconsPro = require('@hugeicons/react-native-pro');
  Home01Icon = HugeIconsPro.Home01Icon;
  GoogleDocIcon = HugeIconsPro.GoogleDocIcon;
  AccountSetting03Icon = HugeIconsPro.AccountSetting03Icon;
  console.log('✅ HugeIcons Pro loaded successfully');
} catch (proError) {
  console.log('❌ HugeIcons Pro failed, trying regular:', proError.message);
  try {
    const HugeIcons = require('@hugeicons/react-native');
    Home01Icon = HugeIcons.Home01Icon;
    GoogleDocIcon = HugeIcons.GoogleDocIcon;
    AccountSetting03Icon = HugeIcons.AccountSetting03Icon;
    console.log('✅ HugeIcons Regular loaded successfully');
  } catch (regularError) {
    console.log('❌ Both HugeIcons packages failed:', regularError.message);
  }
}

// Import screens
import { HomeScreen, SolicitudesScreen, AjustesScreen } from '../screens';

export type TabParamList = {
  HomeTab: undefined;
  SolicitudesTab: undefined;
  AjustesTab: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Tab icon components with reliable fallback system
const HomeIcon = ({ focused }: { focused: boolean }) => {
  const iconColor = focused ? colors.primary.deepBlue : colors.text.tertiary;
  
  // Check if HugeIcon is available and try to use it
  if (Home01Icon) {
    try {
      return <Home01Icon size={24} color={iconColor} />;
    } catch (error) {
      console.log('❌ Home01Icon render failed:', error);
    }
  }
  
  // Always fallback to reliable Expo Vector Icons
  return <MaterialIcons name="home" size={24} color={iconColor} />;
};

const SolicitudesIcon = ({ focused }: { focused: boolean }) => {
  const iconColor = focused ? colors.primary.deepBlue : colors.text.tertiary;
  
  // Check if HugeIcon is available and try to use it
  if (GoogleDocIcon) {
    try {
      return <GoogleDocIcon size={24} color={iconColor} />;
    } catch (error) {
      console.log('❌ GoogleDocIcon render failed:', error);
    }
  }
  
  // Always fallback to reliable Expo Vector Icons
  return <Feather name="file-text" size={24} color={iconColor} />;
};

const AjustesIcon = ({ focused }: { focused: boolean }) => {
  const iconColor = focused ? colors.primary.deepBlue : colors.text.tertiary;
  
  // Check if HugeIcon is available and try to use it
  if (AccountSetting03Icon) {
    try {
      return <AccountSetting03Icon size={24} color={iconColor} />;
    } catch (error) {
      console.log('❌ AccountSetting03Icon render failed:', error);
    }
  }
  
  // Always fallback to reliable Expo Vector Icons
  return <Feather name="settings" size={24} color={iconColor} />;
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
