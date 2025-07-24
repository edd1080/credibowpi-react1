import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { OfflineStatusBanner, SyncStatusIndicator, Breadcrumb, BreadcrumbItem } from '../molecules';
import { SyncStatus } from '../molecules/SyncStatusIndicator';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbItems?: BreadcrumbItem[];
  showSyncStatus?: boolean;
  onSyncPress?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  breadcrumbItems,
  showSyncStatus = true,
  onSyncPress,
}) => {
  const insets = useSafeAreaInsets();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();

  // Mock sync status management (in a real app, this would come from a store)
  useEffect(() => {
    // Simulate some pending items
    setPendingCount(3);
    setLastSyncTime(new Date(Date.now() - 5 * 60 * 1000)); // 5 minutes ago
  }, []);

  const handleSyncPress = async () => {
    if (onSyncPress) {
      setSyncStatus('syncing');
      try {
        await onSyncPress();
        setSyncStatus('success');
        setPendingCount(0);
        setLastSyncTime(new Date());
        
        // Reset to idle after a few seconds
        setTimeout(() => {
          setSyncStatus('idle');
        }, 3000);
      } catch (error) {
        setSyncStatus('error');
        console.error('Sync error:', error);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Status Bar */}
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={colors.background.primary}
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
        
        <View style={styles.mainContent}>
          {children}
        </View>
        
        {showSyncStatus && (
          <View style={[styles.syncStatusContainer, { paddingBottom: insets.bottom }]}>
            <SyncStatusIndicator
              status={syncStatus}
              pendingCount={pendingCount}
              lastSyncTime={lastSyncTime}
              onPress={handleSyncPress}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  
  content: {
    flex: 1,
  },
  
  mainContent: {
    flex: 1,
  },
  
  syncStatusContainer: {
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
  },
});