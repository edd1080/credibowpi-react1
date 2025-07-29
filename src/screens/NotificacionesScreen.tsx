import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Typography } from '../components/atoms';
import { AppShell } from '../components/organisms';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { Ionicons } from '@expo/vector-icons';

interface NotificacionesScreenProps {
  navigation?: {
    goBack: () => void;
  };
}

interface NotificationSetting {
  id: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  icon: string;
}

export const NotificacionesScreen: React.FC<NotificacionesScreenProps> = ({ navigation }) => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([
    {
      id: 'push_general',
      title: 'Notificaciones Push',
      subtitle: 'Recibir notificaciones push en el dispositivo',
      enabled: true,
      icon: 'notifications',
    },
    {
      id: 'push_solicitudes',
      title: 'Nuevas Solicitudes',
      subtitle: 'Notificar cuando hay nuevas solicitudes asignadas',
      enabled: true,
      icon: 'document-text',
    },
    {
      id: 'push_actualizaciones',
      title: 'Actualizaciones de Estado',
      subtitle: 'Notificar cambios en el estado de las solicitudes',
      enabled: true,
      icon: 'refresh',
    },
    {
      id: 'push_recordatorios',
      title: 'Recordatorios',
      subtitle: 'Recordatorios de tareas pendientes y seguimientos',
      enabled: false,
      icon: 'alarm',
    },
    {
      id: 'inapp_general',
      title: 'Notificaciones In-App',
      subtitle: 'Mostrar notificaciones dentro de la aplicación',
      enabled: true,
      icon: 'phone-portrait',
    },
    {
      id: 'inapp_sync',
      title: 'Estado de Sincronización',
      subtitle: 'Notificar sobre el estado de la sincronización',
      enabled: true,
      icon: 'sync',
    },
    {
      id: 'inapp_errores',
      title: 'Errores y Advertencias',
      subtitle: 'Mostrar alertas de errores y advertencias importantes',
      enabled: true,
      icon: 'warning',
    },
    {
      id: 'inapp_tips',
      title: 'Consejos y Ayuda',
      subtitle: 'Mostrar consejos útiles y ayuda contextual',
      enabled: false,
      icon: 'help-circle',
    },
  ]);

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

  const toggleNotification = (id: string) => {
    setNotificationSettings(prev =>
      prev.map(setting =>
        setting.id === id
          ? { ...setting, enabled: !setting.enabled }
          : setting
      )
    );
  };

  const renderNotificationItem = (setting: NotificationSetting) => (
    <View key={setting.id} style={styles.notificationItem}>
      <View style={styles.notificationInfo}>
        <View style={styles.notificationIcon}>
          <Ionicons 
            name={setting.icon as any} 
            size={20} 
            color={setting.enabled ? colors.primary.deepBlue : colors.text.tertiary} 
          />
        </View>
        <View style={styles.notificationContent}>
          <Typography variant="bodyM" color="primary" weight="medium">
            {setting.title}
          </Typography>
          <Typography variant="bodyS" color="secondary" style={styles.notificationSubtitle}>
            {setting.subtitle}
          </Typography>
        </View>
      </View>
      <Switch
        value={setting.enabled}
        onValueChange={() => toggleNotification(setting.id)}
        trackColor={{ 
          false: colors.neutral.gray300, 
          true: colors.primary.blue 
        }}
        thumbColor={setting.enabled ? colors.background.primary : colors.neutral.gray400}
        ios_backgroundColor={colors.neutral.gray300}
      />
    </View>
  );

  // Separar notificaciones push e in-app
  const pushNotifications = notificationSettings.filter(setting => setting.id.startsWith('push_'));
  const inAppNotifications = notificationSettings.filter(setting => setting.id.startsWith('inapp_'));

  return (
    <AppShell onSyncPress={handleSync}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Typography variant="h2" color="primary" weight="bold">
            Notificaciones
          </Typography>
        </View>

        <Typography variant="bodyM" color="secondary" style={styles.description}>
          Configura cómo y cuándo quieres recibir notificaciones de la aplicación.
        </Typography>

        {/* Push Notifications Section */}
        <View style={styles.section}>
          <Typography variant="bodyL" color="primary" weight="medium" style={styles.sectionTitle}>
            Notificaciones Push
          </Typography>
          <Typography variant="bodyS" color="secondary" style={styles.sectionDescription}>
            Notificaciones que aparecen en tu dispositivo incluso cuando la app está cerrada.
          </Typography>

          <View style={styles.notificationGroup}>
            {pushNotifications.map(renderNotificationItem)}
          </View>
        </View>

        {/* In-App Notifications Section */}
        <View style={styles.section}>
          <Typography variant="bodyL" color="primary" weight="medium" style={styles.sectionTitle}>
            Notificaciones In-App
          </Typography>
          <Typography variant="bodyS" color="secondary" style={styles.sectionDescription}>
            Notificaciones que aparecen dentro de la aplicación mientras la usas.
          </Typography>

          <View style={styles.notificationGroup}>
            {inAppNotifications.map(renderNotificationItem)}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Typography variant="bodyM" color="primary" weight="medium" style={styles.infoTitle}>
              Información Importante
            </Typography>
          </View>
          <Typography variant="bodyS" color="secondary" style={styles.infoText}>
            • Las notificaciones push requieren permisos del sistema operativo.{'\n'}
            • Puedes cambiar estas configuraciones en cualquier momento.{'\n'}
            • Algunas notificaciones críticas no se pueden desactivar por seguridad.
          </Typography>
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
    marginBottom: spacing.space16,
  },

  backButton: {
    padding: spacing.space8,
    marginLeft: -spacing.space8,
    marginRight: spacing.space16,
  },

  description: {
    marginBottom: spacing.space32,
    lineHeight: 22,
  },

  section: {
    marginBottom: spacing.space32,
  },

  sectionTitle: {
    marginBottom: spacing.space8,
  },

  sectionDescription: {
    marginBottom: spacing.space16,
    lineHeight: 20,
  },

  notificationGroup: {
    backgroundColor: colors.background.primary,
    borderRadius: spacing.borderRadius.xl,
    overflow: 'hidden',
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

  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },

  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.space16,
  },

  notificationContent: {
    flex: 1,
  },

  notificationSubtitle: {
    marginTop: spacing.space4,
    lineHeight: 18,
  },

  infoCard: {
    backgroundColor: colors.background.primary,
    padding: spacing.space20,
    borderRadius: spacing.borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.info,
    marginBottom: spacing.space32,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.space12,
  },

  infoTitle: {
    marginLeft: spacing.space8,
  },

  infoText: {
    lineHeight: 20,
  },
});