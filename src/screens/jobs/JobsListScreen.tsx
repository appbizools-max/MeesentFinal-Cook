import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
  Modal,
  Dimensions,
  ScrollView,
  Linking,
  Share
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../../services/firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import JobsSidebar from '../../components/JobsSidebar';
import PremiumLockModal from '../../components/PremiumLockModal';
import { useJobCategories } from '../../hooks/useDynamicCategories';

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

const AP_DISTRICTS = [
  'Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool',
  'Prakasam', 'Srikakulam', 'Sri Potti Sriramulu Nellore', 'Visakhapatnam',
  'Vizianagaram', 'West Godavari', 'YSR Kadapa', 'Parvathipuram Manyam',
  'Alluri Sitharama Raju', 'Anakapalli', 'Kakinada', 'Konaseema', 'Eluru',
  'NTR', 'Bapatla', 'Palnadu', 'Nandyal', 'Sri Sathya Sai', 'Annamayya', 'Tirupati'
];

const TELANGANA_DISTRICTS = [
  'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial',
  'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy',
  'Karimnagar', 'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar',
  'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
  'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Ranga Reddy',
  'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
];

const ALL_LOCATIONS = ['All Locations', ...AP_DISTRICTS, ...TELANGANA_DISTRICTS].sort((a, b) => {
  if (a === 'All Locations') return -1;
  if (b === 'All Locations') return 1;
  return a.localeCompare(b);
});

// JOB_CATEGORIES now loaded dynamically from Firestore via useJobCategories hook

const JOB_TYPES = ['All Types', 'Full Time', 'Part Time', 'Contract', 'Freelance', 'Internship', 'Work From Home'];
const EXPERIENCE_RANGES = ['All Experience', 'Fresher', '1-2 Years', '2-5 Years', '5+ Years'];

