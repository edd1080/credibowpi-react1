import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing } from '../constants/spacing';
import { SimpleIcons } from '../components/atoms/SimpleIcon';

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

// Tab icon components using SimpleIcons
const HomeIcon = ({ focused }: { focused: boolean }) => (
  <SimpleIcons.home 
    size={24} 
    color={focused ? colors.primary.deepBlue : colors.text.tertiary} 
  />
);

const SolicitudesIcon = ({ focused }: { focused: boolean }) => (
  <SimpleIcons.assignment 
    size={24} 
    color={focused ? colors.primary.deepBlue : colors.text.tertiary} 
  />
);

const AjustesIcon = ({ focused }: { focused: boolean }) => (
  <SimpleIcons.settings 
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
  

});