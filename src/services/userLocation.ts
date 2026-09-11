import * as Location from 'expo-location';
import { getNearbyVendors, getPriorityScore } from './geofire';
import { auth, db } from './firebase';

export interface UserCoords {
  lat: number;
  lng: number;
}

let cachedCoords: UserCoords | null = null;
let cachedLocalPool: any[] | null = null;
let cachedBroadPool: any[] | null = null;
let lastWarmedTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute TTL

let isWarmingUpLocal = false;
let isFetchingBroad = false;

const LOCAL_SCORES = new Set([1004, 1003, 1002, 1001]);
const ALL_CANDIDATE_SCORES = new Set([1004, 1003, 1002, 1001, 4, 3]);

export function getCachedUserCoords(): UserCoords {
  return cachedCoords || { lat: 17.3850, lng: 78.4867 };
}

export function hasCachedCoords(): boolean {
  return cachedCoords !== null;
}

export function getCachedVendorPool(): any[] | null {
  const isFresh = (Date.now() - lastWarmedTimestamp) < CACHE_TTL_MS;
  if (!isFresh) return null;
  return cachedLocalPool;
}

export function getCachedBroadPool(): any[] | null {
  const isFresh = (Date.now() - lastWarmedTimestamp) < CACHE_TTL_MS;
  if (!isFresh) return null;
  return cachedBroadPool;
}

/**
 * Phase 1: Fast 8km Local Pre-Warm (Used for Home and Search default view)
 * Zero lag, small query!
 */
export async function warmUpLocationAndVendors(forceRefresh = false): Promise<{ coords: UserCoords; pool: any[] }> {
  const isFresh = (Date.now() - lastWarmedTimestamp) < CACHE_TTL_MS;
  if (!forceRefresh && cachedCoords && cachedLocalPool && isFresh) {
    return { coords: cachedCoords, pool: cachedLocalPool };
  }

  if (isWarmingUpLocal) {
    let attempts = 0;
    while (isWarmingUpLocal && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (cachedCoords && cachedLocalPool) {
      return { coords: cachedCoords, pool: cachedLocalPool };
    }
  }

  isWarmingUpLocal = true;
  try {
    let lat = 17.3850;
    let lng = 78.4867;

    if (cachedCoords && isFresh) {
      lat = cachedCoords.lat;
      lng = cachedCoords.lng;
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getLastKnownPositionAsync({}) || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc) {
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
            cachedCoords = { lat, lng };
          }
        }
      } catch (e) {
        console.warn("Background GPS warming notice:", e);
      }
    }

    // includeNonLocalPaid = false for fast 8km local query
    const nearbyDocs = await getNearbyVendors(lat, lng, 8, undefined, undefined, false);
    const pool = nearbyDocs
      .filter((biz: any) => LOCAL_SCORES.has(getPriorityScore(biz)))
      .sort((a, b) => {
        const diff = getPriorityScore(b) - getPriorityScore(a);
        if (diff !== 0) return diff;
        return (a.distance || 0) - (b.distance || 0);
      });

    cachedLocalPool = pool;
    lastWarmedTimestamp = Date.now();
    return { coords: { lat, lng }, pool };
  } catch (err) {
    console.error("Error warming up local location and vendors:", err);
    return { coords: cachedCoords || { lat: 17.3850, lng: 78.4867 }, pool: cachedLocalPool || [] };
  } finally {
    isWarmingUpLocal = false;
  }
}

/**
 * Phase 2: Deferred Broad Vendor Fetch (Called only when user types in search)
 * Includes both 8km local vendors & non-local paid plan vendors.
 */
export async function fetchBroadVendorPool(forceRefresh = false): Promise<any[]> {
  const isFresh = (Date.now() - lastWarmedTimestamp) < CACHE_TTL_MS;
  if (!forceRefresh && cachedBroadPool && isFresh) {
    return cachedBroadPool;
  }

  if (isFetchingBroad) {
    let attempts = 0;
    while (isFetchingBroad && attempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (cachedBroadPool) return cachedBroadPool;
  }

  isFetchingBroad = true;
  try {
    const coords = getCachedUserCoords();
    // includeNonLocalPaid = true to fetch broad non-local paid vendors
    const nearbyDocs = await getNearbyVendors(coords.lat, coords.lng, 8, undefined, undefined, true);
    const pool = nearbyDocs
      .filter((biz: any) => ALL_CANDIDATE_SCORES.has(getPriorityScore(biz)))
      .sort((a, b) => {
        const diff = getPriorityScore(b) - getPriorityScore(a);
        if (diff !== 0) return diff;
        return (a.distance || 0) - (b.distance || 0);
      });

    cachedBroadPool = pool;
    lastWarmedTimestamp = Date.now();
    return pool;
  } catch (err) {
    console.error("Error fetching broad vendor pool:", err);
    return cachedBroadPool || cachedLocalPool || [];
  } finally {
    isFetchingBroad = false;
  }
}
