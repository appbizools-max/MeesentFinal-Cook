import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import Toast from 'react-native-toast-message';
import razorpayService from '../../services/razorpay.service';
import RazorpayCheckout from 'react-native-razorpay';
import notificationService from '../../services/notification.service';
import { BACKEND_CONFIG } from '../../config/backend';

const { width } = Dimensions.get('window');

const PLANS = [
  {
    id: 'big',
    name: 'Premium Plan',
    price: 799,
    color: '#2563EB',
    icon: 'crown',
    mostPopular: true,
    features: [
      { text: 'Top visibility', icon: 'checkmark-circle' },
      { text: 'Search visibility', icon: 'checkmark-circle' },
      { text: 'Trusted symbol', icon: 'checkmark-circle', badge: 'trusted' },
      { text: 'Recommended symbol', icon: 'checkmark-circle', badge: 'star' },
      { text: 'Guaranteed leads', icon: 'checkmark-circle', tag: 'Guarantee' },
      { text: 'Customer support', icon: 'checkmark-circle', tag: 'Priority' },
      { text: 'Free Job Posting', icon: 'briefcase', tag: 'Free' },
    ]
  },
  {
    id: 'small',
    name: 'Smart Plan',
    price: 499,
    color: '#f97316',
    icon: 'star',
    features: [
      { text: 'Standard visibility', icon: 'checkmark-circle' },
      { text: 'Search visibility', icon: 'checkmark-circle' },
      { text: 'Recommended symbol', icon: 'checkmark-circle', badge: 'star' },
      { text: 'Guaranteed leads', icon: 'checkmark-circle', tag: 'Guarantee' },
      { text: 'Customer support', icon: 'checkmark-circle', tag: 'Priority' },
      { text: 'Free Job Posting', icon: 'briefcase', tag: 'Free' },
    ]
  },
  {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    color: '#64748b',
    icon: 'shield-outline',
    features: [
      { text: 'Standard visibility', icon: 'checkmark-circle' },
      { text: 'No search boost', icon: 'close-circle', color: '#ef4444' },
      { text: 'No badges', icon: 'close-circle', color: '#ef4444' },
      { text: 'No guaranteed leads', icon: 'close-circle', color: '#ef4444' },
      { text: 'Standard support', icon: 'checkmark-circle' },
    ]
  }
];

const DURATIONS = [
  { id: 'big_1', planId: 'big', months: 1, price: 799, oldPrice: 799, save: '0%', monthly: 799, label: 'Starter', color: '#2563EB' },
  { id: 'big_6', planId: 'big', months: 6, price: 4599, oldPrice: 4794, save: '4%', monthly: 766, label: 'Popular', color: '#2563EB' },
  { id: 'big_12', planId: 'big', months: 12, price: 9199, oldPrice: 9588, save: '4%', monthly: 767, label: 'Best Value', color: '#2563EB' },
  { id: 'small_1', planId: 'small', months: 1, price: 499, oldPrice: 499, save: '0%', monthly: 499, label: 'Starter', color: '#f97316' },
  { id: 'small_6', planId: 'small', months: 6, price: 2899, oldPrice: 2994, save: '3%', monthly: 483, label: '', color: '#f97316' },
  { id: 'small_12', planId: 'small', months: 12, price: 5699, oldPrice: 5988, save: '4%', monthly: 475, label: '', color: '#f97316' },
  { id: 'free_1', planId: 'free', months: 1, price: 0, oldPrice: 0, save: '0%', monthly: 0, label: 'Free', color: '#64748b' },
];

