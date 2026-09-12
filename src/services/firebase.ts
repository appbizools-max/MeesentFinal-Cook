import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Messent Firebase Configuration (Updated with Real Credentials)
const firebaseConfig = {
  apiKey: "AIzaSyBxVDrFByuJkvZawdbaBGUYQNofdLVnQVc",
  authDomain: "meesent-543b7.firebaseapp.com",
  projectId: "meesent-543b7",
  storageBucket: "meesent-543b7.firebasestorage.app",
  messagingSenderId: "1056850789517",
  appId: "1:1056850789517:web:2a1b1a04fa3e7138db8ec4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Fix for Firebase Auth persistence in React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
