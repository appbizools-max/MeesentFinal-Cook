import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { ALL_CATEGORIES } from '../../data/categories';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../../services/firebase';
import { collection, query, where, onSnapshot, doc, getDocs, addDoc, getDoc } from 'firebase/firestore';
import { PINCODES } from '../../data/pincodes';
import { ActivityIndicator, Linking, Alert } from 'react-native';


const { width } = Dimensions.get('window');
const PRIMARY_COLOR = '#8eabeb';

const getCategoryTheme = (categoryId: string) => {
  const themes: { [key: string]: { bg: string, color: string } } = {
    daily_needs: { bg: '#eff6ff', color: '#2563eb' },
    food: { bg: '#fff7ed', color: '#ea580c' },
    automobile: { bg: '#f0fdfa', color: '#0d9488' },
    baby_care: { bg: '#fdf2f8', color: '#db2777' },
    banquets: { bg: '#faf5ff', color: '#7c3aed' },
    beauty: { bg: '#fff1f2', color: '#e11d48' },
    bills: { bg: '#f0fdf4', color: '#16a34a' },
    borewell: { bg: '#ecfeff', color: '#0891b2' },
    bulk_comm: { bg: '#eff6ff', color: '#3b82f6' },
    cake_shops: { bg: '#fff5f5', color: '#e53e3e' },
    caterers: { bg: '#fffbeb', color: '#d97706' },
    contractors: { bg: '#fef3c7', color: '#b45309' },
    consultants: { bg: '#f8fafc', color: '#475569' },
    decorators: { bg: '#fdf4ff', color: '#c084fc' },
    doctors: { bg: '#ecfdf5', color: '#059669' },
    event_organizers: { bg: '#faf5ff', color: '#9333ea' },
    florists: { bg: '#fdf2f8', color: '#ec4899' },
    housekeeping: { bg: '#f0fdfa', color: '#14b8a6' },
    interior_designers: { bg: '#fff7ed', color: '#f97316' },
    internet_digital: { bg: '#eff6ff', color: '#1d4ed8' },
    language_classes: { bg: '#f5f3ff', color: '#6d28d9' },
    modular_kitchen: { bg: '#fff7ed', color: '#c2410c' },
    packers_movers: { bg: '#fef2f2', color: '#dc2626' },
    party_services: { bg: '#fdf4ff', color: '#a855f7' },
    pest_control: { bg: '#fef3c7', color: '#d97706' },
    pet_care: { bg: '#f0fdf4', color: '#15803d' },
    pg_hostel: { bg: '#f5f3ff', color: '#5b21b6' },
    real_estate: { bg: '#ecfdf5', color: '#065f46' },
    rent_hire: { bg: '#fffbeb', color: '#b45309' },
    repairs_services: { bg: '#f1f5f9', color: '#334155' },
    security_cctv: { bg: '#fef2f2', color: '#991b1b' },
    training_institutes: { bg: '#eff6ff', color: '#1e40af' },
  };
  return themes[categoryId] || { bg: '#f1f5f9', color: '#475569' };
};

const RANDOM_ICONS = [
  { library: 'FontAwesome5', name: 'star' },
  { library: 'FontAwesome5', name: 'award' },
  { library: 'FontAwesome5', name: 'bookmark' },
  { library: 'FontAwesome5', name: 'gift' },
  { library: 'FontAwesome5', name: 'heart' },
  { library: 'FontAwesome5', name: 'compass' },
  { library: 'FontAwesome5', name: 'flag' },
  { library: 'FontAwesome5', name: 'tag' },
  { library: 'FontAwesome5', name: 'thumbs-up' },
  { library: 'FontAwesome5', name: 'check-circle' },
  { library: 'MaterialCommunityIcons', name: 'hexagon-outline' },
  { library: 'MaterialCommunityIcons', name: 'rhombus-outline' },
  { library: 'MaterialCommunityIcons', name: 'octagram-outline' },
  { library: 'MaterialCommunityIcons', name: 'certificate-outline' },
];

