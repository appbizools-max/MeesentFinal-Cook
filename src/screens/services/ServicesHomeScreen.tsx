import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Dimensions, StyleSheet, ActivityIndicator, Modal, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { PINCODES } from '../../data/pincodes';
import { ALL_CATEGORIES } from '../../data/categories';
import { ALL_PRODUCTS } from '../../data/products';
import ServicesSidebar from '../../components/ServicesSidebar';
import * as Location from 'expo-location';
import { getNearbyVendors } from '../../services/geofire';
import { warmUpLocationAndVendors } from '../../services/userLocation';
const { width } = Dimensions.get('window');
const PRIMARY_COLOR = '#2563EB';
const SECONDARY_COLOR = '#1e40af';

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
// Pre-defined color pairs for the grid items to maintain the premium look
const COLOR_PALETTES = [
  { color: '#eff6ff', iconColor: '#2563EB' },
  { color: '#f0f9ff', iconColor: '#0ea5e9' },
  { color: '#f0fdf4', iconColor: '#10b981' },
  { color: '#fff1f2', iconColor: '#f43f5e' },
  { color: '#eff6ff', iconColor: '#3b82f6' },
  { color: '#f5f3ff', iconColor: '#8b5cf6' },
  { color: '#fff7ed', iconColor: '#f97316' },
  { color: '#fffbeb', iconColor: '#eab308' },
  { color: '#eff6ff', iconColor: '#6366f1' },
  { color: '#f0fdf4', iconColor: '#059669' },
];

const SERVICE_CATS = [
  {
    id: 'my-business',
    name: 'My Business',
    icon8: 'https://img.icons8.com/color/96/briefcase.png',
  },
  {
    id: 'doctors',
    name: 'Doctors',
    icon8: 'https://img.icons8.com/color/96/doctor-male.png',
  },
  {
    id: 'repair-services',
    name: 'Repair & Services',
    icon8: 'https://img.icons8.com/color/96/maintenance.png',
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon8: 'https://img.icons8.com/color/96/real-estate.png',
  },
  {
    id: 'pg-hostel',
    name: 'PG / Hostel',
    icon8: 'https://img.icons8.com/color/96/bed.png',
  },
  {
    id: 'rent-hire',
    name: 'Rent or Hire',
    icon8: 'https://img.icons8.com/color/96/handshake.png',
  },
  {
    id: 'daily-needs',
    name: 'Daily Needs',
    icon8: 'https://img.icons8.com/color/96/shopping-basket-2.png',
  },
  {
    id: 'beauty-wellness',
    name: 'Beauty',
    icon8: 'https://img.icons8.com/color/96/spa-flower.png',
  },
  {
    id: 'education',
    name: 'Education',
    icon8: 'https://img.icons8.com/color/96/student-male.png',
  },
  {
    id: 'food-dining',
    name: 'Food',
    icon8: 'https://img.icons8.com/color/96/restaurant.png',
  },
  {
    id: 'transport',
    name: 'Transport',
    icon8: 'https://img.icons8.com/color/96/taxi.png',
  },
  {
    id: 'b2b',
    name: 'B2B',
    icon8: 'https://img.icons8.com/color/96/factory.png',
  },
  {
    id: 'cake_shops',
    name: 'Cake Shop',
    icon8: 'https://img.icons8.com/color/96/birthday-cake.png',
  },
  {
    id: 'caterers',
    name: 'Caterers',
    icon8: 'https://img.icons8.com/color/96/waiter.png',
  },
  {
    id: 'contractors',
    name: 'Contractors',
    icon8: 'https://img.icons8.com/color/96/construction-worker.png',
  },
  {
    id: 'more',
    name: 'More',
    icon8: 'https://img.icons8.com/color/96/more.png',
  },
];

