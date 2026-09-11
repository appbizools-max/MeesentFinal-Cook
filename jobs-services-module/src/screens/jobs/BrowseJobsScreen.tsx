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
import { useJobsStore, useAuthStore } from '../../state/store';

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

export default function BrowseJobsScreen({ navigation }: any) {
  const { jobs, loading, hasMore, fetchJobs } = useJobsStore();
  const user = useAuthStore(state => state.user);
  const [refreshing, setRefreshing] = useState(false);

  const initializing = useAuthStore(state => state.initializing);
  const userDistrict = user?.district;

  useEffect(() => {
    if (userDistrict) {
      fetchJobs(userDistrict, true).catch(err => {
        console.error("Failed to load jobs on district mount:", err);
      });
    }
  }, [userDistrict]);

  const handleRefresh = async () => {
    if (!userDistrict) return;
    setRefreshing(true);
    try {
      await fetchJobs(userDistrict, true);
    } catch (e) {
      Alert.alert('Error', 'Could not refresh jobs.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (userDistrict && hasMore && !loading) {
      fetchJobs(userDistrict, false).catch(err => {
        console.error("Failed to load more jobs:", err);
      });
    }
  };

  const renderJobCard = ({ item }: { item: any }) => {
    const dateStr = item.createdAt?.toDate 
      ? item.createdAt.toDate().toLocaleDateString()
      : 'Recently';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.district}</Text>
          </View>
        </View>
        <Text style={styles.cardDesc} numberOfLines={3}>{stripRichTextTags(item.description)}</Text>
        <View style={styles.cardFooter}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={styles.footerText}>Posted on: {dateStr}</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  };

  if (initializing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!userDistrict) {
    return (
      <View style={[styles.container, styles.centerContainer, { paddingHorizontal: 20 }]}>
        <Ionicons name="location-outline" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
        <Text style={styles.emptyTitle}>District Profile Required</Text>
        <Text style={styles.emptyDesc}>
          Please select a district in your profile configuration to view matching jobs in your area.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar with Post Job Button */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerText}>District Feed</Text>
          <Text style={styles.subText}>{userDistrict}</Text>
        </View>
        <TouchableOpacity 
          style={styles.postBtn}
          onPress={() => navigation.navigate('PostJob')}
        >
          <Ionicons name="add-circle" size={16} color="white" />
          <Text style={styles.postBtnText}>Post Job</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobCard}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3b82f6']} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No jobs in your district yet</Text>
              <Text style={styles.emptyDesc}>
                Be the first to list a job posting in {userDistrict}!
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
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
  subText: { fontSize: 12, color: '#3b82f6', fontWeight: '700', marginTop: 2 },
  postBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#3b82f6', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 6,
    gap: 4
  },
  postBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
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
  badge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#3b82f6' },
  cardDesc: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  footerLoader: { paddingVertical: 15, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 15 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
