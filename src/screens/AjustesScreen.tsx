import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Typography, Button } from '../components/atoms';
import { AppShell } from '../components/organisms';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  icon?: string;
  showArrow?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  title,
  subtitle,
  onPress,
  icon = '⚙️',
  showArrow = true,
}) => (
  <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
    <View style={styles.settingsItemLeft}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <View style={styles.settingsItemContent}>
        <Typography variant="bodyM" color="primary" weight="medium">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="bodyS" color="secondary">
            {subtitle}
          </Typography>
        )}
      </View>
    </View>
    {showArrow && (
      <Typography variant="bodyM" color="tertiary">
        →
      </Typography>
    )}
  </TouchableOpacity>
);

export const AjustesScreen: React.FC = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSyncSettings = () => {
    Alert.alert(
      'Configuración de Sincronización',
      'Aquí podrás configurar las opciones de sincronización.',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleNotificationSettings = () => {
    Alert.alert(
      'Configuración de Notificaciones',
      'Aquí podrás configurar las notificaciones.',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      'Ayuda y Soporte',
      'Para obtener ayuda, contacta a tu supervisor o al equipo de soporte técnico.',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'Acerca de CrediBowpi',
      'CrediBowpi Mobile v1.0.0\nPlataforma de crédito digital para el campo.',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleSync = async () => {
    // Simulate sync operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Sync completed');
  };

  return (
    <AppShell onSyncPress={handleSync} showSyncStatus={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Typography variant="h2" color="primary" weight="bold">
            Ajustes
          </Typography>
          <Typography variant="bodyM" color="secondary">
            Configura tu aplicación
          </Typography>
        </View>

        {/* User Profile Section */}
        <View style={styles.section}>
          <Typography variant="h3" color="primary" weight="medium" style={styles.sectionTitle}>
            Perfil
          </Typography>
          
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Typography variant="h2" color="inverse" weight="bold">
                {user?.name?.charAt(0) || 'A'}
              </Typography>
            </View>
            <View style={styles.profileInfo}>
              <Typography variant="bodyL" color="primary" weight="medium">
                {user?.name || 'Agente'}
              </Typography>
              <Typography variant="bodyM" color="secondary">
                {user?.email}
              </Typography>
              <Typography variant="bodyS" color="tertiary">
                Rol: {user?.role === 'agent' ? 'Agente' : 'Supervisor'}
              </Typography>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Typography variant="h3" color="primary" weight="medium" style={styles.sectionTitle}>
            Configuración
          </Typography>
          
          <View style={styles.settingsGroup}>
            <SettingsItem
              title="Sincronización"
              subtitle="Configurar sincronización automática"
              icon="🔄"
              onPress={handleSyncSettings}
            />
            
            <SettingsItem
              title="Notificaciones"
              subtitle="Gestionar alertas y notificaciones"
              icon="🔔"
              onPress={handleNotificationSettings}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Typography variant="h3" color="primary" weight="medium" style={styles.sectionTitle}>
            Soporte
          </Typography>
          
          <View style={styles.settingsGroup}>
            <SettingsItem
              title="Ayuda"
              subtitle="Obtener ayuda y soporte"
              icon="❓"
              onPress={handleHelp}
            />
            
            <SettingsItem
              title="Acerca de"
              subtitle="Información de la aplicación"
              icon="ℹ️"
              onPress={handleAbout}
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <Button
            title="Cerrar Sesión"
            variant="secondary"
            onPress={handleLogout}
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
  
  section: {
    marginBottom: spacing.space32,
  },
  
  sectionTitle: {
    marginBottom: spacing.space16,
  },
  
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.space16,
    borderRadius: spacing.borderRadius.md,
  },
  
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.space16,
  },
  
  profileInfo: {
    flex: 1,
  },
  
  settingsGroup: {
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
  },
  
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  settingsIcon: {
    fontSize: 20,
    marginRight: spacing.space12,
  },
  
  settingsItemContent: {
    flex: 1,
  },
  
  logoutSection: {
    marginTop: 'auto',
    paddingTop: spacing.space32,
  },
});