const PRODUCT_CATS = ALL_PRODUCTS.slice(0, 15).map((prod, index) => {
  const iconMap: Record<string, any> = {
    'prod1': { name: 'apartment', type: 'MaterialIcons' },
    'prod2': { name: 'tv', type: 'Ionicons' },
    'prod3': { name: 'settings', type: 'Ionicons' },
    'prod4': { name: 'construction', type: 'MaterialIcons' },
    'prod5': { name: 'checkroom', type: 'MaterialIcons' },
    'prod6': { name: 'cart', type: 'Ionicons' },
    'prod7': { name: 'medical-services', type: 'MaterialIcons' },
    'prod8': { name: 'inventory', type: 'MaterialIcons' },
    'prod9': { name: 'biotech', type: 'MaterialIcons' },
    'prod10': { name: 'settings', type: 'Ionicons' },
    'prod11': { name: 'science', type: 'MaterialIcons' },
    'prod12': { name: 'weekend', type: 'MaterialIcons' },
    'prod13': { name: 'agriculture', type: 'MaterialIcons' },
    'prod14': { name: 'directions-car', type: 'MaterialIcons' },
    'prod15': { name: 'home', type: 'MaterialIcons' },
    'prod16': { name: 'business', type: 'MaterialIcons' },
    'prod17': { name: 'handyman', type: 'MaterialIcons' },
    'prod18': { name: 'card-giftcard', type: 'MaterialIcons' },
    'prod19': { name: 'restaurant', type: 'MaterialIcons' },
    'prod20': { name: 'checkroom', type: 'MaterialIcons' },
    'prod21': { name: 'menu-book', type: 'MaterialIcons' },
    'prod22': { name: 'face', type: 'MaterialIcons' },
    'prod23': { name: 'window', type: 'MaterialIcons' },
    'prod24': { name: 'engineering', type: 'MaterialIcons' },
    'prod25': { name: 'diamond', type: 'MaterialIcons' },
    'prod26': { name: 'computer', type: 'MaterialIcons' },
    'prod27': { name: 'watch', type: 'MaterialIcons' },
    'prod28': { name: 'local-florist', type: 'MaterialIcons' },
    'prod29': { name: 'verified-user', type: 'MaterialIcons' },
    'prod30': { name: 'pedal-bike', type: 'MaterialIcons' },
    'prod31': { name: 'smartphone', type: 'MaterialIcons' },
    'prod32': { name: 'note', type: 'MaterialIcons' },
    'prod33': { name: 'work', type: 'MaterialIcons' },
    'prod34': { name: 'terrain', type: 'MaterialIcons' },
    'prod35': { name: 'two-wheeler', type: 'MaterialIcons' },
    'prod36': { name: 'train', type: 'MaterialIcons' },
    'prod37': { name: 'shopping-bag', type: 'MaterialIcons' },
    'prod38': { name: 'memory', type: 'MaterialIcons' },
    'prod39': { name: 'bolt', type: 'MaterialIcons' },
    'prod40': { name: 'medication', type: 'MaterialIcons' },
    'prod41': { name: 'eco', type: 'MaterialIcons' },
    'prod42': { name: 'cleaning-services', type: 'MaterialIcons' },
    'prod43': { name: 'business-center', type: 'MaterialIcons' },
    'prod44': { name: 'kitchen', type: 'MaterialIcons' },
    'prod45': { name: 'sports-soccer', type: 'MaterialIcons' },
  };

  const imageMap: Record<string, string> = {
    'prod1': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop&q=80',
    'prod2': 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=300&fit=crop&q=80',
    'prod3': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop&q=80',
    'prod4': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=400&h=300&fit=crop&q=80',
    'prod5': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&q=80',
    'prod6': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop&q=80',
    'prod7': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
    'prod8': 'https://images.unsplash.com/photo-1609709295948-17d77cb2a69b?w=400&h=300&fit=crop&q=80',
    'prod9': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=300&fit=crop&q=80',
    'prod10': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop&q=80',
    'prod11': 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=400&h=300&fit=crop&q=80',
    'prod12': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop&q=80',
    'prod13': 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&h=300&fit=crop&q=80',
    'prod14': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop&q=80',
    'prod15': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop&q=80',
    'prod16': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop&q=80',
    'prod17': 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop&q=80',
    'prod18': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop&q=80',
    'prod19': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&q=80',
    'prod20': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&q=80',
    'prod21': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop&q=80',
    'prod22': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=300&fit=crop&q=80',
    'prod23': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&q=80',
    'prod24': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop&q=80',
    'prod25': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop&q=80',
    'prod26': 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=300&fit=crop&q=80',
    'prod27': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop&q=80',
    'prod28': 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=400&h=300&fit=crop&q=80',
    'prod29': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
    'prod30': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&q=80',
    'prod31': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop&q=80',
    'prod32': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop&q=80',
    'prod33': 'https://images.unsplash.com/photo-1553484771-047a44eee27b?w=400&h=300&fit=crop&q=80',
    'prod34': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=300&fit=crop&q=80',
    'prod35': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&q=80',
    'prod36': 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&h=300&fit=crop&q=80',
    'prod37': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop&q=80',
    'prod38': 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&h=300&fit=crop&q=80',
    'prod39': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=300&fit=crop&q=80',
    'prod40': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop&q=80',
    'prod41': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=300&fit=crop&q=80',
    'prod42': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop&q=80',
    'prod43': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop&q=80',
    'prod44': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&q=80',
    'prod45': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80',
  };
  return {
    id: prod.id,
    name: prod.name,
    icon: iconMap[prod.id] || { name: 'inventory-2', type: 'MaterialIcons' },
    image: imageMap[prod.id] || 'https://img.icons8.com/color/96/package.png',
    count: `${(index + 1) * 154} Items`
  };
});

