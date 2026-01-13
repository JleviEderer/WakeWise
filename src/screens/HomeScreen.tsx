import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/config';
import { RootStackParamList, WakeWindow, WakePrediction } from '../models/types';
import { storageService } from '../services/StorageService';
import { garminService } from '../services/GarminService';
import { wakePredictorService } from '../services/WakePredictorService';
import { alarmService } from '../services/AlarmService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isConnected, setIsConnected] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<WakeWindow | null>(null);
  const [prediction, setPrediction] = useState<WakePrediction | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    // Check Garmin connection
    const connected = await garminService.initialize();
    setIsConnected(connected);

    // Get active alarm
    const windows = await storageService.getWakeWindows();
    const today = new Date().getDay();
    const activeWindow = windows.find(
      (w) => w.enabled && w.repeatDays.includes(today)
    );
    setActiveAlarm(activeWindow || null);

    // Generate prediction if we have an active alarm
    if (activeWindow && connected) {
      const estimatedBedtime = new Date();
      estimatedBedtime.setHours(23, 0, 0, 0);

      const pred = await wakePredictorService.generatePrediction(
        activeWindow,
        estimatedBedtime
      );
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
      // Could show confirmation toast here
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return COLORS.success;
    if (confidence >= 40) return COLORS.warning;
    return COLORS.error;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>WakeWise</Text>
        <Text style={styles.subtitle}>Wake up refreshed</Text>
      </View>

      {/* Connection Status */}
      {!isConnected && (
        <TouchableOpacity
          style={styles.connectCard}
          onPress={() => navigation.navigate('GarminConnect')}
        >
          <Text style={styles.connectTitle}>Connect Your Garmin</Text>
          <Text style={styles.connectText}>
            Link your Garmin account to enable smart wake predictions
          </Text>
          <View style={styles.connectButton}>
            <Text style={styles.connectButtonText}>Connect</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Active Alarm Card */}
      {activeAlarm ? (
        <View style={styles.alarmCard}>
          <View style={styles.alarmHeader}>
            <Text style={styles.alarmLabel}>Next Alarm</Text>
            <Text style={styles.alarmName}>{activeAlarm.name}</Text>
          </View>

          <View style={styles.timeContainer}>
            <Text style={styles.hardTime}>{activeAlarm.hardWakeTime}</Text>
            <Text style={styles.timeLabel}>Latest wake time</Text>
          </View>

          <View style={styles.windowInfo}>
            <Text style={styles.windowText}>
              Wake window: {activeAlarm.windowDurationMinutes} min before
            </Text>
          </View>

          {/* Prediction */}
          {prediction && isConnected && (
            <View style={styles.predictionContainer}>
              <View style={styles.predictionHeader}>
                <Text style={styles.predictionLabel}>Predicted Optimal Time</Text>
                <View
                  style={[
                    styles.confidenceBadge,
                    { backgroundColor: getConfidenceColor(prediction.confidence) },
                  ]}
                >
                  <Text style={styles.confidenceText}>
                    {prediction.confidence}%
                  </Text>
                </View>
              </View>

              <Text style={styles.predictedTime}>
                {prediction.predictedWakeTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>

              <Text style={styles.predictionReasoning}>
                {prediction.reasoning}
              </Text>

              <TouchableOpacity
                style={styles.setAlarmButton}
                onPress={handleSetAlarm}
              >
                <Text style={styles.setAlarmButtonText}>Set Smart Alarm</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isConnected && (
            <Text style={styles.noDataText}>
              Connect Garmin to enable smart predictions
            </Text>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.noAlarmCard}
          onPress={() => navigation.navigate('AlarmSetup', {})}
        >
          <Text style={styles.noAlarmTitle}>No Alarm Set</Text>
          <Text style={styles.noAlarmText}>
            Tap to create your first wake window
          </Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AlarmSetup', {})}
        >
          <Text style={styles.actionIcon}>+</Text>
          <Text style={styles.actionText}>New Alarm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.actionIcon}>⚙</Text>
          <Text style={styles.actionText}>Settings</Text>
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
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  connectCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  connectText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  connectButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 16,
  },
  alarmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  alarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alarmLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  alarmName: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  hardTime: {
    fontSize: 56,
    fontWeight: '300',
    color: COLORS.text,
  },
  timeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  windowInfo: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  windowText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  predictionContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingTop: 16,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 12,
  },
  predictedTime: {
    fontSize: 32,
    fontWeight: '500',
    color: COLORS.primary,
    marginBottom: 8,
  },
  predictionReasoning: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  setAlarmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  setAlarmButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 16,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noAlarmCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surfaceLight,
    borderStyle: 'dashed',
  },
  noAlarmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  noAlarmText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '45%',
  },
  actionIcon: {
    fontSize: 24,
    color: COLORS.primary,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
});