const getStableRandomIcon = (str: string, color: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % RANDOM_ICONS.length;
  const icon = RANDOM_ICONS[index];

  if (icon.library === 'MaterialCommunityIcons') {
    return <MaterialCommunityIcons name={icon.name as any} size={18} color={color} />;
  }
  return <FontAwesome5 name={icon.name} size={14} color={color} />;
};

const getSubCategoryIcon = (sub: string, color: string) => {
  const s = sub.toLowerCase().trim();

  // --- DAILY NEEDS / SERVICES / REPAIRS ---
  if (s.includes('ac ')) return <MaterialCommunityIcons name="air-conditioner" size={18} color={color} />;
  if (s.includes('refrigerator') || s.includes('fridge')) return <MaterialCommunityIcons name="fridge-outline" size={18} color={color} />;
  if (s.includes('washing machine')) return <MaterialCommunityIcons name="washing-machine" size={18} color={color} />;
  if (s.includes('purifier') || s.includes('filter')) return <MaterialCommunityIcons name="filter" size={18} color={color} />;
  if (s.includes('tv') || s.includes('television')) return <MaterialCommunityIcons name="television" size={18} color={color} />;
  if (s.includes('laptop') || s.includes('computer') || s.includes('hardware') || s.includes('computing') || s.includes('software') || s.includes('database')) {
    return <MaterialCommunityIcons name="laptop" size={18} color={color} />;
  }
  if (s.includes('mobile') || s.includes('cellphone') || s.includes('recharge')) return <MaterialCommunityIcons name="cellphone" size={18} color={color} />;
  if (s.includes('gas')) return <MaterialCommunityIcons name="gas-cylinder" size={18} color={color} />;

  if (s.includes('plumber') || s.includes('pipe') || s.includes('borewell')) return <MaterialCommunityIcons name="pipe" size={18} color={color} />;
  if (s.includes('electrician') || s.includes('flash') || s.includes('electricity') || s.includes('power') || s.includes('generator')) return <MaterialCommunityIcons name="flash" size={18} color={color} />;
  if (s.includes('carpenter') || s.includes('wood') || s.includes('furniture')) return <FontAwesome5 name="hammer" size={14} color={color} />;
  if (s.includes('painter') || s.includes('painting')) return <FontAwesome5 name="paint-roller" size={14} color={color} />;
  if (s.includes('clean') || s.includes('maid') || s.includes('housekeep') || s.includes('broom')) return <MaterialCommunityIcons name="broom" size={18} color={color} />;
  if (s.includes('pest') || s.includes('bug') || s.includes('termite') || s.includes('rodent') || s.includes('insect')) return <MaterialCommunityIcons name="bug" size={18} color={color} />;

  // --- MEDICAL / DOCTORS ---
  if (s.includes('ayur')) return <MaterialCommunityIcons name="leaf" size={18} color={color} />;
  if (s.includes('ortho') || s.includes('bone')) return <FontAwesome5 name="bone" size={14} color={color} />;
  if (s.includes('cardio') || s.includes('heart')) return <MaterialCommunityIcons name="heart-pulse" size={18} color={color} />;
  if (s.includes('chest') || s.includes('lung')) return <MaterialCommunityIcons name="lungs" size={18} color={color} />;
  if (s.includes('child') || s.includes('paediatrician') || s.includes('baby') || s.includes('babysitter')) return <FontAwesome5 name="baby" size={14} color={color} />;
  if (s.includes('dentist') || s.includes('tooth')) return <FontAwesome5 name="tooth" size={14} color={color} />;
  if (s.includes('derm') || s.includes('skin') || s.includes('hair') || s.includes('beauty') || s.includes('salon') || s.includes('spa') || s.includes('makeup') || s.includes('cosmetic') || s.includes('groom') || s.includes('parlour')) {
    return <MaterialCommunityIcons name="spa" size={18} color={color} />;
  }
  if (s.includes('diabet')) return <FontAwesome5 name="syringe" size={14} color={color} />;
  if (s.includes('ent spec')) return <MaterialCommunityIcons name="ear-hearing" size={18} color={color} />;
  if (s.includes('eye') || s.includes('ophthalm')) return <Ionicons name="eye" size={18} color={color} />;
  if (s.includes('gastro')) return <MaterialCommunityIcons name="hospital-box" size={18} color={color} />;
  if (s.includes('physiother') || s.includes('rehab')) return <Ionicons name="accessibility" size={18} color={color} />;
  if (s.includes('neurolog') || s.includes('neuro') || s.includes('psych')) return <MaterialCommunityIcons name="brain" size={18} color={color} />;
  if (s.includes('diag') || s.includes('test') || s.includes('lab') || s.includes('microscope')) return <FontAwesome5 name="microscope" size={14} color={color} />;
  if (s.includes('doctor') || s.includes('physician') || s.includes('surgeon')) return <FontAwesome5 name="user-md" size={14} color={color} />;

  // --- AUTOMOBILE ---
  if (s.includes('car repair') || s.includes('bike repair') || s.includes('auto accessories')) return <MaterialCommunityIcons name="car-cog" size={18} color={color} />;
  if (s.includes('motorcycle') || s.includes('bike') || s.includes('two-wheeler')) return <FontAwesome5 name="motorcycle" size={14} color={color} />;
  if (s.includes('car') || s.includes('vehicle') || s.includes('rental')) return <FontAwesome5 name="car" size={14} color={color} />;
  if (s.includes('driver')) return <MaterialCommunityIcons name="car-sports" size={18} color={color} />;
  if (s.includes('mover') || s.includes('pack') || s.includes('transport') || s.includes('truck') || s.includes('deliver') || s.includes('delivery') || s.includes('takeaway')) return <FontAwesome5 name="truck" size={14} color={color} />;

  // --- FOOD & RESTAURANTS ---
  if (s.includes('breakfast') || s.includes('egg')) return <MaterialCommunityIcons name="egg-fried" size={18} color={color} />;
  if (s.includes('lunch') || s.includes('dinner') || s.includes('cater')) return <MaterialCommunityIcons name="room-service" size={18} color={color} />;
  if (s.includes('biryani') || s.includes('pulao') || s.includes('rice')) return <MaterialCommunityIcons name="food-variant" size={18} color={color} />;
  if (s.includes('pizza')) return <MaterialCommunityIcons name="pizza" size={18} color={color} />;
  if (s.includes('burger')) return <MaterialCommunityIcons name="hamburger" size={18} color={color} />;
  if (s.includes('cake') || s.includes('bakery') || s.includes('sweet') || s.includes('dessert')) return <MaterialCommunityIcons name="cake" size={18} color={color} />;
  if (s.includes('coffee') || s.includes('cafe')) return <Ionicons name="cafe" size={18} color={color} />;
  if (s.includes('juice') || s.includes('shake') || s.includes('drink')) return <MaterialCommunityIcons name="glass-cocktail" size={18} color={color} />;
  if (s.includes('restaurant') || s.includes('food') || s.includes('cook') || s.includes('chef')) return <FontAwesome5 name="utensils" size={14} color={color} />;

  // --- RETAIL & DAILY GOODS ---
  if (s.includes('movie') || s.includes('film')) return <Ionicons name="film" size={18} color={color} />;
  if (s.includes('grocery') || s.includes('market') || s.includes('supermarket') || s.includes('cart') || s.includes('shopping')) return <MaterialCommunityIcons name="basket" size={18} color={color} />;
  if (s.includes('fruit')) return <MaterialCommunityIcons name="food-apple" size={18} color={color} />;
  if (s.includes('veg') || s.includes('carrot')) return <MaterialCommunityIcons name="carrot" size={18} color={color} />;
  if (s.includes('milk') || s.includes('dairy')) return <MaterialCommunityIcons name="cow" size={18} color={color} />;
  if (s.includes('medicine') || s.includes('pharmacy')) return <MaterialCommunityIcons name="pill" size={18} color={color} />;
  if (s.includes('stationery') || s.includes('pencil') || s.includes('pen') || s.includes('book')) return <MaterialCommunityIcons name="pencil" size={18} color={color} />;
  if (s.includes('paperwala') || s.includes('news')) return <MaterialCommunityIcons name="newspaper" size={18} color={color} />;

  // --- REAL ESTATE & PG ---
  if (s.includes('pg ') || s.includes('hostel') || s.includes('co-living') || s.includes('room') || s.includes('bed')) return <FontAwesome5 name="bed" size={14} color={color} />;
  if (s.includes('property') || s.includes('estate') || s.includes('house') || s.includes('home')) return <FontAwesome5 name="home" size={14} color={color} />;

  // --- CONSULTANTS & LAW ---
  if (s.includes('law') || s.includes('court') || s.includes('legal') || s.includes('lawyer') || s.includes('advocate')) return <FontAwesome5 name="balance-scale" size={14} color={color} />;
  if (s.includes('ca ') || s.includes('audit') || s.includes('account') || s.includes('tax') || s.includes('gst')) return <MaterialCommunityIcons name="calculator" size={18} color={color} />;

  // --- SECURITY ---
  if (s.includes('security') || s.includes('guard') || s.includes('bodyguard') || s.includes('shield')) return <FontAwesome5 name="shield-alt" size={14} color={color} />;
  if (s.includes('cctv') || s.includes('camera')) return <MaterialCommunityIcons name="cctv" size={18} color={color} />;

  // --- EVENTS & FUN ---
  if (s.includes('flower') || s.includes('florist')) return <MaterialCommunityIcons name="flower" size={18} color={color} />;
  if (s.includes('garden') || s.includes('lawn')) return <MaterialCommunityIcons name="flower-tulip" size={18} color={color} />;
  if (s.includes('party') || s.includes('event') || s.includes('dj') || s.includes('music') || s.includes('photograph') || s.includes('decor')) return <Ionicons name="musical-notes" size={18} color={color} />;

  // --- STUDY / TRAINING ---
  if (s.includes('class') || s.includes('school') || s.includes('college') || s.includes('train') || s.includes('learn') || s.includes('study') || s.includes('coaching') || s.includes('institute') || s.includes('education') || s.includes('ielts') || s.includes('toefl')) {
    return <FontAwesome5 name="graduation-cap" size={12} color={color} />;
  }

  // --- PETS ---
  if (s.includes('pet') || s.includes('dog') || s.includes('cat') || s.includes('paw')) return <FontAwesome5 name="dog" size={14} color={color} />;

  // --- DIGITAL ---
  if (s.includes('wifi') || s.includes('internet')) return <Ionicons name="wifi" size={18} color={color} />;

  // Stable random fallback icon to make unmatched categories look beautifully decorated and unique
  return getStableRandomIcon(sub, color);
};

