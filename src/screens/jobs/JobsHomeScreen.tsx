import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Linking,
  Share,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, where, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth } from '../../services/firebase';
import { useIsFocused } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { PINCODES } from '../../data/pincodes';
import { Modal, KeyboardAvoidingView, TextInput } from 'react-native';

import JobsSidebar from '../../components/JobsSidebar';
import GradientHeader from '../../components/GradientHeader';
import PremiumLockModal from '../../components/PremiumLockModal';

const { width } = Dimensions.get('window');

const isJobGenuine = (item: any) => {
  if (!item) return false;
  if (!item.isGenuineVerified && !item.hasVerificationBadge && !item.isVerified && item.verificationStatus !== 'verified') return false;
  if (!item.genuineVerificationEndDate) return true; // fallback for legacy items / admin lifetime
  try {
    const end = item.genuineVerificationEndDate.toDate
      ? item.genuineVerificationEndDate.toDate()
      : new Date(item.genuineVerificationEndDate);
    return end > new Date();
  } catch {
    return true;
  }
};

const JobsHomeScreen = ({ navigation }: any) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [govtJobs, setGovtJobs] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pincodeAds, setPincodeAds] = useState<any[]>([]);
  const [userPincode, setUserPincode] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userState, setUserState] = useState<string | null>(null);
  const [seekerPlanActive, setSeekerPlanActive] = useState<boolean>(false);
  const [seekerPlanExpiry, setSeekerPlanExpiry] = useState<any>(null);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockedJobData, setLockedJobData] = useState<any>(null);

  const handleJobPress = (clickedJob: any) => {
    const isPremium = seekerPlanActive && seekerPlanExpiry && (seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : new Date(seekerPlanExpiry)) > new Date();
    
    const isSalaryOver20k = () => {
      if (!clickedJob || !clickedJob.salary) return false;
      try {
        const salStr = clickedJob.salary.toString().toLowerCase();
        const kMatch = salStr.match(/(\d+)\s*k/);
        if (kMatch) {
          return parseInt(kMatch[1], 10) * 1000 >= 20000;
        }
        const cleanString = salStr.replace(/[^0-9]/g, '');
        if (!cleanString) return false;
        const salaryNum = parseInt(cleanString, 10);
        if (isNaN(salaryNum)) return false;
        return salaryNum >= 20000;
      } catch (e) {
        return false;
      }
    };

    const currentUserId = auth.currentUser?.uid;
    const isJobOwner = Boolean(
      currentUserId && (
        clickedJob?.userId === currentUserId ||
        clickedJob?.postedBy === currentUserId ||
        clickedJob?.createdBy === currentUserId ||
        clickedJob?.employerId === currentUserId
      )
    );

    const isLocked = (clickedJob?.isUrgentHiring || isSalaryOver20k()) && !isPremium && !isJobOwner;

    if (isLocked) {
      setLockedJobData(clickedJob);
      setLockModalVisible(true);
    } else {
      navigation.navigate('JobDetail', { jobId: clickedJob.id });
    }
  };

  const [profileName, setProfileName] = useState<string>('Guest');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Animated states for typing title and box slide-up
  const [typedLength, setTypedLength] = useState(0);
  const contentFadeAnim = React.useRef(new Animated.Value(0)).current;
  const contentSlideAnim = React.useRef(new Animated.Value(50)).current;
  const hasAnimatedRef = React.useRef(false);

  const prefix = t('home.find_your') || 'Find Your';
  const suffix = t('home.dream_job') || 'Dream Job';
  const fullText = `${prefix} ${suffix}`;

  useEffect(() => {
    if (isFocused) {
      if (hasAnimatedRef.current) {
        // Keep final animation values if already animated once
        setTypedLength(fullText.length);
        contentFadeAnim.setValue(1);
        contentSlideAnim.setValue(0);
        return;
      }

      hasAnimatedRef.current = true;
      setTypedLength(0);
      contentFadeAnim.setValue(0);
      contentSlideAnim.setValue(50);

      let index = 0;
      const typingInterval = setInterval(() => {
        index++;
        setTypedLength(index);
        if (index >= fullText.length) {
          clearInterval(typingInterval);
        }
      }, 80); // Slower typing speed (80ms per character)

      const slideTimeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(contentFadeAnim, {
            toValue: 1,
            duration: 1000, // Slower fade-in (1s)
            useNativeDriver: true,
          }),
          Animated.spring(contentSlideAnim, {
            toValue: 0,
            tension: 40, // Softer spring pull
            friction: 8, // Smoother deceleration
            useNativeDriver: true,
          }),
        ]).start();
      }, 600); // 600ms delay for sequential transition feel

      return () => {
        clearInterval(typingInterval);
        clearTimeout(slideTimeout);
      };
    }
  }, [isFocused, fullText]);

  // User pincode onboarding modal states
  const [askPincodeVisible, setAskPincodeVisible] = useState(false);
  const [modalPincodeQuery, setModalPincodeQuery] = useState('');
  const [modalPincodeSuggestions, setModalPincodeSuggestions] = useState<any[]>([]);
  const [selectedModalPincode, setSelectedModalPincode] = useState<string | null>(null);
  const [savingPincode, setSavingPincode] = useState(false);

  useEffect(() => {
    if (!modalPincodeQuery) {
      setModalPincodeSuggestions([]);
      return;
    }
    const queryLower = modalPincodeQuery.toLowerCase();

    // Fast early-break loop for large dataset search
    const matches: any[] = [];
    for (let i = 0; i < PINCODES.length; i++) {
      const item = PINCODES[i];
      const match = item.pincode.startsWith(queryLower) ||
        item.city.toLowerCase().includes(queryLower) ||
        item.area.toLowerCase().includes(queryLower);
      if (match) {
        matches.push(item);
        if (matches.length >= 5) {
          break;
        }
      }
    }
    setModalPincodeSuggestions(matches);
  }, [modalPincodeQuery]);

  const categories = [
    { id: 1, title: t('jobs.private_jobs'), icon: 'globe', color: '#EA580C' },
    { id: 2, title: t('jobs.central_govt'), icon: 'flag', color: '#bc36ad' },
    { id: 3, title: t('jobs.state_govt'), icon: 'business', color: '#bc36ad' },
  ];

  const fetchJobs = useCallback(() => {
    setLoading(true);
    // Fetch recent jobs with real-time updates
    const q = query(
      collection(db, 'jobs'),
      limit(80)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allJobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter active ones and apply 30-day visibility/expiry rule
      const activeJobs = allJobs.filter((j: any) => {
        if (j.status !== 'Active') return false;

        // 30 days expiry limit for User-posted jobs
        if (j.source === 'User' || j.postedBy) {
          if (j.expiryDate) {
            const exp = j.expiryDate.toDate ? j.expiryDate.toDate() : new Date(j.expiryDate);
            if (exp < new Date()) return false;
          } else if (j.createdAt) {
            const created = j.createdAt.toDate ? j.createdAt.toDate() : new Date(j.createdAt);
            const diffDays = (new Date().getTime() - created.getTime()) / (1000 * 3600 * 24);
            if (diffDays > 30) return false;
          }
        }
        return true;
      });

      // Extract the base district name from a location string like "Visakhapatnam, AP"
      const getDistrictFromLocation = (loc: string) => {
        if (!loc) return '';
        return loc.split(',')[0].trim().toLowerCase();
      };

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

      const userPincodeStr = userPincode || '';
      const currentUserId = auth.currentUser?.uid;

      const isJobInUserArea = (j: any): boolean => {
        if (!userCity && !userPincodeStr) return true; // no location set → show all

        // 1. Job poster's pincode matches user pincode directly
        if (userPincodeStr && (j.location?.includes(userPincodeStr) || j.pincode === userPincodeStr)) return true;

        // 2. Robust district/city match (using spelling-resilient similarity)
        if (userCity && j.location && citiesMatch(userCity, j.location)) return true;

        return false;
      };

      // Sort: local district jobs first, then by date
      const sortedJobs = activeJobs.sort((a: any, b: any) => {
        const isUserPremium = seekerPlanActive && seekerPlanExpiry && (seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : new Date(seekerPlanExpiry)) > new Date();
        if (isUserPremium) {
          if (a.isUrgentHiring && !b.isUrgentHiring) return -1;
          if (!a.isUrgentHiring && b.isUrgentHiring) return 1;
        }

        const aLocal = isJobInUserArea(a);
        const bLocal = isJobInUserArea(b);

        // Top Visibility + local = highest priority
        if (a.isTopVisibility && aLocal && !(b.isTopVisibility && bLocal)) return -1;
        if (b.isTopVisibility && bLocal && !(a.isTopVisibility && aLocal)) return 1;

        // Any Top Visibility
        if (a.isTopVisibility && !b.isTopVisibility) return -1;
        if (!a.isTopVisibility && b.isTopVisibility) return 1;

        // Local district jobs first
        if (aLocal && !bLocal) return -1;
        if (!aLocal && bLocal) return 1;

        // Date descending
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      // All private jobs (non-govt) — always show content, local ones sorted to top
      const allPrivate = sortedJobs.filter((j: any) => {
        const cat = (j.category || '').toLowerCase();
        return !(cat.includes('central') || cat.includes('state') || cat.includes('govt') || cat.includes('government'));
      });

      // For premium users, keep ALL Urgent Hiring jobs at the absolute top of the feed
      const isUserPremium = seekerPlanActive && seekerPlanExpiry && (seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : new Date(seekerPlanExpiry)) > new Date();
      let finalPrivateList: any[] = [];

      if (isUserPremium) {
        const urgentPrivate = allPrivate.filter(j => j.isUrgentHiring);
        const nonUrgentPrivate = allPrivate.filter(j => !j.isUrgentHiring);

        // Filter only local jobs for premium
        const localUrgent = urgentPrivate.filter(j => isJobInUserArea(j) || (currentUserId && j.postedBy === currentUserId));
        const localNonUrgent = nonUrgentPrivate.filter(j => isJobInUserArea(j) || (currentUserId && j.postedBy === currentUserId));

        finalPrivateList = [...localUrgent, ...localNonUrgent];
      } else {
        // Filter only local jobs for non-premium
        finalPrivateList = allPrivate.filter(j => isJobInUserArea(j) || (currentUserId && j.postedBy === currentUserId));
      }

      const privateList = finalPrivateList.slice(0, 15);

      const govtList = sortedJobs.filter((j: any) => {
        const cat = (j.category || '').toLowerCase();
        const isGovt = cat.includes('central') || cat.includes('state') || cat.includes('govt') || cat.includes('government');
        return isGovt;
      }).slice(0, 10);

      setJobs(privateList);
      setGovtJobs(govtList);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Error fetching jobs:", error);
      setLoading(false);
      setRefreshing(false);
    });

    // Fetch banners
    const bannerQuery = query(
      collection(db, 'banners'),
      where('type', '==', 'Job'),
      where('isActive', '==', true)
    );

    const unsubscribeBanners = onSnapshot(bannerQuery, (snapshot) => {
      const bannerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBanners(bannerList);
    });

    return () => {
      unsubscribe();
      unsubscribeBanners();
    };
  }, [userPincode, userCity, seekerPlanActive, seekerPlanExpiry]);

  // Auto-scroll logic for banners is handled below with mergedBanners
  const bannerScrollRef = React.useRef<ScrollView>(null);
  const promoScrollRef = React.useRef<ScrollView>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [activePromoIndex, setActivePromoIndex] = useState(0);

  // Display pincode ads first in the banner carousel, then general banners as fallback
  const mergedBanners = pincodeAds.length > 0
    ? pincodeAds.map((ad: any) => ({ ...ad, isAd: true }))
    : banners;

  useEffect(() => {
    if (mergedBanners.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (activeBannerIndex + 1) % mergedBanners.length;
      bannerScrollRef.current?.scrollTo({ x: nextIndex * (width - 40), animated: true });
      setActiveBannerIndex(nextIndex);
    }, 3000); // Scroll every 3 seconds
    return () => clearInterval(interval);
  }, [activeBannerIndex, mergedBanners.length]);

  useEffect(() => {
    if (promoBanners.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (activePromoIndex + 1) % promoBanners.length;
      promoScrollRef.current?.scrollTo({ x: nextIndex * (width - 40), animated: true });

      setActivePromoIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [activePromoIndex, promoBanners]);

  useEffect(() => {
    const unsubscribe = fetchJobs();
    return () => unsubscribe();
  }, [fetchJobs]);

  // Check user pincode + city from their profile on mount
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubscribeUser = onSnapshot(doc(db, 'users', userId), (userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSeekerPlanActive(data?.seekerPlanActive || false);
        setSeekerPlanExpiry(data?.seekerPlanExpiry || null);
        if (data && data.pincode) {
          setUserPincode(data.pincode);
          setAskPincodeVisible(false);
        } else {
          setAskPincodeVisible(true);
        }
        // Capture city for local job filtering
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
        // Capture name & profileImage for custom header avatar button
        if (data && data.name) {
          setProfileName(data.name);
        }
        if (data && data.profileImage) {
          setProfileImage(data.profileImage);
        } else {
          setProfileImage(null);
        }
      } else {
        setAskPincodeVisible(true);
      }
    });

    return () => unsubscribeUser();
  }, []);

  // Fetch pincode ads targeted to user's pincode (with multiple pincodes array support)
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
      // Exclude expired campaigns and match sourceApp === 'Jobs'
      const now = new Date();
      const matchedAds = adsList.filter(ad => {
        // Match sourceApp: 'Jobs' (or if not specified, default to Jobs to be safe/backwards compatible)
        const matchesApp = !ad.sourceApp || ad.sourceApp === 'Jobs';
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

      // Only show ads that have a successfully uploaded image (valid remote URL)
      const validAds = matchedAds.filter(ad => ad.imageUrl && ad.imageUrl.startsWith('http'));
      setPincodeAds(validAds.slice(0, 5));
    });

    return () => unsubscribeAds();
  }, [userPincode, userCity, userState]);

  const handleSaveUserPincode = async (pincode: string) => {
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      Toast.show({ type: 'error', text1: 'Invalid Pincode', text2: 'Please select or enter a valid 6-digit pincode' });
      return;
    }

    setSavingPincode(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await updateDoc(doc(db, 'users', userId), {
        pincode: pincode,
        updatedAt: serverTimestamp()
      });

      setUserPincode(pincode);
      setAskPincodeVisible(false);
      setModalPincodeQuery('');
      setSelectedModalPincode(null);

      Toast.show({ type: 'success', text1: 'Success', text2: 'Pincode updated successfully' });
    } catch (error: any) {
      console.error("Error saving pincode:", error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to save pincode' });
    } finally {
      setSavingPincode(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs();
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, [fetchJobs]);

  const getStatusBadge = (status: string) => {
    if (status === 'Expired') return { label: t('jobs_list.closed'), color: '#EF4444' };
    if (status === 'Soon') return { label: t('jobs_list.ending_soon'), color: '#F59E0B' };
    return { label: t('jobs_list.active'), color: '#10B981' };
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'bottom']}>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0035a0']}
              tintColor="#0035a0"
            />
          }
        >
          {/* Premium Header Greeting & Search Section */}
          <View style={styles.headerContainerBlock}>
            {/* Top Row: Menu Toggle & Profile Avatar */}
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.menuArrowCircle} onPress={() => setSidebarVisible(true)} activeOpacity={0.7}>
                <Ionicons name="menu" size={24} color="#1e293b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileAvatarCircle}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.8}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileHeaderImage} />
                ) : (
                  <View style={styles.profileHeaderPlaceholder}>
                    <Text style={styles.profileHeaderInitial}>
                      {profileName ? profileName.charAt(0).toUpperCase() : 'G'}
                    </Text>
                  </View>
                )}
                <View style={styles.profileActiveDot} />
              </TouchableOpacity>
            </View>

            {/* Greeting & Subtitle */}
            <View style={styles.headerGreetingBlock}>
              <Text style={styles.welcomeText}>
                {t('home.hello')}, {profileName} <Text style={{ fontSize: 13 }}>👋</Text>
              </Text>
              {(() => {
                const currentText = fullText.slice(0, typedLength);
                if (currentText.length <= prefix.length) {
                  return (
                    <Text style={styles.headerTitle}>
                      {currentText}
                    </Text>
                  );
                } else {
                  const prefixPart = currentText.slice(0, prefix.length + 1);
                  const suffixPart = currentText.slice(prefix.length + 1);
                  return (
                    <Text style={styles.headerTitle}>
                      {prefixPart}
                      <Text style={styles.highlightText}>{suffixPart}</Text>
                    </Text>
                  );
                }
              })()}
            </View>

            {/* Premium Job Search Bar Mock Button */}
            <TouchableOpacity
              style={styles.mockSearchBar}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Jobs', { category: 'Private Jobs' })}
            >
              <Ionicons name="search-outline" size={18} color="#0035a0" style={{ marginRight: 10 }} />
              <Text style={styles.mockSearchText}>Search jobs, skills, or companies...</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={{ opacity: contentFadeAnim, transform: [{ translateY: contentSlideAnim }] }}>
            {/* Hero Banner Carousel - includes Firestore banners + pincode ads */}
            <View style={styles.bannerContainer}>
              {mergedBanners.length > 0 ? (
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
                  {mergedBanners.map((banner: any, index) => (
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
                <LinearGradient
                  colors={['#0035a0', '#0035a0', '#0035a0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroBanner}
                >
                  <View style={styles.bannerCircle} />
                  <View style={styles.bannerContent}>
                    <View style={styles.bannerBadge}>
                      <MaterialCommunityIcons name="creation" size={10} color="#fff" />
                      <Text style={styles.bannerBadgeText}>{t('jobs.new_jobs_count')}</Text>
                    </View>
                    <Text style={styles.bannerTitle}>{t('jobs.banner_title')}</Text>
                    <Text style={styles.bannerSub}>{t('jobs.banner_sub')}</Text>
                  </View>
                  <View style={styles.bannerRightSide}>
                    <View style={styles.bannerIconGlass}>
                      <MaterialCommunityIcons name="briefcase-check" size={32} color="#fff" />
                    </View>
                  </View>
                </LinearGradient>
              )}

              {/* Dot indicators */}
              {mergedBanners.length > 1 && (
                <View style={styles.dotRow}>
                  {mergedBanners.map((_, i) => (
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

            {/* Categories Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('jobs.categories')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    onPress={() => navigation.navigate('Jobs', { category: category.title })}
                  >
                    <View style={styles.categoryIconCircle}>
                      <Ionicons name={category.icon as any} size={18} color={category.color} />
                    </View>
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                    <View style={styles.categoryFooter}>
                      <Text style={styles.jobCountText}>{t('jobs.view_jobs')}</Text>
                      <View style={styles.categoryArrow}>
                        <Ionicons name="arrow-forward" size={10} color="#0035a0" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Government Non-Affiliation Disclaimer Banner */}
              <TouchableOpacity 
                style={styles.homeGovtDisclaimerBox}
                onPress={() => navigation.navigate('GovtJobInfo')}
                activeOpacity={0.8}
              >
                <Ionicons name="information-circle" size={16} color="#991b1b" style={{ marginTop: 1 }} />
                <Text style={styles.homeGovtDisclaimerText}>
                  <Text style={{ fontWeight: '800', color: '#991b1b' }}>Disclaimer: </Text>
                  MEESENT is not an official government app. We only share job info collected from public portals.
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#991b1b" />
              </TouchableOpacity>
            </View>

            {/* Post a Job Section */}
            <View style={styles.postJobWrapper}>
              <LinearGradient
                colors={['#0035a0', '#0f52ba']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumPostJobCard}
              >
                <View style={styles.postJobCircleOverlay1} />
                <View style={styles.postJobCircleOverlay2} />

                <View style={styles.postJobCardHeader}>
                  <View style={styles.postJobIconWrapper}>
                    <MaterialCommunityIcons name="rocket-launch" size={24} color="#0035a0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.premiumPostJobTitle}>{t('jobs.post_job_free')}</Text>
                    <Text style={styles.premiumPostJobSub}>{t('jobs.post_job_sub')}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.premiumPostJobBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PostJob')}
                >
                  <Text style={styles.premiumPostJobBtnText}>{t('jobs.post_job_btn')}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0035a0" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Dynamic Promo Banner Area (Jobs Promo) */}
            {promoBanners.length > 0 && (
              <View style={[styles.bannerContainer, { marginTop: 10, marginBottom: 10 }]}>
                <ScrollView
                  ref={promoScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
                    setActivePromoIndex(index);
                  }}
                  style={styles.bannerCarousel}
                >
                  {promoBanners.map((banner: any, index) => (
                    <View key={banner.id || index} style={styles.bannerSlide}>
                      <Image
                        source={{ uri: banner.imageUrl }}
                        style={styles.bannerImage}
                        resizeMode="cover"
                      />
                      {banner.title && (
                        <View style={styles.bannerOverlay}>
                          <View style={styles.bannerTitleBox}>
                            <Text style={styles.bannerSlideTitle}>{banner.title}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Recent Notifications List */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{t('home.recent_notifications')}</Text>
                  {userCity ? (
                    <Text style={{ fontSize: 12, color: '#0035a0', fontWeight: '600', marginTop: 2 }}>
                      📍 {userCity}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Jobs', { category: 'Private Jobs' })}>
                  <Text style={styles.viewAllText}>{t('home.view_all')}</Text>
                </TouchableOpacity>
              </View>

              {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#0035a0" style={{ marginTop: 20 }} />
              ) : jobs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="briefcase-outline" size={50} color="#CBD5E1" />
                  <Text style={styles.emptyStateText}>{t('home.no_jobs')}</Text>
                </View>
              ) : (
                jobs.map((job) => {
                  const badge = getStatusBadge(job.status);
                  return (
                    <TouchableOpacity
                      key={job.id}
                      activeOpacity={0.8}
                      style={[
                        styles.premiumCard,
                        job.status === 'Expired' && { opacity: 0.6 },
                        job.isTopVisibility && { borderColor: '#bfdbfe', backgroundColor: '#fafcff' }
                      ]}
                      onPress={() => handleJobPress(job)}
                    >
                      {/* Top visibility status indicator */}
                      {job.isTopVisibility && (
                        <View style={styles.topVisIndicator}>
                          <Ionicons name="sparkles" size={10} color="#3b82f6" />
                          <Text style={styles.topVisText}>FEATURED JOB</Text>
                        </View>
                      )}

                      <View style={styles.cardMain}>
                        {/* Company Logo Inner Block */}
                        <View style={styles.cardLogoContainer}>
                          <View style={[styles.cardLogoInner, job.isTopVisibility && { borderColor: '#bfdbfe' }]}>
                            {job.imageUrl ? (
                              <Image source={{ uri: job.imageUrl }} style={styles.fullImage} resizeMode="cover" />
                            ) : (
                              <MaterialCommunityIcons name="briefcase-variant-outline" size={24} color="#3b82f6" />
                            )}
                          </View>
                          {(isJobGenuine(job) || job.isVerified) && (
                            <View style={styles.cardVerifiedBadge}>
                              <Ionicons name="checkmark-sharp" size={10} color="white" />
                            </View>
                          )}
                        </View>

                        <View style={styles.cardInfo}>
                          {/* Title and badges row */}
                          <View style={styles.cardTitleRow}>
                            <View style={{ flex: 1, marginRight: 6 }}>
                              <Text style={styles.cardTitle} numberOfLines={1}>
                                {job.title}
                              </Text>
                              <View style={styles.cardCompanyRow}>
                                <Text style={styles.cardCompany} numberOfLines={1}>
                                  {job.company || 'Private Recruiter'}
                                </Text>
                                {(isJobGenuine(job) || job.isVerified) && (
                                  <View style={styles.verifiedTextBadge}>
                                    <Ionicons name="shield-checkmark" size={11} color="#10b981" />
                                    <Text style={styles.verifiedTextBadgeText}>VERIFIED</Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <View style={[styles.cardTypeChip, { backgroundColor: '#eff6ff' }]}>
                                <Text style={[styles.cardTypeChipText, { color: '#2563eb' }]}>
                                  {job.jobType || job.type || 'Full Time'}
                                </Text>
                              </View>
                              {job.isUrgentHiring && (
                                <View style={styles.urgentHiringTag}>
                                  <Ionicons name="flash" size={8} color="#d97706" />
                                  <Text style={styles.urgentHiringTagText}>URGENT</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Meta items bar */}
                          <View style={styles.cardMetaRow}>
                            <View style={styles.cardMetaItem}>
                              <Ionicons name="location" size={12} color="#3b82f6" />
                              <Text style={[styles.cardMetaText, { color: '#475569' }]}>
                                {job.location?.split(',')[0]}
                              </Text>
                            </View>
                            <View style={styles.cardMetaDivider} />
                            <View style={styles.cardMetaItem}>
                              <Ionicons name="briefcase" size={12} color="#f59e0b" />
                              <Text style={[styles.cardMetaText, { color: '#475569' }]}>
                                {job.experience || 'Fresher'}
                              </Text>
                            </View>
                            {job.vacancies ? (
                              <>
                                <View style={styles.cardMetaDivider} />
                                <View style={styles.cardMetaItem}>
                                  <Ionicons name="people" size={12} color="#10b981" />
                                  <Text style={[styles.cardMetaText, { color: '#475569' }]}>
                                    {job.vacancies} {job.vacancies === 1 ? 'Vacancy' : 'Vacancies'}
                                  </Text>
                                </View>
                              </>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      {/* Card Footer (Salary & View Details) */}
                      <View style={styles.cardFooter}>
                        <View style={styles.cardSalaryContainer}>
                          <Text style={styles.cardSalaryLabel}>{t('jobs_list.est_salary')}</Text>
                          <Text style={styles.cardSalaryValue}>
                            {job.salary || t('jobs_list.negotiable')}
                            {job.salaryType ? (
                              <Text style={styles.salaryTypeSuffix}>
                                {(() => {
                                  const lower = job.salaryType.toLowerCase();
                                  if (lower.includes('month')) return ' / Month';
                                  if (lower.includes('year')) return ' / Year';
                                  if (lower.includes('hour')) return ' / Hour';
                                  if (lower.includes('day')) return ' / Day';
                                  if (lower.includes('project')) return ' / Project';
                                  return ` / ${job.salaryType}`;
                                })()}
                              </Text>
                            ) : null}
                          </Text>
                        </View>
                        <View style={styles.premiumCardActionBtn}>
                          <Text style={styles.premiumCardActionText}>{t('jobs_list.view_details')}</Text>
                          <Ionicons name="arrow-forward-sharp" size={12} color="white" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>


            {/* Job Seekers Premium Promo */}
            <View style={styles.postJobWrapper}>
              <View style={styles.premiumSeekerCard}>
                <View style={styles.premiumSeekerTop}>
                  <View style={styles.premiumSeekerIcon}>
                    <MaterialCommunityIcons name="star-shooting" size={24} color="#0035a0" />
                  </View>
                  <View style={styles.premiumSeekerTextContainer}>
                    <Text style={styles.premiumSeekerTitle}>{t('home.premium_job_seekers')}</Text>
                    <Text style={styles.premiumSeekerSub}>{t('home.starting_at')}</Text>
                  </View>
                </View>

                <View style={styles.premiumSeekerBenefits}>
                  <View style={styles.premiumSeekerBenefitItem}>
                    <Ionicons name="flash" size={14} color="#f59e0b" />
                    <Text style={styles.premiumSeekerBenefitText}>{t('home.urgent_recruitment')}</Text>
                  </View>
                  <View style={styles.premiumSeekerBenefitItem}>
                    <Ionicons name="cash-outline" size={14} color="#10b981" />
                    <Text style={styles.premiumSeekerBenefitText}>{t('home.high_salary')}</Text>
                  </View>
                  <View style={styles.premiumSeekerBenefitItem}>
                    <Ionicons name="rocket-outline" size={14} color="#0035a0" />
                    <Text style={styles.premiumSeekerBenefitText}>{t('home.fast_response')}</Text>
                  </View>
                  <View style={styles.premiumSeekerBenefitItem}>
                    <Ionicons name="document-text-outline" size={14} color="#3b82f6" />
                    <Text style={styles.premiumSeekerBenefitText}>{t('home.show_more')}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.premiumSeekerBtn}
                  onPress={() => navigation.navigate('UpgradeSeeker')}
                >
                  <Text style={styles.premiumSeekerBtnText}>{t('home.upgrade_now')}</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>

          </Animated.View>
        </ScrollView>

        <JobsSidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          navigation={navigation}
        />

      </SafeAreaView>
      {/* Ask Pincode Modal */}
      <Modal visible={askPincodeVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Your Pincode</Text>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.modalSubtitle}>
                Please select or enter your 6-digit pincode to customize your job search and find local opportunities near you.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Search Area / Pincode</Text>
                <TextInput
                  style={styles.textInput}
                  value={modalPincodeQuery}
                  onChangeText={setModalPincodeQuery}
                  placeholder="Enter pincode, city or area"
                  keyboardType="default"
                />

                {/* Suggestions List */}
                {modalPincodeSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {modalPincodeSuggestions.map((item) => (
                      <TouchableOpacity
                        key={item.pincode}
                        style={styles.suggestionItem}
                        onPress={() => {
                          setSelectedModalPincode(item.pincode);
                          setModalPincodeQuery(`${item.pincode} - ${item.area}, ${item.city}`);
                          setModalPincodeSuggestions([]);
                        }}
                      >
                        <Ionicons name="location-outline" size={16} color="#475569" style={{ marginRight: 8 }} />
                        <Text style={styles.suggestionText}>
                          {item.pincode} - {item.area}, {item.city} ({item.state})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Show custom option if input is 6 digit number */}
                {/^\d{6}$/.test(modalPincodeQuery) && !modalPincodeSuggestions.some(s => s.pincode === modalPincodeQuery) && (
                  <View style={styles.suggestionsContainer}>
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => {
                        setSelectedModalPincode(modalPincodeQuery);
                        setModalPincodeSuggestions([]);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#0035a0" style={{ marginRight: 8 }} />
                      <Text style={[styles.suggestionText, { color: '#0035a0', fontWeight: 'bold' }]}>
                        Use custom pincode "{modalPincodeQuery}"
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Selected Pincode Indicator */}
              {selectedModalPincode && (
                <View style={styles.selectedPincodeInfo}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.selectedPincodeText}>Selected: {selectedModalPincode}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, !selectedModalPincode && { backgroundColor: '#cbd5e1' }]}
                onPress={() => selectedModalPincode && handleSaveUserPincode(selectedModalPincode)}
                disabled={!selectedModalPincode || savingPincode}
              >
                {savingPincode ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveBtnText}>Save and Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <PremiumLockModal
        visible={lockModalVisible}
        onClose={() => setLockModalVisible(false)}
        salary={lockedJobData?.salary}
        isUrgent={lockedJobData?.isUrgentHiring}
        onSuccess={() => {
          setLockModalVisible(false);
          if (lockedJobData) {
            navigation.navigate('JobDetail', { jobId: lockedJobData.id });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: 4,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  highlightText: {
    color: '#0035a0',
  },
  actionButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  actionDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    backgroundColor: '#ef4444',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#F8FAFC',
  },
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', paddingHorizontal: 24, marginBottom: 8 },
  sectionSubtitle: { fontSize: 12, color: '#64748b', fontWeight: '600', paddingHorizontal: 24, marginBottom: 16 },
  viewAllText: { fontSize: 13, color: '#0035a0', fontWeight: '700' },
  horizontalScroll: { paddingLeft: 24 },

  // Pincode Ad Styles
  pincodeAdCard: { width: 200, backgroundColor: 'white', borderRadius: 16, marginRight: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  pincodeAdImage: { width: '100%', height: 100 },
  pincodeAdContent: { padding: 12 },
  pincodeAdTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  pincodeAdDesc: { fontSize: 11, color: '#64748b', fontWeight: '500', marginBottom: 8, lineHeight: 14 },
  pincodeAdBadge: { alignSelf: 'flex-start', backgroundColor: '#0035a0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pincodeAdBadgeText: { fontSize: 9, fontWeight: 'bold', color: 'white' },

  bannerContainer: { marginHorizontal: 20, marginTop: 10, borderRadius: 24, overflow: 'hidden' },
  bannerCarousel: { height: 160 },
  bannerSlide: { width: width - 40, height: 160, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: { position: 'absolute', bottom: 10, left: 10, right: 10, alignItems: 'flex-start' },
  bannerTitleBox: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, maxWidth: '90%' },
  bannerSlideTitle: { color: 'white', fontSize: 13, fontWeight: '800' },
  bannerSlideDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Sponsored badge on pincode ad slides
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(193,43,123,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
    gap: 4,
  },
  sponsoredBadgeText: { color: 'white', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  // Dot pagination indicators
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
  heroBanner: {
    padding: 20,
    borderRadius: 24,
    height: 160,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerCircle: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.1)', width: 100, height: 100, borderRadius: 50, top: -20, right: -20 },
  bannerContent: { flex: 1, justifyContent: 'center' },
  bannerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  bannerBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 24 },
  bannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: '500' },
  bannerPrimaryBtn: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginTop: 12, alignSelf: 'flex-start' },
  bannerPrimaryBtnText: { color: '#0035a0', fontSize: 11, fontWeight: '900', marginRight: 4 },
  bannerRightSide: { justifyContent: 'center', alignItems: 'flex-end', width: 50 },
  bannerIconGlass: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', transform: [{ rotate: '15deg' }] },

  // Category Styles
  categoryCard: {
    width: 110,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  categoryIconCircle: {
    width: 36,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  categoryTitle: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  categoryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobCountText: { fontSize: 9, color: '#94A3B8', fontWeight: '700' },
  categoryArrow: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#f0f5fc', justifyContent: 'center', alignItems: 'center' },

  // Government Jobs Styles
  govJobCard: {
    width: 280,
    height: 180,
    borderRadius: 20,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  govJobBanner: {
    width: '100%',
    height: 120,
  },
  govJobActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  govJobActionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  govJobActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },

  // Post Job Styles - FRIENDLY & EASY (COMPACT)
  postJobWrapper: { paddingHorizontal: 20, marginTop: 25, marginBottom: 10 },
  postJobSimpleCard: {
    backgroundColor: '#f0f5fc',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#9dbff2',
  },
  postJobSimpleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  postJobSimpleIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  postJobSimpleText: {
    marginLeft: 14,
    flex: 1,
  },
  postJobSimpleTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  postJobSimpleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 15,
  },
  postJobSimpleBtn: {
    backgroundColor: '#0035a0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  postJobSimpleBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 6,
  },

  // Premium Seeker Card Styles
  premiumSeekerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#f0f5fc',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  premiumSeekerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumSeekerIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#f0f5fc',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumSeekerTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  premiumSeekerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  premiumSeekerSub: {
    fontSize: 12,
    color: '#0035a0',
    marginTop: 2,
    fontWeight: '800',
  },
  premiumSeekerBenefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  premiumSeekerBenefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  premiumSeekerBenefitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 6,
  },
  premiumSeekerBtn: {
    backgroundColor: '#0035a0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  premiumSeekerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 8,
  },

  // Job List Styles
  premiumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#eef2f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMain: { flexDirection: 'row' },
  cardLogoContainer: { position: 'relative', marginRight: 10 },
  cardLogoInner: {
    width: 44,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  fullImage: { width: '100%', height: '100%' },
  cardVerifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981', // Premium green verified color
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 6 },
  cardTypeChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cardTypeChipText: { fontSize: 8, fontWeight: '800', color: '#0035a0', textTransform: 'uppercase' },
  cardCompanyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  cardCompany: { fontSize: 12, fontWeight: '600', color: '#64748b', marginRight: 6 },
  cardStatusBadge: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 },
  cardStatusText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center' },
  cardMetaText: { fontSize: 10, color: '#64748b', marginLeft: 3, fontWeight: '600' },
  cardMetaDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#cbd5e1', marginHorizontal: 6 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardSalaryContainer: { flexDirection: 'column' },
  cardSalaryLabel: { fontSize: 8, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSalaryValue: { fontSize: 12, fontWeight: '800', color: '#1e293b', marginTop: 0 },
  salaryTypeSuffix: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5fc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cardActionText: { fontSize: 11, fontWeight: '800', color: '#0035a0', marginRight: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyStateText: { marginTop: 10, fontSize: 14, color: '#94A3B8', fontWeight: '600' },

  // Premium Notification Cards Styling Enhancements
  topVisIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 10,
    gap: 4,
  },
  topVisText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  verifiedTextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6fbf3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 3,
    marginLeft: 6,
  },
  verifiedTextBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 0.3,
  },
  urgentHiringTag: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  urgentHiringTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#d97706',
  },
  premiumCardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#2563eb',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumCardActionText: {
    fontSize: 11,
    fontWeight: '900',
    color: 'white',
  },

  // Ask Pincode Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, minHeight: 380 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  modalForm: { gap: 15 },
  modalSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '500', lineHeight: 18, marginBottom: 10 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
  textInput: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 15, height: 50, fontSize: 16 },
  saveBtn: { backgroundColor: '#0035a0', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  selectedPincodeInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dcfce7', padding: 12, borderRadius: 12, marginTop: 5 },
  selectedPincodeText: { fontSize: 14, fontWeight: 'bold', color: '#166534' },

  // Pincode Suggestions Styles
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    maxHeight: 180,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: {
    fontSize: 14,
    color: '#334155',
  },
  // Social Media Feed Styles - Government Jobs
  socialMediaFeedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  socialMediaHeroImage: {
    width: '100%',
    height: 420,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  whatsappActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  whatsappButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  socialMediaJobTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
    lineHeight: 22,
  },
  profileHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#0035a0',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  profileHeaderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  profileHeaderPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#f0f5fc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderInitial: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0035a0',
  },
  profileActiveDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // ─── Premium Post Job CTA Styles ────────────────────────────────────────────
  premiumPostJobCard: {
    borderRadius: 20,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  postJobCircleOverlay1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -40,
    right: -45,
  },
  postJobCircleOverlay2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -20,
    left: -20,
  },
  postJobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  postJobIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumPostJobTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.3,
  },
  premiumPostJobSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  premiumPostJobBtn: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumPostJobBtnText: {
    color: '#0035a0',
    fontSize: 13,
    fontWeight: '800',
  },

  // ─── Premium Header & Search Styles ─────────────────────────────────────────
  headerContainerBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backArrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuArrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 1.5,
    backgroundColor: 'white',
    position: 'relative',
  },
  headerGreetingBlock: {
    marginBottom: 14,
  },
  mockSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#eff2f6',
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 14,
    paddingVertical: 4,
    height: 46,
  },
  mockSearchText: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  mockSearchRightBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0035a0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0035a0',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  homeGovtDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    marginHorizontal: 16,
    gap: 6,
  },
  homeGovtDisclaimerText: {
    flex: 1,
    fontSize: 11.5,
    color: '#7F1D1D',
    lineHeight: 16,
    fontWeight: '500',
  },
});

export default JobsHomeScreen;
