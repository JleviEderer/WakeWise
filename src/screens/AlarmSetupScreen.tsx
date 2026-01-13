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
  const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
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
    // Simple time formatting
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Alarm' : 'New Alarm'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Alarm Name */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Alarm Name</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Weekday Alarm"
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      {/* Hard Wake Time */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Latest Wake Time</Text>
        <Text style={styles.sectionHint}>
          You will never wake later than this time
        </Text>
        <TextInput
          style={styles.timeInput}
          value={hardWakeTime}
          onChangeText={(text) => setHardWakeTime(formatTimeInput(text))}
          placeholder="07:00"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="number-pad"
          maxLength={5}
        />
      </View>

      {/* Wake Window Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Wake Window</Text>
        <Text style={styles.sectionHint}>
          How early can we wake you before your deadline?
        </Text>
        <View style={styles.optionsRow}>
          {WINDOW_DURATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                windowDuration === option.value && styles.optionButtonSelected,
              ]}
              onPress={() => setWindowDuration(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  windowDuration === option.value && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Optional Earliest Time */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.sectionLabel}>Earliest Wake Time</Text>
            <Text style={styles.sectionHint}>
              Never wake before this time (optional)
            </Text>
          </View>
          <Switch
            value={useEarliestTime}
            onValueChange={setUseEarliestTime}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
            thumbColor={COLORS.text}
          />
        </View>
        {useEarliestTime && (
          <TextInput
            style={styles.timeInput}
            value={earliestWakeTime}
            onChangeText={(text) => setEarliestWakeTime(formatTimeInput(text))}
            placeholder="06:00"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="number-pad"
            maxLength={5}
          />
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
                styles.dayButton,
                repeatDays.includes(day.value) && styles.dayButtonSelected,
              ]}
              onPress={() => toggleDay(day.value)}
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
        <View style={styles.switchRow}>
          <Text style={styles.sectionLabel}>Alarm Enabled</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
            thumbColor={COLORS.text}
          />
        </View>
      </View>

      {/* Delete Button (only when editing) */}
      {isEditing && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Alarm</Text>
        </TouchableOpacity>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  cancelButton: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  sectionHint: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
  },
  timeInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '300',
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  optionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minWidth: 44,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  dayButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  dayText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: COLORS.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.error + '20',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
