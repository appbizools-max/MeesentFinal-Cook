import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

/**
 * Detects if a notification belongs to the Services / Mart section
 * (e.g. leads, call/whatsapp leads, profile views, vendor alerts, verifications, plan purchases).
 */
export const isServicesNotification = (data: any = {}, title: string = '', body: string = ''): boolean => {
  if (data?.module === 'services' || data?.module === 'mart' || data?.isService === true) {
    return true;
  }
  if (data?.module === 'jobs') {
    return false;
  }

  const type = String(data?.type || '').toLowerCase();
  const screen = String(data?.screen || '').toLowerCase();
  const text = `${title} ${body} ${type} ${screen}`.toLowerCase();

  if (
    type.includes('lead') ||
    type.includes('service') ||
    type.includes('vendor') ||
    type.includes('mart') ||
    type.includes('profile_view') ||
    type.includes('call') ||
    type.includes('whatsapp') ||
    type.includes('verification') ||
    type.includes('plan') ||
    screen.includes('myleads') ||
    screen.includes('service') ||
    screen.includes('vendor') ||
    screen.includes('mart')
  ) {
    return true;
  }

  if (
    text.includes('lead') ||
    text.includes('business profile') ||
    text.includes('services mart') ||
    text.includes('vendor') ||
    text.includes('genuine verification') ||
    text.includes('call lead') ||
    text.includes('whatsapp lead')
  ) {
    return true;
  }

  return false;
};

// Configure how notifications are handled when the app is open
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const content = notification?.request?.content;
    const data = content?.data || {};
    const title = content?.title || '';
    const body = content?.body || '';

    // Mobile vibration ONLY for Services Mart notifications
    if (isServicesNotification(data, title, body)) {
      try {
        Vibration.vibrate([0, 500, 200, 500]);
      } catch (err) {
        console.warn('[NotificationService] Vibration handler error:', err);
      }
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

class NotificationService {
  constructor() {
    this.initNotificationReceivedListener();
  }

  // Listener to vibrate when any notification is received in foreground
  private initNotificationReceivedListener() {
    try {
      Notifications.addNotificationReceivedListener((notification) => {
        const content = notification?.request?.content;
        const data = content?.data || {};
        const title = content?.title || '';
        const body = content?.body || '';

        if (isServicesNotification(data, title, body)) {
          this.triggerServicesVibration();
        }
      });
    } catch (e) {
      console.warn('[NotificationService] Listener initialization warning:', e);
    }
  }

  // Trigger hardware mobile vibration specifically for Services Mart
  triggerServicesVibration() {
    try {
      // Vibrate pattern: double buzz (0ms delay, 500ms vibration, 200ms pause, 500ms vibration)
      Vibration.vibrate([0, 500, 200, 500]);
    } catch (err) {
      console.warn('[NotificationService] Hardware vibration error:', err);
    }
  }

  // Check if running in Expo Go
  private isExpoGo(): boolean {
    return (
      Constants.appOwnership === 'expo' ||
      (Constants as any).executionEnvironment === 'storeClient' ||
      Constants.executionEnvironment === 'storeClient'
    );
  }

  async registerForPushNotificationsAsync() {
    // Skip push notification registration in Expo Go (SDK 53+)
    if (this.isExpoGo()) {
      console.log('Running in Expo Go - skipping push notification registration (not supported in SDK 53+)');
      console.log('Use a development build (eas build --profile development) for push notifications');
      return null;
    }

    let token;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      token = (await Notifications.getDevicePushTokenAsync()).data;
      console.log('FCM Token:', token);

      if (Platform.OS === 'android') {
        // Default channel (Jobs / General)
        await Notifications.setNotificationChannelAsync('default', {
          name: 'General Alerts',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#0035a0',
        });

        // Dedicated Services Mart channel with active vibration
        await Notifications.setNotificationChannelAsync('services_mart', {
          name: 'Services Mart Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#2563eb',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      // Save FCM token to user document in Firestore
      const userId = auth.currentUser?.uid;
      if (userId && token) {
        try {
          await setDoc(doc(db, 'users', userId), {
            fcmToken: token,
            notificationsEnabled: true,
          }, { merge: true });
        } catch (error) {
          console.error('Error saving FCM token:', error);
        }
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Send a local notification (for testing, live alerts, or immediate feedback)
  async sendLocalNotification(title: string, body: string, data: any = {}) {
    try {
      const isService = isServicesNotification(data, title, body);

      // Trigger physical phone vibration only for Services Mart notifications
      if (isService) {
        this.triggerServicesVibration();
      }

      if (Platform.OS === 'android') {
        const channelId = isService ? 'services_mart' : 'default';
        await Notifications.setNotificationChannelAsync(channelId, {
          name: isService ? 'Services Mart Alerts' : 'General Alerts',
          importance: isService ? Notifications.AndroidImportance.MAX : Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: isService ? [0, 500, 200, 500] : [0, 250],
          lightColor: isService ? '#2563eb' : '#0035a0',
          sound: 'default',
          enableVibrate: isService,
          showBadge: true,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Schedule system notification pop-up
      if (finalStatus === 'granted') {
        const channelId = isService ? 'services_mart' : 'default';
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { ...data, isService, module: isService ? 'services' : (data?.module || 'general') },
            sound: true,
            priority: isService ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.DEFAULT,
            channelId,
            vibrate: isService ? [0, 500, 200, 500] : undefined,
          },
          trigger: null, // show immediately
        });
      }

      // Always show in-app banner toast as fallback guarantee
      try {
        const Toast = require('react-native-toast-message').default;
        Toast.show({
          type: isService ? 'success' : 'info',
          text1: title,
          text2: body,
          visibilityTime: 5000,
        });
      } catch (tErr) {
        // Ignore toast error if Toast not mounted
      }
    } catch (error) {
      console.error('Error triggering local notification:', error);
    }
  }
}

export default new NotificationService();
