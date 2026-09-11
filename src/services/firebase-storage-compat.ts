import storage from '@react-native-firebase/storage';

export const getStorage = (app?: any) => {
    return storage();
};
export const ref = (storageInstance: any, path: string) => {
    return storageInstance.ref(path);
};
export const uploadBytes = (storageRef: any, data: Blob | Uint8Array | ArrayBuffer, metadata?: any) => {
    return storageRef.put(data, metadata);
};
export const getDownloadURL = (storageRef: any) => {
    return storageRef.getDownloadURL();
};
