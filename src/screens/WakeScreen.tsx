import React, { useState, useEffect, useRef } from 'react';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Wake'>;
type RouteProps = RouteProp<RootStackParamList, 'Wake'>;

// Moon icon for snooze
const MoonIcon = () => (
  <View style={styles.moonIcon}>
    <View style={styles.moonBody} />
    <View style={styles.moonShadow} />
  </View>
);

// Sun icon for wake
const SunIcon = () => (
  <View style={styles.sunIcon}>
    <View style={styles.sunCore} />
    <View style={[styles.sunRay, { transform: [{ rotate: '0deg' }] }]} />
    <View style={[styles.sunRay, { transform: [{ rotate: '45deg' }] }]} />
    <View style={[styles.sunRay, { transform: [{ rotate: '90deg' }] }]} />
    <View style={[styles.sunRay, { transform: [{ rotate: '135deg' }] }]} />
  </View>
);

export default function WakeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [snoozed, setSnoozed] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.7,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Vibration
    const vibrationPattern = [0, 500, 200, 500, 200, 500];
    Vibration.vibrate(vibrationPattern, true);

    return () => {
      clearInterval(timer);
      Vibration.cancel();
    };
  }, []);

  const handleSnooze = async () => {
    Vibration.cancel();
    await alarmService.snoozeAlarm(5);
    setSnoozed(true);
    setTimeout(() => {
      navigation.goBack();
    }, 2000);
  };

  const handleDismiss = async () => {
    Vibration.cancel();
    await alarmService.dismissAlarm();
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
          <View style={styles.snoozedIconContainer}>
            <MoonIcon />
          </View>
          <Text style={styles.snoozedTitle}>Snoozed</Text>
          <Text style={styles.snoozedSubtitle}>5 more minutes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Time display */}
      <View style={styles.timeContainer}>
        <Text style={styles.date}>{formatDate(currentTime)}</Text>
        <Animated.View
          style={[
            styles.timeWrapper,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Animated.View style={[styles.timeGlow, { opacity: glowAnim }]} />
          <Text style={styles.time}>{formatTime(currentTime)}</Text>
        </Animated.View>
        <View style={styles.wakeMessageContainer}>
          <Text style={styles.wakeMessage}>Time to rise</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.snoozeButton}
          onPress={handleSnooze}
          activeOpacity={0.8}
        >
          <View style={styles.snoozeIconContainer}>
            <MoonIcon />
          </View>
          <Text style={styles.snoozeText}>Snooze</Text>
          <Text style={styles.snoozeHint}>5 minutes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          activeOpacity={0.85}
        >
          <View style={styles.dismissIconContainer}>
            <SunIcon />
          </View>
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
    padding: 24,
    paddingTop: 100,
    paddingBottom: 60,
  },
  timeContainer: {
    alignItems: 'center',
  },
  date: {
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  timeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeGlow: {
    position: 'absolute',
    width: 280,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
  },
  time: {
    fontSize: 80,
    fontWeight: '200',
    color: COLORS.text,
    letterSpacing: -3,
  },
  wakeMessageContainer: {
    marginTop: 24,
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  wakeMessage: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  actionsContainer: {
    gap: 14,
  },
  snoozeButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  snoozeIconContainer: {
    marginBottom: 10,
  },
  snoozeText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '500',
  },
  snoozeHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  dismissButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 26,
    alignItems: 'center',
  },
  dismissIconContainer: {
    marginBottom: 10,
  },
  dismissText: {
    fontSize: 20,
    color: COLORS.background,
    fontWeight: '600',
  },
  snoozedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoozedIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  snoozedTitle: {
    fontSize: 28,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  snoozedSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  // Moon icon
  moonIcon: {
    width: 32,
    height: 32,
    position: 'relative',
  },
  moonBody: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    position: 'absolute',
  },
  moonShadow: {
    width: 20,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    position: 'absolute',
    right: 0,
  },

  // Sun icon
  sunIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunCore: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    position: 'absolute',
  },
  sunRay: {
    position: 'absolute',
    width: 40,
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
  },
});
