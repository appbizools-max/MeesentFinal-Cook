import firestore from '@react-native-firebase/firestore';

export const getFirestore = (app?: any) => {
    return firestore();
};

export const collection = (dbInstance: any, path: string) => {
    if (typeof dbInstance === 'string') {
        return firestore().collection(dbInstance);
    }
    if (dbInstance.collection) return dbInstance.collection(path);
    return firestore().collection(path);
};

export const doc = (dbInstance: any, path: string, id?: string) => {
    if (id) {
        if (typeof dbInstance.collection === 'function') {
            return dbInstance.collection(path).doc(id);
        }
    }
    if (typeof dbInstance.doc === 'function') {
        return dbInstance.doc(path);
    }
    if (typeof dbInstance === 'string') {
         return firestore().doc(dbInstance);
    }
    return firestore().doc(path);
};

export const getDoc = async (ref: any) => {
  try {
    return await ref.get();
  } catch (err: any) {
    if (
      err?.code === 'firestore/unavailable' ||
      (err?.message && (err.message.includes('unavailable') || err.message.includes('transient')))
    ) {
      console.warn('Firestore server getDoc unavailable, attempting cache fallback...');
      try {
        return await ref.get({ source: 'cache' });
      } catch (cacheErr) {
        console.warn('Firestore cache getDoc fallback failed:', cacheErr);
      }
    }
    throw err;
  }
};
export const getDocs = (ref: any) => ref.get();
export const addDoc = (ref: any, data: any) => ref.add(data);
export const updateDoc = (ref: any, data: any) => ref.update(data);
export const setDoc = (ref: any, data: any, options?: any) => ref.set(data, options);
export const deleteDoc = (ref: any) => ref.delete();

export const query = (ref: any, ...queryConstraints: any[]) => {
    let currentQuery = ref;
    for (const qc of queryConstraints) {
        currentQuery = qc(currentQuery);
    }
    return currentQuery;
};

export const where = (fieldPath: string, opStr: any, value: any) => {
    return (ref: any) => ref.where(fieldPath, opStr, value);
};

export const orderBy = (fieldPath: string, directionStr?: any) => {
    return (ref: any) => ref.orderBy(fieldPath, directionStr);
};

export const limit = (limitValue: number) => {
    return (ref: any) => ref.limit(limitValue);
};

export const onSnapshot = (
    ref: any,
    onNext: (snapshot: any) => void,
    onError?: (error: any) => void,
    onCompletion?: () => void
) => {
    const safeOnError = onError || ((err: any) => console.warn('Firestore onSnapshot warning:', err));
    return ref.onSnapshot(
        (snapshot: any) => {
            if (!snapshot) return;
            onNext(snapshot);
        },
        safeOnError,
        onCompletion
    );
};

export const serverTimestamp = () => firestore.FieldValue.serverTimestamp();
export const increment = (n: number) => firestore.FieldValue.increment(n);
