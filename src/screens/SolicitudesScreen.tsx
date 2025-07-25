import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Typography, Button } from '../components/atoms';
import { LoanRequestCard } from '../components/molecules';
import { AppShell } from '../components/organisms';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

export const SolicitudesScreen: React.FC = () => {
  const handleSync = async () => {
    // Simulate sync operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Sync completed');
  };

  // Mock data for demonstration
  const mockRequests = [
    {
      id: 'SCP_834062',
      applicantName: 'María González López',
      currentStage: 'Documentos y Firma',
      progress: 75,
      stage: 'Información Personal',
      requestedAmount: 25000,
      status: 'active' as const,
      contextLabel: 'Card Delivery',
    },
    {
      id: 'SCP_834063',
      applicantName: 'Carlos Rodríguez Pérez',
      currentStage: 'Revisión de Documentos',
      progress: 90,
      stage: 'Verificación',
      requestedAmount: 15000,
      status: 'under_review' as const,
    },
    {
      id: 'SCP_834064',
      applicantName: 'Ana Patricia Morales',
      currentStage: 'Proceso Completado',
      progress: 100,
      stage: 'Finalizada',
      requestedAmount: 30000,
      status: 'approved' as const,
    },
    {
      id: 'SCP_834065',
      applicantName: 'Roberto Silva Castillo',
      currentStage: 'Documentación Incompleta',
      progress: 45,
      stage: 'Documentos',
      requestedAmount: 20000,
      status: 'rejected' as const,
    },
  ];

  const handleCardPress = (id: string) => {
    console.log('Card pressed:', id);
    // TODO: Navigate to loan request details
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

        {mockRequests.length > 0 ? (
          <View style={styles.requestsList}>
            {mockRequests.map((request) => (
              <LoanRequestCard
                key={request.id}
                id={request.id}
                applicantName={request.applicantName}
                currentStage={request.currentStage}
                progress={request.progress}
                stage={request.stage}
                requestedAmount={request.requestedAmount}
                status={request.status}
                contextLabel={request.contextLabel || undefined}
                onPress={() => handleCardPress(request.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Typography
              variant="h3"
              color="primary"
              weight="medium"
              style={styles.emptyTitle}
            >
              No hay solicitudes
            </Typography>

            <Typography
              variant="bodyM"
              color="secondary"
              style={styles.emptyDescription}
            >
              Cuando crees una nueva solicitud, aparecerá aquí para que puedas
              gestionarla.
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
        )}
      </ScrollView>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.space24,
    paddingVertical: spacing.space16,
    backgroundColor: colors.background.app,
  },

  header: {
    marginBottom: spacing.space24,
  },

  requestsList: {
    flex: 1,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.space48,
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