const buildDynamicPlansAndDurations = (pricingData: any) => {
  const bigMonthly = Number(pricingData?.bigPlan?.monthly || 799);
  const bigSix = Number(pricingData?.bigPlan?.sixMonths || 4599);
  const bigYearly = Number(pricingData?.bigPlan?.yearly || 9199);

  const smallMonthly = Number(pricingData?.smallPlan?.monthly || 499);
  const smallSix = Number(pricingData?.smallPlan?.sixMonths || 2899);
  const smallYearly = Number(pricingData?.smallPlan?.yearly || 5699);

  const dynamicPlans = [
    {
      id: 'big',
      name: 'Premium Plan',
      price: bigMonthly,
      color: '#2563EB',
      icon: 'crown',
      mostPopular: true,
      features: [
        { text: 'Top visibility', icon: 'checkmark-circle' },
        { text: 'Search visibility', icon: 'checkmark-circle' },
        { text: 'Trusted symbol', icon: 'checkmark-circle', badge: 'trusted' },
        { text: 'Recommended symbol', icon: 'checkmark-circle', badge: 'star' },
        { text: 'Guaranteed leads', icon: 'checkmark-circle', tag: 'Guarantee' },
        { text: 'Customer support', icon: 'checkmark-circle', tag: 'Priority' },
        { text: 'Free Job Posting', icon: 'briefcase', tag: 'Free' },
      ]
    },
    {
      id: 'small',
      name: 'Smart Plan',
      price: smallMonthly,
      color: '#f97316',
      icon: 'star',
      features: [
        { text: 'Standard visibility', icon: 'checkmark-circle' },
        { text: 'Search visibility', icon: 'checkmark-circle' },
        { text: 'Recommended symbol', icon: 'checkmark-circle', badge: 'star' },
        { text: 'Guaranteed leads', icon: 'checkmark-circle', tag: 'Guarantee' },
        { text: 'Customer support', icon: 'checkmark-circle', tag: 'Priority' },
        { text: 'Free Job Posting', icon: 'briefcase', tag: 'Free' },
      ]
    },
    {
      id: 'free',
      name: 'Free Plan',
      price: 0,
      color: '#64748b',
      icon: 'shield-outline',
      features: [
        { text: 'Standard visibility', icon: 'checkmark-circle' },
        { text: 'No search boost', icon: 'close-circle', color: '#ef4444' },
        { text: 'No badges', icon: 'close-circle', color: '#ef4444' },
        { text: 'No guaranteed leads', icon: 'close-circle', color: '#ef4444' },
        { text: 'Standard support', icon: 'checkmark-circle' },
      ]
    }
  ];

  const calcSave = (price: number, baseMonthly: number, months: number) => {
    const fullPrice = baseMonthly * months;
    if (!fullPrice || fullPrice <= price) return '0%';
    const pct = Math.round(((fullPrice - price) / fullPrice) * 100);
    return `${pct}%`;
  };

  const dynamicDurations = [
    {
      id: 'big_1',
      planId: 'big',
      months: 1,
      price: bigMonthly,
      oldPrice: bigMonthly,
      save: '0%',
      monthly: bigMonthly,
      label: 'Starter',
      color: '#2563EB'
    },
    {
      id: 'big_6',
      planId: 'big',
      months: 6,
      price: bigSix,
      oldPrice: bigMonthly * 6,
      save: calcSave(bigSix, bigMonthly, 6),
      monthly: Math.round(bigSix / 6),
      label: 'Popular',
      color: '#2563EB'
    },
    {
      id: 'big_12',
      planId: 'big',
      months: 12,
      price: bigYearly,
      oldPrice: bigMonthly * 12,
      save: calcSave(bigYearly, bigMonthly, 12),
      monthly: Math.round(bigYearly / 12),
      label: 'Best Value',
      color: '#2563EB'
    },
    {
      id: 'small_1',
      planId: 'small',
      months: 1,
      price: smallMonthly,
      oldPrice: smallMonthly,
      save: '0%',
      monthly: smallMonthly,
      label: 'Starter',
      color: '#f97316'
    },
    {
      id: 'small_6',
      planId: 'small',
      months: 6,
      price: smallSix,
      oldPrice: smallMonthly * 6,
      save: calcSave(smallSix, smallMonthly, 6),
      monthly: Math.round(smallSix / 6),
      label: '',
      color: '#f97316'
    },
    {
      id: 'small_12',
      planId: 'small',
      months: 12,
      price: smallYearly,
      oldPrice: smallMonthly * 12,
      save: calcSave(smallYearly, smallMonthly, 12),
      monthly: Math.round(smallYearly / 12),
      label: '',
      color: '#f97316'
    },
    {
      id: 'free_1',
      planId: 'free',
      months: 1,
      price: 0,
      oldPrice: 0,
      save: '0%',
      monthly: 0,
      label: 'Free',
      color: '#64748b'
    },
  ];

  return { dynamicPlans, dynamicDurations };
};

