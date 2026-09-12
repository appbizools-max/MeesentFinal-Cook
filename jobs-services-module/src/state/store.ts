import { create } from 'zustand';
import { db, auth } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot 
} from 'firebase/firestore';
import { updateDistrictNotificationSubscription } from '../services/fcm';

// ─── AUTH STATE SLICE ────────────────────────────────────────────────────────

interface AuthState {
  user: any | null;
  loading: boolean;
  initializing: boolean;
  setUser: (user: any) => void;
  updateUserDistrict: (district: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initializing: true,
  setUser: (user) => {
    set({ user, initializing: false });
    if (user && user.district) {
      updateDistrictNotificationSubscription(user.district).catch(err => 
        console.error("Failed to resubscribe district topic on login/boot:", err)
      );
    }
  },
  updateUserDistrict: async (district) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is logged in");

    set({ loading: true });
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        district,
        updatedAt: serverTimestamp()
      });

      // Update state locally
      set({ user: { ...get().user, district } });

      // Handle FCM Topic Subscriptions
      await updateDistrictNotificationSubscription(district);
    } finally {
      set({ loading: false });
    }
  }
}));

// ─── JOBS STATE SLICE ────────────────────────────────────────────────────────

interface JobsState {
  jobs: any[];
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
  loading: boolean;
  hasMore: boolean;
  fetchJobs: (district: string, isRefresh?: boolean) => Promise<void>;
  createJob: (title: string, description: string, district: string) => Promise<void>;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  lastVisible: null,
  loading: false,
  hasMore: true,
  fetchJobs: async (district, isRefresh = false) => {
    const currentJobs = isRefresh ? [] : get().jobs;
    const startCursor = isRefresh ? null : get().lastVisible;

    if (get().loading) return;
    set({ loading: true });

    try {
      let q = query(
        collection(db, 'jobs'),
        where('district', '==', district),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (startCursor) {
        q = query(q, startAfter(startCursor));
      }

      const snapshot = await getDocs(q);
      const jobsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      set({
        jobs: [...currentJobs, ...jobsList],
        lastVisible: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === 20
      });
    } catch (err) {
      console.error("Error fetching jobs from Firestore:", err);
      throw err;
    } finally {
      set({ loading: false });
    }
  },
  createJob: async (title, description, district) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Authentication required to create jobs.");

    await addDoc(collection(db, 'jobs'), {
      title,
      description,
      district,
      postedBy: currentUser.uid,
      createdAt: serverTimestamp()
    });
  }
}));

// ─── SERVICES STATE SLICE ────────────────────────────────────────────────────

interface ServicesState {
  nearbyServices: any[];
  loading: boolean;
  lastUserPosition: [number, number] | null;
  createService: (title: string, description: string, lat: number, lng: number, geohash: string) => Promise<void>;
  setNearbyServices: (services: any[]) => void;
  setLastUserPosition: (position: [number, number]) => void;
}

export const useServicesStore = create<ServicesState>((set) => ({
  nearbyServices: [],
  loading: false,
  lastUserPosition: null,
  createService: async (title, description, lat, lng, geohash) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Authentication required to offer services.");

    await addDoc(collection(db, 'services'), {
      title,
      description,
      location: { lat, lng },
      geohash,
      providerId: currentUser.uid,
      createdAt: serverTimestamp()
    });
  },
  setNearbyServices: (nearbyServices) => set({ nearbyServices }),
  setLastUserPosition: (lastUserPosition) => set({ lastUserPosition })
}));
