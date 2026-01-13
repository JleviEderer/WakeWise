import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/config';
import { RootStackParamList, WakeWindow, WakePrediction } from '../models/types';
import { storageService } from '../services/StorageService';
import { garminService } from '../services/GarminService';
import { wakePredictorService } from '../services/WakePredictorService';
import { alarmService } from '../services/AlarmService';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Moon phase icon component
const MoonIcon = ({ size = 24, phase = 0.7 }: { size?: number; phase?: number }) => (
  <View style={[styles.moonContainer, { width: size, height: size }]}>
    <View style={[styles.moonFull, { width: size, height: size, borderRadius: size / 2 }]} />
    <View
      style={[
        styles.moonShadow,
        {
          width: size * phase,
          height: size,
          borderTopRightRadius: size / 2,
          borderBottomRightRadius: size / 2,
          right: 0,
        },
      ]}
    />
  </View>
);

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isConnected, setIsConnected] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<WakeWindow | null>(null);
  const [prediction, setPrediction] = useState<WakePrediction | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Breathing animation for the time display
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Gentle breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.02,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Update current time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const connected = await garminService.initialize();
    setIsConnected(connected);

    const windows = await storageService.getWakeWindows();
    const today = new Date().getDay();
    const activeWindow = windows.find((w) => w.enabled && w.repeatDays.includes(today));
    setActiveAlarm(activeWindow || null);

    if (activeWindow && connected) {
      const estimatedBedtime = new Date();
      estimatedBedtime.setHours(23, 0, 0, 0);
      const pred = await wakePredictorService.generatePrediction(activeWindow, estimatedBedtime);
      setPrediction(pred);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (isConnected) {
      try {
        await garminService.syncRecentSleepData(7);
      } catch (error) {
        console.error('Sync error:', error);
      }
    }
    await loadData();
    setRefreshing(false);
  };

  const handleSetAlarm = async () => {
    if (activeAlarm && prediction) {
      await alarmService.scheduleAlarm(prediction, activeAlarm);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 5) return 'Deep night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Time to rest';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 75) return 'Excellent';
    if (confidence >= 50) return 'Good';
    return 'Learning';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Decorative top accent */}
      <View style={styles.topAccent} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <View style={styles.brandRow}>
            <MoonIcon size={20} />
            <Text style={styles.brand}>WakeWise</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.settingsIcon}>
            <View style={styles.settingsDot} />
            <View style={styles.settingsDot} />
            <View style={styles.settingsDot} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Connection Card - Garmin */}
      {!isConnected && (
        <TouchableOpacity
          style={styles.connectCard}
          onPress={() => navigation.navigate('GarminConnect')}
          activeOpacity={0.8}
        >
          <View style={styles.connectCardInner}>
            <View style={styles.connectIconContainer}>
              <View style={styles.connectIconRing}>
                <View style={styles.connectIconCore} />
              </View>
            </View>
            <View style={styles.connectTextContainer}>
              <Text style={styles.connectTitle}>Connect Wearable</Text>
              <Text style={styles.connectSubtitle}>
                Link your Garmin for smart predictions
              </Text>
            </View>
            <View style={styles.connectArrow}>
              <Text style={styles.connectArrowText}>→</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Main Alarm Display */}
      {activeAlarm ? (
        <View style={styles.alarmCard}>
          {/* Decorative glow behind time */}
          <Animated.View style={[styles.timeGlow, { opacity: glowAnim }]} />

          <View style={styles.alarmMeta}>
            <View style={styles.alarmBadge}>
              <Text style={styles.alarmBadgeText}>NEXT WAKE</Text>
            </View>
            <Text style={styles.alarmName}>{activeAlarm.name}</Text>
          </View>

          <Animated.View
            style={[styles.timeContainer, { transform: [{ scale: breatheAnim }] }]}
          >
            <Text style={styles.timeDisplay}>{activeAlarm.hardWakeTime}</Text>
            <Text style={styles.timeLabel}>latest</Text>
          </Animated.View>

          <View style={styles.windowPill}>
            <Text style={styles.windowPillText}>
              {activeAlarm.windowDurationMinutes} min wake window
            </Text>
          </View>

          {/* Prediction Section */}
          {prediction && isConnected && (
            <View style={styles.predictionSection}>
              <View style={styles.predictionDivider} />

              <View style={styles.predictionHeader}>
                <Text style={styles.predictionTitle}>Optimal wake time</Text>
                <View style={styles.confidencePill}>
                  <View style={styles.confidenceDot} />
                  <Text style={styles.confidenceText}>
                    {getConfidenceLabel(prediction.confidence)}
                  </Text>
                </View>
              </View>

              <Text style={styles.predictedTime}>
                {prediction.predictedWakeTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>

              <Text style={styles.predictionReason}>{prediction.reasoning}</Text>

              <TouchableOpacity
                style={styles.setAlarmButton}
                onPress={handleSetAlarm}
                activeOpacity={0.85}
              >
                <Text style={styles.setAlarmButtonText}>Set Smart Alarm</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isConnected && (
            <View style={styles.noConnectionHint}>
              <Text style={styles.noConnectionText}>
                Connect your wearable for intelligent predictions
              </Text>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.emptyAlarmCard}
          onPress={() => navigation.navigate('AlarmSetup', {})}
          activeOpacity={0.8}
        >
          <View style={styles.emptyIconContainer}>
            <View style={styles.emptyIconOuter}>
              <View style={styles.emptyIconInner}>
                <Text style={styles.emptyIconPlus}>+</Text>
              </View>
            </View>
          </View>
          <Text style={styles.emptyTitle}>Create Wake Window</Text>
          <Text style={styles.emptySubtitle}>
            Set your deadline, we'll find the perfect moment
          </Text>
        </TouchableOpacity>
      )}

      {/* Quick Action */}
      <TouchableOpacity
        style={styles.newAlarmButton}
        onPress={() => navigation.navigate('AlarmSetup', {})}
        activeOpacity={0.8}
      >
        <View style={styles.newAlarmIcon}>
          <Text style={styles.newAlarmIconText}>+</Text>
        </View>
        <Text style={styles.newAlarmText}>New Alarm</Text>
      </TouchableOpacity>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
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
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Top decorative accent
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: COLORS.backgroundGradientStart,
    opacity: 0.5,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  settingsButton: {
    padding: 12,
    marginRight: -12,
  },
  settingsIcon: {
    flexDirection: 'column',
    gap: 4,
  },
  settingsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary,
  },

  // Moon icon
  moonContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  moonFull: {
    backgroundColor: COLORS.primary,
    position: 'absolute',
  },
  moonShadow: {
    backgroundColor: COLORS.background,
    position: 'absolute',
  },

  // Connect card
  connectCard: {
    marginBottom: 24,
  },
  connectCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  connectIconContainer: {
    marginRight: 14,
  },
  connectIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectIconCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  connectTextContainer: {
    flex: 1,
  },
  connectTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  connectSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  connectArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectArrowText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // Main alarm card
  alarmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  timeGlow: {
    position: 'absolute',
    top: 60,
    left: '25%',
    right: '25%',
    height: 100,
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    transform: [{ scaleX: 2 }],
  },
  alarmMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  alarmBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  alarmBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  alarmName: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timeDisplay: {
    fontSize: 72,
    fontWeight: '200',
    color: COLORS.text,
    letterSpacing: -4,
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  windowPill: {
    alignSelf: 'center',
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  windowPillText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Prediction section
  predictionSection: {
    marginTop: 24,
  },
  predictionDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginBottom: 20,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  confidenceText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  predictedTime: {
    fontSize: 40,
    fontWeight: '300',
    color: COLORS.primary,
    marginBottom: 8,
  },
  predictionReason: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  setAlarmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  setAlarmButtonText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // No connection hint
  noConnectionHint: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderStyle: 'dashed',
  },
  noConnectionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Empty state
  emptyAlarmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 40,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconPlus: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '300',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // New alarm button
  newAlarmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  newAlarmIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newAlarmIconText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  newAlarmText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },

  bottomSpacer: {
    height: 20,
  },
});
