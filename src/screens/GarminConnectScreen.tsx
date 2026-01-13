import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../constants/config';
import { RootStackParamList } from '../models/types';
import { garminService } from '../services/GarminService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
        // Start syncing data
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
        'Success!',
        'Your sleep data has been synced. WakeWise will now analyze your patterns.',
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Sync Warning',
        'Connected successfully but could not sync sleep data. This may be due to API limits. Your data will sync automatically later.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>⌚</Text>
        <Text style={styles.title}>Connect Garmin</Text>
        <Text style={styles.description}>
          Link your Garmin account to enable smart wake predictions based on your
          sleep patterns.
        </Text>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔒</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Private & Secure</Text>
              <Text style={styles.featureDescription}>
                Your data stays on your device
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Sleep Stages</Text>
              <Text style={styles.featureDescription}>
                We analyze deep, light, and REM patterns
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎯</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Better Predictions</Text>
              <Text style={styles.featureDescription}>
                More data = more accurate wake times
              </Text>
            </View>
          </View>
        </View>

        {isConnected ? (
          <View style={styles.connectedContainer}>
            <Text style={styles.connectedIcon}>✓</Text>
            <Text style={styles.connectedText}>Connected!</Text>
            {isSyncing && (
              <View style={styles.syncingContainer}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.syncingText}>Syncing sleep data...</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.connectButtonText}>Connect with Garmin</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.note}>
          You'll be redirected to Garmin's website to authorize access.
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
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    color: COLORS.primary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  features: {
    width: '100%',
    marginBottom: 30,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  connectButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  connectedContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  connectedIcon: {
    fontSize: 48,
    color: COLORS.success,
    marginBottom: 12,
  },
  connectedText: {
    fontSize: 20,
    fontWeight: '600',
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
