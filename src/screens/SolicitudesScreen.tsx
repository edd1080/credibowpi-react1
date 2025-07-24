import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Typography, Button } from '../components/atoms';
import { AppShell } from '../components/organisms';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export const SolicitudesScreen: React.FC = () => {
  const handleSync = async () => {
    // Simulate sync operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Sync completed');
  };

  return (
    <AppShell onSyncPress={handleSync}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Typography variant="h2" color="primary" weight="bold">
            Solicitudes
          </Typography>
          <Typography variant="bodyM" color="secondary">
            Gestiona tus solicitudes de crédito
          </Typography>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Typography variant="h1" color="tertiary">
              📋
            </Typography>
          </View>
          
          <Typography variant="h3" color="primary" weight="medium" style={styles.emptyTitle}>
            No hay solicitudes
          </Typography>
          
          <Typography variant="bodyM" color="secondary" style={styles.emptyDescription}>
            Cuando crees una nueva solicitud, aparecerá aquí para que puedas gestionarla.
          </Typography>
          
          <Button
            title="Nueva Solicitud"
            variant="primary"
            onPress={() => {
              // TODO: Navigate to new application flow
              console.log('Navigate to new application');
            }}
            style={styles.newApplicationButton}
          />
        </View>
      </ScrollView>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.space24,
    paddingVertical: spacing.space16,
  },
  
  header: {
    marginBottom: spacing.space32,
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.space48,
  },
  
  emptyIcon: {
    marginBottom: spacing.space24,
  },
  
  emptyTitle: {
    marginBottom: spacing.space12,
    textAlign: 'center',
  },
  
  emptyDescription: {
    textAlign: 'center',
    marginBottom: spacing.space32,
    paddingHorizontal: spacing.space16,
  },
  
  newApplicationButton: {
    minWidth: 200,
  },
});