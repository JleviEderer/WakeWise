import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/config';
import { RootStackParamList } from '../models/types';
import { feedbackEngine } from '../services/FeedbackEngine';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Feedback'>;
type RouteProps = RouteProp<RootStackParamList, 'Feedback'>;

// Visual representation of feeling levels
const FeelingIcon = ({ level, selected }: { level: number; selected: boolean }) => {
  const color = selected ? COLORS.primary : COLORS.textMuted;
  const heights = [
    [8, 12, 8],     // Terrible - low energy
    [10, 16, 10],   // Groggy
    [14, 20, 14],   // Okay
    [18, 26, 18],   // Good
    [22, 32, 22],   // Great - high energy
  ];
  const h = heights[level - 1];

  return (
    <View style={styles.feelingIcon}>
      <View style={[styles.feelingBar, { height: h[0], backgroundColor: color }]} />
      <View style={[styles.feelingBar, { height: h[1], backgroundColor: color }]} />
      <View style={[styles.feelingBar, { height: h[2], backgroundColor: color }]} />
    </View>
  );
};

const FEELING_OPTIONS = [
  { value: 1, label: 'Terrible' },
  { value: 2, label: 'Groggy' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

export default function FeedbackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const [feeling, setFeeling] = useState<number | null>(null);
  const [alertness, setAlertness] = useState<number | null>(null);
  const [showAlertness, setShowAlertness] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFeelingSelect = (value: number) => {
    setFeeling(value);
  };

  const handleAlertnessSelect = (value: number) => {
    setAlertness(value);
  };

  const handleSubmit = async () => {
    if (!feeling) return;

    const rating = await feedbackEngine.createFeedbackEntry(
      {
        predictedWakeTime: new Date(),
        confidence: 70,
        reasoning: '',
        fallbackTime: new Date(),
        predictedStage: 'light',
      },
      new Date(),
      true
    );

    await feedbackEngine.submitRating(rating, feeling, alertness || undefined);
    setSubmitted(true);

    setTimeout(() => {
      navigation.navigate('Main');
    }, 2000);
  };

  const handleSkipAlertness = () => {
    handleSubmit();
  };

  const handleAskLater = () => {
    handleSubmit();
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.submittedContainer}>
          <View style={styles.successIcon}>
            <View style={styles.successCheck} />
          </View>
          <Text style={styles.submittedTitle}>Thanks!</Text>
          <Text style={styles.submittedText}>
            Your feedback helps improve wake predictions
          </Text>
        </View>
      </View>
    );
  }

  if (showAlertness) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>How alert are you now?</Text>
          <Text style={styles.subtitle}>30 minutes after waking</Text>
        </View>

        <View style={styles.optionsContainer}>
          {FEELING_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                alertness === option.value && styles.optionButtonSelected,
              ]}
              onPress={() => handleAlertnessSelect(option.value)}
              activeOpacity={0.8}
            >
              <FeelingIcon level={option.value} selected={alertness === option.value} />
              <Text
                style={[
                  styles.optionLabel,
                  alertness === option.value && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !alertness && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!alertness}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipAlertness}
          >
            <Text style={styles.skipButtonText}>Skip this question</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning</Text>
        <Text style={styles.title}>How do you feel?</Text>
        <Text style={styles.subtitle}>
          Your feedback helps improve predictions
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {FEELING_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              feeling === option.value && styles.optionButtonSelected,
            ]}
            onPress={() => handleFeelingSelect(option.value)}
            activeOpacity={0.8}
          >
            <FeelingIcon level={option.value} selected={feeling === option.value} />
            <Text
              style={[
                styles.optionLabel,
                feeling === option.value && styles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !feeling && styles.submitButtonDisabled,
          ]}
          onPress={() => setShowAlertness(true)}
          disabled={!feeling}
          activeOpacity={0.85}
        >
          <Text style={styles.submitButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleAskLater}>
          <Text style={styles.skipButtonText}>Ask me later</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 100,
    flexGrow: 1,
  },
  header: {
    marginBottom: 48,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  optionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    paddingTop: 20,
    alignItems: 'center',
    width: '18%',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  feelingIcon: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 36,
    gap: 3,
    marginBottom: 10,
  },
  feelingBar: {
    width: 6,
    borderRadius: 3,
  },
  optionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  actionContainer: {
    marginTop: 'auto',
    paddingBottom: 40,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  submittedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
  },
  submittedTitle: {
    fontSize: 26,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 10,
  },
  submittedText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
