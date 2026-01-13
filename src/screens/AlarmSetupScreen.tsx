import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, WINDOW_DURATION_OPTIONS, DAYS_OF_WEEK } from '../constants/config';
import { RootStackParamList, WakeWindow } from '../models/types';
import { storageService } from '../services/StorageService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AlarmSetup'>;
type RouteProps = RouteProp<RootStackParamList, 'AlarmSetup'>;

export default function AlarmSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const isEditing = !!route.params?.alarmId;

  const [name, setName] = useState('');
  const [hardWakeTime, setHardWakeTime] = useState('07:00');
  const [windowDuration, setWindowDuration] = useState(30);
  const [earliestWakeTime, setEarliestWakeTime] = useState('');
  const [useEarliestTime, setUseEarliestTime] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (route.params?.alarmId) {
      loadExistingAlarm(route.params.alarmId);
    }
  }, [route.params?.alarmId]);

  const loadExistingAlarm = async (id: string) => {
    const windows = await storageService.getWakeWindows();
    const existing = windows.find((w) => w.id === id);
    if (existing) {
      setName(existing.name);
      setHardWakeTime(existing.hardWakeTime);
      setWindowDuration(existing.windowDurationMinutes);
      setEarliestWakeTime(existing.earliestWakeTime || '');
      setUseEarliestTime(!!existing.earliestWakeTime);
      setRepeatDays(existing.repeatDays);
      setEnabled(existing.enabled);
    }
  };

  const handleSave = async () => {
    const alarm: WakeWindow = {
      id: route.params?.alarmId || `alarm_${Date.now()}`,
      name: name || 'Alarm',
      hardWakeTime,
      windowDurationMinutes: windowDuration,
      earliestWakeTime: useEarliestTime ? earliestWakeTime : undefined,
      enabled,
      repeatDays,
    };
    await storageService.saveWakeWindow(alarm);
    navigation.goBack();
  };

  const handleDelete = async () => {
    if (route.params?.alarmId) {
      await storageService.deleteWakeWindow(route.params.alarmId);
      navigation.goBack();
    }
  };

  const toggleDay = (day: number) => {
    if (repeatDays.includes(day)) {
      setRepeatDays(repeatDays.filter((d) => d !== day));
    } else {
      setRepeatDays([...repeatDays, day].sort());
    }
  };

  const formatTimeInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Alarm' : 'New Alarm'}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Alarm Name */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Name</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Morning routine"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      {/* Latest Wake Time */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Latest Wake Time</Text>
        <Text style={styles.sectionHint}>Your hard deadline - never wake later</Text>
        <View style={styles.timeCard}>
          <TextInput
            style={styles.timeInput}
            value={hardWakeTime}
            onChangeText={(text) => setHardWakeTime(formatTimeInput(text))}
            placeholder="07:00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
      </View>

      {/* Wake Window */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Wake Window</Text>
        <Text style={styles.sectionHint}>How early can we wake you?</Text>
        <View style={styles.optionsGrid}>
          {WINDOW_DURATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                windowDuration === option.value && styles.optionCardSelected,
              ]}
              onPress={() => setWindowDuration(option.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.optionValue,
                  windowDuration === option.value && styles.optionValueSelected,
                ]}
              >
                {option.value}
              </Text>
              <Text
                style={[
                  styles.optionUnit,
                  windowDuration === option.value && styles.optionUnitSelected,
                ]}
              >
                min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Earliest Wake Time (Optional) */}
      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleContent}>
            <Text style={styles.sectionLabel}>Earliest Wake Time</Text>
            <Text style={styles.sectionHint}>Never wake before this time</Text>
          </View>
          <Switch
            value={useEarliestTime}
            onValueChange={setUseEarliestTime}
            trackColor={{
              false: COLORS.surfaceBorder,
              true: COLORS.primaryMuted,
            }}
            thumbColor={useEarliestTime ? COLORS.primary : COLORS.textMuted}
          />
        </View>
        {useEarliestTime && (
          <View style={styles.timeCardSmall}>
            <TextInput
              style={styles.timeInputSmall}
              value={earliestWakeTime}
              onChangeText={(text) => setEarliestWakeTime(formatTimeInput(text))}
              placeholder="06:00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        )}
      </View>

      {/* Repeat Days */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Repeat</Text>
        <View style={styles.daysRow}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day.value}
              style={[
                styles.dayPill,
                repeatDays.includes(day.value) && styles.dayPillSelected,
              ]}
              onPress={() => toggleDay(day.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dayText,
                  repeatDays.includes(day.value) && styles.dayTextSelected,
                ]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Enabled Toggle */}
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Alarm Active</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{
                false: COLORS.surfaceBorder,
                true: COLORS.primaryMuted,
              }}
              thumbColor={enabled ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>
      </View>

      {/* Delete Button */}
      {isEditing && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteText}>Delete Alarm</Text>
        </TouchableOpacity>
      )}

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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  saveText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },

  // Input cards
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  textInput: {
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  timeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 24,
    alignItems: 'center',
  },
  timeInput: {
    fontSize: 56,
    fontWeight: '200',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -2,
  },
  timeCardSmall: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  timeInputSmall: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.text,
    textAlign: 'center',
  },

  // Options grid
  optionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  optionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  optionCardSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  optionValue: {
    fontSize: 22,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  optionValueSelected: {
    color: COLORS.primary,
  },
  optionUnit: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  optionUnitSelected: {
    color: COLORS.primaryLight,
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  // Days row
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  dayPillSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  dayTextSelected: {
    color: COLORS.primary,
  },

  // Delete button
  deleteButton: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.error,
  },

  bottomSpacer: {
    height: 40,
  },
});
