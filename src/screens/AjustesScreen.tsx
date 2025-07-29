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
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  iconName?: string;
  iconLibrary?: 'MaterialIcons' | 'Feather' | 'Ionicons';
  showArrow?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  title,
  subtitle,
  onPress,
  iconName = 'settings',
  iconLibrary = 'Ionicons',
  showArrow = true,
}) => {
  const renderIcon = () => {
    let IconComponent;
    switch (iconLibrary) {
      case 'Feather':
        IconComponent = Feather;
        break;
      case 'MaterialIcons':
        IconComponent = MaterialIcons;
        break;
      case 'Ionicons':
      default:
        IconComponent = Ionicons;
        break;
    }
    
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
          <Typography variant="bodyM" color="primary" weight="bold">
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
      'Estado de Sincronización',
      'Última sincronización: Hace 5 minutos\nElementos pendientes: 3\n\n¿Deseas sincronizar ahora?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sincronizar',
          style: 'default',
          onPress: () => {
            Alert.alert('Sincronizando...', 'Los datos se están sincronizando.');
          },
        },
      ]
    );
  };

  const handleNotificationSettings = () => {
    // Navegar a la pantalla de configuración de notificaciones
    Alert.alert('Navegación', 'Ir a configuración de notificaciones');
  };

  const handleHelp = () => {
    Alert.alert(
      'Ayuda y Soporte',
      'Para obtener ayuda, contacta a tu supervisor o al equipo de soporte técnico.',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const handleAbout = () => {
    // Navegar a la pantalla "Acerca de"
    Alert.alert('Navegación', 'Ir a pantalla Acerca de');
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
            variant="bodyM"
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
              <Typography variant="bodyL" color="primary" weight="bold">
                {user?.name || 'Agente de Campo'}
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
            variant="bodyM"
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
              iconName="sync"
              iconLibrary="Ionicons"
              onPress={handleSyncSettings}
            />

            <SettingsItem
              title="Notificaciones"
              subtitle="Gestionar alertas y notificaciones"
              iconName="notifications"
              iconLibrary="Ionicons"
              onPress={handleNotificationSettings}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Typography
            variant="bodyM"
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
              iconName="help-circle"
              iconLibrary="Ionicons"
              onPress={handleHelp}
            />

            <SettingsItem
              title="Acerca de"
              subtitle="Información de la aplicación"
              iconName="information-circle"
              iconLibrary="Ionicons"
              onPress={handleAbout}
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Typography variant="bodyM" color="inverse" weight="medium">
              Cerrar Sesión
            </Typography>
          </TouchableOpacity>
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

  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.space16,
    paddingHorizontal: spacing.space24,
    borderRadius: spacing.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
