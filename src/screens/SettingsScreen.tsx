import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, APP_INFO } from '../constants/config';
import { RootStackParamList, UserSettings } from '../models/types';
import { storageService } from '../services/StorageService';
import { garminService } from '../services/GarminService';
import { feedbackEngine } from '../services/FeedbackEngine';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<{
    totalRatings: number;
    averageFeeling: number;
  } | null>(null);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    const s = await storageService.getUserSettings();
    setSettings(s);
  };

  const loadStats = async () => {
    const stats = await feedbackEngine.getStats();
    setFeedbackStats({
      totalRatings: stats.totalRatings,
      averageFeeling: stats.averageFeeling,
    });
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await storageService.saveUserSettings({ [key]: value });
  };

  const handleDisconnectGarmin = async () => {
    Alert.alert(
      'Disconnect Garmin',
      'Are you sure? Your historical sleep data will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await garminService.disconnect();
            await loadSettings();
          },
        },
      ]
    );
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your sleep data, alarms, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await storageService.clearAllData();
            await loadSettings();
            await loadStats();
          },
        },
      ]
    );
  };

  if (!settings) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Garmin Connection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wearable</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>Garmin Connect</Text>
              <Text style={styles.rowSubtitle}>
                {settings.garminConnected ? 'Connected' : 'Not connected'}
              </Text>
            </View>
            {settings.garminConnected ? (
              <TouchableOpacity onPress={handleDisconnectGarmin}>
                <Text style={styles.disconnectButton}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => navigation.navigate('GarminConnect')}
              >
                <Text style={styles.connectButton}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Alarm Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alarm Behavior</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Confidence Threshold</Text>
              <Text style={styles.rowSubtitle}>
                Use predicted time only when confidence is above{' '}
                {settings.confidenceThreshold}%
              </Text>
            </View>
          </View>

          <View style={styles.thresholdButtons}>
            {[30, 40, 50, 60, 70].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.thresholdButton,
                  settings.confidenceThreshold === value &&
                    styles.thresholdButtonSelected,
                ]}
                onPress={() => updateSetting('confidenceThreshold', value)}
              >
                <Text
                  style={[
                    styles.thresholdText,
                    settings.confidenceThreshold === value &&
                      styles.thresholdTextSelected,
                  ]}
                >
                  {value}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowTitle}>Gradual Volume Ramp</Text>
            <Switch
              value={settings.gradualVolumeRamp}
              onValueChange={(v) => updateSetting('gradualVolumeRamp', v)}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
            />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowTitle}>Haptic Feedback</Text>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(v) => updateSetting('hapticFeedback', v)}
              trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
            />
          </View>
        </View>
      </View>

      {/* Stats */}
      {feedbackStats && feedbackStats.totalRatings > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.card}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{feedbackStats.totalRatings}</Text>
                <Text style={styles.statLabel}>Wake ratings</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {feedbackStats.averageFeeling.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Avg feeling (1-5)</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleClearData}>
            <Text style={styles.dangerText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{APP_INFO.name}</Text>
            <Text style={styles.rowSubtitle}>v{APP_INFO.version}</Text>
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    gap: 16,
  },
  backButton: {
    color: COLORS.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    color: COLORS.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  connectButton: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  disconnectButton: {
    color: COLORS.error,
    fontSize: 16,
  },
  thresholdButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  thresholdButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  thresholdButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  thresholdText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  thresholdTextSelected: {
    color: COLORS.text,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dangerText: {
    color: COLORS.error,
    fontSize: 16,
  },
});
