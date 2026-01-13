import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/config';
import { RootStackParamList } from '../models/types';
import { storageService } from '../services/StorageService';
import { alarmService } from '../services/AlarmService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

// Custom icon components
const SunriseIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.sunBody} />
    <View style={styles.horizon} />
    <View style={[styles.ray, styles.ray1]} />
    <View style={[styles.ray, styles.ray2]} />
    <View style={[styles.ray, styles.ray3]} />
  </View>
);

const WatchIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.watchFace}>
      <View style={styles.watchHand} />
    </View>
    <View style={styles.watchBandT} />
    <View style={styles.watchBandB} />
  </View>
);

const TargetIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.targetRing1}>
      <View style={styles.targetRing2}>
        <View style={styles.targetDot} />
      </View>
    </View>
  </View>
);

const ChartIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.chartBars}>
      <View style={[styles.chartBar, { height: 24 }]} />
      <View style={[styles.chartBar, { height: 40 }]} />
      <View style={[styles.chartBar, { height: 32 }]} />
      <View style={[styles.chartBar, { height: 48 }]} />
    </View>
  </View>
);

const SLIDES = [
  {
    Icon: SunriseIcon,
    title: 'Wake Up Refreshed',
    description:
      'WakeWise finds the optimal moment to wake you—during light sleep when you\'ll feel most alert.',
  },
  {
    Icon: WatchIcon,
    title: 'Connect Your Wearable',
    description:
      'Link your Garmin to import sleep patterns. More data means more accurate predictions.',
  },
  {
    Icon: TargetIcon,
    title: 'Set Your Window',
    description:
      'Tell us your deadline and flexibility. We\'ll find the best moment within your range.',
  },
  {
    Icon: ChartIcon,
    title: 'Honest Predictions',
    description:
      'We show confidence levels. If we\'re unsure, we default to your safe wake time.',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (nextSlide: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentSlide(nextSlide);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = async () => {
    if (currentSlide < SLIDES.length - 1) {
      animateTransition(currentSlide + 1);
    } else {
      await alarmService.requestPermissions();
      await storageService.saveUserSettings({ onboardingCompleted: true });
      navigation.replace('Main');
    }
  };

  const handleSkip = async () => {
    await alarmService.requestPermissions();
    await storageService.saveUserSettings({ onboardingCompleted: true });
    navigation.replace('Main');
  };

  const slide = SLIDES[currentSlide];
  const isLastSlide = currentSlide === SLIDES.length - 1;
  const IconComponent = slide.Icon;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconWrapper}>
          <View style={styles.iconGlow} />
          <IconComponent />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentSlide && styles.dotActive]}
          />
        ))}
      </View>

      {/* Button */}
      <TouchableOpacity
        style={styles.nextButton}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.nextButtonText}>
          {isLastSlide ? 'Get Started' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    paddingTop: 60,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 10,
    marginRight: -10,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.primaryMuted,
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sunrise icon
  sunBody: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    bottom: 10,
  },
  horizon: {
    position: 'absolute',
    bottom: 10,
    width: 70,
    height: 3,
    backgroundColor: COLORS.surfaceBorder,
    borderRadius: 2,
  },
  ray: {
    position: 'absolute',
    width: 3,
    height: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    bottom: 55,
  },
  ray1: { transform: [{ rotate: '-30deg' }], left: 20 },
  ray2: { transform: [{ rotate: '0deg' }] },
  ray3: { transform: [{ rotate: '30deg' }], right: 20 },

  // Watch icon
  watchFace: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchHand: {
    width: 3,
    height: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  watchBandT: {
    position: 'absolute',
    top: 8,
    width: 22,
    height: 10,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  watchBandB: {
    position: 'absolute',
    bottom: 8,
    width: 22,
    height: 10,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },

  // Target icon
  targetRing1: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetRing2: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  // Chart icon
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 50,
  },
  chartBar: {
    width: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  title: {
    fontSize: 26,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceBorder,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  nextButtonText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '600',
  },
});