export default function JobsListScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { width } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const { category } = route?.params || { category: 'Private Jobs' };

  // Dynamic categories from Firestore (falls back to hardcoded if unavailable)
  const { categories: JOB_CATEGORIES } = useJobCategories();

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userDistrict, setUserDistrict] = useState<string>('');
  const [hasSetDefaultLocation, setHasSetDefaultLocation] = useState(false);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All Categories');
  const [selectedGovtFilter, setSelectedGovtFilter] = useState<string>(''); // Government sub-filter: '', 'All Govt', 'Paperkey', 'Hall Ticket', 'Result'

  // Canonical Category Helper to keep filtering language-agnostic
  const getCanonicalCategory = useCallback((inputCategory: string): string => {
    if (!inputCategory) return 'Private Jobs';
    const c = inputCategory.trim().toLowerCase();

    // Direct matches against active locale strings
    const currentPrivateJob = (t('jobs.private_jobs') || '').toLowerCase();
    const currentSidebarPrivateJob = (t('sidebar.private_jobs') || '').toLowerCase();
    const currentCentralGovt = (t('jobs.central_govt') || '').toLowerCase();
    const currentSidebarCentralGovt = (t('sidebar.central_govt_jobs') || '').toLowerCase();
    const currentStateGovt = (t('jobs.state_govt') || '').toLowerCase();
    const currentSidebarStateGovt = (t('sidebar.state_govt_jobs') || '').toLowerCase();

    if (c === currentCentralGovt || c === currentSidebarCentralGovt) return 'Central Govt';
    if (c === currentStateGovt || c === currentSidebarStateGovt) return 'State Govt';
    if (c === currentPrivateJob || c === currentSidebarPrivateJob) return 'Private Jobs';

    // Central Govt
    if (
      c === 'central govt' ||
      c === 'central_govt' ||
      c.includes('central') ||
      c.includes('కేంద్ర') ||
      c.includes('केंद्र') ||
      c.includes('ಕೇಂದ್ರ')
    ) {
      return 'Central Govt';
    }

    // State Govt
    if (
      c === 'state govt' ||
      c === 'state_govt' ||
      c.includes('state') ||
      c.includes('రాష్ట్ర') ||
      c.includes('राज्य') ||
      c.includes('ರಾಜ್ಯ')
    ) {
      return 'State Govt';
    }

    // All Govt
    if (
      c === 'all govt' ||
      c === 'govt' ||
      c.includes('government') ||
      c.includes('ప్రభుత్వ') ||
      c.includes('सरकार') ||
      c.includes('ಸರ್ಕಾರ')
    ) {
      return 'All Govt';
    }

    // Private Jobs (includes Hindi 'निजी', Telugu 'ప్రైవేట్', Kannada 'ಖಾಸಗಿ', Hindi 'प्राइवेट')
    if (
      c === 'private jobs' ||
      c === 'private' ||
      c.includes('private') ||
      c.includes('निजी') ||
      c.includes('ప్రైవేట్') ||
      c.includes('प्राइवेट') ||
      c.includes('ಖಾಸಗಿ')
    ) {
      return 'Private Jobs';
    }

    // All Categories / All Jobs
    if (
      c === 'all categories' ||
      c === 'all jobs' ||
      c === 'view all' ||
      c === 'all' ||
      c.includes('అన్ని') ||
      c.includes('सभी') ||
      c.includes('ಎಲ್ಲಾ')
    ) {
      return 'All Categories';
    }

    return inputCategory;
  }, [t]);

  const getDisplayCategoryTitle = (cat: string) => {
    const canonical = getCanonicalCategory(cat);
    if (canonical === 'Central Govt') return t('jobs.central_govt') || 'Central Govt';
    if (canonical === 'State Govt') return t('jobs.state_govt') || 'State Govt';
    if (canonical === 'Private Jobs') return t('jobs.private_jobs') || 'Private Jobs';
    if (canonical === 'All Categories' || canonical === 'All Jobs') return t('jobs_list.search_title') || 'Search Jobs';
    return cat;
  };

  // Set category filter when category prop changes
  useEffect(() => {
    if (category && category !== 'View all' && category !== 'All Jobs' && category !== 'All Categories') {
      const canonical = getCanonicalCategory(category);
      setSelectedCategoryFilter(canonical);

      // Reset type and experience filters for government categories
      if (canonical === 'Central Govt' || canonical === 'State Govt' || canonical === 'All Govt') {
        setSelectedType('All Types');
        setSelectedExperience('All Experience');
        setSelectedGovtFilter('');
      }
    } else {
      // Default to Private Jobs when no specific category given
      setSelectedCategoryFilter('Private Jobs');
    }
  }, [category, t, getCanonicalCategory]);

  const [seekerPlanActive, setSeekerPlanActive] = useState<boolean>(false);
  const [seekerPlanExpiry, setSeekerPlanExpiry] = useState<any>(null);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockedJobData, setLockedJobData] = useState<any>(null);

  const handleJobPress = (clickedJob: any) => {
    const isPremium = seekerPlanActive && seekerPlanExpiry && (seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : new Date(seekerPlanExpiry)) > new Date();

    const isSalaryOver20k = () => {
      if (!clickedJob) return false;
      if (clickedJob.isPremiumJobSeekerOnly === true || clickedJob.requiresPremium === true) return true;
      if (clickedJob.minSalary !== undefined && clickedJob.minSalary !== null && !isNaN(Number(clickedJob.minSalary))) {
        return Number(clickedJob.minSalary) >= 20000;
      }
      if (!clickedJob.salary) return false;
      try {
        const salStr = clickedJob.salary.toString().toLowerCase();
        const rangeMatch = salStr.match(/^₹?\s*(\d+[\d,]*)\s*(?:k)?\s*[-–to]/i);
        if (rangeMatch) {
          let minVal = parseInt(rangeMatch[1].replace(/,/g, ''), 10);
          if (salStr.includes('k') && minVal < 1000) minVal *= 1000;
          return minVal >= 20000;
        }
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

  // Fetch user details from Firestore in real-time
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const unsubscribeUser = onSnapshot(doc(db, 'users', userId), (userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        const city = data?.city || '';
        if (city) {
          setUserCity(city);
          setUserDistrict(city.toLowerCase());
        }
        setSeekerPlanActive(data?.seekerPlanActive || false);
        setSeekerPlanExpiry(data?.seekerPlanExpiry || null);
      }
    }, (error) => {
      console.error('Error listening to user doc:', error);
    });
    return () => unsubscribeUser();
  }, []);

  // Auto-set location to user's city as the default when loaded
  useEffect(() => {
    if (userCity && !hasSetDefaultLocation) {
      setSelectedLocation(userCity);
      setHasSetDefaultLocation(true);
    }
  }, [userCity, hasSetDefaultLocation]);
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [selectedExperience, setSelectedExperience] = useState<string>('All Experience');

  const canonicalCategory = getCanonicalCategory(selectedCategoryFilter);

  // Check if current category is a government job category (admin panel only)
  const isGovernmentCategory = canonicalCategory === 'Central Govt' || canonicalCategory === 'State Govt' || canonicalCategory === 'All Govt';
  const isPrivateCategory = canonicalCategory === 'Private Jobs';

  // Modal Visibility States
  const [filterModal, setFilterModal] = useState<'' | 'location' | 'category' | 'type' | 'experience'>('');
  const [searchDistrictQuery, setSearchDistrictQuery] = useState('');
  const [selectedState, setSelectedState] = useState<'Andhra Pradesh' | 'Telangana' | null>(null);


  useEffect(() => {
    // Listen to all active jobs real-time
    const q = query(collection(db, 'jobs'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allJobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const visibleSortedJobs = allJobs
        .filter((j: any) => {
          if (j.status === 'Hidden' || j.status === 'Inactive') return false;

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
        })
        .sort((a: any, b: any) => {
          const isUserPremium = seekerPlanActive && seekerPlanExpiry && (seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : new Date(seekerPlanExpiry)) > new Date();
          if (isUserPremium) {
            if (a.isUrgentHiring && !b.isUrgentHiring) return -1;
            if (!a.isUrgentHiring && b.isUrgentHiring) return 1;
          }

          const getDistrict = (loc: string) => (loc || '').split(',')[0].trim().toLowerCase();
          const aDistrict = getDistrict(a.location);
          const bDistrict = getDistrict(b.location);
          const aInDistrict = userDistrict && (aDistrict.includes(userDistrict) || userDistrict.includes(aDistrict));
          const bInDistrict = userDistrict && (bDistrict.includes(userDistrict) || userDistrict.includes(bDistrict));

          // Priority 1: Top Visibility + user's district → absolute top
          if (a.isTopVisibility && aInDistrict && !(b.isTopVisibility && bInDistrict)) return -1;
          if (b.isTopVisibility && bInDistrict && !(a.isTopVisibility && aInDistrict)) return 1;

          // Priority 2: Any Top Visibility
          if (a.isTopVisibility && !b.isTopVisibility) return -1;
          if (!a.isTopVisibility && b.isTopVisibility) return 1;

          // Priority 3: User's district jobs first
          if (aInDistrict && !bInDistrict) return -1;
          if (!aInDistrict && bInDistrict) return 1;

          // Priority 4: Date descending
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });

      setJobs(visibleSortedJobs);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Error fetching jobs:", error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [userDistrict, seekerPlanActive, seekerPlanExpiry]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const currentUserId = auth.currentUser?.uid;

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

  // Fuzzy district match helper (same logic as Recent Notifications)
  const districtMatches = (jobLocation: string, targetDistrict: string): boolean => {
    if (!targetDistrict) return true; // no filter set, show all
    return citiesMatch(jobLocation, targetDistrict);
  };

  const filteredJobs = jobs.filter(job => {
    // 1. Search Query Filter
    const matchesSearch = searchQuery === '' ||
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const selectedLocationLower = selectedLocation?.toLowerCase() || '';
    const selectedLocationBase = selectedLocationLower ? selectedLocationLower.split(',')[0].trim() : '';

    // 2. Location Filter
    // For Private Jobs: always show own jobs + fuzzy district match
    let matchesLocation: boolean;
    if (isGovernmentCategory) {
      matchesLocation = true; // govt jobs are national, no location filter
    } else if (selectedLocation === 'All Locations') {
      matchesLocation = true;
    } else if (isPrivateCategory && currentUserId && job.postedBy === currentUserId) {
      matchesLocation = true; // always show own posted jobs
    } else {
      // Use fuzzy district match (same as Recent Notifications)
      const districtFilter = selectedLocationBase || selectedLocationLower;
      matchesLocation = districtMatches(job.location || '', districtFilter);
    }

    // 3. Category Filter
    let matchesCategory = selectedCategoryFilter === 'All Categories' || selectedCategoryFilter === 'All Jobs';

    if (selectedGovtFilter === 'All Govt') {
      if (job.category) {
        const jobCat = job.category.toLowerCase().trim();
        matchesCategory = jobCat.includes('central') || jobCat.includes('state') || jobCat.includes('govt') || jobCat.includes('government');
      }
    } else if (job.category) {
      const jobCategory = job.category.toLowerCase().trim();
      const filterCategory = selectedCategoryFilter.toLowerCase().trim();

      if (filterCategory === 'central govt') {
        matchesCategory = jobCategory.includes('central');
      } else if (filterCategory === 'state govt') {
        matchesCategory = jobCategory.includes('state') && !jobCategory.includes('central');
      } else if (filterCategory === 'all govt' || (isGovernmentCategory && (filterCategory === 'all categories' || filterCategory === 'all jobs'))) {
        matchesCategory = jobCategory.includes('central') ||
          jobCategory.includes('state') ||
          jobCategory.includes('govt') ||
          jobCategory.includes('government');
      } else if (filterCategory === 'private jobs') {
        matchesCategory = job.source === 'User' || jobCategory.includes('private') || (!jobCategory.includes('govt') && !jobCategory.includes('central') && !jobCategory.includes('state'));
      } else if (!matchesCategory) {
        matchesCategory = jobCategory === filterCategory || jobCategory.includes(filterCategory);
      }
    }

    // 3.1. Source Filter
    let matchesSource = true;
    if (isGovernmentCategory && matchesCategory) {
      matchesSource = job.source === 'Admin' || job.source === 'User' || !job.source;
    } else if (isPrivateCategory && matchesCategory) {
      matchesSource = job.source === 'User' || job.source !== 'Admin';
    }

    // 3.2. Government Sub-Filter (Paperkey, Result, Jobs)
    let matchesGovtFilter = true;
    if (isGovernmentCategory && selectedGovtFilter !== 'All') {
      const jobType = (job.jobType || job.type || '').toLowerCase();
      const filterType = selectedGovtFilter.toLowerCase();
      if (filterType === 'paperkey') {
        matchesGovtFilter = jobType.includes('paper') || jobType.includes('key') || jobType.includes('exam');
      } else if (filterType === 'result') {
        matchesGovtFilter = jobType.includes('result') || jobType.includes('outcome');
      } else if (filterType === 'hall ticket') {
        matchesGovtFilter = jobType.includes('hall ticket') || jobType.includes('admit card');
      } else if (filterType === 'jobs') {
        const isPaperKey = jobType.includes('paper') || jobType.includes('key') || jobType.includes('exam');
        const isResult = jobType.includes('result') || jobType.includes('outcome');
        const isHallTicket = jobType.includes('hall ticket') || jobType.includes('admit card');
        matchesGovtFilter = !isPaperKey && !isResult && !isHallTicket;
      }
    }

    // 4. Job Type Filter - Skip for government categories
    let matchesType = true;
    if (!isGovernmentCategory) {
      matchesType = selectedType === 'All Types' ||
        (job.jobType && job.jobType.toLowerCase() === selectedType.toLowerCase());
    }

    // 5. Work Experience Filter - Skip for government categories
    let matchesExperience = selectedExperience === 'All Experience';
    if (!matchesExperience && job.experience) {
      const expStr = job.experience.toLowerCase();
      if (selectedExperience === 'Fresher') {
        matchesExperience = expStr.includes('fresh') || expStr.includes('0') || expStr.includes('no');
      } else if (selectedExperience === '1-2 Years') {
        matchesExperience = expStr.includes('1') || expStr.includes('2');
      } else if (selectedExperience === '2-5 Years') {
        matchesExperience = expStr.includes('2') || expStr.includes('3') || expStr.includes('4') || expStr.includes('5');
      } else if (selectedExperience === '5+ Years') {
        matchesExperience = expStr.includes('5') || expStr.includes('6') || expStr.includes('7') || expStr.includes('8') || expStr.includes('9') || expStr.includes('10');
      }
    }

    return matchesSearch && matchesLocation && matchesCategory && matchesSource && matchesGovtFilter && matchesType && matchesExperience;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'Expired') return { label: t('jobs_list.closed'), color: '#EF4444' };
    if (status === 'Soon') return { label: t('jobs_list.ending_soon'), color: '#F59E0B' };
    return { label: t('jobs_list.active'), color: '#10B981' };
  };

  const renderJobItem = ({ item }: any) => {
    const badge = getStatusBadge(item.status);

    // Special layout for government jobs - social-media style feed with high-fidelity badges and apply links
    if (isGovernmentCategory) {
      const applyUrl = item.applyUrl || item.applyLink || item.url || '';
      const rawPhoneNumber = item.whatsappNumber || item.contactNumber || '';
      const subCategoryTag = item.subCategory || item.jobSubCategory || item.jobType || 'Job';

      return (
        <View style={styles.socialMediaFeedCard}>
          {/* Header Badges Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <View style={{ backgroundColor: '#0035a0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>{item.category || selectedCategoryFilter}</Text>
              </View>
              {subCategoryTag ? (
                <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' }}>
                  <Text style={{ color: '#1d4ed8', fontSize: 11, fontWeight: '700' }}>{subCategoryTag}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Large Hero Image - Landscape Banner */}
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.socialMediaHeroImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.socialMediaHeroImage, { backgroundColor: '#0035a0', justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginVertical: 8, height: 130 }]}>
              <LinearGradient colors={['#0035a0', '#002166']} style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 12, padding: 16 }}>
                <Ionicons name="newspaper-outline" size={36} color="rgba(255,255,255,0.85)" />
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800', marginTop: 6, textAlign: 'center' }}>
                  {item.category ? item.category.toUpperCase() : 'OFFICIAL GOVT RECRUITMENT'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2, textAlign: 'center' }}>
                  Official Recruitment Notification & Apply Portal
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* Job Title - Bold Typography */}
          <Text style={styles.socialMediaJobTitle}>{item.title}</Text>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.whatsappActionButton, { backgroundColor: '#2563eb', borderColor: '#1d4ed8' }]}
              onPress={() => {
                if (applyUrl) {
                  Linking.openURL(applyUrl);
                } else {
                  const formattedPhone = rawPhoneNumber.replace(/\D/g, '');
                  const phoneNumber = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;
                  if (phoneNumber) {
                    const message = `Hello, please provide the official link / details for "${item.title}".`;
                    Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`);
                  } else {
                    Alert.alert('Official Link', 'Official website link will be updated shortly.');
                  }
                }
              }}
            >
              <Ionicons name="globe-outline" size={14} color="#ffffff" />
              <Text style={[styles.whatsappButtonText, { color: '#ffffff' }]}>Get Official Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.whatsappActionButton, { backgroundColor: '#16a34a', borderColor: '#15803d' }]}
              onPress={() => {
                const formattedPhone = rawPhoneNumber.replace(/\D/g, '');
                const phoneNumber = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;
                const message = `Hello, I need help applying for "${item.title}". Please guide me.`;
                if (phoneNumber) {
                  Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`);
                } else {
                  Alert.alert('Info', 'No WhatsApp number attached to this post.');
                }
              }}
            >
              <Ionicons name="logo-whatsapp" size={14} color="#ffffff" />
              <Text style={[styles.whatsappButtonText, { color: '#ffffff' }]}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.whatsappActionButton, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}
              onPress={() => handleShare(item)}
            >
              <Ionicons name="share-social-outline" size={14} color="#334155" />
              <Text style={[styles.whatsappButtonText, { color: '#334155' }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Standard layout for private jobs
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.premiumCard,
          item.status === 'Expired' && { opacity: 0.6 },
          item.isTopVisibility && { borderColor: '#bfdbfe', backgroundColor: '#fafcff' }
        ]}
        onPress={() => handleJobPress(item)}
      >
        {/* Top visibility status indicator */}
        {item.isTopVisibility && (
          <View style={styles.topVisIndicator}>
            <Ionicons name="sparkles" size={10} color="#3b82f6" />
            <Text style={styles.topVisText}>FEATURED JOB</Text>
          </View>
        )}

        <View style={styles.cardMain}>
          {/* Company Logo Inner Block */}
          <View style={styles.cardLogoContainer}>
            <View style={[styles.cardLogoInner, item.isTopVisibility && { borderColor: '#bfdbfe' }]}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.fullImage} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name="briefcase-variant-outline" size={24} color="#3b82f6" />
              )}
            </View>
            {(isJobGenuine(item) || item.isVerified) && (
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
                  {item.title}
                </Text>
                <View style={styles.cardCompanyRow}>
                  <Text style={styles.cardCompany} numberOfLines={1}>
                    {item.company || 'Private Recruiter'}
                  </Text>
                  {(isJobGenuine(item) || item.isVerified) && (
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
                    {item.jobType || item.type || 'Full Time'}
                  </Text>
                </View>
                {item.isUrgentHiring && (
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
                  {item.location?.split(',')[0]}
                </Text>
              </View>
              <View style={styles.cardMetaDivider} />
              <View style={styles.cardMetaItem}>
                <Ionicons name="briefcase" size={12} color="#f59e0b" />
                <Text style={[styles.cardMetaText, { color: '#475569' }]}>
                  {item.experience || t('jobs_list.fresher')}
                </Text>
              </View>
              {item.vacancies ? (
                <>
                  <View style={styles.cardMetaDivider} />
                  <View style={styles.cardMetaItem}>
                    <Ionicons name="people" size={12} color="#10b981" />
                    <Text style={[styles.cardMetaText, { color: '#475569' }]}>
                      {item.vacancies} {item.vacancies === 1 ? 'Vacancy' : 'Vacancies'}
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
              {item.salary || t('jobs_list.negotiable')}
              {item.salaryType ? (
                <Text style={styles.salaryTypeSuffix}>
                  {(() => {
                    const lower = item.salaryType.toLowerCase();
                    if (lower.includes('month')) return ' / Month';
                    if (lower.includes('year')) return ' / Year';
                    if (lower.includes('hour')) return ' / Hour';
                    if (lower.includes('day')) return ' / Day';
                    if (lower.includes('project')) return ' / Project';
                    return ` / ${item.salaryType}`;
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
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedLocation !== 'All Locations') count++;
    if (selectedCategoryFilter !== 'All Categories' && selectedCategoryFilter !== 'All Jobs') count++;
    if (selectedType !== 'All Types') count++;
    if (selectedExperience !== 'All Experience') count++;
    return count;
  };

  const clearFilters = () => {
    setSelectedLocation(userCity || 'All Locations');
    setSelectedCategoryFilter('All Categories');
    setSelectedType('All Types');
    setSelectedExperience('All Experience');
    setSelectedGovtFilter('All');
    setSearchQuery('');
  };

  const listHeaderJSX = (
    <View style={{ backgroundColor: 'white', paddingBottom: 4 }}>
      {/* Header - Reduced height, cleaner design */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {getDisplayCategoryTitle(selectedCategoryFilter)}
            </Text>
            <Text style={styles.headerSubtitle}>{filteredJobs.length} {t('jobs_list.vacancies')}</Text>
          </View>
        </View>

        {/* Info (i) Button for Government Jobs */}
        {isGovernmentCategory && (
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => navigation.navigate('GovtJobInfo')}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={22} color="#0035a0" />
          </TouchableOpacity>
        )}
      </View>

      {/* Standalone Search Bar with Reduced Height */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#0035a0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('jobs_list.search_placeholder')}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Unified Filter Card Box */}
      <View style={styles.unifiedFilterContainer}>
        <View style={[styles.unifiedFilterCard, isGovernmentCategory && styles.flatFilterCard]}>
          {/* Bottom Row: Controls */}
          {isGovernmentCategory ? (
            <View style={styles.unifiedBottomRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContentInline}>
                {/* Clear All action if active */}
                {(selectedLocation !== 'All Locations' || selectedGovtFilter !== 'All' || searchQuery !== '') && (
                  <TouchableOpacity
                    style={[styles.filterPillInline, { backgroundColor: '#a9c1f2ff', borderColor: '#779be9ff' }]}
                    onPress={clearFilters}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillTextInline, { color: '#ffffffff' }]}>Clear All</Text>
                  </TouchableOpacity>
                )}

                {/* Category selector tag */}
                <TouchableOpacity
                  style={[styles.filterPillInline, styles.activePillInline]}
                  onPress={() => setFilterModal('category')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="grid" size={12} color="white" style={{ marginRight: 4 }} />
                  <Text style={[styles.pillTextInline, styles.activePillTextInline]} numberOfLines={1}>{getDisplayCategoryTitle(selectedCategoryFilter)}</Text>
                  <Ionicons name="chevron-down" size={10} color="white" style={{ marginLeft: 2 }} />
                </TouchableOpacity>


                {/* Segmented Control for Govt Sub-filters rendered as matching chips */}
                {[
                  { id: 'All Govt', label: 'All Govt' },
                  { id: 'Paperkey', label: 'Answer Keys' },
                  { id: 'Hall Ticket', label: 'Hall Tickets' },
                  { id: 'Result', label: 'Results' }
                ].map(chip => (
                  <TouchableOpacity
                    key={chip.id}
                    style={[
                      styles.filterPillInline,
                      selectedGovtFilter === chip.id && styles.activePillInline
                    ]}
                    onPress={() => setSelectedGovtFilter(selectedGovtFilter === chip.id ? '' : chip.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.pillTextInline,
                      selectedGovtFilter === chip.id && styles.activePillTextInline
                    ]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            /* Non-govt category controls */
            <View style={styles.unifiedBottomRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContentInline}>
                {/* Clear All pill */}
                {(selectedLocation !== 'All Locations' || (selectedCategoryFilter !== 'All Categories' && selectedCategoryFilter !== 'All Jobs') || selectedType !== 'All Types' || selectedExperience !== 'All Experience') && (
                  <TouchableOpacity
                    style={[styles.filterPillInline, { backgroundColor: '#a9c1f2ff', borderColor: '#779be9ff' }]}
                    onPress={clearFilters}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillTextInline, { color: '#ffffffff' }]}>Clear All</Text>
                  </TouchableOpacity>
                )}

                {/* Location pill */}
                <TouchableOpacity
                  style={[styles.filterPillInline, selectedLocation !== 'All Locations' && styles.activePillInline]}
                  onPress={() => setFilterModal('location')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillTextInline, selectedLocation !== 'All Locations' && styles.activePillTextInline]}>
                    {selectedLocation}
                  </Text>
                  <Ionicons name="chevron-down" size={10} color={selectedLocation !== 'All Locations' ? 'white' : '#0035a0'} />
                </TouchableOpacity>

                {/* Category pill */}
                <TouchableOpacity
                  style={[styles.filterPillInline, selectedCategoryFilter !== 'All Categories' && selectedCategoryFilter !== 'All Jobs' && styles.activePillInline]}
                  onPress={() => setFilterModal('category')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillTextInline, selectedCategoryFilter !== 'All Categories' && selectedCategoryFilter !== 'All Jobs' && styles.activePillTextInline]}>
                    {getDisplayCategoryTitle(selectedCategoryFilter)}
                  </Text>
                  <Ionicons name="chevron-down" size={10} color={selectedCategoryFilter !== 'All Categories' && selectedCategoryFilter !== 'All Jobs' ? 'white' : '#0035a0'} />
                </TouchableOpacity>

                {/* Job Type pill */}
                <TouchableOpacity
                  style={[styles.filterPillInline, selectedType !== 'All Types' && styles.activePillInline]}
                  onPress={() => setFilterModal('type')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillTextInline, selectedType !== 'All Types' && styles.activePillTextInline]}>
                    {selectedType}
                  </Text>
                  <Ionicons name="chevron-down" size={10} color={selectedType !== 'All Types' ? 'white' : '#0035a0'} />
                </TouchableOpacity>

                {/* Experience pill */}
                <TouchableOpacity
                  style={[styles.filterPillInline, selectedExperience !== 'All Experience' && styles.activePillInline]}
                  onPress={() => setFilterModal('experience')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillTextInline, selectedExperience !== 'All Experience' && styles.activePillTextInline]}>
                    {selectedExperience}
                  </Text>
                  <Ionicons name="chevron-down" size={10} color={selectedExperience !== 'All Experience' ? 'white' : '#0035a0'} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Warning Alert Banner for Private Jobs */}
      {isPrivateCategory && (
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={18} color="#059669" style={{ marginRight: 6 }} />
          <Text style={styles.warningBannerText}>
            Please do not pay any money to get a job through this app. Beware of fake job offers and fraudulent recruiters !
          </Text>
        </View>
      )}

      {/* Disclaimer Banner for Government Jobs */}
      {isGovernmentCategory && (
        <View style={[styles.warningBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" style={{ marginRight: 6 }} />
          <Text style={[styles.warningBannerText, { color: '#991B1B' }]}>
            MEESENT is not an official government app and has no government affiliation. Job info is gathered from public official portals. Please verify details on official websites before applying.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <FlatList
        data={filteredJobs}
        renderItem={renderJobItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={listHeaderJSX}
        contentContainerStyle={{ ...styles.listContent, paddingBottom: 40 + insets.bottom, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0035a0']}
            tintColor="#0035a0"
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={[styles.loaderContainer, { paddingVertical: 50 }]}>
              <ActivityIndicator size="large" color="#0035a0" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="text-box-search-outline" size={60} color="#E2E8F0" />
              <Text style={styles.emptyText}>
                {isGovernmentCategory
                  ? "No government job listings available. These are managed by admin panel."
                  : "No job listings match your active filters."}
              </Text>
            </View>
          )
        }
      />

      {/* Filter Selection Modal (Centered Popup) */}
      <Modal visible={filterModal !== ''} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setFilterModal('');
              setSelectedState(null);
              setSearchDistrictQuery('');
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {filterModal === 'location' && selectedState !== null ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedState(null);
                      setSearchDistrictQuery('');
                    }}
                    style={styles.modalBackBtn}
                  >
                    <Ionicons name="arrow-back" size={18} color="#1e293b" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.modalIconBadge}>
                    <Ionicons
                      name={filterModal === 'location' ? 'location-sharp' : filterModal === 'category' ? 'grid' : 'options'}
                      size={18}
                      color="#2563EB"
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {filterModal === 'location'
                      ? (selectedState === null ? 'Select State' : `${selectedState} Districts`)
                      : `Select ${filterModal === 'category' ? 'Job Category' : filterModal === 'type' ? 'Job Type' : 'Experience'}`
                    }
                  </Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {filterModal === 'location'
                      ? (selectedState === null ? 'Filter jobs by state or region' : `Select district in ${selectedState}`)
                      : 'Choose an option to filter jobs'
                    }
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setFilterModal('');
                  setSelectedState(null);
                  setSearchDistrictQuery('');
                }}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalHeaderDivider} />

            {filterModal === 'location' && selectedState === null ? (
              /* Region Selection Screen */
              <View style={styles.stateSelectionContainer}>
                <Text style={styles.stateHelpText}>Select a region to choose the exact location:</Text>

                {/* Special "All Locations" Option */}
                <TouchableOpacity
                  style={[styles.allLocationsBtn, selectedLocation === 'All Locations' && styles.selectedAllLocationsBtn]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedLocation('All Locations');
                    setFilterModal('');
                  }}
                >
                  <Ionicons name="globe-outline" size={20} color={selectedLocation === 'All Locations' ? '#0035a0' : '#64748b'} />
                  <Text style={[styles.allLocationsText, selectedLocation === 'All Locations' && styles.selectedAllLocationsText]}>All Locations (Anywhere)</Text>
                  {selectedLocation === 'All Locations' && <Ionicons name="checkmark-circle" size={20} color="#0035a0" />}
                </TouchableOpacity>

                <View style={styles.stateCardsColumn}>
                  {/* Andhra Pradesh */}
                  <TouchableOpacity
                    style={[styles.stateWideCard, { borderColor: '#9dbff2', backgroundColor: '#f0f5fc' }]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedState('Andhra Pradesh')}
                  >
                    <View style={[styles.stateWideIconBox, { backgroundColor: '#0035a0' }]}>
                      <Ionicons name="map" size={24} color="white" />
                    </View>
                    <View style={styles.stateWideTextContent}>
                      <Text style={styles.stateWideTitle}>Andhra Pradesh</Text>
                      <Text style={styles.stateWideSub}>Explore 26 Districts</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#0035a0" />
                  </TouchableOpacity>

                  {/* Telangana */}
                  <TouchableOpacity
                    style={[styles.stateWideCard, { borderColor: '#ddd6fe', backgroundColor: '#f5f3ff' }]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedState('Telangana')}
                  >
                    <View style={[styles.stateWideIconBox, { backgroundColor: '#7c3aed' }]}>
                      <Ionicons name="location" size={24} color="white" />
                    </View>
                    <View style={styles.stateWideTextContent}>
                      <Text style={styles.stateWideTitle}>Telangana</Text>
                      <Text style={styles.stateWideSub}>Explore 33 Districts</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#7c3aed" />
                  </TouchableOpacity>

                  {/* Bangalore (Direct Select) */}
                  <TouchableOpacity
                    style={[styles.stateWideCard, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedLocation('Bangalore, Karnataka');
                      setFilterModal('');
                    }}
                  >
                    <View style={[styles.stateWideIconBox, { backgroundColor: '#16a34a' }]}>
                      <Ionicons name="business" size={24} color="white" />
                    </View>
                    <View style={styles.stateWideTextContent}>
                      <Text style={styles.stateWideTitle}>Bangalore</Text>
                      <Text style={styles.stateWideSub}>Karnataka (Direct Select)</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* Search field if Location Selector is active */}
                {filterModal === 'location' && selectedState !== null && (
                  <View style={styles.modalSearchContainer}>
                    <Ionicons name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder={`Search in ${selectedState}...`}
                      placeholderTextColor="#94a3b8"
                      value={searchDistrictQuery}
                      onChangeText={setSearchDistrictQuery}
                    />
                  </View>
                )}

                <FlatList
                  data={
                    filterModal === 'location' ? (selectedState === 'Andhra Pradesh' ? AP_DISTRICTS : TELANGANA_DISTRICTS).filter(loc => loc.toLowerCase().includes((searchDistrictQuery || '').toLowerCase())) :
                      filterModal === 'category' ? JOB_CATEGORIES :
                        filterModal === 'type' ? JOB_TYPES : EXPERIENCE_RANGES
                  }
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        (filterModal === 'location' && selectedLocation === item) && styles.selectedModalItem,
                        (filterModal === 'category' && selectedCategoryFilter === item) && styles.selectedModalItem,
                        (filterModal === 'type' && selectedType === item) && styles.selectedModalItem,
                        (filterModal === 'experience' && selectedExperience === item) && styles.selectedModalItem,
                      ]}
                      onPress={() => {
                        if (filterModal === 'location') setSelectedLocation(item);
                        if (filterModal === 'category') setSelectedCategoryFilter(item);
                        if (filterModal === 'type') setSelectedType(item);
                        if (filterModal === 'experience') setSelectedExperience(item);
                        setFilterModal('');
                        setSelectedState(null);
                        setSearchDistrictQuery('');
                      }}
                    >
                      <Text style={[
                        styles.modalItemText,
                        ((filterModal === 'location' && selectedLocation === item) ||
                          (filterModal === 'category' && selectedCategoryFilter === item) ||
                          (filterModal === 'type' && selectedType === item) ||
                          (filterModal === 'experience' && selectedExperience === item)) && styles.selectedModalItemText
                      ]}>{item}</Text>

                      {((filterModal === 'location' && selectedLocation === item) ||
                        (filterModal === 'category' && selectedCategoryFilter === item) ||
                        (filterModal === 'type' && selectedType === item) ||
                        (filterModal === 'experience' && selectedExperience === item)) ? (
                        <Ionicons name="checkmark-circle" size={20} color="#0035a0" />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 0,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f5fc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f5fc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#0035a0',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  clearFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f5fc',
    borderWidth: 1,
    borderColor: '#9dbff2'
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444'
  },
  adminInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5fc',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9dbff2',
  },
  adminInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C1752',
    marginLeft: 8,
  },
  searchBarContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5fc',
    borderWidth: 1,
    borderColor: '#9dbff2',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    paddingVertical: 0,
    height: '100%',
  },
  clearSearchBtn: {
    padding: 2,
  },
  unifiedFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    zIndex: 10,
  },
  unifiedFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#9dbff2',
    padding: 10,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  flatFilterCard: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    padding: 0,
  },
  unifiedBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  unifiedCategoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5fc',
    borderWidth: 1,
    borderColor: '#9dbff2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  unifiedCategoryTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0035a0',
    maxWidth: 90,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 2,
    flex: 1,
    justifyContent: 'space-between',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#0035a0',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  unifiedClearTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  unifiedClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  pillsContentInline: {
    gap: 8,
    alignItems: 'center',
  },
  filterPillInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5fc',
    borderWidth: 1,
    borderColor: '#9dbff2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  activePillInline: {
    backgroundColor: '#0035a0',
    borderColor: '#0035a0',
  },
  pillTextInline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0035a0',
  },
  activePillTextInline: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
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
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 8 },
  cardTypeChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cardTypeChipText: { fontSize: 8, fontWeight: '800', color: '#0035a0', textTransform: 'uppercase' },
  cardCompanyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  cardCompany: { fontSize: 12, fontWeight: '600', color: '#64748b', marginRight: 8 },
  cardStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  cardStatusText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center' },
  cardMetaText: { fontSize: 10, color: '#94a3b8', marginLeft: 4, fontWeight: '600' },
  cardMetaDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#cbd5e1', marginHorizontal: 6 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  cardSalaryContainer: { flexDirection: 'column' },
  cardSalaryLabel: { fontSize: 8, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSalaryValue: { fontSize: 12, fontWeight: '800', color: '#1e293b', marginTop: 1 },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5fc',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardActionText: { fontSize: 10, fontWeight: '800', color: '#0035a0', marginRight: 3 },

  // Social Media Feed Styles - Government Jobs
  socialMediaFeedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginHorizontal: 16,
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
  scrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  scrollIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0035a0',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    maxHeight: '82%',
    width: '100%',
    maxWidth: 390,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalIconBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', letterSpacing: -0.2 },
  modalSubtitle: { fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 1 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalBackBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  modalHeaderDivider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 14, marginHorizontal: -4 },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12
  },
  modalSearchInput: { flex: 1, fontSize: 13, color: '#1e293b' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedModalItem: { backgroundColor: '#f0f5fc', borderRadius: 8, paddingHorizontal: 10 },
  modalItemText: { fontSize: 14, color: '#334155', fontWeight: '600' },
  selectedModalItemText: { color: '#0035a0', fontWeight: 'bold' },

  stateSelectionContainer: { paddingVertical: 2 },
  stateHelpText: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 12 },
  stateCardsColumn: { flexDirection: 'column', gap: 10 },
  stateWideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  stateWideIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stateWideTextContent: { flex: 1 },
  stateWideTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  stateWideSub: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  allLocationsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 15,
    gap: 10
  },
  selectedAllLocationsBtn: {
    backgroundColor: '#f0f5fc',
    borderColor: '#0035a0',
  },
  allLocationsText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155'
  },
  selectedAllLocationsText: {
    color: '#0035a0'
  },

  // Premium Card Styling Enhancements (matched to home feed)
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
  salaryTypeSuffix: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  warningBannerText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
    flex: 1,
  },
});