export default function SelectPlanScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { vendorId } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(vendorId || null);
  const [selectedPlanId, setSelectedPlanId] = useState('big');
  const [selectedDurationId, setSelectedDurationId] = useState('big_6');
  const [paymentOption, setPaymentOption] = useState<'auto' | 'one-time'>('auto');
  const [takenPlans, setTakenPlans] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [plansList, setPlansList] = useState<any[]>(PLANS);
  const [durationsList, setDurationsList] = useState<any[]>(DURATIONS);
  const [verificationPrice, setVerificationPrice] = useState<number>(199);

  const applyPricingPayload = (data: any) => {
    if (!data) return;
    const { dynamicPlans, dynamicDurations } = buildDynamicPlansAndDurations(data);
    setPlansList(dynamicPlans);
    setDurationsList(dynamicDurations);
    if (data.servicesVerification || data.verification) {
      setVerificationPrice(Number(data.servicesVerification || data.verification));
    }
  };

  const fetchBackendPricing = async () => {
    const urls = [
      `${BACKEND_CONFIG.API_URL}/api/pricing`,
      'http://10.0.2.2:5000/api/pricing',
      'http://localhost:5000/api/pricing',
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        const resData = await res.json();
        if (resData.success && resData.pricing) {
          applyPricingPayload(resData.pricing);
          break;
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    // 1. Initial REST API load
    fetchBackendPricing();

    // 2. Real-time Firestore snapshot listener
    const unsubPricing = onSnapshot(doc(db, 'config', 'service_pricing'), (snapshot) => {
      if (snapshot.exists()) {
        applyPricingPayload(snapshot.data());
      } else {
        fetchBackendPricing();
      }
    }, (err) => {
      console.warn("Firestore snapshot pricing listener notice, using backend API fallback...", err);
      fetchBackendPricing();
    });

    return () => unsubPricing();
  }, []);

  const selectedPlan = plansList.find(p => p.id === selectedPlanId) || plansList[0];
  const selectedDuration = durationsList.find(d => d.id === selectedDurationId) || durationsList[0];
  const isUpgrade = route.params?.isUpgrade || false;

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoadingBiz(true);
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const q = query(
          collection(db, 'vendors'),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const bizList = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let planExpiry = data.planExpiry || data.currentPeriodEnd || data.planEndDate || data.expiryDate;
          let planStartDate = data.planStartDate || data.currentPeriodStart || data.paymentDate || data.createdAt;
          let planId = data.planId || data.plan;
          let billingCycleMonths = data.billingCycleMonths || data.months;

          try {
            const subSnap = await getDoc(doc(db, 'vendorSubscriptions', docSnap.id));
            if (subSnap.exists()) {
              const subData = subSnap.data();
              if (subData.currentPeriodEnd) {
                planExpiry = subData.currentPeriodEnd;
              }
              if (subData.currentPeriodStart) {
                planStartDate = subData.currentPeriodStart;
              }
              if (subData.planId) {
                planId = subData.planId;
              }
              if (subData.billingCycleMonths) {
                billingCycleMonths = subData.billingCycleMonths;
              }
            }
          } catch (e) {
            console.warn("Sub fetch notice:", e);
          }

          return {
            id: docSnap.id,
            ...data,
            planId,
            planExpiry,
            planStartDate,
            billingCycleMonths,
          };
        }));
        setBusinesses(bizList);

        // Pre-select target vendorId if provided, else default to first
        if (vendorId && bizList.some(b => b.id === vendorId)) {
          setActiveVendorId(vendorId);
        } else if (bizList.length > 0) {
          setActiveVendorId(bizList[0].id);
        }
      } catch (error) {
        console.error("Error fetching user businesses for SelectPlan:", error);
      } finally {
        setLoadingBiz(false);
      }
    };

    fetchBusinesses();
  }, [vendorId]);

  useEffect(() => {
    const fetchTakenPlans = async () => {
      if (!activeVendorId) return;
      try {
        setLoadingHistory(true);
        const q = query(
          collection(db, 'payments'),
          where('vendorId', '==', activeVendorId)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by createdAt descending
        list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTakenPlans(list);
      } catch (err) {
        console.error("Error fetching taken plans:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchTakenPlans();
  }, [activeVendorId]);

  const getParsedExpiry = (rawExpiry: any): Date | null => {
    if (!rawExpiry) return null;
    if (typeof rawExpiry.toDate === 'function') {
      return rawExpiry.toDate();
    }
    if (rawExpiry.seconds !== undefined) {
      return new Date(rawExpiry.seconds * 1000);
    }
    if (rawExpiry instanceof Date) {
      return rawExpiry;
    }
    const parsed = new Date(rawExpiry);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  };

  const getActiveBusinessExpiryDate = (biz: any): Date | null => {
    if (!biz) return null;
    const raw = biz.planExpiry || biz.currentPeriodEnd || biz.planEndDate || biz.expiryDate;
    if (raw) {
      const parsed = getParsedExpiry(raw);
      if (parsed) return parsed;
    }
    const startRaw = biz.planStartDate || biz.currentPeriodStart || biz.paymentDate || biz.createdAt;
    if (startRaw) {
      const startParsed = getParsedExpiry(startRaw);
      if (startParsed) {
        const months = biz.planDurationMonths || biz.billingCycleMonths || 1;
        const d = new Date(startParsed);
        d.setMonth(d.getMonth() + parseInt(months, 10));
        return d;
      }
    }
    return null;
  };

  const formatExpiryDate = (rawExpiry: any, biz?: any): string | null => {
    let d = getParsedExpiry(rawExpiry);
    if (!d && biz) {
      d = getActiveBusinessExpiryDate(biz);
    }
    if (!d) return null;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const checkPlanActive = (biz: any) => {
    if (!biz) return false;
    const pId = biz.planId || biz.plan;
    if (!pId || pId === 'none') return false;
    const rawExp = biz.planExpiry || biz.currentPeriodEnd || biz.planEndDate || biz.expiryDate;
    if (!rawExp) return false;
    const parsed = getParsedExpiry(rawExp);
    return parsed ? parsed.getTime() > Date.now() : false;
  };

  const activeBusiness = businesses.find(b => b.id === activeVendorId);
  const isBusinessVerified = activeBusiness ? Boolean(
    activeBusiness.tookVerification === true ||
    activeBusiness.isVerified === true ||
    activeBusiness.verifyMark === true ||
    activeBusiness.verificationStatus === 'verified'
  ) : false;
  const hasActivePlan = checkPlanActive(activeBusiness);

  const handleContinue = async () => {
    if (!activeVendorId) {
      Toast.show({
        type: 'error',
        text1: 'No Business Selected',
        text2: 'Please select a business to upgrade.'
      });
      return;
    }

    if (!isBusinessVerified && selectedPlanId !== 'free') {
      Toast.show({
        type: 'error',
        text1: 'Verification Required',
        text2: 'This business must be verified before you can upgrade.'
      });
      return;
    }

    if (hasActivePlan) {
      Toast.show({
        type: 'error',
        text1: 'Plan Active',
        text2: 'This business already has an active upgrade plan.'
      });
      return;
    }

    const saveUpgradeToDatabase = async (paymentId: string, orderId: string, signature: string) => {
      if (!activeVendorId) return;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + (selectedDuration?.months || 1));

      // 1. Update Vendor plan info directly
      await updateDoc(doc(db, 'vendors', activeVendorId), {
        planId: selectedPlanId,
        plan: selectedPlanId,
        planDurationId: selectedDurationId,
        planExpiry: expiryDate.toISOString(),
        planStartDate: new Date().toISOString(),
        planUpdatedAt: new Date().toISOString(),
        planBundle: `${selectedPlanId.toUpperCase()} (${selectedDuration?.months || 1}M)`,
        updatedAt: serverTimestamp(),
      });

      // 2. Write/Update vendorSubscriptions/{vendorId}
      const subRef = doc(db, 'vendorSubscriptions', activeVendorId);
      await setDoc(subRef, {
        vendorId: activeVendorId,
        planId: selectedPlanId,
        billingCycleMonths: selectedDuration?.months || 1,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiryDate,
        extensionCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update User document subscriptionPlan
      const currentUid = auth.currentUser?.uid;
      if (currentUid) {
        try {
          await updateDoc(doc(db, 'users', currentUid), {
            'subscriptionPlan.planId': selectedPlanId,
            'subscriptionPlan.status': 'active',
            'subscriptionPlan.startDate': new Date().toISOString(),
            'subscriptionPlan.expiryDate': expiryDate.toISOString(),
          });
        } catch (_) {}
      }

      // 3. Write/Update transactions/{txnId}
      const txnRef = doc(collection(db, 'transactions'));
      await setDoc(txnRef, {
        vendorId: activeVendorId,
        subscriptionId: activeVendorId,
        planId: selectedPlanId,
        amount: selectedDuration?.price || 0,
        type: 'new_subscription',
        status: 'success',
        paymentMethod: selectedPlanId === 'free' ? 'None' : 'Razorpay',
        gatewayTransactionId: paymentId,
        date: new Date(),
        periodStart: new Date(),
        periodEnd: expiryDate,
        createdAt: serverTimestamp()
      });

      // Write a payment history record (legacy compat)
      const paymentRef = doc(collection(db, 'payments'));
      const newPaymentRecord = {
        vendorId: activeVendorId,
        amount: selectedDuration?.price || 0,
        planId: selectedPlanId,
        planName: selectedPlan?.name,
        duration: `${selectedDuration?.months} Month(s)`,
        status: 'success',
        transactionId: paymentId,
        orderId: orderId,
        signature: signature,
        createdAt: new Date().toISOString(),
        paymentMethod: selectedPlanId === 'free' ? 'None' : 'Razorpay'
      };
      await setDoc(paymentRef, newPaymentRecord);

      // Refresh local businesses list state so selector cards update instantly
      setBusinesses(prev => prev.map(b => b.id === activeVendorId ? {
        ...b,
        planId: selectedPlanId,
        plan: selectedPlanId,
        planExpiry: expiryDate.toISOString(),
      } : b));

      // Refresh the taken plans list state
      setTakenPlans(prev => [{ id: paymentRef.id, ...newPaymentRecord }, ...prev]);

      // 1. Send push notification on device
      try {
        await notificationService.sendLocalNotification(
          'Plan Upgraded successfully! 🎉',
          `Your business "${activeBusiness?.businessName || 'Business'}" is now upgraded to ${selectedPlan?.name}.`,
          { module: 'services', isService: true, screen: 'ServicesHome' }
        );
      } catch (pushError) {
        console.error('Error sending local notification:', pushError);
      }

      // 2. Save notification to user db
      try {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const notifRef = doc(collection(db, 'notifications'));
          await setDoc(notifRef, {
            userId: userId,
            title: 'Plan Upgraded successfully! 🎉',
            body: `Your business "${activeBusiness?.businessName || 'Business'}" is now upgraded to ${selectedPlan?.name}.`,
            createdAt: new Date().toISOString(),
            isRead: false
          });
        }
      } catch (dbNotifError) {
        console.error('Error saving db notification:', dbNotifError);
      }

      Alert.alert(
        "Subscription Successful",
        `You are now subscribed to the ${selectedPlan?.name}!`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    };

    if (selectedPlanId === 'free' || selectedDuration?.price === 0) {
      // Free Tier instant activation bypass
      setLoading(true);
      try {
        const freeTxnId = `free_${Math.random().toString(36).substring(2, 11)}`;
        await saveUpgradeToDatabase(freeTxnId, `free_ord_${Date.now()}`, 'free_signature');
      } catch (freeError: any) {
        Toast.show({ type: 'error', text1: 'Subscription Error', text2: freeError.message || 'Failed to activate plan' });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isUpgrade) {
      // Direct payment flow for already registered users using Razorpay
      try {
        setLoading(true);
        const userId = auth.currentUser?.uid;
        if (userId) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userData = userDoc.data();

          // Create Razorpay payment options
          const orderId = razorpayService.generateOrderId();
          const paymentOptions = razorpayService.createPaymentOptions({
            amount: selectedDuration?.price || 0,
            name: 'Meesent',
            description: `${selectedPlan?.name} - ${selectedDuration?.months} Months`,
            prefill: {
              name: userData?.name || '',
              email: userData?.email || '',
              contact: userData?.phone || '',
            },
          });

          // Open Razorpay checkout using native wrapper
          try {
            const paymentResult = await RazorpayCheckout.open(paymentOptions as any);
            await saveUpgradeToDatabase(
              paymentResult.razorpay_payment_id,
              paymentResult.razorpay_order_id || orderId,
              paymentResult.razorpay_signature
            );
          } catch (checkoutError: any) {
            console.warn('Razorpay Error:', checkoutError);
            if (checkoutError?.code !== 0) {
              Alert.alert(
                'Payment Cancelled or Failed',
                checkoutError.description || 'The payment was not completed. Please try again.'
              );
            }
          }
        }
      } catch (error: any) {
        console.error('Payment error:', error);
        const errorMessage = error.code === 0 ? 'Payment cancelled' : 'Payment failed. Please try again.';
        Alert.alert("Payment Error", errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      // New user flow: Navigate to Registration Form with selected plan details
      navigation.navigate('VendorRegistration', {
        planData: {
          planId: selectedPlanId,
          planDurationId: selectedDurationId,
          paymentOption: paymentOption,
          totalPayable: (selectedDuration?.price || 0) + verificationPrice,
        }
      });
    }
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar style="dark" />
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#1e293b" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Upgrade Plan</Text>
              <Text style={styles.headerSubtitle}>Boost Your Business Visibility</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {loadingBiz ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading your businesses...</Text>
            </View>
          ) : businesses.length === 0 ? (
            <View style={styles.gateCard}>
              <LinearGradient colors={['#f8fafc', '#ffffff']} style={styles.gateGradient}>
                <View style={[styles.gateIconBox, { backgroundColor: '#f1f5f9' }]}>
                  <Ionicons name="business" size={30} color="#64748b" />
                </View>
                <View style={styles.gateContent}>
                  <Text style={[styles.gateTitle, { color: '#475569' }]}>No Registered Business</Text>
                  <Text style={[styles.gateDesc, { color: '#64748b' }]}>
                    You don't have any registered businesses (Services / Products). Please register a business first to upgrade.
                  </Text>
                  <TouchableOpacity
                    style={[styles.gateBtn, { backgroundColor: '#3b82f6' }]}
                    onPress={() => navigation.navigate('VendorRegistration')}
                  >
                    <Text style={styles.gateBtnText}>Register Business Now</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 + insets.bottom }}>

              {/* Business Selector (If they have businesses) */}
              {businesses.length > 0 && (
                <View style={styles.businessSelectorSection}>
                  <Text style={styles.businessSelectorTitle}>Select Business to Upgrade</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessScrollContainer}>
                    {businesses.map((biz) => {
                      const isSelected = activeVendorId === biz.id;
                      const isVerified = Boolean(
                        biz.tookVerification === true ||
                        biz.isVerified === true ||
                        biz.verifyMark === true ||
                        biz.verificationStatus === 'verified'
                      );
                      const isPlanActive = checkPlanActive(biz);
                      const activePlanName = (biz.planId && biz.planId !== 'free') ? biz.planId : (biz.plan && biz.plan !== 'none' && biz.plan !== 'free') ? biz.plan : null;
                      const rawExp = biz.planExpiry || biz.currentPeriodEnd || biz.planEndDate || biz.expiryDate;
                      const formattedExpiry = formatExpiryDate(rawExp);

                      return (
                        <TouchableOpacity
                          key={biz.id}
                          style={[
                            styles.businessSelectCard,
                            isSelected && styles.businessSelectCardActive,
                            isPlanActive && { borderColor: '#2563eb', backgroundColor: '#eff6ff' }
                          ]}
                          onPress={() => setActiveVendorId(biz.id)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons
                                name={isPlanActive ? "lock-closed" : isVerified ? "shield-checkmark" : "shield-outline"}
                                size={16}
                                color={isPlanActive ? "#2563eb" : isVerified ? "#10b981" : "#f59e0b"}
                              />
                              <Text style={[styles.businessCardName, isSelected && styles.businessCardNameActive]}>
                                {biz.businessName}
                              </Text>
                            </View>
                            <View style={[
                              styles.miniStatusBadge,
                              { backgroundColor: isPlanActive ? '#dbeafe' : isVerified ? '#dcfce7' : '#fef3c7' }
                            ]}>
                              <Text style={[
                                styles.miniStatusText,
                                { color: isPlanActive ? '#1d4ed8' : isVerified ? '#15803d' : '#b45309' }
                              ]}>
                                {isPlanActive ? 'LOCKED' : isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.businessCardPlan}>
                            {isPlanActive
                              ? `Exp: ${formattedExpiry || 'Active'}`
                              : isVerified
                                ? (activePlanName ? `Plan: ${activePlanName.toUpperCase()}` : 'No Plan Active (Select Below)')
                                : 'Verification Required'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {!isBusinessVerified && activeBusiness ? (
                /* Verification Gate Card */
                <View style={styles.gateCard}>
                  <LinearGradient colors={['#fff7ed', '#ffffff']} style={styles.gateGradient}>
                    <View style={styles.gateIconBox}>
                      <Ionicons name="alert-circle" size={32} color="#f97316" />
                    </View>
                    <View style={styles.gateContent}>
                      <Text style={styles.gateTitle}>Verification Required</Text>
                      <Text style={styles.gateDesc}>
                        "{activeBusiness.businessName}" needs a Verification Badge before you can unlock the Boost Your Business features.
                      </Text>
                      <TouchableOpacity
                        style={styles.gateBtn}
                        onPress={() => navigation.navigate('BusinessVerification', { vendorId: activeVendorId })}
                      >
                        <Text style={styles.gateBtnText}>Verify Business First - ₹{verificationPrice}</Text>
                        <Ionicons name="arrow-forward" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              ) : (
                /* Subscription Plan Options (Only open when verified) */
                <>
                  {hasActivePlan && activeBusiness && (
                    <View style={styles.activePlanCard}>
                      <View style={styles.activePlanContainer}>
                        <View style={styles.activePlanHeaderRow}>
                          <View style={styles.activePlanIconBox}>
                            <MaterialCommunityIcons name="lock-clock" size={24} color="#0035a0" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.activePlanTitle}>ACTIVE PLAN LOCKED</Text>
                              <View style={styles.lockedPill}>
                                <Text style={styles.lockedPillText}>LOCKED</Text>
                              </View>
                            </View>
                            <Text style={styles.activePlanDesc}>
                              {activeBusiness.businessName} • {activeBusiness.planId === 'big' ? 'Premium Plan' : activeBusiness.planId === 'small' ? 'Smart Plan' : `${(activeBusiness.planId || activeBusiness.plan || 'Upgrade').toUpperCase()} Plan`}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.activePlanDatesRow}>
                          <View style={styles.dateBoxChip}>
                            <Ionicons name="calendar-outline" size={16} color="#0035a0" />
                            <View>
                              <Text style={styles.dateChipLabel}>ACTIVATION DATE</Text>
                              <Text style={styles.dateChipVal}>
                                {formatExpiryDate(activeBusiness.planStartDate || activeBusiness.currentPeriodStart || activeBusiness.paymentDate || activeBusiness.createdAt) || 'Active'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.dateBoxChip}>
                            <Ionicons name="timer-outline" size={16} color="#dc2626" />
                            <View>
                              <Text style={styles.dateChipLabel}>EXPIRATION DATE</Text>
                              <Text style={styles.dateChipVal}>
                                {formatExpiryDate(activeBusiness.planExpiry, activeBusiness) || 'N/A'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.lockNoticeRow}>
                          <Ionicons name="information-circle-outline" size={16} color="#92400e" />
                          <Text style={styles.lockNoticeText}>
                            Upgrades are locked for the {activeBusiness.billingCycleMonths || 1}-month plan duration until it expires.
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  <View style={{ marginTop: 10 }}>
                    <View style={hasActivePlan ? { opacity: 0.65, pointerEvents: 'none' } : undefined}>
                      <View style={styles.sectionHeader}>
                        <View>
                          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
                          <Text style={styles.sectionSubtitle}>
                            {hasActivePlan ? 'Plans are locked for selection until your active plan expires' : 'All plans include verified badge and trusted visibility'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.planCardRow}>
                        {plansList.filter(p => p.id !== 'free').map(plan => (
                          <TouchableOpacity
                            key={plan.id}
                            style={[
                              styles.planCard,
                              { borderColor: selectedPlanId === plan.id ? plan.color : '#f1f5f9' },
                              selectedPlanId === plan.id && { borderWidth: 2 },
                            ]}
                            disabled={hasActivePlan}
                            onPress={() => {
                              setSelectedPlanId(plan.id);
                              const firstDuration = durationsList.find(d => d.planId === plan.id);
                              if (firstDuration) setSelectedDurationId(firstDuration.id);
                            }}
                          >
                            {hasActivePlan ? (
                              <View style={[styles.popularRibbon, { backgroundColor: '#64748b' }]}>
                                <Text style={styles.popularRibbonText}>LOCKED</Text>
                              </View>
                            ) : plan.mostPopular ? (
                              <View style={styles.popularRibbon}>
                                <Text style={styles.popularRibbonText}>POPULAR</Text>
                              </View>
                            ) : null}

                            <View style={styles.planHeader}>
                              <View style={[styles.planIconCircle, { backgroundColor: plan.color + '15' }]}>
                                <MaterialCommunityIcons name={plan.icon as any} size={18} color={plan.color} />
                              </View>
                              <View style={{ marginLeft: 8, flex: 1 }}>
                                <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
                                <Text style={styles.planPrice}>
                                  <Text style={{ color: plan.color, fontWeight: '900', fontSize: 16 }}>₹{plan.price}</Text>
                                  <Text style={{ color: '#94a3b8', fontSize: 9 }}>/mo</Text>
                                </Text>
                              </View>
                            </View>

                            <View style={styles.featureList}>
                              {plan.features.map((f, i) => (
                                <View key={i} style={styles.featureRow}>
                                  <Ionicons name={f.icon as any} size={11} color={f.color || (plan.color + '80')} />
                                  <Text style={styles.featureText} numberOfLines={1}>{f.text}</Text>
                                </View>
                              ))}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Free Plan standalone selection */}
                      <TouchableOpacity
                        style={[
                          styles.freePlanCard,
                          selectedPlanId === 'free' && styles.freePlanCardActive,
                        ]}
                        disabled={hasActivePlan}
                        onPress={() => {
                          setSelectedPlanId('free');
                          const firstDuration = durationsList.find(d => d.planId === 'free');
                          if (firstDuration) setSelectedDurationId(firstDuration.id);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={[styles.planIconCircle, { backgroundColor: '#f1f5f9', width: 36, height: 36, borderRadius: 10 }]}>
                            <Ionicons name="gift-outline" size={18} color="#64748b" />
                          </View>
                          <View>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#1e293b' }}>Standard Free Listing</Text>
                            <Text style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>Basic visibility without priority boost</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          {hasActivePlan ? (
                            <View style={[styles.miniStatusBadge, { backgroundColor: '#f1f5f9' }]}>
                              <Text style={[styles.miniStatusText, { color: '#64748b' }]}>LOCKED</Text>
                            </View>
                          ) : (
                            <>
                              <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b' }}>₹0</Text>
                              <View style={[styles.radioCircle, { marginRight: 0, width: 20, height: 20, borderRadius: 10 }]}>
                                {selectedPlanId === 'free' && <View style={[styles.radioInner, { width: 10, height: 10, borderRadius: 5 }]} />}
                              </View>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* Subscription Duration */}
                      <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                        <View>
                          <Text style={styles.sectionTitle}>Subscription Duration</Text>
                          <Text style={styles.sectionSubtitle}>
                            {selectedPlanId === 'free' ? 'Standard 1-Month Free Period' : 'Choose billing cycle that works best for you'}
                          </Text>
                        </View>
                      </View>

                      {selectedPlanId === 'free' ? (
                        <View style={[styles.durationCard, { borderColor: '#64748b', borderWidth: 2, backgroundColor: '#f8fafc', width: '100%' }]}>
                          <View style={[styles.durationLabel, { backgroundColor: '#64748b' }]}>
                            <Text style={styles.durationLabelText}>Standard Free</Text>
                          </View>
                          <Text style={styles.durationTitle}>1 Month Free Listing</Text>
                          <Text style={styles.durationMainPrice}>₹0</Text>
                          <View style={styles.divider} />
                          <Text style={styles.durationMonthly}>₹0 /month</Text>
                          <View style={{ marginTop: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#475569' }}>
                              Expires: {(() => {
                                const d = new Date();
                                d.setMonth(d.getMonth() + 1);
                                return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                              })()}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.durationScroll}>
                          {durationsList.filter(d => d.planId === selectedPlanId).map(duration => (
                            <TouchableOpacity
                              key={duration.id}
                              style={[
                                styles.durationCard,
                                { borderColor: selectedDurationId === duration.id ? duration.color : '#f1f5f9' },
                                selectedDurationId === duration.id && { borderWidth: 2, backgroundColor: duration.color + '05' },
                              ]}
                              disabled={hasActivePlan}
                              onPress={() => setSelectedDurationId(duration.id)}
                            >
                              {duration.label !== '' && (
                                <View style={[styles.durationLabel, { backgroundColor: String(duration.id).includes('6') ? '#3b82f6' : '#6d28d9' }]}>
                                  <Text style={styles.durationLabelText}>{duration.label}</Text>
                                </View>
                              )}
                              <Text style={styles.durationTitle}>{duration.months} Month{duration.months > 1 ? 's' : ''}</Text>
                              <Text style={styles.durationMainPrice}>₹{duration.price.toLocaleString()}</Text>
                              <View style={styles.divider} />
                              <Text style={styles.durationMonthly}>₹{duration.monthly} /month</Text>
                              <View style={{ marginTop: 6, backgroundColor: selectedDurationId === duration.id ? '#dbeafe' : '#f1f5f9', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, alignItems: 'center' }}>
                                <Text style={{ fontSize: 9, fontWeight: '800', color: selectedDurationId === duration.id ? '#1e40af' : '#475569' }}>
                                  Expires: {(() => {
                                    const d = new Date();
                                    d.setMonth(d.getMonth() + duration.months);
                                    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                                  })()}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}

                      {/* Choose Payment Option */}
                      <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                        <View>
                          <Text style={styles.sectionTitle}>Choose Payment Option</Text>
                        </View>
                      </View>

                      {selectedPlanId === 'free' ? (
                        <View style={{ backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#14532d' }}>No Payment Required</Text>
                            <Text style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>The Free Plan is completely free. Click activate below to get started immediately.</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.paymentOptionContainer}>
                          <TouchableOpacity
                            style={[styles.paymentCard, paymentOption === 'auto' && styles.paymentCardActive]}
                            disabled={hasActivePlan}
                            onPress={() => setPaymentOption('auto')}
                          >
                            <View style={styles.radioCircle}>
                              {paymentOption === 'auto' && <View style={styles.radioInner} />}
                            </View>
                            <View style={styles.paymentContent}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.paymentName}>Auto Pay</Text>
                                <View style={styles.recommendedTag}>
                                  <Text style={styles.recommendedTagText}>Recommended</Text>
                                </View>
                              </View>
                              <Text style={styles.paymentDesc}>Automatic monthly payments{"\n"}Cancel anytime</Text>
                            </View>
                            <View style={styles.paymentIconBox}>
                              <Ionicons name="sync-circle" size={32} color="#3b82f6" />
                            </View>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.paymentCard, paymentOption === 'one-time' && styles.paymentCardActive]}
                            disabled={hasActivePlan}
                            onPress={() => setPaymentOption('one-time')}
                          >
                            <View style={styles.radioCircle}>
                              {paymentOption === 'one-time' && <View style={styles.radioInner} />}
                            </View>
                            <View style={styles.paymentContent}>
                              <Text style={styles.paymentName}>One-time Payment</Text>
                              <Text style={styles.paymentDesc}>Pay full amount upfront{"\n"}No auto renewals</Text>
                            </View>
                            <View style={[styles.paymentIconBox, { backgroundColor: '#fef2f2' }]}>
                              <Ionicons name="wallet" size={24} color="#3b82f6" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Purchased Plans History */}
                  <View style={styles.takenPlansSection}>
                    <Text style={styles.takenPlansTitle}>Purchased Plans History</Text>
                    {loadingHistory ? (
                      <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 20 }} />
                    ) : takenPlans.length === 0 ? (
                      <View style={styles.noHistoryCard}>
                        <Ionicons name="card-outline" size={20} color="#94a3b8" />
                        <Text style={styles.noHistoryText}>No previous plan purchases found.</Text>
                      </View>
                    ) : (
                      <View style={styles.historyList}>
                        {takenPlans.map((item) => (
                          <View key={item.id} style={styles.historyCard}>
                            <View style={styles.historyHeader}>
                              <Text style={styles.historyPlanName}>
                                {item.planName || (item.planId === 'big' ? 'Premium Plan' : item.planId === 'small' ? 'Smart Plan' : 'Upgrade Plan')}
                              </Text>
                              <Text style={styles.historyPrice}>₹{item.amount}</Text>
                            </View>
                            <View style={styles.historyDetails}>
                              <Text style={styles.historyMeta}>
                                Duration: {item.duration || 'N/A'} • {item.paymentMethod || 'Razorpay'}
                              </Text>
                              <Text style={styles.historyDate}>
                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              )}

            </ScrollView>
          )}

          {/* Footer (only visible when verified & business exists) */}
          {!loadingBiz && businesses.length > 0 && isBusinessVerified && (
            <View style={styles.footer}>
              <View style={styles.footerSummary}>
                <View>
                  <Text style={styles.youPayLabel}>You Pay Today</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.totalPrice}>₹{selectedDuration?.price.toLocaleString()}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.planDropdown} disabled={hasActivePlan}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.planDropdownLabel}>Plan</Text>
                    <Text style={styles.planDropdownValue}>{selectedPlan?.name} - {selectedDuration?.months} Months</Text>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#166534', marginTop: 1 }}>
                      Expires: {(() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + (selectedDuration?.months || 1));
                        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                      })()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#64748b" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.payBtn, hasActivePlan && styles.payBtnDisabled]}
                onPress={handleContinue}
                disabled={loading || hasActivePlan}
              >
                {loading ? <ActivityIndicator color="white" /> : hasActivePlan ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="lock-closed" size={20} color="white" />
                    <Text style={styles.payBtnText}>Upgrade Locked (Plan Active)</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.payBtnText}>
                      {selectedPlanId === 'free' ? 'Activate Free Plan' : 'Continue to Payment'}
                    </Text>
                    <Ionicons
                      name={selectedPlanId === 'free' ? "checkmark-circle" : "arrow-forward"}
                      size={20}
                      color="white"
                      style={{ marginLeft: 8 }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

        </SafeAreaView>
        <Toast />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  headerSubtitle: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 1 },

  verifyBanner: { marginHorizontal: 20, marginTop: 10, marginBottom: 15, borderRadius: 20, overflow: 'hidden' },
  verifyGradient: { padding: 15, flexDirection: 'row', alignItems: 'center' },
  verifyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2
  },
  verifyContent: { flex: 1, marginLeft: 12 },
  verifyTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  verifyTitle: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginRight: 6 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12
  },
  verifiedBadgeText: { color: 'white', fontSize: 8, fontWeight: '900', marginLeft: 2 },
  verifySubtitle: { fontSize: 10, color: '#64748b', fontWeight: '600', marginBottom: 6 },
  verifyPriceText: { flexDirection: 'row', alignItems: 'baseline' },
  verifyDeco: { position: 'absolute', right: -5, top: -5, width: 60, height: 60 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  sectionSubtitle: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  gstTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1fe',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB20'
  },
  gstTagText: { color: '#2563EB', fontSize: 9, fontWeight: '900', marginLeft: 4 },

  planCardRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 5,
    gap: 10
  },
  planCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative'
  },
  freePlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1
  },
  freePlanCardActive: {
    borderColor: '#64748b',
    borderWidth: 2,
    backgroundColor: '#f8fafc'
  },
  popularRibbon: {
    position: 'absolute',
    top: -10,
    right: 15,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10
  },
  popularRibbonText: { color: 'white', fontSize: 8, fontWeight: '900' },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  planIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  planPrice: { marginTop: 2 },

  featureList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureText: { fontSize: 9, color: '#475569', fontWeight: '700', marginLeft: 6, flexShrink: 1 },
  featureTag: { marginLeft: 'auto', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  featureTagText: { fontSize: 7, fontWeight: '900' },

  durationScroll: { paddingLeft: 20, paddingTop: 15, paddingBottom: 10, marginTop: 10 },
  durationCard: {
    width: 140,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative'
  },
  durationLabel: { position: 'absolute', top: -10, right: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  durationLabelText: { color: 'white', fontSize: 8, fontWeight: '900' },
  saveBadge: { position: 'absolute', top: -10, left: 10, backgroundColor: '#f97316', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  saveBadgeText: { color: 'white', fontSize: 8, fontWeight: '900' },
  durationTitle: { fontSize: 13, fontWeight: '900', color: '#1e293b', marginTop: 5 },
  durationMainPrice: { fontSize: 20, fontWeight: '900', color: '#2563EB', marginTop: 4 },
  durationOldPrice: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textDecorationLine: 'line-through', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  durationMonthly: { fontSize: 10, color: '#64748b', fontWeight: '700' },

  paymentOptionContainer: { paddingHorizontal: 20, gap: 12 },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  paymentCardActive: { borderColor: '#2563EB', backgroundColor: '#eff6ff', borderWidth: 2 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB' },
  paymentContent: { flex: 1 },
  paymentName: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  paymentDesc: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 4, lineHeight: 14 },
  recommendedTag: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 10 },
  recommendedTagText: { color: '#166534', fontSize: 8, fontWeight: '900' },
  paymentIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },

  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20
  },
  footerSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  youPayLabel: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  totalPrice: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  saveFooterBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 10 },
  saveFooterText: { color: '#166534', fontSize: 9, fontWeight: '900' },
  planDropdown: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 8, borderRadius: 12 },
  planDropdownLabel: { fontSize: 8, color: '#94a3b8', fontWeight: '900' },
  planDropdownValue: { fontSize: 11, fontWeight: '900', color: '#1e293b' },

  payBtn: {
    height: 60,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8
  },
  payBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },
  trustText: { fontSize: 9, color: '#94a3b8', fontWeight: '800' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#cbd5e1' },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '600',
  },
  businessSelectorSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  businessSelectorTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  businessScrollContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  businessSelectCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    minWidth: 170,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  businessSelectCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#eff6ff',
    shadowColor: '#2563eb',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  businessCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  businessCardNameActive: {
    color: '#2563EB',
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniStatusText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  businessCardPlan: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 4,
  },
  gateCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#c5e4f5',
  },
  gateGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gateIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  gateContent: {
    flex: 1,
  },
  gateTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ea580c',
    marginBottom: 6,
  },
  gateDesc: {
    fontSize: 12,
    color: '#9a3412',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 16,
  },
  gateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  gateBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  activePlanCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  activePlanContainer: {
    padding: 16,
  },
  activePlanHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  activePlanIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  activePlanTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0035a0',
    letterSpacing: 0.5,
  },
  lockedPill: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  lockedPillText: {
    color: '#dc2626',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activePlanDesc: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
    marginTop: 2,
  },
  activePlanDatesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  dateBoxChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateChipLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateChipVal: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '900',
    marginTop: 1,
  },
  lockNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbe6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  lockNoticeText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '700',
    flex: 1,
  },
  activePlanContent: {
    flex: 1,
  },
  activePlanExpiry: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  payBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowColor: '#94a3b8',
    opacity: 0.8,
  },
  takenPlansSection: {
    paddingHorizontal: 20,
    marginTop: 35,
    marginBottom: 30,
  },
  takenPlansTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 15,
  },
  noHistoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    justifyContent: 'center',
  },
  noHistoryText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 5,
    elevation: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyPlanName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e293b',
  },
  historyPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#3b82f6',
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyMeta: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  blurLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 20,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  blurLockIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  blurLockTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  blurLockSub: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 310,
  },
});
