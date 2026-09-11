import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { auth, db } from '../../services/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function MyActivitiesScreen({ navigation, route }: any) {
  const sourceApp = route?.params?.sourceApp || 'Jobs';
  const brandColor = sourceApp === 'Services' ? '#3b5fa6' : '#0035a0';
  const brandBgColor = sourceApp === 'Services' ? '#e8effb' : '#f0f5fc';
  const brandGradient = sourceApp === 'Services' ? ['#3b5fa6', '#2a4a85'] : ['#0035a0', '#002570'];

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active');

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'pincode_ads'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ads = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      // Sort by createdAt descending
      const sortedAds = ads.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setActivities(sortedAds);
      setLoading(false);
    }, (error) => {
      console.error("Error loading activities:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getAdStatusBadge = (endDateStr: any) => {
    if (!endDateStr) return { label: 'Active', color: '#10b981', isActive: true };
    
    let end: Date;
    if (endDateStr.seconds) {
      end = new Date(endDateStr.seconds * 1000);
    } else {
      end = new Date(endDateStr);
    }
    
    const isActive = end.getTime() > new Date().getTime();
    return {
      label: isActive ? 'Active' : 'Expired',
      color: isActive ? '#10b981' : '#ef4444',
      isActive
    };
  };

  const getRemainingDays = (endDateStr: any) => {
    if (!endDateStr) return 0;
    let end: Date;
    if (endDateStr.seconds) {
      end = new Date(endDateStr.seconds * 1000);
    } else {
      end = new Date(endDateStr);
    }
    const diffTime = end.getTime() - new Date().getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatAdDate = (endDateStr: any) => {
    if (!endDateStr) return 'N/A';
    let end: Date;
    if (endDateStr.seconds) {
      end = new Date(endDateStr.seconds * 1000);
    } else {
      end = new Date(endDateStr);
    }
    return end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const appCampaigns = activities.filter(ad => ad.sourceApp === sourceApp);
  const activeCount = appCampaigns.filter(ad => getAdStatusBadge(ad.endDate).isActive).length;
  const expiredCount = appCampaigns.filter(ad => !getAdStatusBadge(ad.endDate).isActive).length;
  const totalSpend = appCampaigns.reduce((sum, ad) => sum + (Number(ad.amountPaid) || 0), 0);

  const filteredActivities = appCampaigns.filter(ad => {
    const badge = getAdStatusBadge(ad.endDate);
    return activeTab === 'active' ? badge.isActive : !badge.isActive;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Ad Campaigns</Text>
        <TouchableOpacity style={[styles.createAdBtn, { backgroundColor: brandBgColor }]} onPress={() => navigation.navigate('PostAd', { sourceApp })}>
          <Ionicons name="add" size={24} color={brandColor} />
        </TouchableOpacity>
      </View>

      {/* Stats Dashboard */}
      {!loading && appCampaigns.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: brandBgColor }]}>
              <Ionicons name="megaphone-outline" size={18} color={brandColor} />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Total Ads</Text>
              <Text style={styles.statValue}>{appCampaigns.length}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#e8f8f0' }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Active</Text>
              <Text style={styles.statValue}>{activeCount}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="wallet-outline" size={18} color="#d97706" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Spend</Text>
              <Text style={styles.statValue}>₹{totalSpend}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tabs Row */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && { borderBottomColor: brandColor }]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && { color: brandColor }]}>
            Active ({activeCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expired' && { borderBottomColor: brandColor }]}
          onPress={() => setActiveTab('expired')}
        >
          <Text style={[styles.tabText, activeTab === 'expired' && { color: brandColor }]}>
            Expired ({expiredCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={brandColor} />
          <Text style={[styles.loadingText, { color: brandColor }]}>Loading campaigns...</Text>
        </View>
      ) : filteredActivities.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyStateCard}>
            <View style={[styles.emptyIconWrap, { backgroundColor: brandBgColor }]}>
              <Ionicons name="megaphone-outline" size={60} color={brandColor} style={{ opacity: 0.2 }} />
            </View>
            <Text style={styles.emptyTitle}>
              No {activeTab === 'active' ? 'Active' : 'Expired'} Campaigns
            </Text>
            <Text style={styles.emptyDesc}>
              {activeTab === 'active'
                ? 'Create a targeted pincode ad campaign to promote your jobs or services to candidates in specific areas.'
                : 'Your expired ad campaigns will appear here.'}
            </Text>
            {activeTab === 'active' && (
              <TouchableOpacity onPress={() => navigation.navigate('PostAd', { sourceApp })}>
                <LinearGradient
                  colors={brandGradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.emptyBtn, { shadowColor: brandColor }]}
                >
                  <Text style={styles.emptyBtnText}>Launch First Campaign</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {filteredActivities.map((ad) => {
            const badge = getAdStatusBadge(ad.endDate);
            const remainingDays = getRemainingDays(ad.endDate);
            
            return (
              <View key={ad.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.planBadgeContainer}>
                      <Text style={styles.cardPlanTitle}>
                        {ad.plan === 'week' ? 'Weekly Promo Plan' : 'Monthly Promo Plan'}
                      </Text>
                      <View style={[styles.planPill, { backgroundColor: brandBgColor }]}>
                        <Text style={[styles.planPillText, { color: brandColor }]}>
                          {ad.plan === 'week' ? '7 Days' : '30 Days'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.placedRow}>
                      <Ionicons name="calendar-outline" size={11} color="#94a3b8" style={{ marginRight: 4 }} />
                      <Text style={styles.cardDate}>
                        Placed on: {ad.createdAt?.toDate ? formatAdDate(ad.createdAt?.toDate()) : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: badge.isActive ? '#e8f8f0' : '#fee2e2' }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.isActive ? '#047857' : '#b91c1c' }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {ad.imageUrl ? (
                  <View style={styles.adImageWrapper}>
                    <Image source={{ uri: ad.imageUrl }} style={styles.adImage} />
                  </View>
                ) : (
                  <LinearGradient
                    colors={sourceApp === 'Services' ? ['#e8effb', '#d1e0f7'] : ['#f0f5fc', '#d0e0fc']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.noImagePlaceholder}
                  >
                    <Ionicons name="megaphone-outline" size={32} color={brandColor} style={{ opacity: 0.7, marginBottom: 4 }} />
                    <Text style={[styles.noImageText, { color: brandColor }]}>Campaign Active on Mobile App</Text>
                  </LinearGradient>
                )}

                <View style={styles.cardContent}>
                  {/* Targeting & Amount Paid Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.gridItem}>
                      <View style={styles.gridIconWrap}>
                        <Ionicons name="location-outline" size={16} color="#64748b" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>TARGETING AREA</Text>
                        <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
                          {ad.targetType === 'state' ? `State-wide (${toTitleCase(ad.targetState || '')})` : 
                           ad.targetType === 'district' ? `District-wide (${toTitleCase(ad.targetDistrict || '')})` : 
                           `${ad.pincodeCount || ad.pincodes?.length || 1} Pincode(s)`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.gridItemRight}>
                      <View style={styles.gridIconWrap}>
                        <Ionicons name="wallet-outline" size={16} color="#10b981" />
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.infoLabel}>AMOUNT PAID</Text>
                        <Text style={styles.infoValueAmount}>₹{ad.amountPaid || 99}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* End Date & Remaining Days Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.gridItem}>
                      <View style={styles.gridIconWrap}>
                        <Ionicons name="calendar-clear-outline" size={16} color="#64748b" />
                      </View>
                      <View>
                        <Text style={styles.infoLabel}>END DATE</Text>
                        <Text style={styles.infoValueDate}>{formatAdDate(ad.endDate)}</Text>
                      </View>
                    </View>

                    {badge.isActive ? (
                      <View style={styles.gridItemRight}>
                        <View style={styles.gridIconWrap}>
                          <Ionicons name="hourglass-outline" size={16} color="#d97706" />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.infoLabel}>REMAINING</Text>
                          <Text style={styles.infoValueDays}>{remainingDays} Day(s)</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.gridItemRight}>
                        <View style={styles.gridIconWrap}>
                          <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.infoLabel}>STATUS</Text>
                          <Text style={styles.infoValueExpired}>Expired</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  createAdBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 5,
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginTop: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  emptyBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafbfc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  planBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  placedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardPlanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  adImageWrapper: {
    width: '100%',
    height: 150,
    backgroundColor: '#f1f5f9',
  },
  adImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  noImagePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  noImageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  gridItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  gridIconWrap: {
    marginRight: 8,
    marginLeft: 4,
  },
  infoLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  infoValueAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  infoValueDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  infoValueDays: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  infoValueExpired: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
});
