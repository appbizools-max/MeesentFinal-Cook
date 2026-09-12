import auth from '@react-native-firebase/auth';

export const getAuth = (app?: any) => {
    return auth();
};
export const initializeAuth = (app: any, deps?: any) => {
    return auth();
};
export const getReactNativePersistence = (storage: any) => {
    return storage;
};
export const signInWithEmailAndPassword = (authInstance: any, email: string, pass: string) => {
    return authInstance.signInWithEmailAndPassword(email, pass);
};
export const createUserWithEmailAndPassword = (authInstance: any, email: string, pass: string) => {
    return authInstance.createUserWithEmailAndPassword(email, pass);
};
export const signOut = (authInstance?: any) => {
    return (authInstance || auth()).signOut();
};
export const deleteUser = (user: any) => {
    return user.delete();
};
// Add missing ConfirmationResult for type imports if any
export interface ConfirmationResult {
    confirm(verificationCode: string): Promise<any>;
}
