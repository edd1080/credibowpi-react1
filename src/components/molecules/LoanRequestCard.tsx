import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '../atoms';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { MaterialIcons } from '@expo/vector-icons';

export type LoanRequestStatus = 'active' | 'under_review' | 'approved' | 'rejected';

export interface LoanRequestCardProps {
  id: string;
  applicantName: string;
  currentStage: string;
  progress: number; // 0-100
  stage: string;
  requestedAmount: number;
  status: LoanRequestStatus;
  contextLabel?: string; // Optional pill at top
  onPress?: () => void;
}

export const LoanRequestCard: React.FC<LoanRequestCardProps> = ({
  id,
  applicantName,
  currentStage,
  progress,
  stage,
  requestedAmount,
  status,
  contextLabel,
  onPress,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          icon: 'info',
          iconBg: '#E3F2FD', // Light blue
          iconColor: colors.primary.blue,
          badgeText: 'Activa',
          badgeBg: colors.primary.blue,
          progressColor: colors.primary.blue,
        };
      case 'under_review':
        return {
          icon: 'schedule',
          iconBg: '#FFF8E1', // Light amber
          iconColor: '#FFC447',
          badgeText: 'En Revisión',
          badgeBg: '#FFC447',
          progressColor: '#FFC447',
        };
      case 'approved':
        return {
          icon: 'check-circle',
          iconBg: '#E8F5E9', // Light green
          iconColor: '#33A853',
          badgeText: 'Aprobada',
          badgeBg: '#33A853',
          progressColor: '#33A853',
        };
      case 'rejected':
        return {
          icon: 'cancel',
          iconBg: '#FFEBEE', // Light red
          iconColor: '#E55252',
          badgeText: 'Rechazada',
          badgeBg: '#E55252',
          progressColor: '#E55252',
        };
    }
  };

  const statusConfig = getStatusConfig();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, onPress && styles.containerTouchable]}
      onPress={onPress}
      activeOpacity={onPress ? 0.96 : 1}
    >
      {/* Optional context label */}
      {contextLabel && (
        <View style={styles.contextLabelContainer}>
          <Typography variant="bodyS" color="secondary" style={styles.contextLabel}>
            {contextLabel}
          </Typography>
        </View>
      )}

      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.leftSection}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: statusConfig.iconBg }]}>
            <MaterialIcons
              name={statusConfig.icon as any}
              size={24}
              color={statusConfig.iconColor}
            />
          </View>

          {/* ID and Name */}
          <View style={styles.nameSection}>
            <Typography variant="bodyS" color="secondary" style={styles.requestId}>
              {id}
            </Typography>
            <Typography variant="h3" color="primary" weight="bold" style={styles.applicantName}>
              {applicantName}
            </Typography>
          </View>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.badgeBg }]}>
          <Typography variant="label" style={styles.statusText}>
            {statusConfig.badgeText}
          </Typography>
        </View>
      </View>

      {/* Progress row */}
      <View style={styles.progressRow}>
        <Typography variant="bodyM" color="primary" style={styles.currentStage}>
          {currentStage}
        </Typography>
        
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={styles.progressTrack} />
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: statusConfig.progressColor,
                },
              ]}
            />
          </View>
          <Typography variant="bodyS" color="secondary" style={styles.progressText}>
            {progress}%
          </Typography>
        </View>
      </View>

      {/* Footer row */}
      <View style={styles.footerRow}>
        <View style={styles.stageSection}>
          <Typography variant="label" color="secondary" style={styles.label}>
            Etapa:
          </Typography>
          <Typography variant="bodyM" color="primary" style={styles.stageValue}>
            {stage}
          </Typography>
        </View>

        <View style={styles.amountSection}>
          <Typography variant="label" color="secondary" style={styles.label}>
            Monto solicitado
          </Typography>
          <Typography variant="bodyM" color="primary" weight="bold" style={styles.amountValue}>
            {formatAmount(requestedAmount)}
          </Typography>
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: colors.text.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  containerTouchable: {
    // Add press state styles if needed
  },

  contextLabelContainer: {
    marginBottom: spacing.space12,
  },

  contextLabel: {
    // Additional styles if needed
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space12,
  },

  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.space12,
  },

  nameSection: {
    flex: 1,
  },

  requestId: {
    marginBottom: 2,
  },

  applicantName: {
    // Text will be truncated by Typography component if needed
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusText: {
    color: colors.text.inverse,
  },

  progressRow: {
    marginBottom: spacing.space12,
  },

  currentStage: {
    marginBottom: spacing.space8,
  },

  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressBar: {
    flex: 1,
    height: 6,
    marginRight: spacing.space12,
    position: 'relative',
  },

  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.neutral.gray300,
    borderRadius: 3,
  },

  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 6,
    borderRadius: 3,
  },

  progressText: {
    minWidth: 35,
    textAlign: 'right',
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  stageSection: {
    flex: 1,
  },

  amountSection: {
    alignItems: 'flex-end',
  },

  label: {
    marginBottom: 2,
  },

  stageValue: {
    // Additional styles if needed
  },

  amountValue: {
    // Additional styles if needed
  },
});