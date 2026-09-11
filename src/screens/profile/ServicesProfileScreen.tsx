import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { auth, db, storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import razorpayService from '../../services/razorpay.service';
import { PINCODES } from '../../data/pincodes';
const { width } = Dimensions.get('window');
export default function ServicesProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [pincodeAdPrice, setPincodeAdPrice] = useState<number>(99);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch('http://10.0.2.2:5000/api/pricing');
        const data = await res.json();
        if (data.success && data.pricing) {
          setPincodeAdPrice(Number(data.pricing.servicesPincodeAdPrice || data.pricing.pincodeAdPrice || 99));
        }
      } catch (_) { }
    };

    fetchPricing();

    const unsubPricing = onSnapshot(doc(db, 'config', 'service_pricing'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPincodeAdPrice(Number(data.servicesPincodeAdPrice || data.pincodeAdPrice || 99));
      }
    }, (err) => {
      console.warn("Services profile pricing snapshot notice, using API fallback:", err);
      fetchPricing();
    });
    return () => unsubPricing();
  }, []);
  const [profile, setProfile] = useState<any>({
    name: 'User Name',
    email: 'user@gmail.com',
    phone: '+91 00000 00000',
    fullAddress: '',
    pincode: '',
    city: '',
    state: '',
    area: '',
    location: '',
    profileImage: '',
    verified: false,
    hasVerificationBadge: false
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFullAddress, setEditFullAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editLocationQuery, setEditLocationQuery] = useState('');
  const [editSelectedPincode, setEditSelectedPincode] = useState<any>(null);
  const [editSuggestions, setEditSuggestions] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);

  // Ad activities state
  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [myActivitiesLoading, setMyActivitiesLoading] = useState(true);

  // Fetch user's ad activities
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setMyActivitiesLoading(false);
      return;
    }

    const q = query(
      collection(db, 'pincode_ads'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ads = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter ads by sourceApp === 'Services'
      const servicesAds = ads.filter((ad: any) => ad.sourceApp === 'Services');

      // Sort by createdAt descending
      const sortedAds = servicesAds.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setMyActivities(sortedAds);
      setMyActivitiesLoading(false);
    }, (error) => {
      console.error("Error fetching my activities:", error);
      setMyActivitiesLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getAdStatusBadge = (endDate: any) => {
    if (!endDate) return { label: 'Active', color: '#10b981' };
    const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
    if (end < new Date()) {
      return { label: 'Expired', color: '#64748b' };
    }
    return { label: 'Running', color: '#10b981' };
  };

  const formatAdDate = (endDate: any) => {
    if (!endDate) return 'N/A';
    const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
    return end.toLocaleDateString();
  };


  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    // Real-time listener for user profile
    const userRef = doc(db, 'users', userId);
    const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileData = {
          name: data.name || '',
          email: data.email || '',
          phone: data.phoneNumber || '',
          fullAddress: data.fullAddress || '',
          pincode: data.pincode || '',
          city: data.city || '',
          state: data.state || '',
          area: data.area || '',
          location: data.location || '',
          profileImage: data.profileImage || '',
          verified: Boolean(data.isVerified || data.tookVerification),
          hasVerificationBadge: Boolean(data.hasVerificationBadge || data.isGenuineVerified),
        };
        setProfile(profileData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to profile:", error);
      setLoading(false);
    });

    let unsubscribeBusinesses: any;
    const businessesQuery = query(
      collection(db, 'vendors'),
      where('userId', '==', userId)
    );

    unsubscribeBusinesses = onSnapshot(businessesQuery, (snapshot: any) => {
      const businesses = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserBusinesses(businesses);
      setHasBusiness(businesses.length > 0);

      const isAnyBizVerified = businesses.some((b: any) => b.tookVerification || b.isVerified || b.hasVerificationBadge);
      if (isAnyBizVerified) {
        setProfile((prev: any) => ({
          ...prev,
          hasVerificationBadge: true,
          verified: true,
        }));
      }
    });

    return () => {
      unsubscribeProfile();
      if (unsubscribeBusinesses) unsubscribeBusinesses();
    };
  }, []);

  function handleBusinessSelect(business: any) {
    setShowBusinessDropdown(false);
    navigation.navigate('VendorDashboard', { businessId: business.id });
  }

  function handleMyBusinessPress() {
    if (userBusinesses.length > 1) {
      setShowBusinessDropdown(true);
    } else if (userBusinesses.length === 1) {
      navigation.navigate('VendorDashboard', { businessId: userBusinesses[0].id });
    } else {
      navigation.navigate('VendorRegistration');
    }
  }

  // Prefill edit modal inputs when it is opened
  useEffect(() => {
    if (editModalVisible) {
      setIsEditingProfile(false);
      setEditName(profile.name || '');
      setEditPhone(profile.phone || '');
      setEditEmail(profile.email || '');
      setEditFullAddress(profile.fullAddress || '');
      setEditCity(profile.city || '');
      setEditLocationQuery(profile.pincode || '');
      setEditSelectedPincode({
        pincode: profile.pincode,
        city: profile.city,
        state: profile.state,
        area: profile.area,
      });
      setEditSuggestions([]);
    }
  }, [editModalVisible, profile]);

  // Handle location search in edit modal
  useEffect(() => {
    if (!editLocationQuery) {
      setEditSuggestions([]);
      return;
    }
    const currentPincodeString = editSelectedPincode ? editSelectedPincode.pincode : '';
    if (editLocationQuery === currentPincodeString) {
      setEditSuggestions([]);
      return;
    }

    const queryLower = editLocationQuery.toLowerCase();
    const uniqueMap = new Map();
    for (const item of PINCODES) {
      const match = item.pincode.startsWith(queryLower) ||
        item.city.toLowerCase().includes(queryLower) ||
        item.area.toLowerCase().includes(queryLower);
      if (match) {
        if (!uniqueMap.has(item.pincode)) {
          uniqueMap.set(item.pincode, item);
        }
        if (uniqueMap.size >= 15) {
          break;
        }
      }
    }
    setEditSuggestions(Array.from(uniqueMap.values()));
  }, [editLocationQuery, editSelectedPincode]);

  const handleUpdateProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setUpdating(true);
        const selectedUri = result.assets[0].uri;
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const response = await fetch(selectedUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `profiles/${userId}`);
        await uploadBytes(storageRef, blob);
        const profileImageUrl = await getDownloadURL(storageRef);

        await updateDoc(doc(db, 'users', userId), {
          profileImage: profileImageUrl,
          updatedAt: new Date(),
        });

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile picture updated successfully',
        });
      }
    } catch (error: any) {
      console.error("Error updating profile image:", error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error.message || 'Failed to update profile picture',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName || !editPhone || !editEmail || !editFullAddress || !editLocationQuery || !editCity) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill in all fields' });
      return;
    }

    setUpdating(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        name: editName,
        email: editEmail,
        phoneNumber: editPhone,
        fullAddress: editFullAddress,
        pincode: editLocationQuery,
        city: editCity,
        state: editSelectedPincode?.state || profile.state || '',
        area: editSelectedPincode?.area || profile.area || '',
        location: `${editCity}${editSelectedPincode?.state ? ', ' + editSelectedPincode.state : (profile.state ? ', ' + profile.state : '')}`,
        updatedAt: new Date(),
      });

      setEditModalVisible(false);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to update profile' });
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };



  const menuItems = [
    { id: 'business', label: 'My Business', sub: 'Register or manage your business', icon: 'business-outline', color: '#8eabeb' },
    { id: 'addBusiness', label: 'Add New Business', sub: 'Register a new business', icon: 'add-circle-outline', color: '#8eabeb' },
    { id: 'reviews', label: 'Reviews & Ratings', sub: 'See your feedback from vendors', icon: 'star-outline', color: '#8eabeb' },
    { id: 'myActivities', label: 'My Ad Campaigns', sub: 'Manage your targeted pincode ads', icon: 'megaphone-outline', color: '#8eabeb', route: 'MyActivities' },
    { id: 'paymentHistory', label: 'Payment History', sub: 'View all your payment records', icon: 'receipt-outline', color: '#8eabeb', route: 'PaymentHistory' },
    { id: 'help', label: 'Help & Support', sub: 'Get assistance for services', icon: 'help-circle-outline', color: '#8eabeb', route: 'HelpSupport' },
    { id: 'privacy', label: 'Privacy Policy', sub: 'Read our privacy policy', icon: 'shield-checkmark-outline', color: '#8eabeb', route: 'PrivacyPolicy' },
    { id: 'terms', label: 'Terms & Conditions', sub: 'Read our terms of service', icon: 'document-text-outline', color: '#8eabeb', route: 'TermsConditions' },
  ];


  const getPlanStatus = () => {
    if (userBusinesses.length === 0) return 'Get';

    const activeBusinessPlan = userBusinesses.find(b => {
      const pId = b.planId || b.plan;
      if (!pId || pId === 'free' || pId === 'none') return false;
      if (b.planExpiry) {
        try {
          const d = b.planExpiry?.toDate ? b.planExpiry.toDate() : new Date(b.planExpiry);
          if (isNaN(d.getTime())) return false;
          return d > new Date();
        } catch (e) {
          return false;
        }
      }
      return true;
    });

    if (activeBusinessPlan) {
      const pId = (activeBusinessPlan.planId || activeBusinessPlan.plan || '').toLowerCase();
      return pId === 'big' ? 'Premium' : pId === 'small' ? 'Smart' : 'Boosted';
    }

    const expiredBusinessPlan = userBusinesses.find(b => (b.planId && b.planId !== 'free') || (b.plan && b.plan !== 'free' && b.plan !== 'none'));
    if (expiredBusinessPlan) return 'Expired';

    return 'Get';
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#8eabeb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Top App Bar */}
        <View style={styles.appBar}>
          <Text style={styles.logoText}>Meesent Services</Text>
          <View style={styles.appBarIcons}>
            <TouchableOpacity style={styles.iconContainer}>
              <Ionicons name="notifications-outline" size={26} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconContainer}>
              <Ionicons name="cart-outline" size={26} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profile.profileImage ? (
                  <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color="white" />
                  </View>
                )}
                <TouchableOpacity style={styles.editIconBadge} onPress={handleUpdateProfileImage}>
                  <Ionicons name="pencil" size={14} color="#3b82f6" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <Text style={styles.profileName}>{profile.name}</Text>
                  {profile.hasVerificationBadge ? (
                    <View style={[styles.verifiedBadge, { backgroundColor: '#dcfce7', borderColor: '#10b981', borderWidth: 1, marginTop: 0, marginBottom: 0 }]}>
                      <Ionicons name="shield-checkmark" size={12} color="#10b981" />
                      <Text style={[styles.verifiedText, { color: '#15803d' }]}>Verified Business</Text>
                    </View>
                  ) : profile.verified ? (
                    <View style={[styles.verifiedBadge, { marginTop: 0, marginBottom: 0 }]}>
                      <MaterialCommunityIcons name="shield-check" size={14} color="#2E7D32" />
                      <Text style={styles.verifiedText}>Verified Account</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.profileSubText}>{profile.email}</Text>
                <Text style={styles.profileSubText}>{profile.phone}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setEditModalVisible(true)}
                style={styles.editBtn}
              >
                <Ionicons name="create-outline" size={16} color="#64748b" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Add Post Banner */}
          <TouchableOpacity
            style={styles.addPostBanner}
            onPress={() => navigation.navigate('PostAd', { sourceApp: 'Services' })}
          >
            <LinearGradient
              colors={['#8eabeb', '#3b5fa6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerContent}>
                <View style={styles.bannerLeft}>
                  <Ionicons name="megaphone" size={28} color="#fff" />
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>Post your special ads</Text>
                    <Text style={styles.bannerSubtitle}>Reach targeted customers at ₹{pincodeAdPrice}/pincode</Text>
                  </View>
                </View>
                <View style={styles.bannerRight}>
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Stats Row - Specialized for Services */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => handleMyBusinessPress()}
            >
              <View style={[styles.statIconWrapper, { backgroundColor: '#8eabeb15' }]}>
                <Ionicons name="business" size={16} color="#8eabeb" />
              </View>
              <Text style={styles.statValue}>{hasBusiness ? 'Active' : 'Add'}</Text>
              <Text style={styles.statLabel}>My Business</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('MyActivities', { sourceApp: 'Services' })}
            >
              <View style={[styles.statIconWrapper, { backgroundColor: '#34d39915' }]}>
                <Ionicons name="megaphone" size={16} color="#34d399" />
              </View>
              <Text style={styles.statValue}>{myActivities.length}</Text>
              <Text style={styles.statLabel}>My Activities</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => {
                console.log('Upgrade Plan clicked, hasVerificationBadge:', profile.hasVerificationBadge);
                if (profile.hasVerificationBadge === true) {
                  if (hasBusiness) {
                    navigation.navigate('SelectPlan', {
                      vendorId: userBusinesses[0]?.id,
                      isUpgrade: true
                    });
                  } else {
                    navigation.navigate('SelectPlan');
                  }
                } else {
                  Alert.alert(
                    'Verification Badge Required',
                    'Get a Verification Badge to unlock subscription plans for your business grow.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Get Verification Badge',
                        onPress: () => navigation.navigate('BusinessVerification')
                      }
                    ]
                  );
                }
              }}
            >
              <View style={[styles.statIconWrapper, { backgroundColor: '#3b82f615' }]}>
                <Ionicons name="rocket" size={16} color="#3b82f6" />
              </View>
              <Text style={styles.statValue}>{getPlanStatus()}</Text>
              <Text style={styles.statLabel}>Upgrade Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('PaymentHistory')}
            >
              <View style={[styles.statIconWrapper, { backgroundColor: '#05966915' }]}>
                <Ionicons name="receipt" size={16} color="#059669" />
              </View>
              <Text style={styles.statValue}>History</Text>
              <Text style={styles.statLabel}>Payments</Text>
            </TouchableOpacity>
          </View>



          {/* Menu Items List */}
          <View style={styles.menuContainer}>
            {/* My Business */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMyBusinessPress()}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: '#8eabeb10' }]}>
                <Ionicons name="business-outline" size={22} color="#8eabeb" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>My Business</Text>
                <Text style={styles.menuSub}>Register or manage your business</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* My Leads (Only visible for approved registered businesses) */}
            {userBusinesses.some(b => b.status === 'approved') && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation.navigate('MyLeads')}
              >
                <View style={[styles.menuIconWrapper, { backgroundColor: '#f59e0b10' }]}>
                  <Ionicons name="people-outline" size={22} color="#f59e0b" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuLabel}>My Leads</Text>
                  <Text style={styles.menuSub}>View and manage your business leads</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Get Verification Badge */}
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: '#dcfce710' }]}
              onPress={() => {
                if (profile.hasVerificationBadge === true || profile.verified === true) {
                  Alert.alert(
                    'Verification Already Active ✅',
                    'Your account/business verification is already active!',
                    [{ text: 'OK' }]
                  );
                } else {
                  navigation.navigate('BusinessVerification');
                }
              }}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: '#10b98115' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#10b981" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Get Verification Badge</Text>
                <Text style={styles.menuSub}>
                  {profile.hasVerificationBadge || profile.verified ? 'Your business is verified' : 'Verify your business for more trust'}
                </Text>
              </View>
              <View style={{ backgroundColor: profile.hasVerificationBadge || profile.verified ? '#dcfce7' : '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#166534' }}>
                  {profile.hasVerificationBadge || profile.verified ? 'ACTIVE' : 'NEW'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Add New Business */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('VendorRegistration')}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: '#8eabeb10' }]}>
                <Ionicons name="add-circle-outline" size={22} color="#8eabeb" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Add New Business</Text>
                <Text style={styles.menuSub}>Register a new business</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Boost Your Business */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                console.log('Boost Your Business clicked, hasVerificationBadge:', profile.hasVerificationBadge);
                if (profile.hasVerificationBadge === true) {
                  if (hasBusiness) {
                    navigation.navigate('SelectPlan', {
                      vendorId: userBusinesses[0]?.id,
                      isUpgrade: true
                    });
                  } else {
                    navigation.navigate('SelectPlan');
                  }
                } else {
                  Alert.alert(
                    'Verification Badge Required ✅ ',
                    'Get a Verification Badge to unlock subscription plans for your business grow.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Get Verification Badge',
                        onPress: () => navigation.navigate('BusinessVerification')
                      }
                    ]
                  );
                }
              }}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: '#8eabeb10' }]}>
                <Ionicons name="rocket-outline" size={22} color="#8eabeb" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Boost Your Business</Text>
                <Text style={styles.menuSub}>Upgrade with a subscription plan</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Post your special ads */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('PostAd', { sourceApp: 'Services' })}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: '#8eabeb10' }]}>
                <Ionicons name="megaphone-outline" size={22} color="#8eabeb" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Post your special ads</Text>
                <Text style={styles.menuSub}>Promote your services to reach more</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {menuItems.filter(item => !['business', 'addBusiness'].includes(item.id)).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  if (item.route) {
                    if (item.id === 'myActivities') {
                      navigation.navigate(item.route, { sourceApp: 'Services' });
                    } else {
                      navigation.navigate(item.route);
                    }
                  }
                }}
              >
                <View style={[styles.menuIconWrapper, { backgroundColor: item.color + '10' }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={handleLogout} style={[styles.menuItem, styles.logoutItem]}>
              <View style={styles.logoutIconWrapper}>
                <Ionicons name="log-out-outline" size={22} color="#3b82f6" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuLabel, { color: '#000' }]}>Logout</Text>
                <Text style={styles.menuSub}>Sign out from your account</Text>
              </View>
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity
              onPress={() => navigation.navigate('DeleteAccount')}
              style={[styles.menuItem, { backgroundColor: '#fff1f2', marginTop: 4 }]}
            >
              <View style={[styles.logoutIconWrapper, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuLabel, { color: '#dc2626' }]}>Delete Account</Text>
                <Text style={styles.menuSub}>Permanently delete your account and data</Text>
              </View>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={false} onRequestClose={() => setEditModalVisible(false)}>
        <SafeAreaView style={styles.modalFullScreenContainer} edges={['top', 'bottom']}>
          {/* Modal Header - outside KeyboardAvoidingView so it's never blocked */}
          <View style={styles.modalFullScreenHeader}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Edit Profile</Text>
              <View style={{ width: 40 }} />
            </View>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Avatar Section centered (Overlapping Header) */}
              <View style={styles.modalAvatarSection}>
                <View style={styles.modalAvatarContainer}>
                  {profile.profileImage ? (
                    <Image source={{ uri: profile.profileImage }} style={styles.modalAvatarImage} />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Ionicons name="person" size={50} color="white" />
                    </View>
                  )}
                  <TouchableOpacity style={styles.modalAvatarEditBadge} onPress={handleUpdateProfileImage}>
                    <Ionicons name="camera" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalUserTitle}>{profile.name}</Text>
                <Text style={styles.modalUserSubtitle}>{profile.phone} • {profile.email}</Text>
              </View>

              {/* Form Card */}
              <View style={styles.modalFormCard}>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>FULL NAME</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="person-outline" size={18} color="#3b5fa6" />
                    </View>
                    <TextInput
                      style={styles.modalTextInput}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter your name"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Phone Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="call-outline" size={18} color="#3b5fa6" />
                    </View>
                    <TextInput
                      style={styles.modalTextInput}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="Enter phone number"
                      keyboardType="phone-pad"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="mail-outline" size={18} color="#3b5fa6" />
                    </View>
                    <TextInput
                      style={styles.modalTextInput}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="Enter email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Pincode */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PINCODE</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="location-outline" size={18} color="#3b5fa6" />
                    </View>
                    <TextInput
                      style={styles.modalTextInput}
                      value={editLocationQuery}
                      onChangeText={setEditLocationQuery}
                      placeholder="Type 6-digit pincode..."
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  {/* Suggestions List */}
                  {editSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                        {editSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={`${item.pincode}-${index}`}
                            style={styles.suggestionItem}
                            onPress={() => {
                              setEditSelectedPincode(item);
                              setEditLocationQuery(item.pincode);
                              setEditCity(item.city);
                              const extraAddress = `${item.area ? item.area + ', ' : ''}${item.city}, ${item.state}`;
                              setEditFullAddress(prev => prev ? `${prev}, ${extraAddress}` : extraAddress);
                              setEditSuggestions([]);
                            }}
                          >
                            <Ionicons name="location-outline" size={16} color="#3b5fa6" style={{ marginRight: 8 }} />
                            <Text style={styles.suggestionText}>
                              {item.area ? `${item.area}, ` : ''}{item.city}, {item.state} ({item.pincode})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* City */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CITY</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="business-outline" size={18} color="#3b5fa6" />
                    </View>
                    <TextInput
                      style={styles.modalTextInput}
                      value={editCity}
                      onChangeText={setEditCity}
                      placeholder="Enter city"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Full Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>FULL ADDRESS</Text>
                  <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 10 }]}>
                    <View style={[styles.inputIconContainer, { marginTop: 2 }]}>
                      <Ionicons name="home-outline" size={18} color="#3b5fa6" />
                    </View>
                    <TextInput
                      style={[styles.modalTextInput, { height: '100%', textAlignVertical: 'top' }]}
                      value={editFullAddress}
                      onChangeText={setEditFullAddress}
                      placeholder="House No, Building, Street, Area..."
                      multiline
                      numberOfLines={3}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>

              {/* Buttons Container */}
              <View style={{ paddingHorizontal: 20, marginTop: 25, gap: 10 }}>
                <TouchableOpacity onPress={handleSaveProfile} disabled={updating}>
                  <LinearGradient
                    colors={['#8eabeb', '#3b5fa6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalSaveBtn}
                  >
                    {updating ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>



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
                      <Ionicons name="business" size={20} color="#3b82f6" />
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
              <Ionicons name="add-circle" size={20} color="#3b82f6" />
              <Text style={styles.addBusinessText}>Add New Business</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


    </View>
  );
}

const StatCard = ({ icon, label, value, color }: any) => (
  <TouchableOpacity style={styles.statCard}>
    <View style={[styles.statIconWrapper, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  logoText: { fontSize: 24, fontWeight: '900', color: '#8eabeb', letterSpacing: -1 },
  appBarIcons: { flexDirection: 'row', gap: 15 },
  iconContainer: { padding: 4 },
  profileCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginTop: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'white',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: { marginLeft: 15, flex: 1 },
  profileName: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  verifiedText: { color: '#2E7D32', fontSize: 10, fontWeight: '800', marginLeft: 4 },
  profileSubText: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 1 },
  editBtn: {
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editBtnText: { color: '#64748b', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: 20,
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },


  menuContainer: { marginTop: 25, marginHorizontal: 20, backgroundColor: 'white', borderRadius: 24, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  menuIconWrapper: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextContainer: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  menuSub: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  logoutItem: { borderBottomWidth: 0 },
  logoutIconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, minHeight: 350 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  modalForm: { gap: 15 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
  textInput: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 15, height: 50, fontSize: 16 },
  saveBtn: { backgroundColor: '#8eabeb', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Business Dropdown Styles
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownContainer: { backgroundColor: 'white', borderRadius: 16, width: '90%', maxHeight: '80%', overflow: 'hidden' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  dropdownScroll: { maxHeight: 400 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  dropdownItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dropdownItemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#3b82f615', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dropdownItemText: { flex: 1 },
  dropdownItemName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  dropdownItemType: { fontSize: 13, color: '#64748b' },
  dropdownItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: '#10b981' },
  statusDotPending: { backgroundColor: '#f59e0b' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  statusTextActive: { color: '#166534' },
  statusTextPending: { color: '#92400e' },
  addBusinessBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 8 },
  addBusinessText: { fontSize: 15, fontWeight: 'bold', color: '#3b82f6' },

  // Boost & Ad Cards
  boostCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 20, overflow: 'hidden', shadowColor: '#8eabeb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  adCard: { marginHorizontal: 20, marginTop: 14, marginBottom: 10, borderRadius: 20, overflow: 'hidden', shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  boostGradient: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20 },
  boostIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  boostTitle: { fontSize: 15, fontWeight: '900', color: 'white', marginBottom: 2 },
  boostSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  boostArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Payment Modal Styles
  paymentInfo: { alignItems: 'center', paddingVertical: 20 },
  priceTag: { backgroundColor: '#dcfce7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginBottom: 15 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#166534' },
  paymentTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  paymentDesc: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  featuresList: { width: '100%', gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  payBtn: { backgroundColor: '#3b82f6', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  payBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Ad Form Styles
  imageUploadBox: { height: 150, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e2e8f0', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadedImage: { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { fontSize: 12, color: '#94a3b8', marginTop: 8 },

  // Pincode Suggestions and Chips Styles
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    maxHeight: 200,
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991b1b',
  },
  chipRemoveBtn: {
    padding: 2,
  },
  targetTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 4,
  },
  targetTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#f8fafc',
  },
  targetTypeBtnActive: {
    backgroundColor: '#8eabeb',
    borderColor: '#8eabeb',
  },
  targetTypeBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
  },
  targetTypeBtnTextActive: {
    color: 'white',
  },
  selectedAreaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginVertical: 4,
  },
  selectedAreaName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#991b1b',
  },
  selectedAreaSub: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 2,
  },
  clearAreaBtn: {
    padding: 4,
  },
  pricingSummaryCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 8,
    gap: 6,
  },
  pricingSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingSummaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  pricingSummaryValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  pricingTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 4,
  },
  pricingTotalLabel: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '900',
  },
  pricingTotalValue: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '900',
  },
  inlinePricingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    gap: 6,
  },
  inlinePricingText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500',
  },
  inlinePricingValue: {
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Plan Selection Modal Styles
  plansContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  planCardSelected: {
    borderColor: '#8eabeb',
    backgroundColor: '#f0f9ff',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 4,
  },
  planDuration: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 12,
  },
  planFeatures: {
    gap: 8,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  modalFullScreenContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalFullScreenHeader: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalGradientHeaderEdit: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  modalHeaderProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatarContainer: {
    position: 'relative',
  },
  modalAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  modalAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'white',
  },
  modalAvatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalHeaderTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  modalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalProfileName: {
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
  },
  modalProfileSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '600',
  },
  modalStatusCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  modalStatusCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  modalStatusIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  modalStatusTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  modalStatusSub: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  modalDetailsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  modalDetailsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalDetailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  modalDetailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  modalEditDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#3b5fa6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalEditDetailsBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalAvatarSection: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 25,
  },
  modalAvatarContainer: {
    position: 'relative',
    shadowColor: '#3b5fa6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalAvatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#3b5fa6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  modalAvatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: 'white',
  },
  modalAvatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#3b5fa6',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalUserTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 12,
  },
  modalUserSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  modalFormCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inputIcon: {
    marginRight: 12,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#3b5fa6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalSaveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  modalCancelBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalTextInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    height: '100%',
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  addPostBanner: {
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8eabeb',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4
  },
  bannerGradient: {
    padding: 20
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  bannerTextContainer: {
    marginLeft: 15,
    flex: 1
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#e0e0e0'
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
});

