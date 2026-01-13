import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/config';
import { RootStackParamList } from '../models/types';
import { storageService } from '../services/StorageService';
import { alarmService } from '../services/AlarmService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '🌅',
    title: 'Wake Up Better',
    description:
      'WakeWise uses your sleep data to find the optimal moment to wake you—when you\'re naturally in light sleep.',
  },
  {
    icon: '⌚',
    title: 'Connect Your Wearable',
    description:
      'Link your Garmin, Fitbit, or other wearable to import your sleep patterns. The more data, the better the predictions.',
  },
  {
    icon: '🎯',
    title: 'Set Your Wake Window',
    description:
      'Tell us your hard deadline and how much flexibility you have. We\'ll find the best moment within your window.',
  },
  {
    icon: '📊',
    title: 'Honest Confidence',
    description:
      'We show you our confidence level. If we\'re not sure, we\'ll default to your safe wake time. No false promises.',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = async () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Request notification permissions
      await alarmService.requestPermissions();

      // Mark onboarding complete
      await storageService.saveUserSettings({ onboardingCompleted: true });

      // Navigate to main app
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

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.icon}>{slide.icon}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentSlide && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {isLastSlide ? 'Get Started' : 'Next'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    paddingTop: 60,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    fontSize: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceLight,
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
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
});