export default function ServicesHomeScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userVendorStatus, setUserVendorStatus] = useState<string | null>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [topVendors, setTopVendors] = useState<any[]>([]);
  const [registeredVendors, setRegisteredVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);

  const nowForPlan = new Date();
  const isPremiumActive = (item: any) => {
    if (!item || !item.planExpiry) return false;
    const expiry = item.planExpiry.toDate ? item.planExpiry.toDate() : new Date(item.planExpiry);
    return item.planId === 'big' && expiry > nowForPlan;
  };
  const isSmartActive = (item: any) => {
    if (!item || !item.planExpiry) return false;
    const expiry = item.planExpiry.toDate ? item.planExpiry.toDate() : new Date(item.planExpiry);
    return item.planId === 'small' && expiry > nowForPlan;
  };

  // User location and pincode ads state
  const [userPincode, setUserPincode] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userState, setUserState] = useState<string | null>(null);
  const [pincodeAds, setPincodeAds] = useState<any[]>([]);
  React.useEffect(() => {
    const fetchStatus = async () => {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const docSnap = await getDoc(doc(db, 'users', userId));
        if (docSnap.exists()) {
          setUserVendorStatus(docSnap.data().vendorStatus || null);
        }
      }
    };
    fetchStatus();

    // Fetch Banners for Services
    const bannerQuery = query(
      collection(db, 'banners'),
      where('type', '==', 'Service'),
      where('isActive', '==', true)
    );
    const unsubscribeBanners = onSnapshot(bannerQuery, (snapshot) => {
      const bannerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBanners(bannerList);
    });
    // Fetch Mid-Banners (ServicePromo)
    const promoQuery = query(
      collection(db, 'banners'),
      where('type', '==', 'ServicePromo'),
      where('isActive', '==', true)
    );

    const unsubscribePromo = onSnapshot(promoQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPromoBanners(list);
    });

    // Fetch user's businesses
    const userId = auth.currentUser?.uid;
    if (userId) {
      const businessesQuery = query(
        collection(db, 'vendors'),
        where('userId', '==', userId)
      );

      const unsubscribeBusinesses = onSnapshot(businessesQuery, (snapshot: any) => {
        const businesses = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserBusinesses(businesses);
      });

      return () => {
        unsubscribeBanners();
        unsubscribePromo();
        unsubscribeBusinesses();
      };
    }

    return () => {
      unsubscribeBanners();
      unsubscribePromo();
    };
  }, []);

  // Fetch Top Vendors dynamically using live GPS & 8km Haversine + 2-tier spatial ranking
  React.useEffect(() => {
    let isMounted = true;
    const loadNearbyVendors = async () => {
      setLoadingVendors(true);
      try {
        const { coords, pool } = await warmUpLocationAndVendors();
        if (!isMounted) return;
        cachedUserCoords = coords;

        const paidVendors = pool.filter((v: any) => v.planId === 'big' || v.planId === 'small' || v.isBoosted || v.plan === 'growth');
        const topList = paidVendors.length > 0 ? paidVendors : pool.slice(0, 10);

        setTopVendors(topList);
        setRegisteredVendors(pool);
      } catch (error) {
        console.error("Error fetching nearby vendors for Home:", error);
      } finally {
        if (isMounted) setLoadingVendors(false);
      }
    };

    loadNearbyVendors();
    return () => {
      isMounted = false;
    };
  }, [userCity]);

  // Check user pincode + city from their profile on mount
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubscribeUser = onSnapshot(doc(db, 'users', userId), (userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data && data.pincode) {
          setUserPincode(data.pincode);
        }
        // Capture city/district for ad targeting scope
        if (data && data.city) {
          setUserCity(data.city);
        }
        // Capture state for ad targeting scope
        if (data && data.state) {
          setUserState(data.state);
        }
        // Fallback state/city lookup from PINCODES if missing in profile
        if (data && data.pincode && (!data.state || !data.city)) {
          const matchedPin = PINCODES.find(p => p.pincode === data.pincode);
          if (matchedPin) {
            if (!data.city) setUserCity(matchedPin.city);
            setUserState(matchedPin.state);
          }
        }
      }
    });

    return () => unsubscribeUser();
  }, []);

  // Fetch pincode ads targeted to user's pincode
  useEffect(() => {
    if (!userPincode) {
      setPincodeAds([]);
      return;
    }

    const qAds = query(
      collection(db, 'pincode_ads'),
      where('status', '==', 'active')
    );

    const unsubscribeAds = onSnapshot(qAds, (snapshot) => {
      const adsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Filter ads matching user's location based on targetType
      // Exclude expired campaigns and match sourceApp === 'Services'
      const now = new Date();
      const matchedAds = adsList.filter(ad => {
        const matchesApp = ad.sourceApp === 'Services';
        if (!matchesApp) return false;

        // Check expiration (endDate is in the past)
        if (ad.endDate) {
          const endDateObj = ad.endDate.toDate ? ad.endDate.toDate() : new Date(ad.endDate);
          if (endDateObj < now) return false;
        }

        // Match by targeting type
        if (ad.targetType === 'state') {
          return userState && ad.targetState && userState.toLowerCase() === ad.targetState.toLowerCase();
        }
        if (ad.targetType === 'district') {
          return userCity && ad.targetDistrict && userCity.toLowerCase() === ad.targetDistrict.toLowerCase();
        }

        // Default: match by pincode
        if (Array.isArray(ad.pincodes) && ad.pincodes.length > 0) {
          return ad.pincodes.includes(userPincode);
        }
        return ad.pincode === userPincode;
      });

      setPincodeAds(matchedAds.slice(0, 5));
    });

    return () => unsubscribeAds();
  }, [userPincode, userCity, userState]);

  const bannerScrollRef = React.useRef<ScrollView>(null);
  const promoScrollRef = React.useRef<ScrollView>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [activePromoIndex, setActivePromoIndex] = useState(0);

  // Top banner carousel always shows general banners
  const topBanners = banners;

  // Mid-banner (Bulk Sourcing) shows pincode ads if available, else promo banners
  const promoBannersToDisplay = pincodeAds.length > 0
    ? pincodeAds.map((ad: any) => ({ ...ad, isAd: true }))
    : promoBanners;

  useEffect(() => {
    if (topBanners.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (activeBannerIndex + 1) % topBanners.length;
      bannerScrollRef.current?.scrollTo({ x: nextIndex * (width - 40), animated: true });
      setActiveBannerIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeBannerIndex, topBanners.length]);

  useEffect(() => {
    if (promoBannersToDisplay.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (activePromoIndex + 1) % promoBannersToDisplay.length;
      promoScrollRef.current?.scrollTo({ x: nextIndex * (width - 40), animated: true });
      setActivePromoIndex(nextIndex);
    }, 3000);
    return () => clearInterval(interval);
  }, [activePromoIndex, promoBannersToDisplay.length]);

  function handleBusinessSelect(business: any) {
    setShowBusinessDropdown(false);
    // Navigate to vendor dashboard with the specific business ID
    navigation.navigate('VendorDashboard', { businessId: business.id });
  }

  function handleMyBusinessPress() {
    if (userBusinesses.length > 1) {
      // Show dropdown if user has multiple businesses
      setShowBusinessDropdown(true);
    } else if (userBusinesses.length === 1) {
      // Navigate directly if only one business
      navigation.navigate('VendorDashboard', { businessId: userBusinesses[0].id });
    } else {
      // Navigate to registration if no businesses
      navigation.navigate('VendorRegistration');
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ServicesSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        {/* Premium Header Section */}
        <LinearGradient
          colors={['#8eabeb', '#8eabeb', '#8eabeb']}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
                  <Ionicons name="chevron-back" size={28} color="#1e293b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSidebarVisible(true)} style={{ marginRight: 15 }}>
                  <Ionicons name="menu" size={30} color="#1e293b" />
                </TouchableOpacity>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.brandTitle}>MEESENT</Text>
                    <View style={{ marginLeft: 8, backgroundColor: '#2563EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}>{i18n.language}</Text>
                    </View>
                  </View>
                  <Text style={styles.brandSub}>{t('services_home.brand_sub')}</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.profileBtn}>
                  <Ionicons name="person" size={20} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.headerHeadline}>{t('services_home.headline')} {t('services_home.headline_bold')}</Text>
            </View>

            {/* Premium Search Bar */}
            <View style={styles.searchContainer}>
              <TouchableOpacity
                style={styles.searchBar}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ServicesSearch')}
              >
                <Ionicons name="search" size={20} color="#94a3b8" />
                <View style={[styles.searchInput, { justifyContent: 'center' }]}>
                  <Text style={{ color: '#94a3b8' }}>{t('services_home.search_placeholder')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.body}>
          {/* Top Dynamic Carousel (General Services) */}
          {topBanners.length > 0 && (
            <View style={[styles.bannerContainer, { marginTop: 0, marginBottom: 20 }]}>
              <ScrollView
                ref={bannerScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                  setActiveBannerIndex(index);
                }}
                style={styles.bannerCarousel}
              >
                {topBanners.map((banner: any, index) => (
                  <View key={banner.id || index} style={styles.bannerSlide}>
                    <Image
                      source={{ uri: banner.imageUrl || banner.image || banner.url || banner.imageURL || '' }}
                      style={styles.bannerImage}
                      resizeMode="cover"
                    />
                    {/* Overlay container with title/badge (no black shadow) */}
                    {(banner.title || banner.isAd) && (
                      <View style={styles.bannerOverlay}>
                        {banner.isAd && (
                          <View style={styles.sponsoredBadge}>
                            <Ionicons name="megaphone" size={10} color="white" />
                            <Text style={styles.sponsoredBadgeText}>AD</Text>
                          </View>
                        )}
                        {banner.title ? (
                          <View style={styles.bannerTitleBox}>
                            <Text style={styles.bannerSlideTitle} numberOfLines={2}>{banner.title}</Text>
                            {banner.isAd && banner.description ? (
                              <Text style={styles.bannerSlideDesc} numberOfLines={1}>{banner.description}</Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
              {/* Dot indicators */}
              {topBanners.length > 1 && (
                <View style={styles.dotRow}>
                  {topBanners.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i === activeBannerIndex ? styles.dotActive : styles.dotInactive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Section: Category Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('services_home.main_categories')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ServicesList', { category: 'All' })}>
                <Text style={styles.viewAll}>{t('services_home.view_all_directory')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.catGrid}>
              {SERVICE_CATS.filter(cat => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return cat.name.toLowerCase().includes(query);
              }).map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catCard}
                  onPress={() => {
                    if (cat.id === 'my-business') {
                      handleMyBusinessPress();
                    } else if (cat.id === 'b2b') {
                      navigation.navigate('ProductsList', { category: 'All' });
                    } else {
                      navigation.navigate('ServicesList', { category: cat.name });
                    }
                  }}
                >
                  <View style={styles.catIconContainer}>
                    <Image
                      source={{ uri: cat.icon8 }}
                      style={{ width: 32, height: 32 }}
                      resizeMode="contain"
                    />
                  </View>
                  <Text numberOfLines={1} style={styles.catLabel}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dynamic Promo Banner Area (Bulk Sourcing) */}
          <View style={styles.bannerContainer}>
            {promoBannersToDisplay.length > 0 ? (
              <ScrollView
                ref={promoScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / (width - 12));
                  setActivePromoIndex(index);
                }}
                style={styles.bannerCarousel}
              >
                {promoBannersToDisplay.map((banner: any, index) => (
                  <View key={banner.id || index} style={styles.bannerSlide}>
                    <Image
                      source={{ uri: banner.imageUrl || banner.image || banner.url || banner.imageURL || '' }}
                      style={styles.bannerImage}
                      resizeMode="cover"
                    />
                    {(banner.title || banner.isAd) && (
                      <View style={styles.bannerOverlay}>
                        {banner.isAd && (
                          <View style={styles.sponsoredBadge}>
                            <Ionicons name="megaphone" size={10} color="white" />
                            <Text style={styles.sponsoredBadgeText}>AD</Text>
                          </View>
                        )}
                        {banner.title ? (
                          <View style={styles.bannerTitleBox}>
                            <Text style={styles.bannerSlideTitle} numberOfLines={2}>{banner.title}</Text>
                            {banner.isAd && banner.description ? (
                              <Text style={styles.bannerSlideDesc} numberOfLines={1}>{banner.description}</Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <TouchableOpacity style={styles.promoBanner}>
                <LinearGradient
                  colors={['#1e293b', '#0f172a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.promoGradient}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoTitle}>{t('services_home.bulk_sourcing_title')}</Text>
                    <Text style={styles.promoDesc}>{t('services_home.bulk_sourcing_desc')}</Text>
                    <View style={styles.promoBtn}>
                      <Text style={styles.promoBtnText}>{t('services_home.start_sourcing')}</Text>
                    </View>
                  </View>
                  <Ionicons name="rocket" size={80} color="rgba(255,255,255,0.1)" style={styles.promoIcon} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Section: Product Mart Categories (NEW) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('services_home.product_mart')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProductsList', { category: 'All' })}>
                <Text style={styles.viewAll}>{t('services_home.view_all_mart')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.catGrid}>
              {PRODUCT_CATS.filter(prod => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return prod.name.toLowerCase().includes(query);
              }).map((prod) => (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.catCard}
                  onPress={() => navigation.navigate('ProductsList', { category: prod.name })}
                >
                  <View style={styles.catIconContainer}>
                    {prod.icon.type === 'MaterialIcons' ? (
                      <MaterialIcons name={prod.icon.name} size={32} color="#2563EB" />
                    ) : (
                      <Ionicons name={prod.icon.name} size={32} color="#2563EB" />
                    )}
                  </View>
                  <Text numberOfLines={1} style={styles.catLabel}>{prod.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.catCard}
                onPress={() => navigation.navigate('ProductsList', { category: 'All' })}
              >
                <View style={styles.catIconContainer}>
                  <Ionicons name="grid-outline" size={24} color="#64748b" />
                </View>
                <Text numberOfLines={1} style={styles.catLabel}>{t('services_home.all_mart')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section: Featured Products (Moved Below) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('services_home.featured_products')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProductsList', { category: 'All' })}>
                <Text style={styles.viewAll}>{t('services_home.view_all')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }}>
              {PRODUCT_CATS.map((prod) => (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.productCard}
                  onPress={() => navigation.navigate('ProductsList', { category: prod.name })}
                >
                  <View style={styles.productImgContainer}>
                    <Image
                      source={{ uri: prod.image }}
                      style={styles.productImg}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {(() => { const translated = t(`product_categories.${prod.id}`); return translated.startsWith('product_categories.') ? prod.name : translated; })()}
                    </Text>
                    <View style={styles.productFooter}>
                      <Text style={styles.productCount}>{prod.count.replace('Items', t('services_home.items'))}</Text>
                      <View style={styles.productArrow}>
                        <Ionicons name="arrow-forward" size={14} color="white" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ width: 20 }} />
            </ScrollView>
          </View>

          {/* Section: Top Rated Vendors (Moved Below Featured Products) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('services_home.top_rated_vendors')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ServicesList', { category: 'All' })}>
                <Text style={styles.viewAll}>{t('services_home.view_all')}</Text>
              </TouchableOpacity>
            </View>

            {loadingVendors ? (
              <ActivityIndicator color={PRIMARY_COLOR} />
            ) : topVendors.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('services_home.finding_partners')}</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 20 }}>
                {topVendors.slice(0, 5).map((vendor) => (
                  <TouchableOpacity
                    key={vendor.id}
                    style={styles.realtimeVendorCard}
                    onPress={() => navigation.navigate('ServiceDetail', { service: vendor })}
                  >
                    <View style={styles.realtimeVendorImgWrapper}>
                      {(() => {
                        const realImg = (vendor.image && typeof vendor.image === 'string' && vendor.image.trim() !== '' && !vendor.image.includes('picsum.photos'))
                          ? vendor.image
                          : (vendor.businessImage && typeof vendor.businessImage === 'string' && vendor.businessImage.trim() !== '' && !vendor.businessImage.includes('picsum.photos'))
                            ? vendor.businessImage
                            : (Array.isArray(vendor.images) && vendor.images.length > 0 && vendor.images[0] && typeof vendor.images[0] === 'string' && vendor.images[0].trim() !== '' && !vendor.images[0].includes('picsum.photos'))
                              ? vendor.images[0]
                              : null;

                        if (realImg) {
                          return (
                            <Image
                              source={{ uri: realImg }}
                              style={[
                                styles.realtimeVendorImg,
                                vendor.isOnline === false && { borderColor: '#e2e8f0' }
                              ]}
                            />
                          );
                        }

                        return (
                          <View style={[styles.realtimeVendorImg, { backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', padding: 4 }]}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: '#3b82f6', letterSpacing: -0.3, textAlign: 'center' }}>
                              Business
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                    <View style={styles.realtimeVendorInfo}>
                      {/* Line 1: Vendor Name */}
                      <Text style={styles.realtimeVendorName} numberOfLines={1}>
                        {vendor.businessName}
                      </Text>

                      {/* Line 2: Tags & Badges */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 6 }}>
                        <Text style={{ fontSize: 8.5, fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5 }}>✓ verified</Text>

                        {vendor.type === 'product' && (
                          <View style={styles.mBadgeMini}>
                            <Text style={styles.mBadgeTextMini}>Manufacturer</Text>
                          </View>
                        )}

                        {isPremiumActive(vendor) && (
                          <>
                            <View style={styles.trustedBadgeMini}>
                              <Ionicons name="shield-checkmark" size={10} color="#2563EB" style={{ marginRight: 2 }} />
                              <Text style={styles.trustedBadgeTextMini}>Trusted</Text>
                            </View>
                            <View style={styles.recommendedBadgeMini}>
                              <Ionicons name="thumbs-up" size={10} color="#b45309" style={{ marginRight: 2 }} />
                              <Text style={styles.recommendedBadgeTextMini}>Recommended</Text>
                            </View>
                          </>
                        )}

                        {isSmartActive(vendor) && !isPremiumActive(vendor) && (
                          <View style={styles.recommendedBadgeMini}>
                            <Ionicons name="thumbs-up" size={10} color="#b45309" style={{ marginRight: 2 }} />
                            <Text style={styles.recommendedBadgeTextMini}>Recommended</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.realtimeVendorLoc} numberOfLines={1}>
                        <Ionicons name="location" size={12} color="#64748b" /> {vendor.location || 'Local Area'}
                      </Text>
                      {/* First Catalog Item */}
                      {vendor.catalog && vendor.catalog.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#f8fafc', borderRadius: 4, alignSelf: 'flex-start' }}>
                          <Ionicons name="pricetag-outline" size={10} color="#3b82f6" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 10, color: '#334155', fontWeight: '500' }} numberOfLines={1}>
                            {vendor.catalog[0].name} {vendor.catalog[0].price ? `• ₹${vendor.catalog[0].price}` : ''}
                          </Text>
                        </View>
                      )}
                      <View style={styles.realtimeFooter}>
                        <Text style={styles.vendorPriceMini} numberOfLines={1}>{vendor.category || 'Service'}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Section: Registered Shops (NEW) */}
        </View>
      </ScrollView>

      {/* Business Selection Modal */}
      <Modal
        visible={showBusinessDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBusinessDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowBusinessDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Business</Text>
              <TouchableOpacity onPress={() => setShowBusinessDropdown(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownScroll}>
              {userBusinesses.map((business: any) => (
                <TouchableOpacity
                  key={business.id}
                  style={styles.dropdownItem}
                  onPress={() => handleBusinessSelect(business)}
                >
                  <View style={styles.dropdownItemLeft}>
                    <View style={styles.dropdownItemIcon}>
                      <Ionicons name="business" size={20} color="#2563EB" />
                    </View>
                    <View style={styles.dropdownItemText}>
                      <Text style={styles.dropdownItemName}>{business.businessName}</Text>
                      <Text style={styles.dropdownItemType}>{business.category}</Text>
                    </View>
                  </View>
                  <View style={styles.dropdownItemRight}>
                    <View style={[
                      styles.statusBadge,
                      business.status === 'active' ? styles.statusActive : styles.statusPending
                    ]}>
                      <View style={[
                        styles.statusDot,
                        business.status === 'active' ? styles.statusDotActive : styles.statusDotPending
                      ]} />
                      <Text style={[
                        styles.statusText,
                        business.status === 'active' ? styles.statusTextActive : styles.statusTextPending
                      ]}>
                        {business.status === 'active' ? 'ACTIVE' : business.status?.toUpperCase() || 'PENDING'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.addBusinessBtn}
              onPress={() => {
                setShowBusinessDropdown(false);
                navigation.navigate('VendorRegistration');
              }}
            >
              <Ionicons name="add-circle" size={20} color="#2563EB" />
              <Text style={styles.addBusinessText}>Add New Business</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  headerGradient: {
    paddingBottom: 30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -1.5,
  },
  brandSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
    marginTop: -4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: '#ff4d4d',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
  },
  profileBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 10,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 16,
    color: 'white',
    fontWeight: '900',
    marginLeft: 5,
  },
  headerHeadline: {
    fontSize: 28,
    color: 'white',
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 34,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'white',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  filterBtn: {
    width: 40,
    height: 40,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingTop: 10,
  },
  section: {
    marginTop: 10,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  viewAll: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  catCard: {
    width: (width - 64) / 4,
    alignItems: 'center',
    marginBottom: 20,
  },
  catIconContainer: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  bannerContainer: { marginHorizontal: 6, marginBottom: 30, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  bannerCarousel: { height: 190 },
  bannerSlide: { width: width - 12, height: 190, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', bottom: 12, left: 12, right: 12, alignItems: 'flex-start' },
  bannerTitleBox: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, maxWidth: '90%' },
  bannerSlideTitle: { color: 'white', fontSize: 13, fontWeight: '800' },
  bannerSlideDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '500', marginTop: 2 },
  sponsoredBadge: {
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
  sponsoredBadgeText: { color: 'white', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  dotRow: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 16, backgroundColor: 'white' },
  dotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.5)' },
  promoBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 6,
    marginBottom: 30,
  },
  promoGradient: {
    padding: 30,
    minHeight: 190,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  promoDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 15,
  },
  promoBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  promoBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  promoIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  productCard: {
    width: 200,
    backgroundColor: 'white',
    marginRight: 15,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  productImgContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  hotBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hotBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 15,
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 10,
    height: 40,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  productArrow: {
    width: 24,
    height: 24,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorCard: {
    width: 130,
    backgroundColor: 'white',
    marginRight: 12,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  vendorImgContainer: {
    width: '100%',
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  vendorImg: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#3b82f6',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  recommendBadgeMini: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#2563EB',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  vendorInfo: {
    marginTop: 5,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  ratingRowMini: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingTextMini: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginLeft: 3,
  },
  dotSpacerMini: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 5,
  },
  vendorLocMini: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  realtimeVendorCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  realtimeVendorImgWrapper: {
    position: 'relative',
    padding: 3,
  },
  realtimeVendorImg: {
    width: 75,
    height: 75,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0', // Neutral default
  },
  onlinePulseOuter: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    padding: 4,
    borderRadius: 10,
  },
  onlinePulseInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: 'white',
  },
  realtimeVendorInfo: {
    flex: 1,
    marginLeft: 15,
  },
  realtimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  realtimeVendorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ef4444',
  },
  realtimeVendorLoc: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  realtimeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ratingBoxMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 4,
  },
  ratingVal: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  vendorPriceMini: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  callBtnMini: {
    width: 40,
    height: 40,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  // Business Dropdown Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  dropdownScroll: {
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownItemText: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  dropdownItemType: {
    fontSize: 13,
    color: '#64748b',
  },
  dropdownItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
  },
  statusDotPending: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTextActive: {
    color: '#166534',
  },
  statusTextPending: {
    color: '#92400e',
  },
  addBusinessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  addBusinessText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  mBadgeMini: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mBadgeTextMini: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1d4ed8',
  },
  planBadgesRowMini: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 1,
    marginBottom: 3,
  },
  trustedBadgeMini: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustedBadgeTextMini: {
    fontSize: 9,
    fontWeight: '900',
    color: '#1d4ed8',
  },
  recommendedBadgeMini: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendedBadgeTextMini: {
    fontSize: 9,
    fontWeight: '900',
    color: '#b45309',
  },
  mBadgeOverlay: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mBadgeOverlayText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1d4ed8',
  },
});