import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/config';
import { RootStackParamList } from '../models/types';
import { alarmService } from '../services/AlarmService';
import { feedbackEngine } from '../services/FeedbackEngine';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Wake'>;
type RouteProps = RouteProp<RootStackParamList, 'Wake'>;

export default function WakeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pulseAnim] = useState(new Animated.Value(1));
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Start pulse animation
    startPulseAnimation();

    // Vibrate pattern
    const vibrationPattern = [0, 500, 200, 500, 200, 500];
    Vibration.vibrate(vibrationPattern, true);

    return () => {
      clearInterval(timer);
      Vibration.cancel();
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleSnooze = async () => {
    Vibration.cancel();
    await alarmService.snoozeAlarm(5);
    setSnoozed(true);

    // Go back after showing snoozed message
    setTimeout(() => {
      navigation.goBack();
    }, 2000);
  };

  const handleDismiss = async () => {
    Vibration.cancel();
    await alarmService.dismissAlarm();

    // Navigate to feedback screen
    navigation.replace('Feedback', {
      wakeSessionId: route.params.predictionId,
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (snoozed) {
    return (
      <View style={styles.container}>
        <View style={styles.snoozedContainer}>
          <Text style={styles.snoozedIcon}>💤</Text>
          <Text style={styles.snoozedText}>Snoozed for 5 minutes</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.timeContainer}>
        <Text style={styles.date}>{formatDate(currentTime)}</Text>
        <Animated.Text
          style={[
            styles.time,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {formatTime(currentTime)}
        </Animated.Text>
        <Text style={styles.wakeMessage}>Time to wake up</Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.snoozeButton}
          onPress={handleSnooze}
          activeOpacity={0.7}
        >
          <Text style={styles.snoozeIcon}>💤</Text>
          <Text style={styles.snoozeText}>Snooze</Text>
          <Text style={styles.snoozeHint}>5 minutes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissIcon}>☀️</Text>
          <Text style={styles.dismissText}>I'm Awake</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 100,
    paddingBottom: 60,
  },
  timeContainer: {
    alignItems: 'center',
  },
  date: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  time: {
    fontSize: 72,
    fontWeight: '200',
    color: COLORS.text,
    letterSpacing: -2,
  },
  wakeMessage: {
    fontSize: 20,
    color: COLORS.primary,
    marginTop: 20,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 16,
  },
  snoozeButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
  },
  snoozeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  snoozeText: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '600',
  },
  snoozeHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dismissButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  dismissIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  dismissText: {
    fontSize: 22,
    color: COLORS.text,
    fontWeight: '700',
  },
  snoozedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoozedIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  snoozedText: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
