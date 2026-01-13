import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/config';
import { RootStackParamList } from '../models/types';
import { garminService } from '../services/GarminService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Custom icon components
const WatchIcon = () => (
  <View style={styles.watchIcon}>
    <View style={styles.watchFace}>
      <View style={styles.watchDot} />
    </View>
    <View style={styles.watchBandTop} />
    <View style={styles.watchBandBottom} />
  </View>
);

const ShieldIcon = () => (
  <View style={styles.shieldIcon}>
    <View style={styles.shieldBody}>
      <View style={styles.shieldCheck} />
    </View>
  </View>
);

const WaveIcon = () => (
  <View style={styles.waveIcon}>
    <View style={[styles.waveLine, styles.waveLine1]} />
    <View style={[styles.waveLine, styles.waveLine2]} />
    <View style={[styles.waveLine, styles.waveLine3]} />
  </View>
);

const TargetIcon = () => (
  <View style={styles.targetIcon}>
    <View style={styles.targetOuter}>
      <View style={styles.targetInner}>
        <View style={styles.targetCenter} />
      </View>
    </View>
  </View>
);

export default function GarminConnectScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await garminService.connect();
      if (success) {
        setIsConnected(true);
        handleSync();
      } else {
        Alert.alert(
          'Connection Failed',
          'Could not connect to Garmin. Please try again.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while connecting to Garmin.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await garminService.syncRecentSleepData(30);
      Alert.alert(
        'Success',
        'Your sleep data has been synced. WakeWise will now analyze your patterns.',
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Sync Note',
        'Connected successfully but could not sync sleep data yet. Your data will sync automatically later.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Hero Icon */}
        <View style={styles.heroContainer}>
          <View style={styles.heroGlow} />
          <WatchIcon />
        </View>

        <Text style={styles.title}>Connect Wearable</Text>
        <Text style={styles.description}>
          Link your Garmin to enable intelligent wake predictions based on your
          sleep patterns
        </Text>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={styles.featureIconContainer}>
              <ShieldIcon />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Private & Secure</Text>
              <Text style={styles.featureDescription}>
                Data stays on your device
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIconContainer}>
              <WaveIcon />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Sleep Stages</Text>
              <Text style={styles.featureDescription}>
                Deep, light, and REM analysis
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIconContainer}>
              <TargetIcon />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Smart Predictions</Text>
              <Text style={styles.featureDescription}>
                More data, better accuracy
              </Text>
            </View>
          </View>
        </View>

        {/* Connect / Connected State */}
        {isConnected ? (
          <View style={styles.connectedContainer}>
            <View style={styles.successIcon}>
              <View style={styles.successCheck} />
            </View>
            <Text style={styles.connectedText}>Connected</Text>
            {isSyncing && (
              <View style={styles.syncingContainer}>
                <ActivityIndicator color={COLORS.primary} size="small" />
                <Text style={styles.syncingText}>Syncing sleep data...</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={isConnecting}
            activeOpacity={0.85}
          >
            {isConnecting ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.connectButtonText}>Connect with Garmin</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.note}>
          You'll be redirected to Garmin to authorize
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 10,
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 20,
  },

  // Hero icon
  heroContainer: {
    marginBottom: 28,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryMuted,
  },
  watchIcon: {
    width: 64,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchFace: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  watchBandTop: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 12,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  watchBandBottom: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 12,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },

  title: {
    fontSize: 26,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },

  // Features
  features: {
    width: '100%',
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Mini icons
  shieldIcon: {
    width: 20,
    height: 22,
    alignItems: 'center',
  },
  shieldBody: {
    width: 18,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCheck: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  waveIcon: {
    width: 20,
    height: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  waveLine: {
    width: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  waveLine1: {
    height: 8,
  },
  waveLine2: {
    height: 14,
  },
  waveLine3: {
    height: 10,
  },
  targetIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetCenter: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },

  // Connect button
  connectButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  note: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Connected state
  connectedContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  connectedText: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.success,
  },
  syncingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  syncingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
