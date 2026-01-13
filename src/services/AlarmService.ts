import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { WakePrediction, WakeWindow } from '../models/types';
import { storageService } from './StorageService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

class AlarmService {
  private scheduledAlarmId: string | null = null;

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true, // Required for alarm-style notifications
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Configure Android channel for alarms
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarms', {
        name: 'Wake Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'alarm_sound.wav', // Custom sound file
        bypassDnd: true, // Bypass Do Not Disturb
      });
    }

    await storageService.saveUserSettings({ notificationsEnabled: true });
    return true;
  }

  // Schedule an alarm based on prediction
  async scheduleAlarm(
    prediction: WakePrediction,
    wakeWindow: WakeWindow
  ): Promise<string> {
    // Cancel any existing scheduled alarm
    await this.cancelScheduledAlarm();

    const settings = await storageService.getUserSettings();

    // Decide which time to use based on confidence
    const alarmTime =
      prediction.confidence >= settings.confidenceThreshold
        ? prediction.predictedWakeTime
        : prediction.fallbackTime;

    const usedPrediction = prediction.confidence >= settings.confidenceThreshold;

    // Schedule the notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to Wake Up',
        body: usedPrediction
          ? `Optimal wake time (${prediction.confidence}% confidence)`
          : 'Your scheduled alarm time',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          type: 'alarm',
          predictionId: `${Date.now()}`,
          usedPrediction,
          confidence: prediction.confidence,
          wakeWindowId: wakeWindow.id,
        },
        // iOS specific
        interruptionLevel: 'timeSensitive',
      },
      trigger: {
        date: alarmTime,
        channelId: Platform.OS === 'android' ? 'alarms' : undefined,
      },
    });

    this.scheduledAlarmId = identifier;

    // Also schedule a backup alarm at hard wake time if using prediction
    if (usedPrediction) {
      await this.scheduleBackupAlarm(prediction.fallbackTime, wakeWindow.id);
    }

    return identifier;
  }

  // Schedule backup alarm (in case user sleeps through prediction)
  private async scheduleBackupAlarm(
    hardWakeTime: Date,
    wakeWindowId: string
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Backup Alarm',
        body: 'This is your hard wake time',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          type: 'backup_alarm',
          wakeWindowId,
        },
        interruptionLevel: 'timeSensitive',
      },
      trigger: {
        date: hardWakeTime,
        channelId: Platform.OS === 'android' ? 'alarms' : undefined,
      },
    });
  }

  // Cancel scheduled alarm
  async cancelScheduledAlarm(): Promise<void> {
    if (this.scheduledAlarmId) {
      await Notifications.cancelScheduledNotificationAsync(this.scheduledAlarmId);
      this.scheduledAlarmId = null;
    }

    // Also cancel all scheduled notifications to be safe
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get all scheduled notifications
  async getScheduledAlarms(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Snooze alarm (reschedule for X minutes later)
  async snoozeAlarm(minutes: number = 5): Promise<string> {
    const snoozeTime = new Date(Date.now() + minutes * 60000);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Snooze Alarm',
        body: `Snoozed for ${minutes} minutes`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          type: 'snooze',
        },
        interruptionLevel: 'timeSensitive',
      },
      trigger: {
        date: snoozeTime,
        channelId: Platform.OS === 'android' ? 'alarms' : undefined,
      },
    });

    return identifier;
  }

  // Dismiss alarm (mark as handled)
  async dismissAlarm(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await this.cancelScheduledAlarm();
  }

  // Schedule recurring alarms for a wake window
  async scheduleRecurringAlarm(wakeWindow: WakeWindow): Promise<void> {
    if (!wakeWindow.enabled) return;

    // For each day in repeatDays, schedule a notification
    // Note: This is simplified - in production you'd want more sophisticated scheduling
    const [hours, minutes] = wakeWindow.hardWakeTime.split(':').map(Number);

    for (const day of wakeWindow.repeatDays) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: wakeWindow.name || 'Wake Up',
          body: 'Your scheduled alarm',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: {
            type: 'recurring_alarm',
            wakeWindowId: wakeWindow.id,
          },
        },
        trigger: {
          weekday: day + 1, // Expo uses 1-7 (Sunday = 1)
          hour: hours,
          minute: minutes,
          repeats: true,
          channelId: Platform.OS === 'android' ? 'alarms' : undefined,
        },
      });
    }
  }

  // Listen for notification responses (user tapping notification)
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Listen for notifications received while app is foregrounded
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }
}

export const alarmService = new AlarmService();
