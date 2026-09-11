import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

const stripRichTextTags = (text: string) => {
  if (!text) return '';
  return text
    .replace(/<\/?b>/gi, '')
    .replace(/<\/?strong>/gi, '')
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, '$1')
    .replace(/<a\s+href=["'][^"']+["']>([^<]+)<\/a>/gi, '$1')
    .replace(/^\s*•\s*/gm, '')
    .replace(/^\s*\*\s*/gm, '')
    .replace(/^\s*-\s*/gm, '')
    .replace(/^\s*\d+\.\s*/gm, '');
};

export default function AvailableJobsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    fetchNearbyJobs();
  }, []);

  const fetchNearbyJobs = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Not Logged In', 'Please log in to see available jobs.');
        setLoading(false);
        return;
      }

      // Fetch provider data to get category and location details
      const providerSnap = await getDoc(doc(db, 'providers', userId));
      if (!providerSnap.exists()) {
        Alert.alert(
          'Profile Incomplete',
          'Please complete your business profile registration to find jobs.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
        setLoading(false);
        return;
      }

      const providerData = providerSnap.data();
      setProvider(providerData);

      const category = providerData.category;
      const vendorLocationStr = (providerData.address || providerData.city || '').toLowerCase().trim();
      const lat = Number(providerData.lat);
      const lng = Number(providerData.lng);

      // Query active jobs under this category
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('category', '==', category),
        where('status', '==', 'Active')
      );
      
      const jobsSnapshot = await getDocs(jobsQuery);
      const activeJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const cleanAndNormalize = (str: string): string[] => {
        if (!str) return [];
        return str
          .toLowerCase()
          .split(/[\s,.-]+/)
          .map(word => word.replace(/[^a-z0-9]/g, '').replace(/[aeiouy]/g, ''))
          .filter(word => word.length > 1);
      };

      const citiesMatch = (cityA: string, cityB: string): boolean => {
        const normA = cleanAndNormalize(cityA);
        const normB = cleanAndNormalize(cityB);
        if (normA.length === 0 || normB.length === 0) return false;
        return normA.some(wordA => normB.some(wordB => wordA === wordB || wordA.includes(wordB) || wordB.includes(wordA)));
      };

      const distanceBetween = (a: [number, number], b: [number, number]): number => {
        const R = 6371;
        const dLat = ((b[0] - a[0]) * Math.PI) / 180;
        const dLon = ((b[1] - a[1]) * Math.PI) / 180;
        const h =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((a[0] * Math.PI) / 180) *
          Math.cos((b[0] * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
      };

      // Filter jobs district-wise
      const matchedJobs = activeJobs.filter((job: any) => {
        if (!vendorLocationStr || !job.location) return true; // fallback to show if locations are unset
        return citiesMatch(vendorLocationStr, job.location);
      });

      // Calculate distance if coordinates are present on both ends
      const jobsWithDistance = matchedJobs.map((job: any) => {
        const jLat = Number(job.lat);
        const jLng = Number(job.lng);
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(jLat) && !isNaN(jLng)) {
          const dist = distanceBetween([lat, lng], [jLat, jLng]);
          return { ...job, distance: parseFloat(dist.toFixed(2)) };
        }
        return job;
      });

      // Sort by distance (if available), then by creation date
      const sortedJobs = jobsWithDistance.sort((a: any, b: any) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setJobs(sortedJobs);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      Toast.show({
        type: 'error',
        text1: 'Fetch Failed',
        text2: error.message || 'Failed to search available jobs.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async (jobId: string, jobTitle: string) => {
    Alert.alert(
      'Accept Job',
      `Are you sure you want to accept "${jobTitle}"? You will be connected with the customer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setLoading(true);
              const userId = auth.currentUser?.uid;
              if (!userId) return;

              // Update job status to accepted in Firestore
              await updateDoc(doc(db, 'jobs', jobId), {
                status: 'Accepted',
                acceptedBy: userId,
                acceptedAt: new Date().toISOString(),
              });

              Toast.show({
                type: 'success',
                text1: 'Job Accepted! 🎉',
                text2: 'Customer will contact you shortly.',
              });

              // Refresh list after accepting
              fetchNearbyJobs();
            } catch (error: any) {
              console.error('Error accepting job:', error);
              Alert.alert('Error', error.message || 'Failed to accept job.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderJobItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.jobType || 'Full Time'}</Text>
        </View>
        <View style={styles.distanceBadge}>
          <Ionicons name="location-outline" size={12} color="#1e40af" />
          <Text style={styles.distanceText}>
            {item.distance !== undefined ? `${item.distance.toFixed(1)} km away` : 'Nearby'}
          </Text>
        </View>
      </View>

      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.companyName}>Posted by: {item.company || 'Customer'}</Text>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="map-outline" size={14} color="#64748b" />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.location || 'Unknown location'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="wallet-outline" size={14} color="#64748b" />
          <Text style={styles.detailText} numberOfLines={1}>
            ₹{item.salary} ({item.salaryType || 'Per Month'})
          </Text>
        </View>
        {item.vacancies ? (
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={14} color="#64748b" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.vacancies} {item.vacancies === 1 ? 'Vacancy' : 'Vacancies'}
            </Text>
          </View>
        ) : null}
      </View>

      {item.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {stripRichTextTags(item.description)}
        </Text>
      ) : null}

      <TouchableOpacity
        style={styles.acceptBtn}
        activeOpacity={0.8}
        onPress={() => handleAcceptJob(item.id, item.title)}
      >
        <Text style={styles.acceptBtnText}>Accept Job</Text>
        <Ionicons name="checkmark-circle-outline" size={16} color="white" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Available Jobs</Text>
          {provider ? (
            <Text style={styles.headerSubtitle}>
              Matching <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>{provider.category}</Text> within {provider.serviceRadiusKm || 8} km
            </Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchNearbyJobs} disabled={loading}>
          <Ionicons name="refresh" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Searching nearby openings...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobItem}
          contentContainerStyle={{
            padding: 15,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="briefcase-outline" size={48} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Jobs Found</Text>
              <Text style={styles.emptyDesc}>
                There are currently no open jobs matching your category within your {provider?.serviceRadiusKm || 8} km service radius.
              </Text>
              <TouchableOpacity style={styles.emptyRefreshBtn} onPress={fetchNearbyJobs}>
                <Text style={styles.emptyRefreshText}>Check Again</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  headerSubtitle: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { fontSize: 13, color: '#64748b', marginTop: 10, fontWeight: '600' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  distanceBadge: {
    backgroundColor: '#dbeafe',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1e40af',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    lineHeight: 22,
  },
  companyName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    lineHeight: 18,
  },
  acceptBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  acceptBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyRefreshBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f6ff',
  },
  emptyRefreshText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
});
