import React, { useState, useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ProfileSetupScreen from '@screens/auth/ProfileSetupScreen';
import LanguageScreen from '@screens/LanguageScreen';
import authService from '@services/auth.service';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '@services/notification.service';
import * as Notifications from 'expo-notifications';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

const linking = {
  prefixes: ['meesent://', 'https://meesent.com'],
  config: {
    screens: {
      MainApp: {
        screens: {
          JobsWorld: {
            screens: {
              JobsTabs: {
                screens: {
                  Jobs: 'jobs',
                  PostJob: 'post-job',
                }
              },
              JobDetail: 'job/:jobId',
            }
          }
        }
      }
    }
  }
};

export default function RootNavigator() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [languageSelected, setLanguageSelected] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};
    let unsubscribeNotif: () => void = () => {};

    // Check saved language and onboarding state
    const checkInitialState = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('userLanguage');
        if (savedLang) {
          setLanguageSelected(true);
        }
        const seenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        if (seenOnboarding === 'true') {
          setHasSeenOnboarding(true);
        }
      } catch (e) {
        console.error("Failed to fetch initial state", e);
      }
    };
    checkInitialState();

    // 1. Real-time listener for NEW broadcasts from Web Admin
    try {
      const notifQuery = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      let lastNotifiedId: string | null = null;
      unsubscribeNotif = onSnapshot(notifQuery, (snapshot) => {
        if (snapshot.empty) return;
        const latestDoc = snapshot.docs[0];
        const notifId = latestDoc.id;
        const notifData = latestDoc.data();

        if (lastNotifiedId === null) {
          lastNotifiedId = notifId;
          return;
        }

        if (notifId !== lastNotifiedId && notifData && notifData.title && notifData.body) {
          lastNotifiedId = notifId;
          notificationService.sendLocalNotification(notifData.title, notifData.body, notifData);
        }
      }, (err) => {
        console.warn("Real-time notification listener notice:", err?.message);
      });
    } catch (err) {
      console.warn("Notification listener setup error:", err);
    }

    // 2. Direct listener for newly added State Govt & Central Govt jobs in Firestore
    let unsubscribeJobs: () => void = () => {};
    try {
      const jobsQuery = query(
        collection(db, 'jobs'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      let lastJobId: string | null = null;
      unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
        if (snapshot.empty) return;
        const latestJobDoc = snapshot.docs[0];
        const jobId = latestJobDoc.id;
        const jobData = latestJobDoc.data();

        if (lastJobId === null) {
          lastJobId = jobId;
          return;
        }

        if (jobId !== lastJobId && jobData) {
          lastJobId = jobId;
          const cat = jobData.category || '';
          if (cat.includes('Central') || cat.includes('State') || cat.includes('Govt')) {
            const titleText = cat.includes('Central') ? 'Central Govt Alert' : cat.includes('State') ? 'State Govt Alert' : `${cat} Alert`;
            const bodyText = `${jobData.title || 'New Job'} Announced. Tap to apply on Meesent!`;
            notificationService.sendLocalNotification(titleText, bodyText, { ...jobData, module: 'jobs' });
          }
        }
      }, (err) => {
        console.warn("Real-time jobs listener notice:", err?.message);
      });
    } catch (err) {
      console.warn("Jobs listener setup error:", err);
    }

    let unsubscribeUserNotifs: () => void = () => {};

    const unsubscribeAuth = authService.onAuthStateChanged((currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Register for push notifications & configure default channel
        notificationService.registerForPushNotificationsAsync().catch(err => {
          console.error("Error registering push notifications:", err);
        });

        // Listen to user document changes to track profile completion
        unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setProfileCompleted(docSnap.data().profileCompleted || false);
          }
          setLoading(false);
        });

        // Real-time listener for incoming vendor leads / personal notifications
        try {
          const userNotifQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', currentUser.uid)
          );
          const initialTimestamp = Date.now();
          unsubscribeUserNotifs = onSnapshot(userNotifQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const notifData = change.doc.data();
                const createdAtMs = new Date(notifData.createdAt || 0).getTime();
                // Alert if created now or recently
                if (createdAtMs > initialTimestamp - 5000) {
                  const title = notifData.title || 'New Lead Alert 🔔';
                  const body = notifData.body || notifData.message || 'Someone viewed your business profile. Tap to check My Leads!';
                  notificationService.sendLocalNotification(title, body, {
                    ...notifData,
                    module: 'services',
                    isService: true,
                    screen: notifData.screen || 'MyLeads',
                  });
                }
              }
            });
          }, (err) => {
            console.warn("User notification listener notice:", err?.message);
          });
        } catch (notifErr) {
          console.warn("User notification listener setup error:", notifErr);
        }
      } else {
        setProfileCompleted(false);
        setLoading(false);
        if (unsubscribeUserNotifs) unsubscribeUserNotifs();
      }
    });

    // Listen to push notification clicks for deep-linking navigation
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log("[Notification Clicked] Received response data:", data);

      if (data) {
        if (navigationRef.isReady()) {
          const category = data.category;
          console.log("[Notification Clicked] Category extracted:", category);

          // Route to My Leads when tapping vendor lead alerts
          if (data.screen === 'MyLeads' || data.type === 'profile_view' || data.type === 'call_lead' || data.type === 'whatsapp_lead') {
            console.log("[Notification Clicked] Routing to MyLeads screen");
            navigationRef.navigate('MainApp' as any, {
              screen: 'ServicesWorld',
              params: {
                screen: 'MyLeads'
              }
            } as any);
          } else if (category === 'Central Govt' || category === 'State Govt') {
            console.log("[Notification Clicked] Routing to Jobs tab with category:", category);
            // Redirect to Jobs tab, pre-filtering by Central Govt / State Govt
            navigationRef.navigate('MainApp' as any, {
              screen: 'JobsWorld',
              params: {
                screen: 'JobsTabs',
                params: {
                  screen: 'Jobs',
                  params: { category: category }
                }
              }
            } as any);
          } else if (data.jobId) {
            console.log("[Notification Clicked] Routing to JobDetail with ID:", data.jobId);
            // Redirect standard private/other jobs to the specific Job Details screen
            navigationRef.navigate('MainApp' as any, {
              screen: 'JobsWorld',
              params: {
                screen: 'JobDetail',
                params: { jobId: data.jobId }
              }
            } as any);
          }
        } else {
          console.warn("[Notification Clicked] navigationRef is NOT ready!");
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeUserNotifs) unsubscribeUserNotifs();
      notificationSubscription.remove();
    };
  }, []);

  // Show nothing while loading so the native OS splash screen persists
  if (loading) {
    return null;
  }

  // Standard Navigation Flow
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!languageSelected ? (
          <Stack.Screen name="Language">
            {(props) => <LanguageScreen {...props} onSelect={() => setLanguageSelected(true)} />}
          </Stack.Screen>
        ) : !user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} initialParams={{ hasSeenOnboarding }} />
        ) : !profileCompleted ? (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : (
          <>
            <Stack.Screen name="MainApp" component={MainNavigator} />
            <Stack.Screen name="Language">
              {(props) => (
                <LanguageScreen
                  {...props}
                  onSelect={() => {
                    if (props.navigation.canGoBack()) {
                      props.navigation.goBack();
                    } else {
                      setLanguageSelected(true);
                    }
                  }}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
