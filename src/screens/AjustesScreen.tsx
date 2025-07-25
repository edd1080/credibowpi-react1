import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Typography, Button } from '../components/atoms';
import { HugeIcon } from '../components/atoms/HugeIcon';
import { AppShell } from '../components/organisms';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { MaterialIcons, Feather } from '@expo/vector-icons';

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  iconName?: string;
  iconLibrary?: 'MaterialIcons' | 'Feather' | 'HugeIcons';
  showArrow?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  title,
  subtitle,
  onPress,
  iconName = 'settings',
  iconLibrary = 'MaterialIcons',
  showArrow = true,
}) => {
  const renderIcon = () => {
    // Try HugeIcon first, fallback to other libraries
    if (iconLibrary === 'HugeIcons') {
      return (
        <HugeIcon
          name={iconName || 'settings'}
          size={20}
          color={colors.text.secondary}
        />
      );
    }
    
    const IconComponent = iconLibrary === 'Feather' ? Feather : MaterialIcons;
    return (
      <IconComponent
        name={iconName as any}
        size={20}
        color={colors.text.secondary}
        style={styles.settingsIcon}
      />
    );
  };

  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsItemLeft}>
        {renderIcon()}
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
        <Feather name="chevron-right" size={20} color={colors.text.tertiary} />
      )}
    </TouchableOpacity>
  );
};

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
    <AppShell onSyncPress={handleSync}>
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
          <Typography
            variant="h3"
            color="primary"
            weight="medium"
            style={styles.sectionTitle}
          >
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
          <Typography
            variant="h3"
            color="primary"
            weight="medium"
            style={styles.sectionTitle}
          >
            Configuración
          </Typography>

          <View style={styles.settingsGroup}>
            <SettingsItem
              title="Sincronización"
              subtitle="Configurar sincronización automática"
              iconName="sync01"
              iconLibrary="HugeIcons"
              onPress={handleSyncSettings}
            />

            <SettingsItem
              title="Notificaciones"
              subtitle="Gestionar alertas y notificaciones"
              iconName="notification01"
              iconLibrary="HugeIcons"
              onPress={handleNotificationSettings}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Typography
            variant="h3"
            color="primary"
            weight="medium"
            style={styles.sectionTitle}
          >
            Soporte
          </Typography>

          <View style={styles.settingsGroup}>
            <SettingsItem
              title="Ayuda"
              subtitle="Obtener ayuda y soporte"
              iconName="helpCircle"
              iconLibrary="HugeIcons"
              onPress={handleHelp}
            />

            <SettingsItem
              title="Acerca de"
              subtitle="Información de la aplicación"
              iconName="informationCircle"
              iconLibrary="HugeIcons"
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
    backgroundColor: colors.background.app,
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
    backgroundColor: colors.background.primary,
    padding: spacing.space20,
    borderRadius: spacing.borderRadius.xl,
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
