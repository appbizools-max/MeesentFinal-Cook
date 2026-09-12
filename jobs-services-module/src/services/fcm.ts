import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Handles topic subscription updates for district channels.
 * Unsubscribes from the old district (cached in AsyncStorage) and subscribes to the new one.
 */
export async function updateDistrictNotificationSubscription(newDistrict: string): Promise<void> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('FCM Notifications permission not granted.');
      return;
    }

    const cachedDistrictKey = 'subscribed_district_topic';
    const oldDistrictTopic = await AsyncStorage.getItem(cachedDistrictKey);
    const newTopic = `district_${newDistrict.replace(/\s+/g, '_').toLowerCase()}`;

    if (oldDistrictTopic) {
      if (oldDistrictTopic === newTopic) {
        console.log(`Already subscribed to topic: ${newTopic}`);
        return;
      }
      try {
        await messaging().unsubscribeFromTopic(oldDistrictTopic);
        console.log(`Unsubscribed from old topic: ${oldDistrictTopic}`);
        await AsyncStorage.removeItem(cachedDistrictKey);
      } catch (err) {
        console.error(`Failed to unsubscribe from old topic: ${oldDistrictTopic}`, err);
        throw err;
      }
    }

    // Subscribe to new topic
    await messaging().subscribeToTopic(newTopic);
    console.log(`Subscribed to new topic: ${newTopic}`);

    // Cache the new subscription topic
    await AsyncStorage.setItem(cachedDistrictKey, newTopic);
  } catch (error) {
    console.error('Error updating district FCM topic subscriptions:', error);
    throw error;
  }
}
