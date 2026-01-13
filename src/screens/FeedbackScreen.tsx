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

const FEELING_OPTIONS = [
  { value: 1, emoji: '😫', label: 'Terrible' },
  { value: 2, emoji: '😴', label: 'Groggy' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
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

    // In a real implementation, we'd pass the actual prediction data
    // For now, create a basic feedback entry
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

    // Go home after delay
    setTimeout(() => {
      navigation.navigate('Main');
    }, 2000);
  };

  const handleSkipAlertness = () => {
    handleSubmit();
  };

  const handleAskLater = () => {
    // Could schedule a notification for 30 min later
    handleSubmit();
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.submittedContainer}>
          <Text style={styles.submittedIcon}>✓</Text>
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
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
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkipAlertness}>
            <Text style={styles.skipButtonText}>Skip this question</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning!</Text>
        <Text style={styles.title}>How do you feel?</Text>
        <Text style={styles.subtitle}>Your feedback helps improve predictions</Text>
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
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
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
    padding: 20,
    paddingTop: 80,
    flexGrow: 1,
  },
  header: {
    marginBottom: 40,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  optionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '18%',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  submittedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  submittedIcon: {
    fontSize: 64,
    color: COLORS.success,
    marginBottom: 20,
  },
  submittedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  submittedText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
