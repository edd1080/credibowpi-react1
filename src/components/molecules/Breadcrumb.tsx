import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Typography } from '../atoms';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

export interface BreadcrumbItem {
  label: string;
  onPress?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  maxItems?: number;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  maxItems = 3,
}) => {
  // If we have more items than maxItems, show first item, ellipsis, and last few items
  const displayItems = React.useMemo(() => {
    if (items.length <= maxItems) {
      return items;
    }

    const firstItem = items[0];
    const lastItems = items.slice(-(maxItems - 2));
    
    return [
      firstItem,
      { label: '...', onPress: undefined },
      ...lastItems,
    ];
  }, [items, maxItems]);

  return (
    <View style={styles.container}>
      {displayItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <Typography variant="bodyS" color="tertiary" style={styles.separator}>
              /
            </Typography>
          )}
          
          {item.onPress ? (
            <TouchableOpacity onPress={item.onPress} style={styles.itemTouchable}>
              <Typography
                variant="bodyS"
                color="primary"
                style={styles.clickableItem}
              >
                {item.label}
              </Typography>
            </TouchableOpacity>
          ) : (
            <Typography
              variant="bodyS"
              color={index === displayItems.length - 1 ? 'primary' : 'tertiary'}
              weight={index === displayItems.length - 1 ? 'medium' : 'regular'}
              style={styles.item}
            >
              {item.label}
            </Typography>
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space8,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  
  separator: {
    marginHorizontal: spacing.space8,
  },
  
  item: {
    maxWidth: 120,
  },
  
  itemTouchable: {
    maxWidth: 120,
  },
  
  clickableItem: {
    textDecorationLine: 'underline',
  },
});