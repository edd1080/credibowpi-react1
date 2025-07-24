import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Typography } from '../components/atoms';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';



interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-complete after 2 seconds maximum
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onAnimationComplete]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo placeholder - in a real app, this would be an image */}
        <View style={styles.logoPlaceholder}>
          <Typography variant="h1" color="inverse" weight="bold">
            CB
          </Typography>
        </View>
        
        <Typography
          variant="h2"
          color="inverse"
          weight="bold"
          style={styles.brandName}
        >
          CrediBowpi
        </Typography>
        
        <Typography
          variant="bodyM"
          color="inverse"
          style={styles.tagline}
        >
          Crédito digital para el campo
        </Typography>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.space24,
    shadowColor: colors.neutral.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  brandName: {
    marginBottom: spacing.space8,
    textAlign: 'center',
  },
  
  tagline: {
    textAlign: 'center',
    opacity: 0.9,
  },
});