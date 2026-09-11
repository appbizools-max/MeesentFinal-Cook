import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  Share,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { getNearbyVendors } from '../../services/geofire';
import { getCachedUserCoords } from '../../services/userLocation';
const { width } = Dimensions.get('window');
const DISTRICT_COORDS: { [key: string]: [number, number] } = {
  'Adilabad': [19.6641, 78.5320],
  'Anantapur': [14.6819, 77.6006],
  'Chittoor': [13.2172, 79.1003],
  'Guntur': [16.3067, 80.4365],
  'Hyderabad': [17.3850, 78.4867],
  'Kakinada': [16.9891, 82.2475],
  'Karimnagar': [18.4386, 79.1288],
  'Khammam': [17.2473, 80.1514],
  'Kurnool': [15.8281, 78.0373],
  'Mahbubnagar': [16.7488, 77.9870],
  'Medak': [18.0480, 78.2614],
  'Nalgonda': [17.0575, 79.2671],
  'Nellore': [14.4426, 79.9865],
  'Nizamabad': [18.6725, 78.0941],
  'Rajahmundry': [17.0005, 81.8040],
  'Rangareddy': [17.3617, 78.3917],
  'Srikakulam': [18.2949, 83.8935],
  'Tirupati': [13.6288, 79.4192],
  'Vijayawada': [16.5062, 80.6480],
  'Vizianagaram': [18.1066, 83.3956],
  'Warangal': [17.9689, 79.5941]
};

let cachedUserCoords: { lat: number; lng: number } | null = null;

