import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  OfflineStatusBanner,
  Breadcrumb,
  BreadcrumbItem,
} from '../molecules';
import { colors } from '../../constants/colors';

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbItems?: BreadcrumbItem[];
  onSyncPress?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  breadcrumbItems,
  onSyncPress,
}) => {
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);

  // Mock sync status management (in a real app, this would come from a store)
  useEffect(() => {
    // Simulate some pending items
    setPendingCount(3);
  }, []);

  const handleSyncPress = async () => {
    if (onSyncPress) {
      try {
        await onSyncPress();
        setPendingCount(0);
      } catch (error) {
        console.error('Sync error:', error);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Status Bar */}
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background.app}
        translucent={false}
      />

      <OfflineStatusBanner
        onSyncPress={handleSyncPress}
        pendingCount={pendingCount}
      />

      <View style={styles.content}>
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Breadcrumb items={breadcrumbItems} />
        )}

        <View style={styles.mainContent}>{children}</View>


      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.app, // Cambiado para que coincida con el fondo del app
  },

  content: {
    flex: 1,
  },

  mainContent: {
    flex: 1,
  },
});
