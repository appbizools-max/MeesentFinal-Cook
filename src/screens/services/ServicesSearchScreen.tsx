import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Dimensions,
  TextInput,
  Share,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { PINCODES } from '../../data/pincodes';
import * as Location from 'expo-location';
import { getNearbyVendors, getPriorityScore, getTierBadgeInfo } from '../../services/geofire';
import { getCachedVendorPool, warmUpLocationAndVendors, fetchBroadVendorPool } from '../../services/userLocation';
const { width } = Dimensions.get('window');

const ALL_CANDIDATE_SCORES = new Set([1004, 1003, 1002, 1001, 4, 3]);

const sortByPriorityScore = (a: any, b: any) => {
  const diff = getPriorityScore(b) - getPriorityScore(a);
  if (diff !== 0) return diff;
  return (a.distance || 0) - (b.distance || 0);
};

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

export default function ServicesSearchScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState(route.params?.initialQuery || '');
  const initialPool = getCachedVendorPool() || [];
  const [loading, setLoading] = useState(initialPool.length === 0);
  const [allVendors, setAllVendors] = useState<any[]>(initialPool);
  const [filteredVendors, setFilteredVendors] = useState<any[]>([]);
  const [userPincode, setUserPincode] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    if (initialPool.length > 0) {
      if (searchQuery) filterList(searchQuery, initialPool);
      setLoading(false);
      fetchAllVendors(false);
    } else {
      fetchAllVendors(true);
    }
  }, []);

  const fetchAllVendors = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const { pool } = await warmUpLocationAndVendors();
      setAllVendors(pool);
      if (searchQuery) {
        filterList(searchQuery, pool);
      }
    } catch (error) {
      console.error("Error fetching nearby vendors for search: ", error);
    } finally {
      setLoading(false);
    }
  };

  const filterList = (queryText: string, vendorsToFilter: any[] = allVendors) => {
    if (!queryText || queryText.trim() === '') {
      setFilteredVendors([]);
      return;
    }

    const lowerQuery = queryText.toLowerCase().trim();

    // Map over the vendors to find any matched catalog/featured product for each vendor
    const mappedVendors = vendorsToFilter.map((biz: any) => {
      let matchedProduct = null;
      if (biz.catalog && Array.isArray(biz.catalog)) {
        matchedProduct = biz.catalog.find((item: any) =>
          String(item.name || '').toLowerCase().includes(lowerQuery) ||
          String(item.description || '').toLowerCase().includes(lowerQuery) ||
          String(item.category || '').toLowerCase().includes(lowerQuery)
        );
      }
      return { ...biz, matchedProduct };
    });

    const result = mappedVendors.filter((biz: any) => {
      // 1. Business Name
      if (String(biz.businessName || '').toLowerCase().includes(lowerQuery)) return true;

      // 2. Category & SubCategory
      if (String(biz.category || '').toLowerCase().includes(lowerQuery)) return true;
      if (String(biz.subCategory || '').toLowerCase().includes(lowerQuery)) return true;
      if (String(biz.description || '').toLowerCase().includes(lowerQuery)) return true;

      // 3. Location, City, Pincode
      if (String(biz.location || '').toLowerCase().includes(lowerQuery)) return true;
      if (String(biz.city || '').toLowerCase().includes(lowerQuery)) return true;
      if (String(biz.pincode || '').includes(lowerQuery)) return true;

      // 4. Matched Product in catalog
      if (biz.matchedProduct) return true;

      // 5. Products Array
      if (biz.products && Array.isArray(biz.products)) {
        const hasProductMatch = biz.products.some((p: any) =>
          String(typeof p === 'string' ? p : p.name || '').toLowerCase().includes(lowerQuery)
        );
        if (hasProductMatch) return true;
      }

      // 6. Services Array
      if (biz.services && Array.isArray(biz.services)) {
        const hasServiceMatch = biz.services.some((s: any) =>
          String(typeof s === 'string' ? s : s.name || '').toLowerCase().includes(lowerQuery)
        );
        if (hasServiceMatch) return true;
      }

      // 7. Keywords or Tags
      if (biz.keywords && Array.isArray(biz.keywords)) {
        const hasKeywordMatch = biz.keywords.some((k: any) =>
          String(k).toLowerCase().includes(lowerQuery)
        );
        if (hasKeywordMatch) return true;
      }

      return false;
    });

    // Sort strictly by 6-tier priority score formula (1004 -> 1003 -> 1002 -> 1001 -> 4 -> 3)
    result.sort(sortByPriorityScore);
    setFilteredVendors(result);
  };

  const extractFeaturedServices = (vendorsList: any[], queryText: string) => {
    const lowerQuery = (queryText || '').toLowerCase().trim();
    const results: any[] = [];

    vendorsList.forEach((vendor: any) => {
      const vendorTier = getPriorityScore(vendor);
      const vendorRating = Number(vendor.rating) || 0;
      let hasItem = false;

      // 1. Catalog items
      if (vendor.catalog && Array.isArray(vendor.catalog) && vendor.catalog.length > 0) {
        vendor.catalog.forEach((item: any, idx: number) => {
          const name = String(item.name || item.title || '');
          const desc = String(item.description || '');
          const cat = String(item.category || vendor.category || '');

          const matches = !lowerQuery || (
            name.toLowerCase().includes(lowerQuery) ||
            desc.toLowerCase().includes(lowerQuery) ||
            cat.toLowerCase().includes(lowerQuery) ||
            String(vendor.businessName || '').toLowerCase().includes(lowerQuery)
          );

          if (matches && name) {
            hasItem = true;
            results.push({
              id: `${vendor.id}_cat_${item.id || idx}`,
              name: item.name || item.title,
              price: item.price,
              description: item.description,
              image: item.image || vendor.businessImage || vendor.image || vendor.logo || `https://picsum.photos/seed/${vendor.id}_${idx}/400/300`,
              vendor,
              tier: vendorTier,
              rating: vendorRating,
            });
          }
        });
      }

      // 2. Services array
      if (vendor.services && Array.isArray(vendor.services) && vendor.services.length > 0) {
        vendor.services.forEach((serv: any, sIdx: number) => {
          const sName = typeof serv === 'string' ? serv : (serv.name || serv.title || '');
          const sDesc = typeof serv === 'string' ? '' : (serv.description || '');
          const sPrice = typeof serv === 'string' ? null : serv.price;

          const matches = !lowerQuery || (
            sName.toLowerCase().includes(lowerQuery) ||
            sDesc.toLowerCase().includes(lowerQuery) ||
            String(vendor.category || '').toLowerCase().includes(lowerQuery) ||
            String(vendor.businessName || '').toLowerCase().includes(lowerQuery)
          );

          if (matches && sName) {
            hasItem = true;
            results.push({
              id: `${vendor.id}_serv_${sIdx}`,
              name: sName,
              price: sPrice,
              description: sDesc,
              image: (typeof serv !== 'string' && serv.image) ? serv.image : (vendor.businessImage || vendor.image || vendor.logo || `https://picsum.photos/seed/${vendor.id}_s${sIdx}/400/300`),
              vendor,
              tier: vendorTier,
              rating: vendorRating,
            });
          }
        });
      }

      // 3. Products array
      if (vendor.products && Array.isArray(vendor.products) && vendor.products.length > 0) {
        vendor.products.forEach((prod: any, pIdx: number) => {
          const pName = typeof prod === 'string' ? prod : (prod.name || prod.title || '');
          const pDesc = typeof prod === 'string' ? '' : (prod.description || '');
          const pPrice = typeof prod === 'string' ? null : prod.price;

          const matches = !lowerQuery || (
            pName.toLowerCase().includes(lowerQuery) ||
            pDesc.toLowerCase().includes(lowerQuery) ||
            String(vendor.category || '').toLowerCase().includes(lowerQuery) ||
            String(vendor.businessName || '').toLowerCase().includes(lowerQuery)
          );

          if (matches && pName) {
            hasItem = true;
            results.push({
              id: `${vendor.id}_prod_${pIdx}`,
              name: pName,
              price: pPrice,
              description: pDesc,
              image: (typeof prod !== 'string' && prod.image) ? prod.image : (vendor.businessImage || vendor.image || vendor.logo || `https://picsum.photos/seed/${vendor.id}_p${pIdx}/400/300`),
              vendor,
              tier: vendorTier,
              rating: vendorRating,
            });
          }
        });
      }

      // 4. Main Vendor Service Offering (Fallback if no explicit catalog array)
      if (!hasItem) {
        const serviceTitle = vendor.subCategory || vendor.category || 'Featured Service';
        const vDesc = vendor.description || '';

        const matches = !lowerQuery || (
          serviceTitle.toLowerCase().includes(lowerQuery) ||
          vDesc.toLowerCase().includes(lowerQuery) ||
          String(vendor.businessName || '').toLowerCase().includes(lowerQuery) ||
          String(vendor.category || '').toLowerCase().includes(lowerQuery) ||
          String(vendor.subCategory || '').toLowerCase().includes(lowerQuery)
        );

        if (matches && serviceTitle) {
          results.push({
            id: `${vendor.id}_main`,
            name: serviceTitle,
            price: vendor.price || vendor.startingPrice || null,
            description: vendor.description,
            vendor,
            tier: vendorTier,
            rating: vendorRating,
          });
        }
      }
    });

    results.sort((a, b) => {
      const diff = getPriorityScore(b.vendor) - getPriorityScore(a.vendor);
      if (diff !== 0) return diff;
      return (a.vendor.distance || 0) - (b.vendor.distance || 0);
    });

    return results;
  };

  const handleServicePress = (item: any) => {
    if (item && item.vendor) {
      navigation.navigate('ServiceDetail', { service: item.vendor });
    }
  };

  const renderFeaturedServicesStrip = (servicesList: any[], title: string) => {
    if (!servicesList || servicesList.length === 0) return null;

    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 15 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles" size={16} color="#2563EB" />
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b' }}>
              {title} ({servicesList.length})
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 12 }}>
          {servicesList.slice(0, 15).map((item: any) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => handleServicePress(item)}
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 6 }}>
                  <Ionicons name="pricetag" size={16} color="#2563EB" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1 }} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                {item.price ? (
                  <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#bbf7d0' }}>
                    <Text style={{ color: '#15803d', fontSize: 12, fontWeight: '900' }}>₹{item.price}</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', flex: 1, marginRight: 8 }} numberOfLines={1}>
                  By <Text style={{ color: '#2563EB', fontWeight: '800' }}>{item.vendor.businessName}</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700' }}>View Vendor</Text>
                  <Ionicons name="chevron-forward" size={14} color="#2563EB" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    filterList(text);

    // Defer broad pool (non-local paid vendors) fetch until user actually types
    if (text.trim().length > 0) {
      fetchBroadVendorPool().then((broadPool) => {
        if (broadPool && broadPool.length > 0) {
          setAllVendors(broadPool);
          filterList(text, broadPool);
        }
      });
    }
  };

  const logLead = async (item: any, type: 'call' | 'whatsapp') => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      let userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Guest User';
      let userPhone = currentUser.phoneNumber || '';
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.name) userName = userData.name;
        if (userData.phoneNumber) userPhone = userData.phoneNumber;
      }
      await addDoc(collection(db, 'leads'), {
        vendorId: item.id,
        vendorName: item.businessName,
        userId: currentUser.uid,
        userName,
        userPhone,
        type,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging lead: ', error);
    }
  };

  const handleCall = (item: any) => {
    const businessName = item.businessName || 'this business';
    Alert.alert(
      'Confirm Call',
      `Do you want to call ${businessName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            logLead(item, 'call');
            Linking.openURL(`tel:${item.phone}`);
          },
        },
      ]
    );
  };

  const handleWhatsApp = (item: any) => {
    const businessName = item.businessName || 'this business';
    Alert.alert(
      'Open WhatsApp',
      `Do you want to chat with ${businessName} on WhatsApp?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            logLead(item, 'whatsapp');
            Linking.openURL(`whatsapp://send?phone=${item.phone}`);
          },
        },
      ]
    );
  };

  const handleMapRedirect = (item: any) => {
    const defaultQuery = item.businessName || item.category || 'Businesses';
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(defaultQuery)}`);
  };

  const handleShare = async (business: any) => {
    try {
      const appUrl = `https://play.google.com/store/apps/details?id=com.messent.app&hl=en_IN`;
      const shareMessage = `Check out ${business.businessName} on Messent!\n\nDownload App: ${appUrl}`;
      await Share.share({ message: shareMessage, title: business.businessName, url: appUrl });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderBusinessCard = ({ item }: { item: any }) => {
    const closingTime = typeof item.timings === 'string'
      ? item.timings.split(' - ')[1] || '9:00 pm'
      : '9:00 pm';
    const subKey = String(item.subCategory || '').toLowerCase()
      .replace(/ & /g, '_').replace(/ \/ /g, '_').replace(/ /g, '_').replace(/-/g, '_').replace(/[^a-z0-9_]/g, '');
    const translatedSub = t(`subcategories.${subKey}`);
    const displaySub = translatedSub === `subcategories.${subKey}` ? (item.subCategory || item.category) : translatedSub;

    const now = new Date();
    const isPremiumActive = item.planId === 'big' && item.planExpiry && new Date(item.planExpiry) > now;
    const isSmartActive = item.planId === 'small' && item.planExpiry && new Date(item.planExpiry) > now;
    const tierBadge = getTierBadgeInfo(item);

    return (
      <View style={styles.compactCard}>
        <TouchableOpacity
          style={styles.cardTopSection}
          activeOpacity={0.95}
          onPress={() => navigation.navigate('ServiceDetail', { service: item })}
        >
          <View style={styles.compactLeftSide}>
            {(() => {
              const logoPhoto = (item.logo && typeof item.logo === 'string' && item.logo.trim() !== '' && !item.logo.includes('picsum.photos'))
                ? item.logo
                : (item.businessLogo && typeof item.businessLogo === 'string' && item.businessLogo.trim() !== '' && !item.businessLogo.includes('picsum.photos'))
                  ? item.businessLogo
                  : (item.profileImage && typeof item.profileImage === 'string' && item.profileImage.trim() !== '' && !item.profileImage.includes('picsum.photos'))
                    ? item.profileImage
                    : (item.image && typeof item.image === 'string' && item.image.trim() !== '' && !item.image.includes('picsum.photos'))
                      ? item.image
                      : null;

              if (logoPhoto) {
                return (
                  <Image
                    source={{ uri: logoPhoto }}
                    style={styles.compactLogo}
                    resizeMode="cover"
                  />
                );
              }

              return (
                <View style={[styles.compactLogo, { backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', padding: 6 }]}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#3b82f6', letterSpacing: -0.3, textAlign: 'center' }}>
                    Business
                  </Text>
                </View>
              );
            })()}
          </View>

          <View style={styles.compactRightSide}>
            <View style={styles.compactRightContent}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.headerContent}>
                  <View style={styles.compactBadgeRow}>
                    {tierBadge && (
                      <View style={[styles.priorityScoreBadge, { backgroundColor: tierBadge.bg, borderColor: tierBadge.borderColor }]}>
                        <Text style={{ fontSize: 9, marginRight: 2 }}>{tierBadge.emoji}</Text>
                        <Text style={[styles.priorityScoreBadgeText, { color: tierBadge.color }]}>
                          {tierBadge.name} <Text style={{ fontWeight: '900' }}>(Score: {tierBadge.score})</Text>
                        </Text>
                      </View>
                    )}
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
                    {(item.tookVerification || item.isVerified || item.verifyMark || item.verificationStatus === 'verified') && (
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
                  <Text style={styles.compactCardTitle} numberOfLines={1}>{item.businessName}</Text>
                </View>
                <TouchableOpacity style={styles.topShareButton} onPress={() => handleShare(item)}>
                  <Ionicons name="share-social" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>

              <View style={styles.addressRow}>
                <Text style={styles.addressText}>{item.location || 'Local Area'}</Text>
              </View>

              {/* Matched Product or First Catalog Item */}
              {(item.matchedProduct || (item.catalog && item.catalog.length > 0)) && (() => {
                const displayItem = item.matchedProduct || item.catalog[0];
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 2, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: '#f8fafc', borderRadius: 6, alignSelf: 'flex-start' }}>
                    <Ionicons name="pricetag-outline" size={12} color="#3b82f6" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: '#334155', fontWeight: '500' }} numberOfLines={1}>
                      {displayItem.name} {displayItem.price ? `• ₹${displayItem.price}` : ''}
                    </Text>
                  </View>
                );
              })()}

              <Text style={styles.categoryText}>{displaySub}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.statusText}>Open until {closingTime}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.fullWidthActions}>
          <TouchableOpacity style={[styles.fullWidthActionButton, { backgroundColor: '#3b82f6', borderWidth: 0 }]} onPress={() => handleCall(item)}>
            <Ionicons name="call" size={width * 0.045} color="white" />
            <Text style={[styles.fullWidthActionButtonText, { color: 'white' }]}>Call Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fullWidthActionButton} onPress={() => handleWhatsApp(item)}>
            <Ionicons name="logo-whatsapp" size={width * 0.045} color="#10b981" />
            <Text style={[styles.fullWidthActionButtonText, { color: '#10b981' }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fullWidthActionButton} onPress={() => navigation.navigate('ServiceDetail', { service: item })}>
            <Ionicons name="storefront-outline" size={width * 0.045} color="#3b82f6" />
            <Text style={[styles.fullWidthActionButtonText, { color: '#3b82f6' }]}>Open Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
      <StatusBar style="dark" />

      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>

        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchBarInput}
            placeholder="Search for any service, product, or vendor..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoFocus
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearchChange('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tier-Ranked Search Suggestions Dropdown */}
      {searchQuery.trim().length > 0 && filteredVendors.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsHeaderTitle}>TIER-RANKED SUGGESTIONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 6 }}>
            {filteredVendors.slice(0, 8).map((biz: any) => {
              const badge = getTierBadgeInfo(biz);
              const chipBg = badge ? badge.bg : '#f8fafc';
              const chipBorder = badge ? badge.borderColor : '#cbd5e1';
              const chipColor = badge ? badge.color : '#334155';
              const emoji = badge ? badge.emoji : '📍';
              const scoreText = badge ? ` (${badge.score})` : '';

              return (
                <TouchableOpacity
                  key={biz.id}
                  style={[styles.suggestionChip, { backgroundColor: chipBg, borderColor: chipBorder }]}
                  onPress={() => handleSearchChange(biz.businessName)}
                >
                  <Text style={{ fontSize: 11 }}>{emoji}</Text>
                  <Text style={[styles.suggestionChipText, { color: chipColor }]}>
                    {biz.businessName}<Text style={{ fontWeight: '900' }}>{scoreText}</Text>
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : searchQuery.trim() === '' ? (
        <FlatList
          data={allVendors.filter(v => getPriorityScore(v) >= 1000).slice(0, 15)}
          keyExtractor={item => item.id}
          renderItem={renderBusinessCard}
          contentContainerStyle={{ ...styles.listPadding, paddingBottom: 80 + insets.bottom, paddingTop: 15 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 15, paddingBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
                Top Rated Vendors
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Explore some of our best businesses
              </Text>
            </View>
          }
        />
      ) : filteredVendors.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="sad-outline" size={60} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyDesc}>We couldn't find anything for "{searchQuery}".</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVendors}
          keyExtractor={item => item.id}
          renderItem={renderBusinessCard}
          contentContainerStyle={{ ...styles.listPadding, paddingBottom: 80 + insets.bottom, paddingTop: 15 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            filteredVendors.length > 0 ? (
              <View style={{ paddingHorizontal: 15, paddingTop: 6, paddingBottom: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
                  Vendors & Shops ({filteredVendors.length})
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Verified businesses matching "{searchQuery}"
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            <View style={{ marginTop: 16, marginBottom: 20 }}>
              {renderFeaturedServicesStrip(extractFeaturedServices(allVendors, searchQuery), "Matching Services & Catalog")}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#475569', marginTop: 15 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  listPadding: { paddingBottom: 80 },

  // Compact Card Styles
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
  cardTopSection: { flexDirection: 'row', padding: 14 },
  compactLeftSide: { width: '32%', marginRight: 14 },
  compactLogo: { width: '100%', aspectRatio: 0.75, borderRadius: 12, resizeMode: 'cover' },
  compactRightSide: { flex: 1, justifyContent: 'space-between' },
  compactRightContent: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  headerContent: { flex: 1 },
  topShareButton: { padding: 8, marginLeft: 8 },
  fullWidthActions: { flexDirection: 'row', paddingHorizontal: width * 0.035, paddingBottom: width * 0.035, paddingTop: width * 0.02, gap: width * 0.02, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  fullWidthActionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  fullWidthActionButtonText: { fontSize: 12, fontWeight: '700' },
  compactBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  trustedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#bfdbfe' },
  trustedBadgeText: { fontSize: 9, fontWeight: '800', color: '#1e40af', textTransform: 'uppercase' },
  recommendedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fde68a' },
  recommendedBadgeText: { fontSize: 9, fontWeight: '800', color: '#92400e', textTransform: 'uppercase' },
  trendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fecaca' },
  trendingBadgeText: { fontSize: 9, fontWeight: '800', color: '#991b1b', textTransform: 'uppercase' },
  topRatedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#bbf7d0' },
  topRatedBadgeText: { fontSize: 9, fontWeight: '800', color: '#166534', textTransform: 'uppercase' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#c7d2fe' },
  verifiedBadgeText: { fontSize: 9, fontWeight: '800', color: '#3730a3', textTransform: 'uppercase' },
  mBadge: { backgroundColor: '#3b82f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },
  mBadgeText: { fontSize: 9, fontWeight: '800', color: 'white', textTransform: 'uppercase' },
  compactCardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3, lineHeight: 22 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16a34a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
  ratingPillText: { color: 'white', fontSize: 11, fontWeight: 'bold', marginLeft: 2 },
  ratingCount: { color: 'white', fontSize: 10, opacity: 0.9 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  addressText: { fontSize: 12, color: '#64748b', flex: 1 },
  categoryText: { fontSize: 12, color: '#3b82f6', fontWeight: '600', marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, color: '#10b981', fontWeight: '600' },
  priorityScoreBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  priorityScoreBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  suggestionsContainer: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 6 },
  suggestionsHeaderTitle: { fontSize: 9, fontWeight: '900', color: '#64748b', paddingHorizontal: 16, marginBottom: 4, letterSpacing: 0.5 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  suggestionChipText: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
});
