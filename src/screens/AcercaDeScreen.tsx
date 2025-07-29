import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Typography } from '../components/atoms';
import { AppShell } from '../components/organisms';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { Ionicons } from '@expo/vector-icons';

interface AcercaDeScreenProps {
  navigation?: {
    goBack: () => void;
  };
}

export const AcercaDeScreen: React.FC<AcercaDeScreenProps> = ({ navigation }) => {
  const handleGoBack = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const handleSync = async () => {
    // Simulate sync operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Sync completed');
  };

  return (
    <AppShell onSyncPress={handleSync}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Typography variant="h2" color="primary" weight="bold">
            Acerca de CrediBowpi
          </Typography>
        </View>

        {/* App Info Card */}
        <View style={styles.card}>
          <View style={styles.appIconContainer}>
            <View style={styles.appIcon}>
              <Typography variant="h1" color="inverse" weight="bold">
                C
              </Typography>
            </View>
          </View>

          <Typography variant="h3" color="primary" weight="bold" style={styles.appName}>
            CrediBowpi Mobile
          </Typography>

          <Typography variant="bodyM" color="secondary" style={styles.version}>
            Versión 1.0.0
          </Typography>

          <Typography variant="bodyM" color="secondary" style={styles.description}>
            Plataforma de crédito digital para el campo colombiano. 
            Facilitamos el acceso al crédito para agricultores y productores rurales.
          </Typography>
        </View>

        {/* Company Info */}
        <View style={styles.card}>
          <Typography variant="bodyL" color="primary" weight="medium" style={styles.sectionTitle}>
            Información de la Empresa
          </Typography>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Typography variant="bodyS" color="secondary">
                Desarrollado por:
              </Typography>
              <Typography variant="bodyS" color="primary" weight="medium">
                CrediBowpi S.A.S.
              </Typography>
            </View>

            <View style={styles.infoRow}>
              <Typography variant="bodyS" color="secondary">
                Sitio web:
              </Typography>
              <Typography variant="bodyS" color="primary" weight="medium">
                www.credibowpi.com
              </Typography>
            </View>

            <View style={styles.infoRow}>
              <Typography variant="bodyS" color="secondary">
                Soporte:
              </Typography>
              <Typography variant="bodyS" color="primary" weight="medium">
                soporte@credibowpi.com
              </Typography>
            </View>

            <View style={styles.infoRow}>
              <Typography variant="bodyS" color="secondary">
                Teléfono:
              </Typography>
              <Typography variant="bodyS" color="primary" weight="medium">
                +57 (1) 234-5678
              </Typography>
            </View>
          </View>
        </View>

        {/* Legal Info */}
        <View style={styles.card}>
          <Typography variant="bodyL" color="primary" weight="medium" style={styles.sectionTitle}>
            Información Legal
          </Typography>

          <Typography variant="bodyS" color="secondary" style={styles.legalText}>
            © 2024 CrediBowpi S.A.S. Todos los derechos reservados.
          </Typography>

          <Typography variant="bodyS" color="secondary" style={styles.legalText}>
            Esta aplicación está protegida por las leyes de derechos de autor y tratados internacionales. 
            El uso no autorizado está prohibido.
          </Typography>

          <Typography variant="bodyS" color="secondary" style={styles.legalText}>
            Licencia de uso interno para agentes autorizados de CrediBowpi.
          </Typography>
        </View>

        {/* Technical Info */}
        <View style={styles.card}>
          <Typography variant="bodyL" color="primary" weight="medium" style={styles.sectionTitle}>
            Información Técnica
          </Typography>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Typography variant="bodyS" color="secondary">
                Plataforma:
              </Typography>
              <Typography variant="bodyS" color="primary" weight="medium">
                React Native
              </Typography>
            </View>

            <View style={styles.infoRow}>
              <Typography variant="bodyS" color="secondary">
                Última actualización:
              </Typography>
              <Typography variant="bodyS" color="primary" weight="medium">
                Enero 2024
              </Typography>
            </View>

            <View style={styles.infoRow}>
              <Typography variant="bodyS" color="secondary">
                Compatibilidad:
              </Typography>
              <Typography variant="bodyS" color="primary" weight="medium">
                iOS 12+, Android 8+
              </Typography>
            </View>
          </View>
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
    backgroundColor: colors.background.app,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.space32,
  },

  backButton: {
    padding: spacing.space8,
    marginLeft: -spacing.space8,
    marginRight: spacing.space16,
  },

  card: {
    backgroundColor: colors.background.primary,
    padding: spacing.space24,
    borderRadius: spacing.borderRadius.xl,
    marginBottom: spacing.space20,
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },

  appIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.space20,
  },

  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },

  appName: {
    textAlign: 'center',
    marginBottom: spacing.space8,
  },

  version: {
    textAlign: 'center',
    marginBottom: spacing.space16,
  },

  description: {
    textAlign: 'center',
    lineHeight: 22,
  },

  sectionTitle: {
    marginBottom: spacing.space16,
  },

  infoList: {
    gap: spacing.space12,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  legalText: {
    marginBottom: spacing.space12,
    lineHeight: 20,
  },
});