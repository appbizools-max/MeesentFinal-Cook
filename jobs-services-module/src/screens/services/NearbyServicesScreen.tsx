import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useServicesStore } from '../../state/store';
import { geofireHelper } from '../../services/geofire';

export default function NearbyServicesScreen({ navigation }: any) {
  const { 
    nearbyServices, 
    loading, 
    lastUserPosition, 
    setNearbyServices, 
    setLastUserPosition 
  } = useServicesStore();
  
  const [fetching, setFetching] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Resolving location...');

  const fetchNearbyServices = async (force = false) => {
    if (fetching) return;
    setFetching(true);
    setStatusMsg('Acquiring GPS coordinates...');

    try {
      // 1. Get GPS coordinates
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS location permission is required to list nearby services.');
        setFetching(false);
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const currentLat = locationData.coords.latitude;
      const currentLng = locationData.coords.longitude;

      // 2. Proximity Throttling Check
      if (lastUserPosition && !force) {
        const distMoved = geofireHelper.getDistanceInKm(
          lastUserPosition, 
          [currentLat, currentLng]
        );

        // Throttle query: only recompute and query if moved more than 500m (0.5 km)
        if (distMoved < 0.5) {
          console.log(`Moved only ${distMoved.toFixed(3)} km (less than 500m). Throttled cache fetch.`);
          setFetching(false);
          return;
        }
      }

      setStatusMsg('Querying nearby cells...');

      // 3. Compute geohash query bounds (8 km in meters = 8000)
      const center: [number, number] = [currentLat, currentLng];
      const bounds = geofireHelper.getQueryBounds(center, 8000);

      // 4. Run parallel Firestore queries
      const snapshots = await Promise.all(
        bounds.map(([lo, hi]) => {
          const q = query(
            collection(db, 'services'),
            orderBy('geohash'),
            where('geohash', '>=', lo),
            where('geohash', '<=', hi),
            limit(50)
          );
          return getDocs(q);
        })
      );

      // 5. Post-filter and sort results
      const seen = new Set<string>();
      const results: any[] = [];

      for (const snapshot of snapshots) {
        for (const d of snapshot.docs) {
          if (seen.has(d.id)) continue;
          seen.add(d.id);

          const data = d.data();
          const sLat = Number(data.location?.lat);
          const sLng = Number(data.location?.lng);

          if (isNaN(sLat) || isNaN(sLng)) continue;

          // Calculate actual distance
          const distance = geofireHelper.getDistanceInKm(center, [sLat, sLng]);

          // Keep only results within 8 km
          if (distance <= 8) {
            results.push({
              id: d.id,
              ...data,
              distance: parseFloat(distance.toFixed(2)) // 2 decimal precision
            });
          }
        }
      }

      // Sort results by actual distance ascending
      const sorted = results.sort((a, b) => a.distance - b.distance);
      setNearbyServices(sorted);
      setLastUserPosition([currentLat, currentLng]); // Only update cache on success

    } catch (err: any) {
      console.error("Proximity search failed:", err);
      Alert.alert('Search Error', err.message || 'Proximity lookup failed.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchNearbyServices();
  }, []);

  const renderServiceCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.distanceBadge}>
          <Ionicons name="navigate-outline" size={12} color="#16a34a" />
          <Text style={styles.distanceText}>{item.distance} km away</Text>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerText}>Local Services</Text>
          <Text style={styles.subText}>Within 8 km radius</Text>
        </View>
        <TouchableOpacity 
          style={styles.regBtn}
          onPress={() => navigation.navigate('CreateService')}
        >
          <Ionicons name="business" size={16} color="white" />
          <Text style={styles.regBtnText}>Register Shop</Text>
        </TouchableOpacity>
      </View>

      {fetching && nearbyServices.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginBottom: 12 }} />
          <Text style={styles.statusLabel}>{statusMsg}</Text>
        </View>
      ) : (
        <FlatList
          data={nearbyServices}
          keyExtractor={(item) => item.id}
          renderItem={renderServiceCard}
          refreshControl={
            <RefreshControl 
              refreshing={fetching} 
              onRefresh={() => fetchNearbyServices(true)} 
              colors={['#3b82f6']} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No services within 8km</Text>
              <Text style={styles.emptyDesc}>
                We couldn't find any registered service providers near your current location.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  headerText: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  subText: { fontSize: 12, color: '#16a34a', fontWeight: '700', marginTop: 2 },
  regBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#3b82f6', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 6,
    gap: 4
  },
  regBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  listContent: { padding: 15, paddingBottom: 30 },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 10, 
    padding: 15, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', flex: 1, marginRight: 10 },
  distanceBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4,
    gap: 3
  },
  distanceText: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  cardDesc: { fontSize: 14, color: '#475569', lineHeight: 20 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  statusLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 15 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6, lineHeight: 18 }
});