export default function ServicesScreen({ route, navigation }: any) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeTabId, setActiveTabId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Vendor search state
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Vendor section banners state
  const [vendorBanners, setVendorBanners] = useState<any[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'banners'));
    const unsubscribeBanners = onSnapshot(q, (snapshot) => {
      const allList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((b: any) => b.isActive !== false);

      const vendorList = allList.filter((b: any) => {
        const t = String(b.type || '').toLowerCase();
        return t === 'vendor' || t === 'vendors' || t.includes('vendor');
      });
      setVendorBanners(vendorList.length > 0 ? vendorList : allList);
    }, (err) => {
      console.warn("Vendor banners snapshot listener warning:", err?.message);
    });

    return () => unsubscribeBanners();
  }, []);

  useEffect(() => {
    if (route.params?.focusSearch) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [route.params?.focusSearch]);

  // User location states
  const [userPincode, setUserPincode] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [userState, setUserState] = useState<string | null>(null);

  // 1. Check user pincode + city from profile on mount
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubscribeUser = onSnapshot(doc(db, 'users', userId), (userDoc) => {
      try {
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data && data.pincode) {
            setUserPincode(data.pincode);
          }
          if (data && data.city) {
            setUserCity(data.city);
          }
          if (data && data.state) {
            setUserState(data.state);
          }
          if (data && data.pincode && (!data.state || !data.city)) {
            const matchedPin = PINCODES.find(p => p.pincode === data.pincode);
            if (matchedPin) {
              if (!data.city) setUserCity(matchedPin.city);
              setUserState(matchedPin.state);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user profile in ServicesScreen:', err);
      }
    });

    return () => unsubscribeUser();
  }, []);



  useEffect(() => {
    try {
      const catParam = route?.params?.category ? String(route.params.category) : '';
      const catParamLower = catParam ? catParam.toLowerCase() : '';
      if (catParamLower) {
        const found = ALL_CATEGORIES.find(c => {
          const cId = c?.id ? String(c.id) : '';
          const cName = c?.name ? String(c.name) : '';
          const cNameLower = cName ? cName.toLowerCase() : '';
          return cId === catParam ||
            cNameLower === catParamLower ||
            (cNameLower && cNameLower.includes(catParamLower)) ||
            (catParamLower && catParamLower.includes(cNameLower)) ||
            (catParamLower && catParamLower.includes('repair') && cId === 'repairs_services') ||
            (catParamLower && catParamLower.includes('doctor') && cId === 'doctors') ||
            (catParamLower && catParamLower.includes('beauty') && cId === 'beauty') ||
            (catParamLower && catParamLower.includes('rent') && cId === 'rent_hire') ||
            (catParamLower && catParamLower.includes('transport') && cId === 'automobile') ||
            (catParamLower && catParamLower.includes('pg') && cId === 'pg_hostel') ||
            (catParamLower && catParamLower.includes('hostel') && cId === 'pg_hostel') ||
            (catParamLower && catParamLower.includes('daily') && cId === 'daily_needs') ||
            (catParamLower && catParamLower.includes('education') && cId === 'training_institutes') ||
            (catParamLower && catParamLower.includes('food') && cId === 'food') ||
            (catParamLower && catParamLower.includes('cake') && cId === 'cake_shops') ||
            (catParamLower && catParamLower.includes('cater') && cId === 'caterers') ||
            (catParamLower && catParamLower.includes('contractor') && cId === 'contractors');
        });
        if (found) {
          setActiveTabId(found.id);
        }
      }
    } catch (error) {
      console.error('Error in ServicesScreen useEffect:', error);
    }
  }, [route?.params?.category]);

  // Priority sort helper (same as ServicesSearchScreen)
  const getTier = (biz: any) => {
    const now = new Date();
    const hasExpiry = biz.planExpiry && new Date(biz.planExpiry) > now;
    if (biz.planId === 'big' && hasExpiry) return 3;
    if (biz.planId === 'small' && hasExpiry) return 2;
    if (biz.plan === 'growth' || biz.isBoosted === true) return 1.5;
    return 1;
  };

  const sortByTierAndRating = (a: any, b: any) => {
    const tierDiff = getTier(b) - getTier(a);
    if (tierDiff !== 0) return tierDiff;
    return (Number(b.rating) || 0) - (Number(a.rating) || 0);
  };

  // Fetch all service vendors on mount
  useEffect(() => {
    const fetchAllVendors = async () => {
      setLoadingVendors(true);
      try {
        const snap = await getDocs(collection(db, 'vendors'));
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((v: any) => {
            const isVisible = v.publiclyVisible !== false && v.type !== 'product';
            const isExpired = v.planExpiry && new Date(v.planExpiry) < new Date();
            return isVisible && !isExpired;
          });
        setAllVendors(docs);
      } catch (e) {
        console.error('Error fetching vendors in ServicesScreen:', e);
      } finally {
        setLoadingVendors(false);
      }
    };
    fetchAllVendors();
  }, []);

  // Filter & sort vendors when searchQuery changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVendors([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const result = allVendors.filter((biz: any) =>
      String(biz.businessName || '').toLowerCase().includes(q) ||
      String(biz.description || '').toLowerCase().includes(q) ||
      String(biz.category || '').toLowerCase().includes(q) ||
      String(biz.subCategory || '').toLowerCase().includes(q) ||
      String(biz.location || '').toLowerCase().includes(q)
    );
    result.sort(sortByTierAndRating);
    setFilteredVendors(result);
  }, [searchQuery, allVendors]);

  const logLead = async (item: any, type: 'call' | 'whatsapp') => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      await addDoc(collection(db, 'leads'), {
        vendorId: item.id, vendorName: item.businessName,
        userId: currentUser.uid, type, createdAt: new Date().toISOString(),
      });
    } catch (e) { }
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
      console.error('Error in getSubKey:', error);
      return 'unknown';
    }
  };

  const renderSubCategory = (sub: string, category: any) => {
    try {
      const subKey = getSubKey(sub);
      const translatedSub = t(`subcategories.${subKey}`);
      const displaySub = translatedSub === `subcategories.${subKey}` ? sub : translatedSub;
      const theme = getCategoryTheme(category.id);

      return (
        <TouchableOpacity
          key={sub}
          style={styles.pill}
          onPress={() => navigation.navigate('BusinessList', {
            category: category.name,
            subCategory: sub
          })}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.bg }]}>
            {getSubCategoryIcon(sub, theme.color)}
          </View>
          <Text style={styles.pillText} numberOfLines={2}>{displaySub}</Text>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('Error in renderSubCategory:', error);
      const theme = getCategoryTheme(category?.id || 'all');
      return (
        <TouchableOpacity
          key={sub}
          style={styles.pill}
          onPress={() => navigation.navigate('BusinessList', {
            category: category?.name || 'All',
            subCategory: sub
          })}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.bg }]}>
            {getSubCategoryIcon(sub, theme.color)}
          </View>
          <Text style={styles.pillText} numberOfLines={2}>{sub}</Text>
        </TouchableOpacity>
      );
    }
  };

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
            <Ionicons name="search-outline" size={18} color="#0035a0" />
            <TextInput
              ref={inputRef}
              placeholder={t('services.search_placeholder')}
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Horizontal Tabs with Icons */}
        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {['all', ...ALL_CATEGORIES.map(c => c.id)].map((id) => {
              const cat = ALL_CATEGORIES.find(c => c.id === id);
              const translatedTab = id === 'all' ? t('services.all_tab') : (cat ? t(`categories.${cat.id}`) : id);
              const isActive = activeTabId === id;

              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setActiveTabId(id)}
                  style={styles.tabItem}
                >
                  <View style={[styles.tabContent, isActive && styles.tabContentActive]}>
                    {cat && <Image source={{ uri: cat.icon8 }} style={styles.tabIcon} />}
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {translatedTab}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {searchQuery.trim().length > 0 ? (
        /* ── Vendor Search Results ── */
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
              {loadingVendors ? 'Searching...' : `${filteredVendors.length} service${filteredVendors.length !== 1 ? 's' : ''} found`}
            </Text>
          </View>
          {loadingVendors ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : filteredVendors.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
              <Ionicons name="business-outline" size={48} color="#cbd5e1" />
              <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>No services found for "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={filteredVendors}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 15, paddingBottom: 80 + insets.bottom }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const now = new Date();
                const isPremiumActive = item.planId === 'big' && item.planExpiry && new Date(item.planExpiry) > now;
                const isSmartActive = item.planId === 'small' && item.planExpiry && new Date(item.planExpiry) > now;
                return (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }}
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
                        return <Image source={{ uri: realImg }} style={{ width: 90, height: 90, backgroundColor: '#f1f5f9' }} resizeMode="cover" />;
                      }

                      return (
                        <View style={{ width: 90, height: 90, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', padding: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#3b82f6', letterSpacing: -0.3, textAlign: 'center' }}>
                            Business
                          </Text>
                        </View>
                      );
                    })()}
                    <View style={{ flex: 1, padding: 10 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                        {isPremiumActive && (<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#dbeafe' }}><Ionicons name="shield-checkmark" size={10} color="#1e40af" style={{ marginRight: 2 }} /><Text style={{ fontSize: 9, fontWeight: '700', color: '#1e40af' }}>Trusted</Text></View>)}
                        {isSmartActive && !isPremiumActive && (<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fefce8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#fef08a' }}><Ionicons name="thumbs-up" size={10} color="#92400e" style={{ marginRight: 2 }} /><Text style={{ fontSize: 9, fontWeight: '700', color: '#92400e' }}>Recommended</Text></View>)}
                        {(item.tookVerification || item.isVerified || item.verifyMark || item.verificationStatus === 'verified') && (<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#bbf7d0' }}><Ionicons name="checkmark-circle" size={10} color="#15803d" style={{ marginRight: 2 }} /><Text style={{ fontSize: 9, fontWeight: '700', color: '#15803d' }}>Verified</Text></View>)}
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 2 }} numberOfLines={1}>{item.businessName}</Text>
                      {item.subCategory ? <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }} numberOfLines={1}>{item.subCategory}</Text> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="location-outline" size={12} color="#64748b" />
                        <Text style={{ fontSize: 11, color: '#64748b', flex: 1 }} numberOfLines={1}>{item.location || item.city || 'Local Area'}</Text>
                      </View>
                    </View>
                    <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, gap: 8 }}>
                      <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }} onPress={() => handleCall(item)}><Ionicons name="call" size={16} color="white" /></TouchableOpacity>
                      <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }} onPress={() => handleWhatsApp(item)}><Ionicons name="logo-whatsapp" size={16} color="white" /></TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ ...styles.contentPadding, paddingBottom: 20 + insets.bottom }}
        >
          {ALL_CATEGORIES
            .filter(c => activeTabId === 'all' || c.id === activeTabId)
            .filter(category => {
              if (!searchQuery) return true;
              const query = searchQuery.toLowerCase();
              const categoryName = category.name.toLowerCase();
              const hasMatchingSub = category.subCategories.some(sub =>
                sub.toLowerCase().includes(query)
              );
              return categoryName.includes(query) || hasMatchingSub;
            })
            .map((category) => (
              <View key={category.id} style={styles.section}>
                <View style={styles.gridContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Image source={{ uri: category.icon8 }} style={styles.sectionIcon} />
                    <Text style={styles.sectionHeader}>{t(`categories.${category.id}`)}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{category.subCategories.length}</Text>
                    </View>
                  </View>
                  <View style={styles.pillGrid}>
                    {category.subCategories.map((sub) => renderSubCategory(sub, category))}
                  </View>
                </View>
              </View>
            ))}

          {/* Elite Directory Banner / Vendor Banner Slider */}
          {vendorBanners.length > 0 ? (
            <View style={{ borderRadius: 24, overflow: 'hidden', height: 180, marginTop: 10, marginBottom: 30, position: 'relative', backgroundColor: '#f1f5f9' }}>
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
                {vendorBanners.map((banner: any, index: number) => (
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
              {vendorBanners.length > 1 && (
                <View style={{ position: 'absolute', bottom: 12, right: 16, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  {vendorBanners.map((_, i) => (
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
              colors={[PRIMARY_COLOR, '#8eabeb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.eliteBanner, { marginTop: 10 }]}
            >
              <View style={styles.bannerContent}>
                <View style={styles.badgeWrap}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.badgeText}>{t('services.verified_providers')}</Text>
                </View>
                <Text style={styles.eliteTitle}>{t('services_home.top_rated_vendors')}</Text>
                <Text style={styles.eliteDesc}>{t('services.elite_desc')}</Text>
              </View>
              <Ionicons name="business" size={80} color="rgba(255,255,255,0.1)" style={styles.bannerBgIcon} />
            </LinearGradient>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  topContainer: {
    backgroundColor: '#ffffff',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 12,
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#eff2f6',
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  tabsWrapper: {
    paddingBottom: 4,
  },
  tabsScroll: {
    paddingHorizontal: 15,
  },
  tabItem: {
    marginRight: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabContentActive: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  tabIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabIndicator: {
    display: 'none',
  },
  contentPadding: {
    paddingHorizontal: 15,
    paddingTop: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionIcon: {
    width: 22,
    height: 22,
    marginRight: 8,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: (width - 45) / 2,
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  gridContainer: {
    padding: 2,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  eliteBanner: {
    padding: 24,
    minHeight: 180,
    borderRadius: 24,
    marginBottom: 30,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerContent: {
    flex: 1,
    zIndex: 1,
  },
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
  badgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eliteTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  eliteDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  bannerBgIcon: {
    position: 'absolute',
    right: -15,
    bottom: -15,
    transform: [{ rotate: '-15deg' }],
  },
  adBannerContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    height: 190,
    backgroundColor: '#f1f5f9',
  },
  adBannerCarousel: {
    height: 190,
  },
  adBannerSlide: {
    width: width - 30,
    height: 190,
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

