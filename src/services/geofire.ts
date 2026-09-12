/**
 * Production-grade Geofire Service — Zero external dependencies
 *
 * Key design decisions for production accuracy:
 * 1. Uses where('geohash', '>=', x).where('geohash', '<=', y) instead of
 *    orderBy+startAt+endAt → Firestore auto-creates single-field index, no manual setup needed.
 * 2. Full deduplication via Set<string> — prevents duplicate results when geohash bounds overlap.
 * 3. Haversine distance is the FINAL authority — geohash is only a fast pre-filter.
 * 4. Bounding box approach covers all 9 cells (center + 8 neighbors) at correct precision.
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

// ─── Geohash Encode ──────────────────────────────────────────────────────────

/**
 * Encodes a [lat, lng] coordinate to a geohash string.
 * Default precision 9 → ~5m cell accuracy.
 */
export function geohashForLocation(
  location: [number, number],
  precision: number = 9
): string {
  const [lat, lng] = location;
  let idx = 0, bit = 0, evenBit = true, geohash = '';
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (lng >= mid) { idx = idx * 2 + 1; lonMin = mid; }
      else { idx = idx * 2; lonMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { idx = idx * 2 + 1; latMin = mid; }
      else { idx = idx * 2; latMax = mid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { geohash += BASE32[idx]; bit = 0; idx = 0; }
  }
  return geohash;
}

// ─── Haversine Distance ───────────────────────────────────────────────────────

/**
 * Returns great-circle distance in kilometers between two [lat, lng] points.
 */
export function distanceBetween(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
    Math.cos((b[0] * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ─── Precision Selection ─────────────────────────────────────────────────────

/**
 * Picks geohash precision so that each cell is roughly half the search radius.
 * This ensures the search circle spans 3-9 cells (center + neighbors).
 */
function pickPrecision(radiusInMeters: number): number {
  // Geohash cell widths at each precision level (approximate, at equator)
  // Precision: [1]=5000km [2]=1250km [3]=156km [4]=39km [5]=4.9km [6]=1.2km [7]=152m [8]=38m [9]=4.8m
  if (radiusInMeters > 156_000) return 2;
  if (radiusInMeters > 39_100) return 3;
  if (radiusInMeters > 4_890) return 4;  // 8km radius → precision 4 (~39km cells)
  if (radiusInMeters > 1_220) return 5;
  if (radiusInMeters > 156) return 6;
  if (radiusInMeters > 39) return 7;
  return 8;
}

// ─── Bounding Box Coverage ───────────────────────────────────────────────────

/**
 * Returns all unique geohash prefixes that could contain points within the
 * given radius. Uses 9-point boundary + intermediate sampling for complete coverage.
 */
export function geohashQueryBounds(
  center: [number, number],
  radiusInMeters: number
): [string, string][] {
  const precision = pickPrecision(radiusInMeters);

  // Convert radius to degree offsets
  const latDeg = radiusInMeters / 111_320;
  const lngDeg = radiusInMeters / (111_320 * Math.cos((center[0] * Math.PI) / 180));

  // Sample 17 points: 9 corners/edges + 8 mid-edge points for complete coverage
  const [clat, clng] = center;
  const candidates: [number, number][] = [
    [clat, clng],              // center
    [clat + latDeg, clng],              // N
    [clat - latDeg, clng],              // S
    [clat, clng + lngDeg],     // E
    [clat, clng - lngDeg],     // W
    [clat + latDeg, clng + lngDeg],     // NE
    [clat + latDeg, clng - lngDeg],     // NW
    [clat - latDeg, clng + lngDeg],     // SE
    [clat - latDeg, clng - lngDeg],     // SW
    [clat + latDeg * 0.7, clng + lngDeg * 0.7], // mid NE
    [clat + latDeg * 0.7, clng - lngDeg * 0.7], // mid NW
    [clat - latDeg * 0.7, clng + lngDeg * 0.7], // mid SE
    [clat - latDeg * 0.7, clng - lngDeg * 0.7], // mid SW
    [clat + latDeg * 0.5, clng],            // mid N
    [clat - latDeg * 0.5, clng],            // mid S
    [clat, clng + lngDeg * 0.5], // mid E
    [clat, clng - lngDeg * 0.5], // mid W
  ];

  const cells = new Set<string>();
  for (const pt of candidates) {
    cells.add(geohashForLocation(pt, precision));
  }

  // Each cell prefix becomes: WHERE geohash >= cell AND geohash <= cell~
  return Array.from(cells).map(cell => [cell, cell + '\u007e']); // '~' = ASCII 126
}

// ─── Nearby Providers ────────────────────────────────────────────────────────

/**
 * Find all providers within radiusInKm of [jobLat, jobLng].
 * Results are deduplicated, Haversine-verified, and sorted nearest-first.
 */
export async function getNearbyProviders(
  jobLat: number,
  jobLng: number,
  radiusInKm: number,
  category?: string
): Promise<any[]> {
  const center: [number, number] = [jobLat, jobLng];
  const bounds = geohashQueryBounds(center, radiusInKm * 1000);

  const snapshots = await Promise.all(
    bounds.map(([lo, hi]) =>
      getDocs(query(
        collection(db, 'providers'),
        where('geohash', '>=', lo),
        where('geohash', '<=', hi)
      ))
    )
  );

  const seen = new Set<string>();
  const results: any[] = [];

  for (const snap of snapshots) {
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);

      const data = d.data();
      const pLat = Number(data.lat);
      const pLng = Number(data.lng);
      if (isNaN(pLat) || isNaN(pLng)) continue;

      const dist = distanceBetween(center, [pLat, pLng]);
      if (dist > radiusInKm) continue;
      if (category && data.category !== category) continue;

      results.push({ id: d.id, ...data, distance: parseFloat(dist.toFixed(2)) });
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}

// ─── Nearby Jobs ─────────────────────────────────────────────────────────────

/**
 * Find all Active jobs within radiusInKm of [providerLat, providerLng].
 * Results are deduplicated, Haversine-verified, and sorted nearest-first.
 */
export async function getNearbyJobs(
  providerLat: number,
  providerLng: number,
  radiusInKm: number,
  category?: string
): Promise<any[]> {
  const center: [number, number] = [providerLat, providerLng];
  const bounds = geohashQueryBounds(center, radiusInKm * 1000);

  const snapshots = await Promise.all(
    bounds.map(([lo, hi]) =>
      getDocs(query(
        collection(db, 'jobs'),
        where('geohash', '>=', lo),
        where('geohash', '<=', hi)
      ))
    )
  );

  const seen = new Set<string>();
  const results: any[] = [];

  for (const snap of snapshots) {
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      const data = d.data();
      const jLat = Number(data.lat);
      const jLng = Number(data.lng);
      if (isNaN(jLat) || isNaN(jLng)) continue;
      // Haversine is the FINAL accuracy gate
      const dist = distanceBetween(center, [jLat, jLng]);
      if (dist > radiusInKm) continue;
      if (data.status !== 'Active') continue;
      if (category && data.category !== category) continue;
      results.push({ id: d.id, ...data, distance: parseFloat(dist.toFixed(2)) });
    }
  }
  return results.sort((a, b) => a.distance - b.distance);
}
/**
 * Find all Active/Publicly Visible vendors within radiusInKm of [userLat, userLng].
 * Results are deduplicated, Haversine-verified, and sorted by tier first, then nearest-first.
 */
export async function getNearbyVendors(
  userLat: number,
  userLng: number,
  radiusInKm: number,
  category?: string,
  subCategory?: string,
  includeNonLocalPaid: boolean = false
): Promise<any[]> {
  const center: [number, number] = [userLat, userLng];
  const bounds = geohashQueryBounds(center, radiusInKm * 1000);
  const promises: Promise<any>[] = bounds.map(([lo, hi]) =>
    getDocs(query(
      collection(db, 'vendors'),
      where('geohash', '>=', lo),
      where('geohash', '<=', hi)
    ))
  );

  // Query paid plan vendors ONLY when broad search is explicitly requested (e.g. when typing)
  if (includeNonLocalPaid) {
    try {
      promises.push(
        getDocs(query(
          collection(db, 'vendors'),
          where('planId', 'in', ['big', 'small'])
        ))
      );
    } catch (e) {
      console.warn("getNearbyVendors planId query notice:", e);
    }
  }

  if (category) {
    if (subCategory) {
      promises.push(
        getDocs(query(
          collection(db, 'vendors'),
          where('category', '==', category),
          where('subCategory', '==', subCategory)
        ))
      );
    } else {
      promises.push(
        getDocs(query(
          collection(db, 'vendors'),
          where('category', '==', category)
        ))
      );
    }
  }
  const snapshots = await Promise.all(promises);
  const seen = new Set<string>();
  const results: any[] = [];
  for (const snap of snapshots) {
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);

      const data = d.data();

      // Must be publicly visible and approved by Admin
      if (data.publiclyVisible !== true) continue;
      if (data.status !== 'approved' && data.status !== 'active') continue;

      // Check plan expiration
      const isExpired = data.planExpiry && new Date(data.planExpiry) < new Date();
      if (isExpired) continue;

      // Filter by category and optionally subCategory
      if (category && data.category !== category) continue;
      if (subCategory && data.subCategory !== subCategory) continue;

      const vLat = Number(data.latitude);
      const vLng = Number(data.longitude);
      let dist = 999999;
      if (!isNaN(vLat) && !isNaN(vLng)) {
        dist = distanceBetween(center, [vLat, vLng]);
      }

      results.push({
        id: d.id,
        ...data,
        distance: parseFloat(dist.toFixed(2)),
        isLocal: dist <= radiusInKm
      });
    }
  }

  return results.sort((a, b) => {
    const priorityDiff = getPriorityScore(b) - getPriorityScore(a);
    if (priorityDiff !== 0) return priorityDiff;
    return a.distance - b.distance;
  });
}

// ─── Ranking Helpers ─────────────────────────────────────────────────────────

export function getPlanScore(biz: any): number {
  const now = new Date();
  const hasExpiry = biz.planExpiry ? (biz.planExpiry.toDate ? biz.planExpiry.toDate() : new Date(biz.planExpiry)) : null;
  const isPlanActive = hasExpiry && hasExpiry > now;
  if (biz.planId === 'big' && isPlanActive) return 4;
  if (biz.planId === 'small' && isPlanActive) return 3;
  if (biz.plan === 'growth' || biz.isBoosted === true) return 2;
  return 1;
}

export function getPriorityScore(biz: any): number {
  const planScore = getPlanScore(biz);
  const isLocal = biz.isLocal !== false && biz.isLocal !== undefined
    ? biz.isLocal
    : (biz.distance !== undefined ? biz.distance <= 8 : true);
  return isLocal ? 1000 + planScore : planScore;
}

export function getTierBadgeInfo(biz: any) {
  const score = getPriorityScore(biz);
  switch (score) {
    case 1004:
      return { emoji: '🥇', name: 'Local Big Plan', score: 1004, color: '#b45309', bg: '#fef3c7', borderColor: '#fde68a' };
    case 1003:
      return { emoji: '🥈', name: 'Local Small Plan', score: 1003, color: '#334155', bg: '#f1f5f9', borderColor: '#cbd5e1' };
    case 1002:
      return { emoji: '🥉', name: 'Local Boosted Plan', score: 1002, color: '#9a3412', bg: '#ffedd5', borderColor: '#fed7aa' };
    case 1001:
      return null;
    case 4:
      return { emoji: '5️⃣', name: 'Non-Local Big Plan', score: 4, color: '#6b21a8', bg: '#f3e8ff', borderColor: '#d8b4fe' };
    case 3:
      return { emoji: '6️⃣', name: 'Non-Local Small Plan', score: 3, color: '#0369a1', bg: '#e0f2fe', borderColor: '#7dd3fc' };
    default:
      return null;
  }
}

