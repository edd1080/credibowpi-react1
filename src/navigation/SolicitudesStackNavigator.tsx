import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SolicitudesScreen, DetalleSolicitudScreen } from '../screens';

export type SolicitudesStackParamList = {
  SolicitudesList: undefined;
  DetalleSolicitud: { id: string };
};

const Stack = createStackNavigator<SolicitudesStackParamList>();

export const SolicitudesStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="SolicitudesList"
        component={SolicitudesScreen}
      />
      <Stack.Screen
        name="DetalleSolicitud"
        component={DetalleSolicitudScreen}
      />
    </Stack.Navigator>
  );
};