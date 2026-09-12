import firebase from '@react-native-firebase/app';

export const initializeApp = (config?: any) => {
    if (!firebase.apps.length && config) {
        return firebase.initializeApp(config);
    }
    return firebase.app();
};

export default firebase;

