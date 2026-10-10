import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

// Configure how notifications are handled when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
class NotificationService {
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
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0035a0',
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
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default Channel',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0035a0',
          sound: 'default',
          enableVibrate: true,
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
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data || {},
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: null, // show immediately
        });
      }

      // Always show in-app banner toast as fallback guarantee
      try {
        const Toast = require('react-native-toast-message').default;
        Toast.show({
          type: 'info',
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
