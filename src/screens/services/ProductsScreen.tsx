import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StyleSheet,
  Image,
  ActivityIndicator,
  FlatList,
  Linking,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ALL_PRODUCTS } from '../../data/products';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import leadService from '../../services/lead.service';

const { width } = Dimensions.get('window');
const PRIMARY_COLOR = '#2563EB';

export default function ProductsScreen({ route, navigation }: any) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeTabId, setActiveTabId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Vendor listing state
  const [vendors, setVendors] = useState<any[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  // Mart banners state
  const [martBanners, setMartBanners] = useState<any[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'banners'));
    const unsubscribeBanners = onSnapshot(q, (snapshot) => {
      const allList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((b: any) => b.isActive !== false);

      const martList = allList.filter((b: any) => {
        const t = String(b.type || '').toLowerCase();
        return t === 'productmart' || t === 'mart' || t.includes('productmart') || t.includes('mart');
      });
      setMartBanners(martList);
    }, (err) => {
      console.warn("Mart banners snapshot listener warning:", err?.message);
    });

    return () => unsubscribeBanners();
  }, []);

  useEffect(() => {
    try {
      const catParam = route?.params?.category ? String(route.params.category) : '';
      const catParamLower = catParam ? catParam.toLowerCase() : '';
      if (catParamLower && catParamLower !== 'all') {
        const found = ALL_PRODUCTS.find(p => {
          const pId = p?.id ? String(p.id) : '';
          const pName = p?.name ? String(p.name) : '';
          const pNameLower = pName ? pName.toLowerCase() : '';
          return pId === catParam ||
            pNameLower === catParamLower ||
            (pNameLower && pNameLower.includes(catParamLower)) ||
            (catParamLower && catParamLower.includes(pNameLower));
        });
        if (found) {
          setActiveTabId(found.id);
        }
      }
    } catch (error) {
      console.error('Error in ProductsScreen useEffect:', error);
    }
  }, [route?.params?.category]);

  // Fetch manufacturer vendors directly from Firestore (fast, no GPS needed)
  useEffect(() => {
    fetchManufacturerVendors();
  }, []);

  const fetchManufacturerVendors = async () => {
    setLoadingVendors(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'vendors'), where('type', '==', 'product'))
      );
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter only approved/active
      const active = all.filter(v => {
        const isApprovedOrActive = v.status === 'approved' || v.status === 'active' || !v.status;
        const isExpired = v.planExpiry && new Date(v.planExpiry) < new Date();
        return isApprovedOrActive && !isExpired;
      });

      // Same priority algorithm as services listing (geofire.ts getTier)
      const getTier = (biz: any) => {
        const now = new Date();
        const hasExpiry = biz.planExpiry
          ? (biz.planExpiry.toDate ? biz.planExpiry.toDate() : new Date(biz.planExpiry))
          : null;
        const isPlanActive = hasExpiry && hasExpiry > now;
        if (biz.planId === 'big' && isPlanActive) return 3;   // Premium plan
        if (biz.planId === 'small' && isPlanActive) return 2;  // Smart plan
        if (biz.plan === 'growth' || biz.isBoosted === true) return 1.5; // Boosted
        return 1; // Free
      };

      const sorted = active.sort((a, b) => getTier(b) - getTier(a));

      setVendors(sorted);
      setFilteredVendors(sorted);
    } catch (error) {
      console.error('Error fetching manufacturer vendors:', error);
    } finally {
      setLoadingVendors(false);
    }
  };

  // Filter vendors by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVendors(vendors);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredVendors(
      vendors.filter(v =>
        (v.businessName && v.businessName.toLowerCase().includes(q)) ||
        (v.description && v.description.toLowerCase().includes(q)) ||
        (v.category && v.category.toLowerCase().includes(q)) ||
        (v.subCategory && v.subCategory.toLowerCase().includes(q)) ||
        (v.location && v.location.toLowerCase().includes(q))
      )
    );
  }, [searchQuery, vendors]);

  const getSubKey = (sub: string) => {
    try {
      const safeSub = sub ? String(sub) : '';
      return safeSub.toLowerCase()
        .replace(/ & /g, '_')
        .replace(/ \/ /g, '_')
        .replace(/ /g, '_')
        .replace(/-/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    } catch (error) {
      return 'unknown';
    }
  };

  const renderSubCategory = (sub: string, categoryName: string) => {
    try {
      const subKey = getSubKey(sub);
      const translatedSub = t(`subcategories.${subKey}`);
      const displaySub = translatedSub === `subcategories.${subKey}` ? sub : translatedSub;
      return (
        <TouchableOpacity
          key={sub}
          style={styles.pill}
          onPress={() => navigation.navigate('BusinessList', { category: categoryName, subCategory: sub })}
        >
          <Text style={styles.pillText} numberOfLines={2}>{displaySub}</Text>
        </TouchableOpacity>
      );
    } catch (error) {
      return (
        <TouchableOpacity key={sub} style={styles.pill}
          onPress={() => navigation.navigate('BusinessList', { category: categoryName, subCategory: sub })}>
          <Text style={styles.pillText} numberOfLines={2}>{sub}</Text>
        </TouchableOpacity>
      );
    }
  };

  const renderVendorCard = ({ item }: { item: any }) => {
    const now = new Date();
    const isPremiumActive = item.planId === 'big' && item.planExpiry && new Date(item.planExpiry) > now;
    return (
      <TouchableOpacity
        style={styles.vendorCard}
        onPress={() => navigation.navigate('ServiceDetail', { service: item })}
        activeOpacity={0.93}
      >
        {(() => {
          const realImg = (item.image && typeof item.image === 'string' && item.image.trim() !== '' && !item.image.includes('picsum.photos'))
            ? item.image
            : (item.businessImage && typeof item.businessImage === 'string' && item.businessImage.trim() !== '' && !item.businessImage.includes('picsum.photos'))
              ? item.businessImage
              : (Array.isArray(item.images) && item.images.length > 0 && item.images[0] && typeof item.images[0] === 'string' && item.images[0].trim() !== '' && !item.images[0].includes('picsum.photos'))
                ? item.images[0]
                : null;

          if (realImg) {
            return (
              <Image
                source={{ uri: realImg }}
                style={styles.vendorImage}
                resizeMode="cover"
              />
            );
          }

          return (
            <View style={[styles.vendorImage, { backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', padding: 6 }]}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#3b82f6', letterSpacing: -0.3, textAlign: 'center' }}>
                Business
              </Text>
            </View>
          );
        })()}
        <View style={styles.vendorInfo}>
          <View style={styles.vendorBadgeRow}>
            <View style={styles.mBadge}>
              <Ionicons name="cube-outline" size={10} color="#1e40af" style={{ marginRight: 3 }} />
              <Text style={styles.mBadgeText}>Manufacturer</Text>
            </View>
            {isPremiumActive && (
              <View style={styles.trustedBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#1e40af" style={{ marginRight: 2 }} />
                <Text style={styles.trustedBadgeText}>Trusted</Text>
              </View>
            )}
            {(item.tookVerification || item.isVerified || item.verifyMark || item.verificationStatus === 'verified') && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={10} color="#15803d" style={{ marginRight: 2 }} />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.vendorName} numberOfLines={1}>{item.businessName}</Text>
          {item.subCategory ? (
            <Text style={styles.vendorSub} numberOfLines={1}>{item.subCategory}</Text>
          ) : null}
          <View style={styles.vendorMeta}>
            <Ionicons name="location-outline" size={12} color="#64748b" />
            <Text style={styles.vendorLocation} numberOfLines={1}>{item.location || item.city || 'Local Area'}</Text>
          </View>
        </View>
        <View style={styles.vendorActions}>
          <TouchableOpacity
            style={styles.vendorCallBtn}
            onPress={() => {
              const businessName = item.businessName || 'this business';
              Alert.alert(
                'Confirm Call',
                `Do you want to call ${businessName}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'OK',
                    onPress: () => {
                      leadService.recordCall(item);
                      Linking.openURL(`tel:${item.phone}`);
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="call" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.vendorWaBtn}
            onPress={() => {
              const businessName = item.businessName || 'this business';
              Alert.alert(
                'Open WhatsApp',
                `Do you want to chat with ${businessName} on WhatsApp?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'OK',
                    onPress: () => {
                      leadService.recordWhatsApp(item);
                      Linking.openURL(`whatsapp://send?phone=${item.phone}`);
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="logo-whatsapp" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const showVendors = searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} style={styles.topContainer}>
        {/* Top Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginTop: 10, marginBottom: 15 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Ionicons name="chevron-back" size={28} color="#1e293b" />
          </TouchableOpacity>
          <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              placeholder="Search manufacturers, products..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Horizontal Tabs */}
        {!showVendors && (
          <View style={styles.tabsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              {['all', ...ALL_PRODUCTS.map(p => p.id)].map((id) => {
                const product = ALL_PRODUCTS.find(p => p.id === id);
                const translatedTab = id === 'all'
                  ? t('products.all_tab')
                  : (product
                    ? (() => { const trans = t(`product_categories.${product.id}`); return trans.startsWith('product_categories.') ? product.name : trans; })()
                    : id);
                const isActive = activeTabId === id;
                return (
                  <TouchableOpacity key={id} onPress={() => setActiveTabId(id)} style={styles.tabItem}>
                    <View style={[styles.tabContent, isActive && styles.tabContentActive]}>
                      {id === 'all' ? (
                        <Ionicons name="grid" size={18} color={isActive ? PRIMARY_COLOR : "#64748b"} style={{ marginRight: 6 }} />
                      ) : (
                        <Ionicons name="cube-outline" size={16} color={isActive ? PRIMARY_COLOR : "#64748b"} style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{translatedTab}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>

      {showVendors ? (
        /* --- Vendor Search Results --- */
        <View style={{ flex: 1 }}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {loadingVendors ? 'Searching...' : `${filteredVendors.length} Manufacturer${filteredVendors.length !== 1 ? 's' : ''} found`}
            </Text>
          </View>
          {loadingVendors ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              <Text style={styles.loadingText}>Finding manufacturers...</Text>
            </View>
          ) : filteredVendors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No manufacturers found for "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={filteredVendors}
              keyExtractor={(item) => item.id}
              renderItem={renderVendorCard}
              contentContainerStyle={{ padding: 15, paddingBottom: 80 + insets.bottom }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : (
        /* --- Category Pills View --- */
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ ...styles.contentPadding, paddingBottom: 20 + insets.bottom }}
        >
          {/* Bulk Sourcing Banner / Product Mart Banner Slider */}
          {martBanners.length > 0 ? (
            <View style={{ borderRadius: 24, overflow: 'hidden', height: 180, marginBottom: 30, position: 'relative', backgroundColor: '#0f172a' }}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                  setActiveBannerIndex(index);
                }}
                style={{ height: 180 }}
              >
                {martBanners.map((banner: any, index: number) => (
                  <View key={banner.id || index} style={{ width: width - 40, height: 180, position: 'relative' }}>
                    <Image
                      source={{ uri: banner.imageUrl || banner.image || '' }}
                      style={{ width: '100%', height: '100%', borderRadius: 24 }}
                      resizeMode="cover"
                    />
                    {banner.title ? (
                      <View style={{ position: 'absolute', bottom: 12, left: 12, backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, maxWidth: '85%' }}>
                        <Text style={{ color: 'white', fontSize: 13, fontWeight: '800' }} numberOfLines={1}>
                          {banner.title}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
              {martBanners.length > 1 && (
                <View style={{ position: 'absolute', bottom: 12, right: 16, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  {martBanners.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        { height: 6, borderRadius: 3 },
                        i === activeBannerIndex ? { width: 16, backgroundColor: 'white' } : { width: 6, backgroundColor: 'rgba(255,255,255,0.5)' },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <LinearGradient
              colors={['#1e293b', '#0f172a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.eliteBanner}
            >
              <View style={styles.bannerContent}>
                <View style={styles.badgeWrap}>
                  <Ionicons name="pricetag" size={12} color="#f59e0b" />
                  <Text style={styles.badgeText}>{t('products.wholesale_deals')}</Text>
                </View>
                <Text style={styles.eliteTitle}>{t('products.global_sourcing')}</Text>
                <Text style={styles.eliteDesc}>{t('products.global_desc')}</Text>
              </View>
              <Ionicons name="cube" size={80} color="rgba(255,255,255,0.05)" style={styles.bannerBgIcon} />
            </LinearGradient>
          )}

          {ALL_PRODUCTS
            .filter(p => activeTabId === 'all' || p.id === activeTabId)
            .map((product) => (
              <View key={product.id} style={styles.section}>
                <View style={styles.gridContainer}>
                  <Text style={styles.sectionHeader}>
                    {(() => { const trans = t(`product_categories.${product.id}`); return trans.startsWith('product_categories.') ? product.name : trans; })()}
                  </Text>
                  <View style={styles.pillGrid}>
                    {product.subCategories.map((sub) => renderSubCategory(sub, product.name))}
                  </View>
                </View>
              </View>
            ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  topContainer: {
    backgroundColor: '#ffffff',
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 15,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1e293b',
  },
  tabsWrapper: { paddingBottom: 0 },
  tabsScroll: { paddingHorizontal: 15 },
  tabItem: { marginRight: 12, paddingVertical: 10, alignItems: 'center' },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabContentActive: { backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: PRIMARY_COLOR },
  contentPadding: { paddingHorizontal: 15, paddingTop: 20 },
  section: { marginBottom: 30 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    width: (width - 65) / 2,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridContainer: { padding: 5 },
  pillText: { fontSize: 13, fontWeight: '700', color: '#334155', textAlign: 'center' },
  eliteBanner: {
    padding: 30,
    minHeight: 180,
    borderRadius: 24,
    marginBottom: 30,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerContent: { flex: 1, zIndex: 1 },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeText: { color: '#fbbf24', fontSize: 10, fontWeight: 'bold', marginLeft: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  eliteTitle: { fontSize: 22, fontWeight: '900', color: 'white', letterSpacing: -0.5, marginBottom: 6 },
  eliteDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  bannerBgIcon: { position: 'absolute', right: -15, bottom: -15, transform: [{ rotate: '-15deg' }] },
  // Vendor Card
  resultsHeader: { paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resultsCount: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  vendorCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  vendorImage: { width: 90, height: 90, backgroundColor: '#f1f5f9' },
  vendorInfo: { flex: 1, padding: 10 },
  vendorBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  vendorName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  vendorSub: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  vendorMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  vendorLocation: { fontSize: 11, color: '#64748b', flex: 1 },
  vendorActions: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, gap: 8 },
  vendorCallBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  vendorWaBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  mBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#dbeafe' },
  mBadgeText: { fontSize: 9, fontWeight: '700', color: '#1e40af' },
  trustedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#dbeafe' },
  trustedBadgeText: { fontSize: 9, fontWeight: '700', color: '#1e40af' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  verifiedBadgeText: { fontSize: 9, fontWeight: '700', color: '#15803d' },
  // Ad Banner Styles
  adBannerContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    height: 125,
    backgroundColor: '#f1f5f9',
  },
  adBannerCarousel: {
    height: 125,
  },
  adBannerSlide: {
    width: width - 30,
    height: 125,
    position: 'relative',
  },
  adBannerImage: {
    width: '100%',
    height: '100%',
  },
  adBannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    justifyContent: 'flex-end',
    padding: 12,
  },
  adSponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
    gap: 4,
  },
  adSponsoredBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  adSlideTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  adSlideDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  adDotRow: {
    position: 'absolute',
    bottom: 10,
    right: 15,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  adDot: {
    height: 6,
    borderRadius: 3,
  },
  adDotActive: {
    width: 16,
    backgroundColor: 'white',
  },
  adDotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
