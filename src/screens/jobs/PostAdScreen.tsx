import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import RazorpayCheckout from 'react-native-razorpay';
import { db, auth, storage } from '../../services/firebase';
import { RAZORPAY_CONFIG } from '../../config/razorpay';
import { collection, addDoc, serverTimestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Toast from 'react-native-toast-message';
import { PINCODES } from '../../data/pincodes';
import notificationService from '../../services/notification.service';

const { width } = Dimensions.get('window');

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function PostAdScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [adLoading, setAdLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>({ name: '', email: '', phone: '' });

  const sourceApp = route?.params?.sourceApp || 'Jobs';
  const brandColor = sourceApp === 'Services' ? '#3b5fa6' : '#0035a0';
  const brandBgColor = sourceApp === 'Services' ? '#e8effb' : '#f0f5fc';

  // Ad Details Form State
  const [adImage, setAdImage] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'week' | 'month'>('month');

  // Targeting States
  const [targetType, setTargetType] = useState<'pincode' | 'district' | 'state'>('pincode');
  const [adPincodes, setAdPincodes] = useState<string[]>([]);
  const [pincodeQuery, setPincodeQuery] = useState('');
  const [pincodeSuggestions, setPincodeSuggestions] = useState<any[]>([]);

  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [districtQuery, setDistrictQuery] = useState('');
  const [districtSuggestions, setDistrictSuggestions] = useState<string[]>([]);

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [stateQuery, setStateQuery] = useState('');
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);

  // Dynamic Pincode Ad Rate from Admin Pricing Config
  const [weeklyAdPrice, setWeeklyAdPrice] = useState<number>(29);
  const [monthlyAdPrice, setMonthlyAdPrice] = useState<number>(99);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch('http://10.0.2.2:5000/api/pricing');
        const data = await res.json();
        if (data.success && data.pricing) {
          const p = data.pricing;
          if (sourceApp === 'Services') {
            setWeeklyAdPrice(Number(p.servicesPincodeAdWeekly || 29));
            setMonthlyAdPrice(Number(p.servicesPincodeAdMonthly || p.servicesPincodeAdPrice || p.pincodeAdPrice || 99));
          } else {
            setWeeklyAdPrice(Number(p.jobsPincodeAdWeekly || 29));
            setMonthlyAdPrice(Number(p.jobsPincodeAdMonthly || p.jobsPincodeAdPrice || p.pincodeAdPrice || 99));
          }
        }
      } catch (_) {}
    };

    fetchPricing();

    const unsubPricing = onSnapshot(doc(db, 'config', 'service_pricing'), (snapshot) => {
      if (snapshot.exists()) {
        const p = snapshot.data();
        if (sourceApp === 'Services') {
          setWeeklyAdPrice(Number(p.servicesPincodeAdWeekly || 29));
          setMonthlyAdPrice(Number(p.servicesPincodeAdMonthly || p.servicesPincodeAdPrice || p.pincodeAdPrice || 99));
        } else {
          setWeeklyAdPrice(Number(p.jobsPincodeAdWeekly || 29));
          setMonthlyAdPrice(Number(p.jobsPincodeAdMonthly || p.jobsPincodeAdPrice || p.pincodeAdPrice || 99));
        }
      }
    }, (err) => {
      console.warn("Pincode ad pricing listener notice, using API fallback:", err);
      fetchPricing();
    });
    return () => unsubPricing();
  }, [sourceApp]);

  // Derived Target Rates
  const ratePerPincode = selectedPlan === 'week' ? weeklyAdPrice : monthlyAdPrice;
  const totalAmount = adPincodes.length * ratePerPincode;

  // Fetch current user details on mount to prefill payments
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            name: data.name || 'User',
            email: auth.currentUser?.email || 'user@example.com',
            phone: data.phone || auth.currentUser?.phoneNumber || '9876543210',
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    fetchUserData();

    // Debug pincode dataset statistics
    const apAll = PINCODES.filter(p => p.state.trim().toLowerCase() === 'andhra pradesh');
    const apUnique = Array.from(new Set(apAll.map(p => p.pincode)));
    const tgAll = PINCODES.filter(p => p.state.trim().toLowerCase() === 'telangana');
    const tgUnique = Array.from(new Set(tgAll.map(p => p.pincode)));
    console.log("=== PINCODES DATASET STATS ===");
    console.log("AP Total rows:", apAll.length, "Unique Pincodes:", apUnique.length);
    console.log("Telangana Total rows:", tgAll.length, "Unique Pincodes:", tgUnique.length);
  }, []);

  // Filter pincodes autocomplete suggestions (optimized for >10,000 items)
  useEffect(() => {
    if (!pincodeQuery) {
      setPincodeSuggestions([]);
      return;
    }
    const queryLower = pincodeQuery.toLowerCase();

    // Fast early-break loop to avoid UI lag with large dataset
    const matches: any[] = [];
    for (let i = 0; i < PINCODES.length; i++) {
      const item = PINCODES[i];
      const match = item.pincode.startsWith(queryLower) ||
        item.city.toLowerCase().includes(queryLower) ||
        item.area.toLowerCase().includes(queryLower);
      if (match) {
        matches.push(item);
        if (matches.length >= 10) {
          break;
        }
      }
    }
    setPincodeSuggestions(matches);
  }, [pincodeQuery]);

  // Derived District & State lists
  const uniqueStates = useMemo(() => ['Andhra Pradesh', 'Telangana'], []);

  // Dynamically derive unique districts from the PINCODES dataset (matching AP and Telangana)
  const uniqueDistricts = useMemo(() => {
    const districtsSet = new Set<string>();
    const allowedStates = ['andhra pradesh', 'telangana'];

    for (let i = 0; i < PINCODES.length; i++) {
      const item = PINCODES[i];
      if (item.state && allowedStates.includes(item.state.trim().toLowerCase())) {
        if (item.city) {
          districtsSet.add(item.city.trim().toUpperCase());
        }
      }
    }
    return Array.from(districtsSet).sort((a, b) => a.localeCompare(b));
  }, []);

  // Filter districts suggestions
  useEffect(() => {
    if (!districtQuery) {
      setDistrictSuggestions(uniqueDistricts);
      return;
    }
    const queryLower = districtQuery.toLowerCase();
    const filtered = uniqueDistricts.filter(dist =>
      dist.toLowerCase().includes(queryLower)
    );
    setDistrictSuggestions(filtered);
  }, [districtQuery, uniqueDistricts]);

  // Filter states suggestions
  useEffect(() => {
    if (!stateQuery) {
      setStateSuggestions(uniqueStates);
      return;
    }
    const queryLower = stateQuery.toLowerCase();
    const filtered = uniqueStates.filter(st =>
      st.toLowerCase().includes(queryLower)
    );
    setStateSuggestions(filtered);
  }, [stateQuery, uniqueStates]);

  const handleTargetTypeChange = (type: 'pincode' | 'district' | 'state') => {
    setTargetType(type);
    setAdPincodes([]);
    setSelectedDistrict(null);
    setSelectedState(null);
    setDistrictQuery('');
    setStateQuery('');
    setPincodeQuery('');
  };

  const handleSelectDistrict = (district: string) => {
    setSelectedDistrict(district);
    const districtPins = PINCODES.filter(
      item => item.city.trim().toLowerCase() === district.trim().toLowerCase()
    ).map(item => item.pincode);
    setAdPincodes(Array.from(new Set(districtPins)));
    setDistrictQuery('');
    setDistrictSuggestions([]);
  };

  const handleSelectState = (state: string) => {
    setSelectedState(state);
    const statePins = PINCODES.filter(
      item => item.state.trim().toLowerCase() === state.trim().toLowerCase()
    ).map(item => item.pincode);
    setAdPincodes(Array.from(new Set(statePins)));
    setStateQuery('');
    setStateSuggestions([]);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setAdImage(result.assets[0].uri);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to pick image' });
    }
  };

  // Submit Ad & Payment Transaction Logs
  const saveAdCampaignToDatabase = async (paymentId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Calculate Campaign Expiry Date
    const daysToAdd = selectedPlan === 'week' ? 7 : 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysToAdd);

    let finalImageUrl: string | null = null;
    if (adImage && (adImage.startsWith('file://') || adImage.startsWith('/') || !adImage.startsWith('http'))) {
      try {
        const response = await fetch(adImage);
        const blob = await response.blob();
        
        const filename = `ads/${userId}/ads_${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        
        finalImageUrl = await getDownloadURL(storageRef);
      } catch (uploadError) {
        console.error('Error uploading ad image to storage:', uploadError);
        // Do NOT save the local file:// path — it won't work on any other render.
        // finalImageUrl stays null; the campaign will show "No image banner" placeholder.
        Toast.show({
          type: 'error',
          text1: 'Image Upload Failed',
          text2: 'Storage permission denied. Please update Firebase Storage Rules to allow writes to ads/ folder.',
        });
      }
    } else if (adImage && adImage.startsWith('http')) {
      // Already a remote URL (e.g. re-submit flow)
      finalImageUrl = adImage;
    }

    // Save ad doc (optimized schema to avoid giant array bloat in Firestore)
    const adDocRef = await addDoc(collection(db, 'pincode_ads'), {
      imageUrl: finalImageUrl,
      pincode: adPincodes[0] || '',
      pincodes: adPincodes,
      pincodeCount: adPincodes.length,
      targetType,
      targetDistrict: selectedDistrict || '',
      targetState: selectedState || '',
      title: '',
      description: '',
      userId,
      status: 'active',
      plan: selectedPlan,
      amountPaid: totalAmount,
      endDate: endDate,
      paymentId: paymentId,
      sourceApp, // Dynamically set sourceApp ('Jobs' or 'Services')
      createdAt: serverTimestamp(),
    });

    // Save payment log
    await addDoc(collection(db, 'payments'), {
      userId,
      adId: adDocRef.id,
      amount: totalAmount,
      paymentId: paymentId,
      status: 'success',
      description: `Pincode Ad Campaign (${selectedPlan === 'week' ? 'Week Plan' : 'Month Plan'})`,
      plan: selectedPlan,
      createdAt: serverTimestamp(),
      endDate: endDate,
      pincodes: adPincodes,
      pincodeCount: adPincodes.length,
      targetType,
      targetDistrict: selectedDistrict || '',
      targetState: selectedState || '',
      sourceApp,
      imageUrl: finalImageUrl,
    });

    // Create description based on targeting type
    let targetDesc = '';
    if (targetType === 'state') {
      targetDesc = `${selectedState} State`;
    } else if (targetType === 'district') {
      targetDesc = `${toTitleCase(selectedDistrict || '')} District`;
    } else {
      targetDesc = `${adPincodes.length} Pincode(s)`;
    }

    const notificationTitle = 'Ad Campaign Active 🚀';
    const notificationBody = `Your special ad campaign for ${targetDesc} has been successfully placed and is now running.`;

    // Trigger local push notification
    try {
      await notificationService.sendLocalNotification(notificationTitle, notificationBody);
    } catch (pushError) {
      console.error('Error sending local notification:', pushError);
    }
  };

  const handlePayment = async () => {
    if (!adImage || adPincodes.length === 0) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please upload a banner image and select targeted areas.' });
      return;
    }

    setAdLoading(true);

    const options = {
      description: `Targeted Ad Campaign - ${adPincodes.length} Pincodes`,
      image: 'https://img.icons8.com/fluency/96/bullhorn.png',
      currency: 'INR',
      key: RAZORPAY_CONFIG.keyId,
      amount: (totalAmount * 100).toString(), // Razorpay expects amount in paise
      name: 'Meesent Technology',
      prefill: {
        email: userProfile.email || 'user@example.com',
        contact: userProfile.phone || '9876543210',
        name: userProfile.name || 'User'
      },
      theme: { color: brandColor }
    };

    try {
      // Call native Razorpay module
      const data = await RazorpayCheckout.open(options);

      // Payment Successful
      await saveAdCampaignToDatabase(data.razorpay_payment_id);

      setAdLoading(false);
      navigation.goBack();
    } catch (error: any) {
      console.warn('Razorpay Error:', error);
      setAdLoading(false);

      if (error?.code !== 0) {
        Alert.alert(
          'Payment Cancelled or Failed',
          error.description || 'The payment was not completed. Please try again.'
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Post your special ads</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollForm} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Ad Image / Banner */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ad Image (Banner)</Text>
            <TouchableOpacity style={styles.imageUploadBox} onPress={handlePickImage}>
              {adImage ? (
                <Image source={{ uri: adImage }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={40} color={brandColor} />
                  <Text style={[styles.uploadTitle, { color: brandColor }]}>Upload Ad Banner</Text>
                  <Text style={styles.uploadSub}>Tap to browse photo gallery</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.ratioNote, { color: brandColor }]}>
              ⚠️ Note: Recommended banner ratio is 1500 * 850 Px (landscape format) for best fit on home screen.
            </Text>
          </View>



          {/* Plan Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Choose Promotion Plan</Text>
            <View style={styles.planContainer}>
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'week' && { borderColor: brandColor, backgroundColor: brandBgColor }]}
                onPress={() => setSelectedPlan('week')}
              >
                <View style={styles.planHeader}>
                  <Ionicons
                    name={selectedPlan === 'week' ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selectedPlan === 'week' ? brandColor : "#94a3b8"}
                  />
                  <Text style={styles.planTitle}>Weekly Plan</Text>
                </View>
                <Text style={styles.planPrice}>₹{weeklyAdPrice}<Text style={styles.planPeriod}> / pincode</Text></Text>
                <Text style={styles.planValidity}>Runs for 7 Days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'month' && { borderColor: brandColor, backgroundColor: brandBgColor }]}
                onPress={() => setSelectedPlan('month')}
              >
                <View style={styles.planHeader}>
                  <Ionicons
                    name={selectedPlan === 'month' ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selectedPlan === 'month' ? brandColor : "#94a3b8"}
                  />
                  <Text style={styles.planTitle}>Monthly Plan</Text>
                </View>
                <Text style={styles.planPrice}>₹{monthlyAdPrice}<Text style={styles.planPeriod}> / pincode</Text></Text>
                <Text style={styles.planValidity}>Runs for 30 Days</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Targeting Option */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Targeting Scope</Text>
            <View style={styles.targetTypeContainer}>
              <TouchableOpacity
                style={[styles.targetTypeBtn, targetType === 'pincode' && { backgroundColor: brandColor }]}
                onPress={() => handleTargetTypeChange('pincode')}
              >
                <Ionicons name="pin" size={14} color={targetType === 'pincode' ? 'white' : '#64748b'} />
                <Text style={[styles.targetTypeBtnText, targetType === 'pincode' && styles.targetTypeBtnTextActive]}>Pincodes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.targetTypeBtn, targetType === 'district' && { backgroundColor: brandColor }]}
                onPress={() => handleTargetTypeChange('district')}
              >
                <Ionicons name="business" size={14} color={targetType === 'district' ? 'white' : '#64748b'} />
                <Text style={[styles.targetTypeBtnText, targetType === 'district' && styles.targetTypeBtnTextActive]}>District</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.targetTypeBtn, targetType === 'state' && { backgroundColor: brandColor }]}
                onPress={() => handleTargetTypeChange('state')}
              >
                <Ionicons name="map" size={14} color={targetType === 'state' ? 'white' : '#64748b'} />
                <Text style={[styles.targetTypeBtnText, targetType === 'state' && styles.targetTypeBtnTextActive]}>State</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* District Targeting */}
          {targetType === 'district' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target District</Text>
              {selectedDistrict ? (
                <View style={styles.selectedAreaCard}>
                  <Ionicons name="business" size={24} color={brandColor} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.selectedAreaName}>{toTitleCase(selectedDistrict || '')} District</Text>
                    <Text style={styles.selectedAreaSub}>{adPincodes.length} pincodes included</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.clearAreaBtn}
                    onPress={() => handleTargetTypeChange('district')}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.textInput}
                    value={districtQuery}
                    onChangeText={setDistrictQuery}
                    placeholder="Search district name"
                  />
                  {districtSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 180 }}>
                        {districtSuggestions.map((dist) => (
                          <TouchableOpacity
                            key={dist}
                            style={styles.suggestionItem}
                            onPress={() => handleSelectDistrict(dist)}
                          >
                            <Ionicons name="business-outline" size={16} color="#475569" style={{ marginRight: 8 }} />
                            <Text style={styles.suggestionText}>{toTitleCase(dist)}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* State Targeting */}
          {targetType === 'state' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target State</Text>
              {selectedState ? (
                <View style={styles.selectedAreaCard}>
                  <Ionicons name="map" size={24} color={brandColor} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.selectedAreaName}>{selectedState}</Text>
                    <Text style={styles.selectedAreaSub}>{adPincodes.length} pincodes included</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.clearAreaBtn}
                    onPress={() => handleTargetTypeChange('state')}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.textInput}
                    value={stateQuery}
                    onChangeText={setStateQuery}
                    placeholder="Search state name"
                  />
                  {stateSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 180 }}>
                        {stateSuggestions.map((st) => (
                          <TouchableOpacity
                            key={st}
                            style={styles.suggestionItem}
                            onPress={() => handleSelectState(st)}
                          >
                            <Ionicons name="map-outline" size={16} color="#475569" style={{ marginRight: 8 }} />
                            <Text style={styles.suggestionText}>{st}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Unified Targeted Pincodes Search & Chips List */}
          {(adPincodes.length > 0 || targetType === 'pincode') && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {targetType === 'pincode' ? 'Select Pincodes' : 'Targeted Pincodes List (Customize)'}
              </Text>
              <TextInput
                style={styles.textInput}
                value={pincodeQuery}
                onChangeText={setPincodeQuery}
                placeholder="Search and add another pincode..."
                keyboardType="default"
              />

              {pincodeSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {pincodeSuggestions.map((item, index) => (
                    <TouchableOpacity
                      key={`${item.pincode}-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => {
                        if (!adPincodes.includes(item.pincode)) {
                          setAdPincodes([...adPincodes, item.pincode]);
                        }
                        setPincodeQuery('');
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

              {/* Selected Pincodes Chips */}
              {adPincodes.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.chipsContainer}>
                    {adPincodes.slice(0, 80).map((pin, index) => {
                      const detail = PINCODES.find(p => p.pincode === pin);
                      return (
                        <View key={`${pin}-${index}`} style={styles.chip}>
                          <Text style={styles.chipText}>
                            {pin} {detail ? `(${toTitleCase(detail.city)})` : ''}
                          </Text>
                          <TouchableOpacity
                            style={styles.chipRemoveBtn}
                            onPress={() => setAdPincodes(adPincodes.filter(p => p !== pin))}
                          >
                            <Ionicons name="close-circle" size={16} color="#475569" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>

                  {adPincodes.length > 80 && (
                    <View style={[styles.morePincodesBadge, { borderColor: brandBgColor, backgroundColor: brandBgColor + '20' }]}>
                      <Ionicons name="information-circle-outline" size={14} color={brandColor} style={{ marginRight: 4 }} />
                      <Text style={[styles.morePincodesText, { color: brandColor }]}>
                        + {adPincodes.length - 80} more pincodes targeted in this campaign
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Pricing Summary */}
          {adPincodes.length > 0 && (
            <View style={styles.pricingSummaryCard}>
              <View style={styles.pricingSummaryHeader}>
                <Ionicons name="calculator-outline" size={18} color={brandColor} />
                <Text style={styles.pricingSummaryHeaderTitle}>Pricing Summary</Text>
              </View>

              <View style={styles.pricingSummaryRow}>
                <Text style={styles.pricingSummaryLabel}>Plan Duration:</Text>
                <Text style={styles.pricingSummaryValue}>{selectedPlan === 'week' ? 'Weekly' : 'Monthly'}</Text>
              </View>

              <View style={styles.pricingSummaryRow}>
                <Text style={styles.pricingSummaryLabel}>Pincodes Targeted:</Text>
                <Text style={styles.pricingSummaryValue}>{adPincodes.length}</Text>
              </View>

              <View style={styles.pricingSummaryRow}>
                <Text style={styles.pricingSummaryLabel}>Rate per Pincode:</Text>
                <Text style={styles.pricingSummaryValue}>₹{ratePerPincode}</Text>
              </View>

              <View style={[styles.pricingSummaryRow, styles.pricingTotalRow]}>
                <Text style={styles.pricingTotalLabel}>Total Amount:</Text>
                <Text style={[styles.pricingTotalValue, { color: brandColor }]}>₹{totalAmount}</Text>
              </View>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: brandColor }, (adPincodes.length === 0 || !adImage) && { backgroundColor: '#cbd5e1' }]}
            onPress={handlePayment}
            disabled={adPincodes.length === 0 || !adImage || adLoading}
          >
            {adLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.payBtnText}>
                  {adPincodes.length > 0
                    ? `Proceed to Pay ₹${totalAmount}`
                    : 'Select Target Areas & Banner'}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  backBtn: {
    padding: 4,
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  scrollForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 50,
    fontSize: 15,
    color: '#0f172a',
  },
  ratioNote: {
    fontSize: 11,
    color: '#0035a0',
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 15,
  },
  imageUploadBox: {
    height: 140,
    backgroundColor: '#faf5ff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#f3e8ff',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0035a0',
    marginTop: 8,
  },
  uploadSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  planContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
  },
  planCardActive: {
    borderColor: '#0035a0',
    backgroundColor: '#f0f5fc',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  planTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
  },
  planPeriod: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  planValidity: {
    fontSize: 11,
    color: '#0035a0',
    fontWeight: '700',
    marginTop: 4,
  },
  targetTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  targetTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  targetTypeBtnActive: {
    backgroundColor: '#0035a0',
  },
  targetTypeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  targetTypeBtnTextActive: {
    color: 'white',
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    maxHeight: 180,
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
    marginTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  chipRemoveBtn: {
    marginLeft: 6,
  },
  selectedAreaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5fc',
    borderWidth: 1.5,
    borderColor: '#e0edfa',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
  },
  selectedAreaName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  selectedAreaSub: {
    fontSize: 11,
    color: '#0035a0',
    fontWeight: '600',
    marginTop: 2,
  },
  clearAreaBtn: {
    padding: 4,
  },
  pricingSummaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginVertical: 10,
  },
  pricingSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
    marginBottom: 12,
  },
  pricingSummaryHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  pricingSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pricingSummaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  pricingSummaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  pricingTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 10,
    marginBottom: 0,
  },
  pricingTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  pricingTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0035a0',
  },
  payBtn: {
    backgroundColor: '#0035a0',
    height: 55,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  morePincodesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e8dbf8',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  morePincodesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0035a0',
  },
});
