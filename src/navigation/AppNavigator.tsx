import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { RootStackParamList } from '../models/types';
import {
  HomeScreen,
  AlarmSetupScreen,
  WakeScreen,
  FeedbackScreen,
  OnboardingScreen,
  SettingsScreen,
  GarminConnectScreen,
} from '../screens';
import { storageService } from '../services/StorageService';
import { alarmService } from '../services/AlarmService';
import { COLORS } from '../constants/config';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkOnboarding();
    setupNotificationListeners();
  }, []);

  const checkOnboarding = async () => {
    const settings = await storageService.getUserSettings();
    setShowOnboarding(!settings.onboardingCompleted);
    setIsLoading(false);
  };

  const setupNotificationListeners = () => {
    // Handle notification tap
    const subscription = alarmService.addNotificationResponseListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (data.type === 'alarm' || data.type === 'backup_alarm') {
          // Navigate to wake screen
          // Note: In a real app, you'd use a navigation ref here
          console.log('Alarm notification tapped:', data);
        }
      }
    );

    return () => subscription.remove();
  };

  if (isLoading) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={showOnboarding ? 'Onboarding' : 'Main'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={HomeScreen} />
        <Stack.Screen
          name="AlarmSetup"
          component={AlarmSetupScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Wake"
          component={WakeScreen}
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Feedback"
          component={FeedbackScreen}
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="GarminConnect"
          component={GarminConnectScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
