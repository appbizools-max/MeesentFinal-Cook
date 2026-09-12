import { LogBox } from 'react-native';

if (__DEV__) {
  LogBox.ignoreLogs([
    'expo-notifications',
    'Push notifications',
    'remote notifications',
    'React Native Firebase namespaced API',
  ]);

  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args.map(arg => String(arg)).join(' ');
    if (
      msg.includes('expo-notifications') || 
      msg.includes('Expo Go') || 
      msg.includes('dev-client') || 
      msg.includes('React Native Firebase namespaced API')
    ) {
      return;
    }
    originalWarn(...args);
  };

  const originalError = console.error;
  console.error = (...args) => {
    const msg = args.map(arg => String(arg)).join(' ');
    if (
      msg.includes('expo-notifications') || 
      msg.includes('Expo Go') || 
      msg.includes('dev-client')
    ) {
      return;
    }
    originalError(...args);
  };
}
