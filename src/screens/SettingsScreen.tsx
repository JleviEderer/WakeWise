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
      'Your historical sleep data will be kept locally.',
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
          text: 'Clear Everything',
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Wearable Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wearable</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.rowIcon}>
              <View style={styles.iconRing}>
                <View style={styles.iconCore} />
              </View>
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Garmin Connect</Text>
              <Text style={styles.rowSubtitle}>
                {settings.garminConnected ? 'Connected' : 'Not connected'}
              </Text>
            </View>
            {settings.garminConnected ? (
              <TouchableOpacity onPress={handleDisconnectGarmin}>
                <Text style={styles.disconnectText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.connectPill}
                onPress={() => navigation.navigate('GarminConnect')}
              >
                <Text style={styles.connectPillText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Alarm Behavior Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alarm Behavior</Text>
        <View style={styles.card}>
          {/* Confidence Threshold */}
          <View style={styles.cardRowVertical}>
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowTitle}>Confidence Threshold</Text>
              <Text style={styles.rowSubtitle}>
                Only use predicted time when confidence exceeds this level
              </Text>
            </View>
            <View style={styles.thresholdRow}>
              {[30, 40, 50, 60, 70].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.thresholdPill,
                    settings.confidenceThreshold === value &&
                      styles.thresholdPillSelected,
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
          </View>

          <View style={styles.cardDivider} />

          {/* Gradual Volume */}
          <View style={styles.cardRow}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Gradual Volume Ramp</Text>
              <Text style={styles.rowSubtitle}>
                Slowly increase alarm volume
              </Text>
            </View>
            <Switch
              value={settings.gradualVolumeRamp}
              onValueChange={(v) => updateSetting('gradualVolumeRamp', v)}
              trackColor={{
                false: COLORS.surfaceBorder,
                true: COLORS.primaryMuted,
              }}
              thumbColor={
                settings.gradualVolumeRamp ? COLORS.primary : COLORS.textMuted
              }
            />
          </View>

          <View style={styles.cardDivider} />

          {/* Haptic Feedback */}
          <View style={styles.cardRow}>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Haptic Feedback</Text>
              <Text style={styles.rowSubtitle}>
                Vibrate when alarm triggers
              </Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(v) => updateSetting('hapticFeedback', v)}
              trackColor={{
                false: COLORS.surfaceBorder,
                true: COLORS.primaryMuted,
              }}
              thumbColor={
                settings.hapticFeedback ? COLORS.primary : COLORS.textMuted
              }
            />
          </View>
        </View>
      </View>

      {/* Stats Section */}
      {feedbackStats && feedbackStats.totalRatings > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.card}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{feedbackStats.totalRatings}</Text>
                <Text style={styles.statLabel}>Wake ratings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {feedbackStats.averageFeeling.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Avg feeling</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity style={styles.dangerCard} onPress={handleClearData}>
          <Text style={styles.dangerText}>Clear All Data</Text>
          <Text style={styles.dangerSubtext}>
            Remove all alarms, settings, and history
          </Text>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutName}>{APP_INFO.name}</Text>
            <Text style={styles.aboutVersion}>v{APP_INFO.version}</Text>
          </View>
          <Text style={styles.aboutDescription}>{APP_INFO.description}</Text>
        </View>
      </View>

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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  backArrow: {
    fontSize: 18,
    color: COLORS.text,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardRowVertical: {
    padding: 16,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginHorizontal: 16,
  },
  rowIcon: {
    marginRight: 14,
  },
  iconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
  },
  rowContent: {
    flex: 1,
  },
  rowTextContainer: {
    marginBottom: 14,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Connect/Disconnect
  disconnectText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
  },
  connectPill: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectPillText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Threshold pills
  thresholdRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thresholdPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  thresholdPillSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  thresholdText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  thresholdTextSelected: {
    color: COLORS.primary,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Danger card
  dangerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  dangerText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.error,
    marginBottom: 4,
  },
  dangerSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // About
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  aboutName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  aboutVersion: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  aboutDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 18,
  },

  bottomSpacer: {
    height: 20,
  },
});
