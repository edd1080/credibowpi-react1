import React from 'react';
import { 
  HugeIconProps,
  Add01Icon,
  Analytics01Icon,
  TrendingUpIcon,
  FileEditIcon,
  AssignmentIcon,
  Edit01Icon,
  SyncIcon,
  SyncProblemIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Alert01Icon,
  Home01Icon,
  User01Icon,
  Settings01Icon,
  RefreshIcon,
  Search01Icon,
  WifiOffIcon,
  CloudIcon,
  CloudUploadIcon,
  ViewIcon,
  ViewOffIcon,
  Fingerprint01Icon,
  Clock01Icon,
  HourglassIcon,
  Folder01Icon,
  Attachment01Icon,
  Notification01Icon,
  Mail01Icon,
  DashboardSquare01Icon,
} from '@hugeicons/react-native';
import { colors } from '../../constants/colors';

export interface IconProps extends Omit<HugeIconProps, 'size' | 'color'> {
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps & { name: string }> = ({
  name,
  size = 24,
  color = colors.text.primary,
  ...props
}) => {
  // This is a fallback, but we'll use the specific icon components below
  return <DashboardSquare01Icon size={size} color={color} {...props} />;
};

// Predefined HugeIcons for common use cases
export const Icons = {
  // Dashboard & Metrics
  dashboard: (props?: Partial<IconProps>) => (
    <DashboardSquare01Icon size={24} color={colors.text.primary} {...props} />
  ),
  analytics: (props?: Partial<IconProps>) => (
    <Analytics01Icon size={24} color={colors.text.primary} {...props} />
  ),
  trending_up: (props?: Partial<IconProps>) => (
    <TrendingUpIcon size={24} color={colors.text.primary} {...props} />
  ),
  
  // Applications & Forms
  description: (props?: Partial<IconProps>) => (
    <FileEditIcon size={24} color={colors.text.primary} {...props} />
  ),
  assignment: (props?: Partial<IconProps>) => (
    <AssignmentIcon size={24} color={colors.text.primary} {...props} />
  ),
  edit: (props?: Partial<IconProps>) => (
    <Edit01Icon size={24} color={colors.text.primary} {...props} />
  ),
  
  // Sync & Status
  sync: (props?: Partial<IconProps>) => (
    <SyncIcon size={24} color={colors.text.primary} {...props} />
  ),
  sync_problem: (props?: Partial<IconProps>) => (
    <SyncProblemIcon size={24} color={colors.text.primary} {...props} />
  ),
  check_circle: (props?: Partial<IconProps>) => (
    <CheckmarkCircle01Icon size={24} color={colors.text.primary} {...props} />
  ),
  error: (props?: Partial<IconProps>) => (
    <AlertCircleIcon size={24} color={colors.text.primary} {...props} />
  ),
  warning: (props?: Partial<IconProps>) => (
    <Alert01Icon size={24} color={colors.text.primary} {...props} />
  ),
  
  // Navigation
  home: (props?: Partial<IconProps>) => (
    <Home01Icon size={24} color={colors.text.primary} {...props} />
  ),
  person: (props?: Partial<IconProps>) => (
    <User01Icon size={24} color={colors.text.primary} {...props} />
  ),
  settings: (props?: Partial<IconProps>) => (
    <Settings01Icon size={24} color={colors.text.primary} {...props} />
  ),
  
  // Actions
  add: (props?: Partial<IconProps>) => (
    <Add01Icon size={24} color={colors.text.primary} {...props} />
  ),
  refresh: (props?: Partial<IconProps>) => (
    <RefreshIcon size={24} color={colors.text.primary} {...props} />
  ),
  search: (props?: Partial<IconProps>) => (
    <Search01Icon size={24} color={colors.text.primary} {...props} />
  ),
  
  // Status indicators
  wifi_off: (props?: Partial<IconProps>) => (
    <WifiOffIcon size={24} color={colors.text.primary} {...props} />
  ),
  cloud_done: (props?: Partial<IconProps>) => (
    <CloudIcon size={24} color={colors.text.primary} {...props} />
  ),
  cloud_upload: (props?: Partial<IconProps>) => (
    <CloudUploadIcon size={24} color={colors.text.primary} {...props} />
  ),
  
  // Authentication
  visibility: (props?: Partial<IconProps>) => (
    <ViewIcon size={24} color={colors.text.primary} {...props} />
  ),
  visibility_off: (props?: Partial<IconProps>) => (
    <ViewOffIcon size={24} color={colors.text.primary} {...props} />
  ),
  fingerprint: (props?: Partial<IconProps>) => (
    <Fingerprint01Icon size={24} color={colors.text.primary} {...props} />
  ),
  
  // Time & Progress
  schedule: (props?: Partial<IconProps>) => (
    <Clock01Icon size={24} color={colors.text.primary} {...props} />
  ),
  hourglass_empty: (props?: Partial<IconProps>) => (
    <HourglassIcon size={24} color={colors.text.primary} {...props} />
  ),
  
  // Documents
  folder: (props?: Partial<IconProps>) => (
    <Folder01Icon size={24} color={colors.text.primary} {...props} />
  ),
  attach_file: (props?: Partial<IconProps>) => (
    <Attachment01Icon size={24} color={colors.text.primary} {...props} />
  ),
  
  // Communication
  notifications: (props?: Partial<IconProps>) => (
    <Notification01Icon size={24} color={colors.text.primary} {...props} />
  ),
  mail: (props?: Partial<IconProps>) => (
    <Mail01Icon size={24} color={colors.text.primary} {...props} />
  ),
};

export default Icon;