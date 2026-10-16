import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db, storage } from '../../services/firebase';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { geohashForLocation } from '../../services/geofire';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Toast from 'react-native-toast-message';
import { FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  reverseGeocodeAsync,
  Accuracy
} from 'expo-location';
import { ALL_CATEGORIES } from '../../data/categories';
import { ALL_PRODUCTS } from '../../data/products';

export default function VendorRegistrationScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const isEditing = route.params?.isEditing || false;
  const businessIdFromRoute = route.params?.businessId || null;
  const planData = route.params?.planData || null;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  
  // Registration form values
  const [logo, setLogo] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [type, setType] = useState('service');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(isEditing);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [vendorPincode, setVendorPincode] = useState('');
  const [vendorCity, setVendorCity] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [customBrandInput, setCustomBrandInput] = useState('');
  const [availableCategoryBrands, setAvailableCategoryBrands] = useState<string[]>([]);

  useEffect(() => {
    if (!subCategory) return;
    const fetchSubCategoryBrands = async () => {
      try {
        const q = query(collection(db, 'brands'), where('subCategory', '==', subCategory));
        const snap = await getDocs(q);
        const bList = snap.docs.map(doc => doc.data().brandName || doc.data().name).filter(Boolean);
        setAvailableCategoryBrands(Array.from(new Set(bList)));
      } catch (err) {
        console.error("Error fetching subcategory brands:", err);
      }
    };
    fetchSubCategoryBrands();
  }, [subCategory]);
  const TIME_CHOICES = [
    '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
    '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM',
    '11:00 PM', '11:30 PM'
  ];

  const [openingTime, setOpeningTime] = useState('09:00 AM');
  const [closingTime, setClosingTime] = useState('09:00 PM');
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [showOpeningTimeModal, setShowOpeningTimeModal] = useState(false);
  const [showClosingTimeModal, setShowClosingTimeModal] = useState(false);

  // Modal states
  const [showSubModal, setShowSubModal] = useState(false);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [showImageRemoveModal, setShowImageRemoveModal] = useState(false);
  const [imageToRemove, setImageToRemove] = useState<number | null>(null);
  
  const [userRegisteredSubCats, setUserRegisteredSubCats] = useState<string[]>([]);

  // Fetch registered sub-categories for current user
  useEffect(() => {
    fetchUserRegisteredSubCats();
  }, []);

  const fetchUserRegisteredSubCats = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      const q = query(collection(db, 'vendors'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const cats = snap.docs.map(doc => doc.data().subCategory).filter(Boolean);
      setUserRegisteredSubCats(cats);
    } catch (err) {
      console.error("Error fetching registered sub-categories:", err);
    }
  };

  // Load existing vendor data if editing
  useEffect(() => {
    if (isEditing) {
      fetchBusinessData();
    }
  }, [isEditing, businessIdFromRoute]);

  const fetchBusinessData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      let businessId = businessIdFromRoute;
      if (!businessId) {
        const userDocSnap = await getDoc(doc(db, 'users', userId));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          businessId = userData.businessId;
        }
      }

      const docId = businessId || userId;
      const docSnap = await getDoc(doc(db, 'vendors', docId));
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBusinessName(data.businessName || '');
        setCategory(data.category || '');
        setSubCategory(data.subCategory || '');
        setType(data.type || 'service');
        setLocation(data.location || '');
        setPhone(data.phone || '');
        setDescription(data.description || '');
        setLatitude(data.latitude || null);
        setLongitude(data.longitude || null);
        setImages(data.images || []);
        setGstNumber(data.gstNumber || '');
        setPanNumber(data.panNumber || '');
        setVendorPincode(data.pincode || '');
        setVendorCity(data.city || '');
        if (Array.isArray(data.brands) && data.brands.length > 0) {
          const brandStrings = data.brands.map((b: any) => typeof b === 'string' ? b : (b?.brandName || b?.name)).filter(Boolean);
          setSelectedBrands(brandStrings);
        } else if (data.brand) {
          const bStr = typeof data.brand === 'string' ? data.brand : (data.brand?.brandName || data.brand?.name);
          if (bStr) setSelectedBrands([bStr]);
        }
        if (data.openingTime) setOpeningTime(data.openingTime);
        if (data.closingTime) setClosingTime(data.closingTime);
        if (Array.isArray(data.workingDays) && data.workingDays.length > 0) setWorkingDays(data.workingDays);
        if (data.image) {
          setLogo(data.image);
        } else if (data.images && data.images.length > 0) {
          setLogo(data.images[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching business data:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permission Required',
        text2: 'Please allow access to your photos to upload media!'
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLogo(result.assets[0].uri);
    }
  };

  const pickMultipleImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permission Required',
        text2: 'Please allow access to your photos to upload media!'
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
      Toast.show({
        type: 'success',
        text1: 'Images Added',
        text2: `${newImages.length} image(s) added successfully`
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageToRemove(index);
    setShowImageRemoveModal(true);
  };

  const confirmRemoveImage = () => {
    if (imageToRemove !== null) {
      const newImages = images.filter((_, i) => i !== imageToRemove);
      setImages(newImages);
      setShowImageRemoveModal(false);
      setImageToRemove(null);
      Toast.show({
        type: 'success',
        text1: 'Image Removed',
        text2: 'Image has been removed permanently'
      });
    }
  };

  const cancelRemoveImage = () => {
    setShowImageRemoveModal(false);
    setImageToRemove(null);
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      let { status } = await requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Enable location in settings' });
        return;
      }
      let loc = await getCurrentPositionAsync({
        accuracy: Accuracy.High,
      });

      const { latitude, longitude } = loc.coords;
      setLatitude(latitude);
      setLongitude(longitude);

      let addressArr = await reverseGeocodeAsync({ latitude, longitude });
      if (addressArr.length > 0) {
        const a = addressArr[0];
        const parts = [
          a.name,
          a.streetNumber,
          a.street,
          a.district,
          a.city,
          a.subregion,
          a.region,
          a.postalCode
        ].filter(p => p && String(p).trim() !== '');
        
        const formatted = parts.join(', ');
        setLocation(formatted || `${latitude}, ${longitude}`);
        
        if (a.postalCode) setVendorPincode(String(a.postalCode).trim());
        if (a.city) setVendorCity(String(a.city).trim());
        else if (a.subregion) setVendorCity(String(a.subregion).trim());
      }

      Toast.show({ type: 'success', text1: 'Location Fixed', text2: 'Exact device location captured' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Location Error', text2: error.message });
    } finally {
      setLoading(false);
    }
  };

  const allSubCategoriesWithParent = React.useMemo(() => {
    const source = type === 'service' ? ALL_CATEGORIES : ALL_PRODUCTS;
    const flattened: { subCategory: string; parentCategory: string }[] = [];
    source.forEach(cat => {
      cat.subCategories.forEach(sub => {
        flattened.push({ subCategory: sub, parentCategory: cat.name });
      });
    });
    return flattened;
  }, [type]);

  const subCategoriesToDisplay = (() => {
    if (!category) {
      return allSubCategoriesWithParent
        .filter(item => item.subCategory.toLowerCase().includes(subSearchQuery.toLowerCase()));
    }
    const source = type === 'service' ? ALL_CATEGORIES : ALL_PRODUCTS;
    const found = source.find(c => c.name === category);
    return (found?.subCategories || []).filter(sub =>
      sub.toLowerCase().includes(subSearchQuery.toLowerCase())
    ).map(sub => ({ subCategory: sub, parentCategory: category }));
  })();

  const handleSubCategorySelect = (item: { subCategory: string; parentCategory: string }) => {
    if (!isEditing && userRegisteredSubCats.includes(item.subCategory)) {
      Alert.alert(
        "Sub-Category Already Registered",
        `You already have a business registered under "${item.subCategory}". You can only add a new business under a different sub-category.`
      );
      return;
    }
    setSubCategory(item.subCategory);
    setCategory(item.parentCategory);
    setShowSubModal(false);
    setSubSearchQuery('');
  };

  const isFormValid = () => {
    return (
      businessName.trim().length > 0 &&
      category !== '' &&
      subCategory !== '' &&
      phone.trim().length > 0 &&
      location.trim().length > 0 &&
      vendorCity.trim().length > 0 &&
      vendorPincode.trim().length === 6 &&
      termsAccepted
    );
  };

  const handleSave = async () => {
    if (!businessName || !category || !subCategory || !location || !phone || !vendorCity || !vendorPincode) {
      Alert.alert("Missing Fields", "Please complete all required location, contact, and business details.");
      return;
    }

    if (!termsAccepted) {
      Alert.alert("Terms Required", "Please accept the Terms & Conditions to submit your business.");
      return;
    }

    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not logged in');

      if (!isEditing) {
        const existingQuery = query(
          collection(db, 'vendors'),
          where('userId', '==', userId),
          where('subCategory', '==', subCategory)
        );
        const existingSnap = await getDocs(existingQuery);
        if (!existingSnap.empty) {
          setLoading(false);
          Alert.alert(
            "Sub-Category Already Registered",
            `You already have a business registered under "${subCategory}". You can only add a new business under a different sub-category.`
          );
          return;
        }
      }

      let finalLogoUrl = logo;
      if (logo && (logo.startsWith('file://') || logo.startsWith('/') || !logo.startsWith('http'))) {
        try {
          const response = await fetch(logo);
          const blob = await response.blob();
          const filename = `vendors/${userId}/logo_${Date.now()}.jpg`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          finalLogoUrl = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.error('Error uploading logo:', uploadError);
        }
      }

      const uploadedImagesUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img && (img.startsWith('file://') || img.startsWith('/') || !img.startsWith('http'))) {
          try {
            const response = await fetch(img);
            const blob = await response.blob();
            const filename = `vendors/${userId}/showcase_${i}_${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);
            uploadedImagesUrls.push(url);
          } catch (uploadError) {
            console.error(`Error uploading showcase image ${i}:`, uploadError);
            uploadedImagesUrls.push(img);
          }
        } else {
          uploadedImagesUrls.push(img);
        }
      }

      let finalLat = latitude;
      let finalLng = longitude;

      if (finalLat === null || finalLng === null) {
        try {
          const queryStr = encodeURIComponent(`${location} ${vendorCity} India`);
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${queryStr}&format=json&limit=1`, {
            headers: { 'User-Agent': 'MeesentApp/1.0' }
          });
          const data = await res.json();
          if (data && data.length > 0) {
            finalLat = parseFloat(data[0].lat);
            finalLng = parseFloat(data[0].lon);
          }
        } catch (err) {
          console.warn("Nominatim Geocoding fallback failed for vendor:", err);
        }
      }

      if (finalLat === null || finalLng === null) {
        finalLat = 17.3850;
        finalLng = 78.4867;
      }

      const hash = geohashForLocation([finalLat, finalLng]);

      const primaryBrand = selectedBrands.length > 0 ? selectedBrands[0] : '';

      const vendorData: any = {
        businessName,
        category,
        subCategory,
        brand: primaryBrand,
        brands: selectedBrands,
        type,
        location,
        phone,
        description,
        images: finalLogoUrl ? [finalLogoUrl, ...uploadedImagesUrls.filter(x => x !== finalLogoUrl)] : uploadedImagesUrls,
        image: finalLogoUrl || '',
        latitude: finalLat,
        longitude: finalLng,
        geohash: hash,
        pincode: vendorPincode || '',
        city: vendorCity || '',
        gstNumber,
        panNumber,
        openingTime: openingTime || '09:00 AM',
        closingTime: closingTime || '09:00 PM',
        workingDays: workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        updatedAt: serverTimestamp(),
      };

      // Auto-register any new brands into Firestore brands collection so they become searchable globally
      for (const bName of selectedBrands) {
        try {
          const brandQuery = query(collection(db, 'brands'), where('brandName', '==', bName), where('subCategory', '==', subCategory));
          const brandSnap = await getDocs(brandQuery);
          if (brandSnap.empty) {
            await addDoc(collection(db, 'brands'), {
              brandName: bName,
              category: category,
              categoryName: category,
              subCategory: subCategory,
              createdAt: serverTimestamp(),
            });
          }
        } catch (brandErr) {
          console.warn('Auto brand register notice:', brandErr);
        }
      }

      if (planData) {
        vendorData.planId = planData.planId;
        vendorData.planDurationId = planData.planDurationId;
        vendorData.paymentOption = planData.paymentOption;
        vendorData.totalPayable = planData.totalPayable;
        vendorData.subscriptionStatus = 'pending_payment';
      }

      if (isEditing) {
        let businessId = businessIdFromRoute;
        if (!businessId) {
          const userDocSnap = await getDoc(doc(db, 'users', userId));
          businessId = userId;
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.businessId) {
              businessId = userData.businessId;
            }
          }
        }

        await updateDoc(doc(db, 'vendors', businessId), vendorData);
        
        await setDoc(doc(db, 'providers', userId), {
          userId: userId,
          name: businessName,
          category: category,
          lat: finalLat,
          lng: finalLng,
          geohash: hash,
          serviceRadiusKm: 8,
          phone: phone,
          address: location
        }, { merge: true });

        Toast.show({ type: 'success', text1: 'Success', text2: 'Business details updated!' });
        navigation.goBack();
      } else {
        vendorData.ownerId = userId;
        vendorData.userId = userId; 
        vendorData.status = 'pending_approval'; 
        vendorData.createdAt = serverTimestamp();
        vendorData.publiclyVisible = false;
        
        // New registered business defaults (requires verification & manual plan activation)
        vendorData.planExpiry = null;
        vendorData.planStartDate = null;
        vendorData.planUpdatedAt = null;
        vendorData.planId = null;
        vendorData.plan = 'none';
        vendorData.planBundle = null;
        vendorData.subscriptionStatus = 'inactive';
        vendorData.tookVerification = false;
        vendorData.isVerified = false;
        vendorData.verifyMark = false;
        vendorData.verificationStatus = 'unverified';

        const businessRef = doc(collection(db, 'vendors'));
        await setDoc(businessRef, vendorData);
        
        await setDoc(doc(db, 'providers', userId), {
          userId: userId,
          name: businessName,
          category: category,
          lat: finalLat,
          lng: finalLng,
          geohash: hash,
          serviceRadiusKm: 8,
          phone: phone,
          address: location
        });

        await updateDoc(doc(db, 'users', userId), {
          isVendor: true,
          vendorStatus: 'pending_approval',
          businessId: businessRef.id,
        });

        try {
          const { default: ns } = require('../../services/notification.service');
          ns.sendLocalNotification(
            'Business Details Submitted 📋',
            `Your business details for "${businessName}" have been successfully submitted and are under review.`,
            { module: 'services', isService: true, screen: 'ServicesHome' }
          );
        } catch (e) {
          console.log('Error triggering local notification:', e);
        }

        Toast.show({ type: 'success', text1: 'Submission Successful', text2: 'Your business profile has been submitted for review!' });
        navigation.navigate('VendorDashboard', { businessId: businessRef.id });
      }
    } catch (error: any) {
      console.error("Error saving business profile:", error);
      Alert.alert("Submission Failed", error.message || "Failed to submit business details.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0035a0" />
        <Text style={styles.loadingText}>Fetching business profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
              <Ionicons name="chevron-back" size={22} color="#1e293b" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Business Registration</Text>
              <Text style={styles.headerSubtitle}>{isEditing ? 'Edit your business profile' : 'Complete your business details'}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 1: Business Identity */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Business Profile & Name</Text>
            <Text style={styles.cardHeaderSub}>Upload logo, enter name and model type.</Text>

            {/* Logo upload placeholder */}
            <View style={styles.logoUploadContainer}>
              {logo ? (
                <View style={styles.logoPreviewWrapper}>
                  <Image source={{ uri: logo }} style={styles.logoPreviewImage} />
                  <TouchableOpacity style={styles.removeLogoBadge} onPress={() => setLogo(null)}>
                    <Ionicons name="trash" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.logoPlaceholderBox} onPress={pickLogo}>
                  <LinearGradient
                    colors={['#f8fafc', '#eff6ff']}
                    style={styles.logoPlaceholderGradient}
                  >
                    <View style={styles.uploadIconBackground}>
                      <Ionicons name="image-outline" size={28} color="#0035a0" />
                    </View>
                    <Text style={styles.uploadMainText}>Add Logo Photo</Text>
                    <Text style={styles.uploadSubText}>PNG or JPG (Max 5MB)</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* Business Name Input */}
            <View style={[styles.inputGroup, { marginTop: 24 }]}>
              <Text style={styles.inputLabel}>BUSINESS NAME *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={18} color="#0035a0" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Athidi Grand Restaurant"
                  placeholderTextColor="#94a3b8"
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>
            </View>

            {/* Business Type Cards */}
            <Text style={[styles.inputLabel, { marginTop: 16, marginBottom: 8 }]}>BUSINESS TYPE *</Text>
            <View style={styles.typeOptionsRow}>
              <TouchableOpacity
                style={[styles.typeOptionCard, type === 'service' && styles.typeOptionCardActive]}
                onPress={() => setType('service')}
              >
                <View style={[styles.typeIconBox, type === 'service' && styles.typeIconBoxActive]}>
                  <Ionicons name="construct-outline" size={20} color={type === 'service' ? 'white' : '#64748b'} />
                </View>
                <Text style={[styles.typeTitle, type === 'service' && styles.typeTitleActive]}>
                  Service & Retail
                </Text>
                {type === 'service' && (
                  <View style={styles.selectedCheckBadge}>
                    <Ionicons name="checkmark" size={10} color="white" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeOptionCard, type === 'product' && styles.typeOptionCardActive]}
                onPress={() => setType('product')}
              >
                <View style={[styles.typeIconBox, type === 'product' && styles.typeIconBoxActive]}>
                  <Ionicons name="cart-outline" size={20} color={type === 'product' ? 'white' : '#64748b'} />
                </View>
                <Text style={[styles.typeTitle, type === 'product' && styles.typeTitleActive]}>
                  Manufacturer & B2B
                </Text>
                {type === 'product' && (
                  <View style={styles.selectedCheckBadge}>
                    <Ionicons name="checkmark" size={10} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 2: Industry Category */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Category Classification</Text>
            <Text style={styles.cardHeaderSub}>Select your sub-category niche classification.</Text>

            <View style={[styles.inputGroup, { marginTop: 16 }]}>
              <Text style={styles.inputLabel}>SUB-CATEGORY / NICHE *</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setShowSubModal(true)}
              >
                <Ionicons name="layers-outline" size={18} color="#0035a0" style={styles.inputIcon} />
                <Text style={[styles.dropdownValueText, !subCategory && { color: '#94a3b8' }]}>
                  {subCategory || 'Select your sub-category...'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.dropdownChevron} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { marginTop: 16 }]}>
              <Text style={styles.inputLabel}>MAIN CATEGORY (AUTO-SELECTED)</Text>
              <View style={[styles.dropdownTrigger, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', opacity: 0.7 }]}>
                <Ionicons name="grid-outline" size={18} color="#64748b" style={styles.inputIcon} />
                <Text style={[styles.dropdownValueText, { color: category ? '#334155' : '#94a3b8' }]}>
                  {category || 'Auto-selected based on niche'}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color={category ? '#10b981' : '#cbd5e1'} style={styles.dropdownChevron} />
              </View>
            </View>
          </View>

          {/* Card: Brands Handled / Offered */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Brands Handled / Offered</Text>
            <Text style={styles.cardHeaderSub}>Select or add the brands your business deals with under this niche.</Text>

            {/* Select from existing category brands if available */}
            {availableCategoryBrands.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.inputLabel, { marginBottom: 8 }]}>POPULAR BRANDS IN THIS CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {availableCategoryBrands.map((bName) => {
                    const isSelected = selectedBrands.includes(bName);
                    return (
                      <TouchableOpacity
                        key={bName}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#0035a0' : '#e2e8f0',
                          backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6
                        }}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedBrands(selectedBrands.filter(b => b !== bName));
                          } else {
                            setSelectedBrands([...selectedBrands, bName]);
                          }
                        }}
                      >
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                          size={16}
                          color={isSelected ? "#0035a0" : "#64748b"}
                        />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#0035a0' : '#475569' }}>
                          {bName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Add Custom Brand Input */}
            <View style={[styles.inputGroup, { marginTop: 16 }]}>
              <Text style={styles.inputLabel}>ADD OTHER BRAND NAME</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <Ionicons name="pricetag-outline" size={18} color="#0035a0" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Samsung, Panasonic, LG..."
                    placeholderTextColor="#94a3b8"
                    value={customBrandInput}
                    onChangeText={setCustomBrandInput}
                  />
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#0035a0',
                    paddingHorizontal: 18,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    const trimmed = customBrandInput.trim();
                    if (trimmed) {
                      if (!selectedBrands.includes(trimmed)) {
                        setSelectedBrands([...selectedBrands, trimmed]);
                      }
                      setCustomBrandInput('');
                    }
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Display selected brands chip tags */}
            {selectedBrands.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.inputLabel, { marginBottom: 8 }]}>SELECTED BRANDS ({selectedBrands.length})</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {selectedBrands.map((bName) => (
                    <View
                      key={bName}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#e0edfa',
                        borderColor: '#9dbff2',
                        borderWidth: 1.5,
                        borderRadius: 16,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        gap: 6
                      }}
                    >
                      <Ionicons name="pricetag" size={12} color="#0035a0" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0035a0' }}>{bName}</Text>
                      <TouchableOpacity onPress={() => setSelectedBrands(selectedBrands.filter(b => b !== bName))}>
                        <Ionicons name="close-circle" size={16} color="#0035a0" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Card: Business Operating Hours & Days */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Business Hours & Operating Days</Text>
            <Text style={styles.cardHeaderSub}>Set shop opening & closing times and active working days.</Text>

            {/* Timings Row */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>OPENING TIME *</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setShowOpeningTimeModal(true)}
                >
                  <Ionicons name="time-outline" size={18} color="#0035a0" style={styles.inputIcon} />
                  <Text style={styles.dropdownValueText}>{openingTime}</Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" style={styles.dropdownChevron} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CLOSING TIME *</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setShowClosingTimeModal(true)}
                >
                  <Ionicons name="time-outline" size={18} color="#0035a0" style={styles.inputIcon} />
                  <Text style={styles.dropdownValueText}>{closingTime}</Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" style={styles.dropdownChevron} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Working Days Checkboxes */}
            <Text style={[styles.inputLabel, { marginTop: 16, marginBottom: 8 }]}>WORKING DAYS OPEN *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { id: 'Sun', label: 'Sunday' },
                { id: 'Mon', label: 'Monday' },
                { id: 'Tue', label: 'Tuesday' },
                { id: 'Wed', label: 'Wednesday' },
                { id: 'Thu', label: 'Thursday' },
                { id: 'Fri', label: 'Friday' },
                { id: 'Sat', label: 'Saturday' },
              ].map((day) => {
                const isSelected = workingDays.includes(day.id);
                return (
                  <TouchableOpacity
                    key={day.id}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#0035a0' : '#cbd5e1',
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}
                    onPress={() => {
                      if (isSelected) {
                        if (workingDays.length <= 1) {
                          Alert.alert("Notice", "At least one working day must be selected.");
                          return;
                        }
                        setWorkingDays(workingDays.filter(d => d !== day.id));
                      } else {
                        setWorkingDays([...workingDays, day.id]);
                      }
                    }}
                  >
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={16}
                      color={isSelected ? "#0035a0" : "#94a3b8"}
                    />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#0035a0' : '#475569' }}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Card 3: Location & Address */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Contact & Location</Text>
            <Text style={styles.cardHeaderSub}>Enter phone, direct address, city and pincode.</Text>

            <View style={[styles.inputGroup, { marginTop: 16 }]}>
              <Text style={styles.inputLabel}>CONTACT PHONE *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color="#0035a0" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. +91 95738 38144"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CITY *</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Hyderabad"
                    placeholderTextColor="#94a3b8"
                    value={vendorCity}
                    onChangeText={setVendorCity}
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>PINCODE *</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 500001"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={vendorPincode}
                    onChangeText={(val) => setVendorPincode(val.replace(/[^0-9]/g, ''))}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHYSICAL ADDRESS *</Text>
              <View style={[styles.inputWrapper, { height: 75, alignItems: 'flex-start', paddingTop: 10 }]}>
                <Ionicons name="map-outline" size={18} color="#0035a0" style={[styles.inputIcon, { marginTop: 2 }]} />
                <TextInput
                  style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                  placeholder="Enter physical shop address..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.detectLocationBtn}
              onPress={getCurrentLocation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="locate" size={18} color="white" />
                  <Text style={styles.detectLocationBtnText}>Auto-Detect GPS Location</Text>
                </>
              )}
            </TouchableOpacity>

            {latitude && longitude ? (
              <View style={styles.locationCapturedCard}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <View style={styles.capturedLocationInfo}>
                  <Text style={styles.capturedLocationTitle}>GPS Coordinates Fixed</Text>
                  <Text style={styles.capturedLocationSub}>
                    Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.locationWarningCard}>
                <Ionicons name="warning-outline" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
                <Text style={styles.locationWarningText}>
                  Detecting device location helps local customers locate your shop nearby.
                </Text>
              </View>
            )}
          </View>

          {/* Card 4: Legal Documents (Optional) */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Legal Verification (Optional)</Text>
            <Text style={styles.cardHeaderSub}>Add verification records to gain consumer trust.</Text>

            <View style={[styles.inputGroup, { marginTop: 16 }]}>
              <Text style={styles.inputLabel}>GSTIN NUMBER</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="receipt-outline" size={18} color="#0035a0" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  value={gstNumber}
                  onChangeText={setGstNumber}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { marginTop: 16 }]}>
              <Text style={styles.inputLabel}>BUSINESS PAN CARD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={18} color="#0035a0" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. ABCDE1234F"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  value={panNumber}
                  onChangeText={setPanNumber}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.uploadDocButton}>
              <Ionicons name="cloud-upload-outline" size={18} color="#0035a0" />
              <Text style={styles.uploadDocText}>Upload Trade License / Certificate</Text>
            </TouchableOpacity>
          </View>

          {/* Card 5: Gallery & Description */}
          <View style={styles.formCard}>
            <Text style={styles.cardHeaderTitle}>Showcase & Gallery</Text>
            <Text style={styles.cardHeaderSub}>Upload multiple business images and summaries.</Text>

            <View style={[styles.inputGroup, { marginTop: 16 }]}>
              <Text style={styles.inputLabel}>BUSINESS DESCRIPTION (OPTIONAL)</Text>
              <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                <Ionicons name="document-text-outline" size={18} color="#0035a0" style={[styles.inputIcon, { marginTop: 2 }]} />
                <TextInput
                  style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                  placeholder="Describe your specialties, shop timings, etc..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>BUSINESS GALLERY PHOTOS</Text>
            <TouchableOpacity style={styles.addImagesButton} onPress={pickMultipleImages}>
              <Ionicons name="images-outline" size={20} color="#0035a0" />
              <Text style={styles.addImagesButtonText}>Add Showcase Images</Text>
              <Text style={styles.addImagesButtonSub}>Tap to select multiple photos</Text>
            </TouchableOpacity>

            {images.length > 0 && (
              <View style={styles.imagesGrid}>
                {images.map((imageUri, index) => (
                  <View key={index} style={styles.imageItem}>
                    <Image source={{ uri: imageUri }} style={styles.imageThumbnail} />
                    <TouchableOpacity
                      style={styles.imageRemoveButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close" size={10} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Card 6: Submission Terms */}
          <View style={[styles.formCard, { marginBottom: 30 }]}>
            <Text style={styles.cardHeaderTitle}>Accept Terms & Launch</Text>
            <Text style={styles.cardHeaderSub}>Review listing agreement checklist.</Text>

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
                {termsAccepted && <Ionicons name="checkmark" size={12} color="white" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I agree to the <Text style={styles.checkboxLink} onPress={() => navigation.navigate('TermsConditions')}>Terms & Conditions</Text> and confirm the details are correct.
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Sticky Footer CTA */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isFormValid() && styles.submitButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!isFormValid() || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'Update Business' : 'Submit Business'}
                </Text>
                <Ionicons
                  name={isEditing ? 'checkmark' : 'rocket-outline'}
                  size={16}
                  color="white"
                  style={{ marginLeft: 6 }}
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <Toast />

      {/* Subcategory Modal */}
      <Modal visible={showSubModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Sub-Category</Text>
            <TouchableOpacity onPress={() => setShowSubModal(false)}>
              <Ionicons name="close-circle" size={32} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search niche categories..."
              value={subSearchQuery}
              onChangeText={setSubSearchQuery}
            />
          </View>
          <FlatList
            data={subCategoriesToDisplay}
            keyExtractor={(item) => `${item.subCategory}-${item.parentCategory}`}
            renderItem={({ item }) => {
              const isAlreadyRegistered = !isEditing && userRegisteredSubCats.includes(item.subCategory);
              return (
                <TouchableOpacity
                  style={[styles.categoryItem, isAlreadyRegistered && { opacity: 0.6 }]}
                  onPress={() => handleSubCategorySelect(item)}
                >
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.categoryItemText}>{item.subCategory}</Text>
                      {isAlreadyRegistered && (
                        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#dc2626' }}>Already Registered</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.categorySubText}>{item.parentCategory}</Text>
                  </View>
                  {subCategory === item.subCategory && category === item.parentCategory ? (
                    <Ionicons name="checkmark-circle" size={20} color="#0035a0" />
                  ) : isAlreadyRegistered ? (
                    <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
                  ) : null}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </Modal>

      {/* Image Remove Confirmation */}
      <Modal visible={showImageRemoveModal} transparent animationType="fade">
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIconContainer}>
              <Ionicons name="warning-outline" size={48} color="#f59e0b" />
            </View>
            <Text style={styles.confirmModalTitle}>Remove Image?</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to remove this image permanently? This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={cancelRemoveImage}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalConfirmButton}
                onPress={confirmRemoveImage}
              >
                <Text style={styles.confirmModalConfirmText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Opening Time Modal */}
      <Modal visible={showOpeningTimeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Opening Time</Text>
            <TouchableOpacity onPress={() => setShowOpeningTimeModal(false)}>
              <Ionicons name="close-circle" size={32} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={TIME_CHOICES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => {
                  setOpeningTime(item);
                  setShowOpeningTimeModal(false);
                }}
              >
                <Text style={styles.categoryItemText}>{item}</Text>
                {openingTime === item && (
                  <Ionicons name="checkmark-circle" size={20} color="#0035a0" />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </Modal>

      {/* Closing Time Modal */}
      <Modal visible={showClosingTimeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Closing Time</Text>
            <TouchableOpacity onPress={() => setShowClosingTimeModal(false)}>
              <Ionicons name="close-circle" size={32} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={TIME_CHOICES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => {
                  setClosingTime(item);
                  setShowClosingTimeModal(false);
                }}
              >
                <Text style={styles.categoryItemText}>{item}</Text>
                {closingTime === item && (
                  <Ionicons name="checkmark-circle" size={20} color="#0035a0" />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 15,
    color: '#0035a0',
    fontWeight: 'bold',
    fontSize: 15,
  },
  
  // Header
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0035a0',
    marginTop: 2,
  },
  
  // Scrollable Body Content
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Premium layout form cards
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.015,
    shadowRadius: 10,
    elevation: 1,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 2,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 16,
  },
  
  // Step 1 - Logo Upload
  logoUploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  logoPreviewWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: '#f0f5fc',
    position: 'relative',
  },
  logoPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 65,
  },
  removeLogoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#ef4444',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  logoPlaceholderBox: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#0035a0',
    borderStyle: 'dashed',
  },
  logoPlaceholderGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  uploadIconBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  uploadMainText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0035a0',
    marginBottom: 2,
  },
  uploadSubText: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
  },
  
  // Input styling
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  typeOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOptionCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  typeOptionCardActive: {
    borderColor: '#0035a0',
    backgroundColor: '#f0f5fc',
  },
  typeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeIconBoxActive: {
    backgroundColor: '#0035a0',
    borderColor: '#0035a0',
  },
  typeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'center',
  },
  typeTitleActive: {
    color: '#0035a0',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0035a0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Dropdowns
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    paddingHorizontal: 14,
    height: 48,
  },
  dropdownValueText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  dropdownChevron: {
    marginLeft: 6,
  },
  
  // GPS Location button
  detectLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0035a0',
    height: 44,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detectLocationBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  locationCapturedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#dcfce7',
  },
  capturedLocationInfo: {
    marginLeft: 10,
    flex: 1,
  },
  capturedLocationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  capturedLocationSub: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '600',
  },
  locationWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#fef3c7',
  },
  locationWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#b45309',
    fontWeight: '600',
    lineHeight: 15,
  },
  
  // Docs
  uploadDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  uploadDocText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0035a0',
  },
  
  // Summary Details
  reviewSummaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    gap: 10,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  reviewValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'right',
    marginLeft: 15,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingRight: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1.5,
  },
  checkboxActive: {
    backgroundColor: '#0035a0',
    borderColor: '#0035a0',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 16,
  },
  checkboxLink: {
    color: '#0035a0',
    fontWeight: '700',
  },
  
  // Footer Submit
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0035a0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  
  // Modal Picker
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    fontWeight: '900',
    color: '#1e293b',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  categoryItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  categorySubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },

  // Multi-Image Showcase
  addImagesButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 12,
    justifyContent: 'center',
    gap: 4,
  },
  addImagesButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0035a0',
    textAlign: 'center',
  },
  addImagesButtonSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 10,
  },
  imageItem: {
    position: 'relative',
    width: 70,
    height: 70,
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Image remove Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  confirmModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 6,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  confirmModalCancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  confirmModalCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  confirmModalConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalConfirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});