export default function BusinessListScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { category = '', subCategory = '' } = route?.params || {};
  const safeCategory = String(category || '');
  const safeSubCategory = String(subCategory || '');
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [sortBy, setSortBy] = useState<string>('default');
  const [showSortModal, setShowSortModal] = useState(false);
  const [filteredBusinesses, setFilteredBusinesses] = useState<any[]>([]);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [userPincode, setUserPincode] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data?.pincode) {
            setUserPincode(data.pincode);
          }
          if (data?.city) {
            setUserCity(data.city);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile in BusinessListScreen:", error);
      }
    };
    fetchUserProfile();
  }, []);

  const fetchBrands = async () => {
    try {
      console.log('Fetching brands for:', { safeCategory, safeSubCategory });

      // Try to fetch by category ID first
      let q = query(
        collection(db, 'brands'),
        where('category', '==', safeCategory),
        where('subCategory', '==', safeSubCategory)
      );

      let querySnapshot = await getDocs(q);
      let docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // If no results, try by categoryName
      if (docs.length === 0) {
        console.log('No brands found by category ID, trying categoryName');
        q = query(
          collection(db, 'brands'),
          where('categoryName', '==', safeCategory),
          where('subCategory', '==', safeSubCategory)
        );
        querySnapshot = await getDocs(q);
        docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      if (docs.length === 0) {
        q = query(collection(db, 'brands'));
        querySnapshot = await getDocs(q);
        const allBrands = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        docs = allBrands.filter((brand: any) =>
          brand.subCategory === safeSubCategory
        );
      }

      setBrands(docs);
    } catch (error) {
      console.error("Error fetching brands: ", error);
    }
  };

  useEffect(() => {
    fetchBusinesses();
    fetchBrands();
  }, [category, subCategory, userPincode, userCity]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const currentUserId = auth.currentUser?.uid;

      const coords = getCachedUserCoords();
      let userLat = coords.lat;
      let userLng = coords.lng;

      console.log(`📍 Fast proximity query coordinates: lat=${userLat}, lng=${userLng}`);

      const ownedPromise = currentUserId
        ? getDocs(query(
          collection(db, 'vendors'),
          where('category', '==', safeCategory),
          where('subCategory', '==', safeSubCategory),
          where('ownerId', '==', currentUserId)
        ))
        : Promise.resolve(null);

      const [nearbyVendorsList, ownedSnapshot] = await Promise.all([
        getNearbyVendors(userLat, userLng, 8, safeCategory, safeSubCategory),
        ownedPromise
      ]);

      let ownedVendors: any[] = [];
      if (ownedSnapshot) {
        ownedVendors = ownedSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((v: any) => v.publiclyVisible === true && (v.status === 'approved' || v.status === 'active'));
      }

      const seen = new Set<string>();
      const docs: any[] = [];

      ownedVendors.forEach(v => {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          docs.push(v);
        }
      });

      nearbyVendorsList.forEach(v => {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          docs.push(v);
        }
      });

      setBusinesses(docs);
      setFilteredBusinesses(docs);
    } catch (error: any) {
      console.error("Error fetching businesses: ", error);
      const message = typeof error?.message === 'string' ? error.message : String(error);
      Toast.show({
        type: 'error',
        text1: 'Query Error',
        text2: message.includes('index')
          ? 'Firestore index required. Check console for link.'
          : message
      });
    } finally {
      setLoading(false);
    }
  };

  const logLead = async (item: any, type: 'call' | 'whatsapp' | 'direction') => {
    try {
      const currentUser = auth.currentUser;
      const vendorId = item.id || item.vendorId;
      let userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest User';
      let userPhone = currentUser?.phoneNumber || '';

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.name) userName = userData.name;
          if (userData.phoneNumber) userPhone = userData.phoneNumber;
        }
      }

      await addDoc(collection(db, 'leads'), {
        vendorId: vendorId || 'unknown',
        vendorName: item.businessName || 'Business',
        userId: currentUser?.uid || 'guest',
        userName,
        userPhone,
        type,
        createdAt: new Date().toISOString(),
      });

      if (vendorId) {
        const updateData: any = {};
        if (type === 'call') {
          updateData.callsCount = increment(1);
          updateData.calls = increment(1);
        } else if (type === 'whatsapp') {
          updateData.whatsappCount = increment(1);
          updateData.whatsapp = increment(1);
        } else if (type === 'direction') {
          updateData.directionsCount = increment(1);
          updateData.directions = increment(1);
        }
        await updateDoc(doc(db, 'vendors', vendorId), updateData);
      }
    } catch (error) {
      console.error('Error logging lead: ', error);
    }
  };

  const handleCall = (item: any) => {
    logLead(item, 'call');
    Linking.openURL(`tel:${item.phone}`);
  };

  const handleWhatsApp = (item: any) => {
    logLead(item, 'whatsapp');
    Linking.openURL(`whatsapp://send?phone=${item.phone}`);
  };

  const handleMapRedirect = (item?: any) => {
    if (item) logLead(item, 'direction');
    const defaultQuery = item?.businessName || item?.location || safeSubCategory || safeCategory || 'Businesses';
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(defaultQuery)}`);
  };

  const filterList = (searchVal: string, brandVal: string, sortType: string = sortBy) => {
    let result = [...businesses];

    if (brandVal !== '') {
      result = result.filter((biz: any) => {
        if (biz.brand === brandVal) return true;
        if (Array.isArray(biz.brands) && biz.brands.includes(brandVal)) return true;
        return false;
      });
    }

    if (searchVal.trim() !== '') {
      const queryText = searchVal.toLowerCase();
      result = result.filter((biz: any) => {
        return (
          (biz.businessName && biz.businessName.toLowerCase().includes(queryText)) ||
          (biz.description && biz.description.toLowerCase().includes(queryText)) ||
          (biz.location && biz.location.toLowerCase().includes(queryText)) ||
          (biz.subCategory && biz.subCategory.toLowerCase().includes(queryText))
        );
      });
    }

    if (sortType === 'rating_high') {
      result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sortType === 'verified_first') {
      result.sort((a, b) => {
        const aVal = (a.tookVerification || a.isVerified || a.planId === 'big' || a.planId === 'small') ? 1 : 0;
        const bVal = (b.tookVerification || b.isVerified || b.planId === 'big' || b.planId === 'small') ? 1 : 0;
        return bVal - aVal;
      });
    } else if (sortType === 'name_asc') {
      result.sort((a, b) => (a.businessName || '').localeCompare(b.businessName || ''));
    }

    setFilteredBusinesses(result);
  };

  const handleBrandSelect = (brandName: string) => {
    setSelectedBrand(brandName);
    setShowBrandModal(false);
    filterList(localSearchQuery, brandName, sortBy);
  };

  const handleSortSelect = (sortOption: string) => {
    setSortBy(sortOption);
    setShowSortModal(false);
    filterList(localSearchQuery, selectedBrand, sortOption);
  };

  const handleShare = async (business: any, displaySub?: string) => {
    try {
      const appUrl = `https://play.google.com/store/apps/details?id=com.messent.app&hl=en_IN`;
      const shareMessage = `Check out ${business.businessName} on Messent!\n\nDownload App: ${appUrl}`;

      await Share.share({
        message: shareMessage,
        title: business.businessName,
        url: appUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        text2: 'Unable to share this business'
      });
    }
  };

  function getBusinessOpenStatus(item: any) {
    const openingTimeStr = item.openingTime || '09:00 AM';
    const closingTimeStr = item.closingTime || '09:00 PM';
    const workingDays: string[] = Array.isArray(item.workingDays) && item.workingDays.length > 0
      ? item.workingDays
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDay = dayNames[now.getDay()];

    if (!workingDays.includes(currentDay)) {
      return { isOpen: false, text: `Closed today (${currentDay})` };
    }

    const parseTimeToMinutes = (timeStr: string) => {
      try {
        const parts = timeStr.trim().split(' ');
        if (parts.length < 2) return null;
        const [hStr, mStr] = parts[0].split(':');
        let hours = parseInt(hStr, 10);
        const minutes = parseInt(mStr, 10);
        const ampm = parts[1].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      } catch (e) {
        return null;
      }
    };

    const openMins = parseTimeToMinutes(openingTimeStr);
    const closeMins = parseTimeToMinutes(closingTimeStr);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    if (openMins !== null && closeMins !== null) {
      if (currentMins >= openMins && currentMins <= closeMins) {
        return { isOpen: true, text: `Open until ${closingTimeStr}` };
      } else {
        return { isOpen: false, text: `Closed • Opens ${openingTimeStr}` };
      }
    }

    return { isOpen: true, text: `Open until ${closingTimeStr}` };
  }

  const renderBusinessCard = ({ item }: { item: any }) => {
    const statusInfo = getBusinessOpenStatus(item);
    const subKey = safeSubCategory.toLowerCase()
      .replace(/ & /g, '_')
      .replace(/ \/ /g, '_')
      .replace(/ /g, '_')
      .replace(/-/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    const translatedSub = t(`subcategories.${subKey}`);
    const displaySub = translatedSub === `subcategories.${subKey}` ? safeSubCategory : translatedSub;

    const now = new Date();
    const isPremiumActive = item.planId === 'big' && item.planExpiry && new Date(item.planExpiry) > now;
    const isSmartActive = item.planId === 'small' && item.planExpiry && new Date(item.planExpiry) > now;

    return (
      <View style={styles.compactCard}>
        {/* Top Section - Whole Area Clickable */}
        <TouchableOpacity
          style={styles.cardTopSection}
          activeOpacity={0.95}
          onPress={() => navigation.navigate('ServiceDetail', { service: item })}
        >
          {/* Left Side - Image Thumbnail */}
          <View style={styles.compactLeftSide}>
            <Image
              source={{ uri: item.image || `https://picsum.photos/seed/${item.id}1/400/300` }}
              style={styles.compactLogo}
              resizeMode="cover"
            />
          </View>

          {/* Right Side - Business Details */}
          <View style={styles.compactRightSide}>
            <View style={styles.compactRightContent}>
              {/* Header Row with Share Button */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.headerContent}>
                  {/* Badges Row */}
                  <View style={styles.compactBadgeRow}>
                    {isPremiumActive && (
                      <>
                        <View style={styles.trustedBadge}>
                          <Ionicons name="shield-checkmark" size={10} color="#1e40af" style={{ marginRight: 2 }} />
                          <Text style={styles.trustedBadgeText}>Trusted</Text>
                        </View>
                        <View style={styles.recommendedBadge}>
                          <Ionicons name="thumbs-up" size={10} color="#92400e" style={{ marginRight: 2 }} />
                          <Text style={styles.recommendedBadgeText}>Recommended</Text>
                        </View>
                      </>
                    )}
                    {isSmartActive && (
                      <View style={styles.recommendedBadge}>
                        <Ionicons name="thumbs-up" size={10} color="#92400e" style={{ marginRight: 2 }} />
                        <Text style={styles.recommendedBadgeText}>Recommended</Text>
                      </View>
                    )}
                    {item.isBoosted && (
                      <View style={styles.trendingBadge}>
                        <Ionicons name="flame" size={10} color="#92400e" style={{ marginRight: 2 }} />
                        <Text style={styles.trendingBadgeText}>Trending</Text>
                      </View>
                    )}
                    {(item.rating || 0) >= 4.5 && (
                      <View style={styles.topRatedBadge}>
                        <Ionicons name="star" size={10} color="#166534" style={{ marginRight: 2 }} />
                        <Text style={styles.topRatedBadgeText}>Top Rated</Text>
                      </View>
                    )}
                    {item.tookVerification && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={10} color="#1e40af" style={{ marginRight: 2 }} />
                        <Text style={styles.verifiedBadgeText}>Verified</Text>
                      </View>
                    )}
                    {item.type === 'product' && (
                      <View style={styles.mBadge}>
                        <Text style={styles.mBadgeText}>Manufacturer</Text>
                      </View>
                    )}
                  </View>

                  {/* Business Name */}
                  <Text style={styles.compactCardTitle} numberOfLines={1}>{item.businessName}</Text>
                </View>

                {/* Share Button at Top Right */}
                <TouchableOpacity
                  style={styles.topShareButton}
                  onPress={() => handleShare(item, displaySub)}
                >
                  <Ionicons name="share-social" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>

              {/* Full Address */}
              <View style={styles.addressRow}>
                <Text style={styles.addressText}>{item.location || 'Local Area'}</Text>
              </View>

              {/* Brands Handled */}
              {((Array.isArray(item.brands) && item.brands.length > 0) || item.brand) && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>Brands:</Text>
                  {(Array.isArray(item.brands) && item.brands.length > 0 ? item.brands : [item.brand]).slice(0, 4).map((bItem: any, bIdx: number) => {
                    const bName = typeof bItem === 'string' ? bItem : (bItem?.brandName || bItem?.name || '');
                    if (!bName) return null;
                    return (
                      <View key={bIdx} style={{ backgroundColor: '#eff6ff', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#bfdbfe' }}>
                        <Text style={{ fontSize: 10, color: '#1d4ed8', fontWeight: '500' }}>{bName}</Text>
                      </View>
                    );
                  })}
                  {Array.isArray(item.brands) && item.brands.length > 4 && (
                    <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '500' }}>+{item.brands.length - 4} more</Text>
                  )}
                </View>
              )}

              {/* First Catalog Item */}
              {item.catalog && item.catalog.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 2, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: '#f8fafc', borderRadius: 6, alignSelf: 'flex-start' }}>
                  <Ionicons name="pricetag-outline" size={12} color="#3b82f6" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: '#334155', fontWeight: '500' }} numberOfLines={1}>
                    {item.catalog[0].name} {item.catalog[0].price ? `• ₹${item.catalog[0].price}` : ''}
                  </Text>
                </View>
              )}

              {/* Category */}
              <Text style={styles.categoryText}>{displaySub}</Text>

              {/* Open/Closed Status */}
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusInfo.isOpen ? '#10b981' : '#ef4444' }]} />
                <Text style={[styles.statusText, { color: statusInfo.isOpen ? '#10b981' : '#ef4444' }]}>
                  {statusInfo.text}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Full Width Action Buttons Row */}
        <View style={styles.fullWidthActions}>
          <TouchableOpacity
            style={[styles.fullWidthActionButton, { backgroundColor: '#3b82f6', borderWidth: 0 }]}
            onPress={() => handleCall(item)}
          >
            <Ionicons name="call" size={width * 0.045} color="white" />
            <Text style={[styles.fullWidthActionButtonText, { color: 'white' }]}>Call Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullWidthActionButton}
            onPress={() => handleWhatsApp(item)}
          >
            <Ionicons name="logo-whatsapp" size={width * 0.045} color="#10b981" />
            <Text style={[styles.fullWidthActionButtonText, { color: '#10b981' }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullWidthActionButton}
            onPress={() => handleMapRedirect(item)}
          >
            <Ionicons name="location" size={width * 0.045} color="#ef4444" />
            <Text style={[styles.fullWidthActionButtonText, { color: '#ef4444' }]}>Direction</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>

        {/* 1. Header with search, back and share buttons */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#1e293b" />
          </TouchableOpacity>

          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchBarInput}
              placeholder={`Search in ${subCategory || category || 'niche'}...`}
              placeholderTextColor="#94a3b8"
              value={localSearchQuery}
              onChangeText={(text) => {
                setLocalSearchQuery(text);
                filterList(text, selectedBrand);
              }}
            />
            {localSearchQuery !== '' && (
              <TouchableOpacity onPress={() => {
                setLocalSearchQuery('');
                filterList('', selectedBrand);
              }} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={() => {
            Alert.alert("Share", "Sharing these services with your friends!");
          }}>
            <Ionicons name="share-social-outline" size={22} color="#1e293b" />
          </TouchableOpacity>
        </View>

        {/* 2. Scrollable Filters list */}
        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScrollContent}>
            <TouchableOpacity
              style={styles.filterIconButton}
              onPress={() => setShowSortModal(true)}
            >
              <Ionicons name="options-outline" size={16} color="#1e293b" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.filterDropdownButton, { backgroundColor: '#f1f5f9' }]}>
              <Text style={styles.filterDropdownText}>{category || 'Options'} ▾</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterDropdownButton, sortBy !== 'default' ? { backgroundColor: '#f0f5fc', borderColor: '#3b82f6' } : null]}
              onPress={() => setShowSortModal(true)}
            >
              <Text style={[styles.filterDropdownText, sortBy !== 'default' ? { color: '#3b82f6', fontWeight: 'bold' } : null]}>
                {sortBy === 'rating_high' ? 'Sort: Top Rated ▾' :
                  sortBy === 'verified_first' ? 'Sort: Verified First ▾' :
                    sortBy === 'name_asc' ? 'Sort: Name (A-Z) ▾' : 'Sort by ▾'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterDropdownButton, selectedBrand ? { backgroundColor: '#f0f5fc', borderColor: '#3b82f6' } : null]}
              onPress={() => setShowBrandModal(true)}
            >
              <Text style={[styles.filterDropdownText, selectedBrand ? { color: '#3b82f6', fontWeight: 'bold' } : null]}>
                {selectedBrand || 'Brand'} ▾
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 3. Results count */}
        <View style={styles.resultCountRow}>
          <Text style={styles.resultCountText}>{filteredBusinesses.length} Results for your search</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : filteredBusinesses.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="business-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>{t('business_list.no_businesses')}</Text>
            <Text style={styles.emptyDesc}>{t('business_list.no_businesses_desc')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredBusinesses}
            keyExtractor={item => item.id}
            renderItem={renderBusinessCard}
            contentContainerStyle={{ ...styles.listPadding, paddingBottom: 80 + insets.bottom }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Sort Modal */}
        <Modal
          visible={showSortModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSortModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSortModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sort Businesses</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {[
                  { id: 'default', label: 'Default / Relevance' },
                  { id: 'rating_high', label: 'Top Rated (Highest Rating)' },
                  { id: 'verified_first', label: 'Verified & Premium First' },
                  { id: 'name_asc', label: 'Name (A to Z)' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.brandOption, sortBy === option.id && styles.brandOptionSelected]}
                    onPress={() => handleSortSelect(option.id)}
                  >
                    <Text style={[styles.brandOptionText, sortBy === option.id && styles.brandOptionTextSelected]}>
                      {option.label}
                    </Text>
                    {sortBy === option.id && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Brand Modal */}
        <Modal
          visible={showBrandModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBrandModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowBrandModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Brand</Text>
                <TouchableOpacity onPress={() => setShowBrandModal(false)}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <TouchableOpacity
                  style={[styles.brandOption, !selectedBrand && styles.brandOptionSelected]}
                  onPress={() => handleBrandSelect('')}
                >
                  <Text style={[styles.brandOptionText, !selectedBrand && styles.brandOptionTextSelected]}>
                    All Brands
                  </Text>
                  {!selectedBrand && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
                </TouchableOpacity>

                {(() => {
                  const dbBrandNames = brands.map((b: any) => typeof b === 'string' ? b : (b.brandName || b.name)).filter(Boolean);
                  const bizBrandNames: string[] = [];
                  businesses.forEach((b: any) => {
                    if (b.brand) {
                      const bStr = typeof b.brand === 'string' ? b.brand : (b.brand?.brandName || b.brand?.name);
                      if (bStr) bizBrandNames.push(bStr);
                    }
                    if (Array.isArray(b.brands)) {
                      b.brands.forEach((br: any) => {
                        const brStr = typeof br === 'string' ? br : (br?.brandName || br?.name);
                        if (brStr) bizBrandNames.push(brStr);
                      });
                    }
                  });
                  const allBrandNames = Array.from(new Set([...dbBrandNames, ...bizBrandNames]));

                  if (allBrandNames.length === 0) {
                    return (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>No specific brands found for this listing</Text>
                      </View>
                    );
                  }

                  return allBrandNames.map((brandName) => (
                    <TouchableOpacity
                      key={brandName}
                      style={[styles.brandOption, selectedBrand === brandName && styles.brandOptionSelected]}
                      onPress={() => handleBrandSelect(brandName)}
                    >
                      <Text style={[styles.brandOptionText, selectedBrand === brandName && styles.brandOptionTextSelected]}>
                        {brandName}
                      </Text>
                      {selectedBrand === brandName && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
                    </TouchableOpacity>
                  ));
                })()}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10
  },
  backBtn: { padding: 4 },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 30,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  searchIcon: { marginRight: 8 },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    paddingVertical: 4,
  },
  micIcon: { marginLeft: 8 },
  shareBtn: { padding: 6 },

  // Filters Scroll
  filtersWrapper: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  filtersScrollContent: {
    paddingHorizontal: 15,
    gap: 8,
    alignItems: 'center'
  },
  filterIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterDropdownButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterDropdownText: { fontSize: 12, fontWeight: '600', color: '#475569' },

  // Result Count Row
  resultCountRow: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff'
  },
  resultCountText: { fontSize: 14, fontWeight: '800', color: '#1e293b' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#475569', marginTop: 15 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  listPadding: { paddingBottom: 80 },

  // Compact Card Styles (JustDial-style horizontal layout)
  compactCard: {
    backgroundColor: 'white',
    marginBottom: 12,
    marginHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardTopSection: {
    flexDirection: 'row',
    padding: 14,
  },
  compactLeftSide: {
    width: '32%',
    marginRight: 14,
  },
  compactLogo: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  leftSideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6,
  },
  leftActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  leftActionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  compactRightSide: {
    flex: 1,
    justifyContent: 'space-between',
  },
  compactRightContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerContent: {
    flex: 1,
  },
  topShareButton: {
    padding: 8,
    marginLeft: 8,
  },
  fullWidthActions: {
    flexDirection: 'row',
    paddingHorizontal: width * 0.035,
    paddingBottom: width * 0.035,
    paddingTop: width * 0.02,
    gap: width * 0.02,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  fullWidthActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: width * 0.03,
    borderRadius: width * 0.02,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: width * 0.015,
  },
  fullWidthActionButtonText: {
    fontSize: width * 0.032,
    fontWeight: '700',
    color: '#1e293b',
  },
  compactBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  trendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b91c1c',
    textTransform: 'uppercase',
  },
  topRatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  topRatedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1e40af',
    textTransform: 'uppercase',
  },
  trustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  trustedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1e40af',
    textTransform: 'uppercase',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  compactCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  ratingPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
  ratingCount: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    flex: 1,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  compactActionButtons: {
    marginTop: 14,
    gap: 8,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 5,
  },
  compactActionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },

  horizontalImagesScroll: {
    paddingLeft: 15,
    marginBottom: 12
  },
  sideImage: {
    width: 135,
    height: 135,
    borderRadius: 12,
    resizeMode: 'cover'
  },
  cardBody: {
    paddingHorizontal: 15
  },
  cardBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8
  },
  verifiedTextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  verifiedTextBadgeText: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 12
  },
  topRatedTextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  topRatedTextBadgeText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 10
  },
  popularTextBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  popularTextBadgeText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 10
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  thumbsUpIconBox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  greenRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#16a34a',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4
  },
  greenRatingValue: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12
  },
  ratingCountText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600'
  },
  cardAddressText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  availableText: {
    color: '#16a34a',
    fontWeight: 'bold',
    fontSize: 13
  },
  untilText: {
    color: '#64748b',
    fontSize: 13
  },
  reviewSnippetContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff5f5',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  chatIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  reviewSnippetText: {
    flex: 1,
    color: '#e11d48',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16
  },
  checkmarksRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 12
  },
  checkmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  checkmarkText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500'
  },

  // Button Row Actions
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8
  },
  callNowBtn: {
    flex: 1.2,
    backgroundColor: '#2563EB',
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  callNowBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  sendEnquiryBtn: {
    flex: 1.4,
    backgroundColor: 'white',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendEnquiryBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },
  whatsAppActionBtn: {
    flex: 1.2,
    backgroundColor: 'white',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  whatsAppActionText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },

  // Floating MAP
  floatingMapButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5
  },
  floatingMapButtonText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  genuineTextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981'
  },
  genuineTextBadgeText: {
    color: '#166534',
    fontWeight: '900',
    fontSize: 10,
    textTransform: 'uppercase'
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8b5cf6'
  },
  deliveryBadgeText: {
    color: '#6b21a8',
    fontWeight: '900',
    fontSize: 10,
    textTransform: 'uppercase'
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalBody: {
    padding: 20,
  },
  brandOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  brandOptionSelected: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  brandOptionText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  brandOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  mBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  mBadgeSymbol: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1d4ed8',
  },
  mBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1e40af',
    textTransform: 'uppercase',
  },
});
