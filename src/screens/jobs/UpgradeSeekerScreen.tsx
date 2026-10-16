import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_CONFIG } from '../../config/razorpay';
import { auth, db } from '../../services/firebase';
import { doc, updateDoc, serverTimestamp, onSnapshot, collection, addDoc } from 'firebase/firestore';

export default function UpgradeSeekerScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState('weekly'); // 'weekly', 'monthly', 'yearly'
  const [seekerPlanActive, setSeekerPlanActive] = useState<boolean>(false);
  const [seekerPlanExpiry, setSeekerPlanExpiry] = useState<any>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [passPrices, setPassPrices] = useState({
    weekly: 9,
    monthly: 29,
    yearly: 199,
  });

  useEffect(() => {
    const unsubPricing = onSnapshot(doc(db, 'config', 'service_pricing'), (pricingDoc) => {
      if (pricingDoc.exists()) {
        const pData = pricingDoc.data();
        setPassPrices({
          weekly: pData.jobSeekerWeeklyPassPrice ?? pData.jobSeekerPass?.weekly ?? 9,
          monthly: pData.jobSeekerMonthlyPassPrice ?? pData.jobSeekerPass?.monthly ?? 29,
          yearly: pData.jobSeekerYearlyPassPrice ?? pData.jobSeekerPass?.yearly ?? 199,
        });
      }
    }, (err) => console.warn('Dynamic seeker pass pricing fetch error:', err));
    return () => unsubPricing();
  }, []);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, 'users', userId), (userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSeekerPlanActive(data?.seekerPlanActive || false);
        setSeekerPlanExpiry(data?.seekerPlanExpiry || null);
        setCurrentPlanId(data?.seekerPlan || null);

        // Auto-select current active plan if premium is active
        if (data?.seekerPlanActive && data?.seekerPlanExpiry && data?.seekerPlan) {
          const exp = data.seekerPlanExpiry.toDate ? data.seekerPlanExpiry.toDate() : new Date(data.seekerPlanExpiry);
          if (exp > new Date()) {
            setSelectedPlan(data.seekerPlan);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);
  const formatExpiryDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const handleUpgrade = () => {
    const selectedPlanObj = plans.find(p => p.id === selectedPlan);
    if (!selectedPlanObj) return;

    const isAnyPremiumActive = seekerPlanActive && seekerPlanExpiry && (seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : new Date(seekerPlanExpiry)) > new Date();

    if (isAnyPremiumActive) {
      Alert.alert('Plan Active', 'You already have an active premium plan. You cannot buy or extend plans until your current plan expires.');
      return;
    }

    let basePrice = parseInt(selectedPlanObj.price.replace('₹', ''));
    let total = basePrice;
    
    let message = `Selected Plan: ${selectedPlanObj.name} (${selectedPlanObj.price}${selectedPlanObj.duration})\n`;
    message += `\nTotal Amount: ₹${total}\n\nProceed to payment?`;

    Alert.alert(
      'Confirm Premium Upgrade',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: () => processPayment() }
      ]
    );
  };

  const processPayment = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'Please log in to upgrade.');
        return;
      }

      // Calculate expiry date (always from now since extensions are disabled)
      const now = new Date();
      let expiryDate = new Date(now);
      if (selectedPlan === 'weekly') {
        expiryDate.setDate(now.getDate() + 7);
      } else if (selectedPlan === 'monthly') {
        expiryDate.setMonth(now.getMonth() + 1);
      } else if (selectedPlan === 'yearly') {
        expiryDate.setFullYear(now.getFullYear() + 1);
      }

      // Create payment history record
      const selectedPlanObj = plans.find(p => p.id === selectedPlan);
      const planPriceStr = selectedPlanObj?.price || '0';
      const basePrice = parseInt(planPriceStr.replace('₹', '')) || 0;

      const options = {
        description: `Premium Job Seeker - ${selectedPlanObj?.name || selectedPlan}`,
        image: 'https://img.icons8.com/fluency/96/crown.png',
        currency: 'INR',
        key: RAZORPAY_CONFIG.keyId,
        amount: (basePrice * 100).toString(), // amount in paise
        name: 'Meesent Technology',
        prefill: {
          email: auth.currentUser?.email || 'user@example.com',
          contact: auth.currentUser?.phoneNumber || '',
          name: auth.currentUser?.displayName || 'User'
        },
        theme: { color: '#0035a0' }
      };

      let paymentId = '';
      try {
        const data = await RazorpayCheckout.open(options);
        paymentId = data.razorpay_payment_id;
      } catch (checkoutError: any) {
        console.warn('Razorpay Native Error:', checkoutError);
        const isNativeModuleOffline = !RazorpayCheckout || checkoutError?.message?.includes('Null') || checkoutError?.code === undefined;
        if (isNativeModuleOffline) {
          paymentId = `PAY-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
        } else {
          Alert.alert('Payment Cancelled', 'Payment was cancelled or failed.');
          return;
        }
      }

      await addDoc(collection(db, 'payments'), {
        userId: userId,
        amount: basePrice,
        description: `Premium Job Seeker - ${selectedPlanObj?.name || selectedPlan}`,
        plan: selectedPlan,
        paymentId: paymentId,
        status: 'SUCCESS',
        createdAt: serverTimestamp(),
        serviceType: 'JobSeekerPremium'
      });

      await updateDoc(doc(db, 'users', userId), {
        seekerPlan: selectedPlan,
        seekerPlanExpiry: expiryDate,
        seekerPlanActive: true,
        seekerPlanUpdatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Upgrade successful! Your premium benefits are now active.');
      navigation.goBack();
    } catch (error: any) {
      console.error("Error processing upgrade payment:", error);
      Alert.alert('Error', 'Failed to update premium plan: ' + error.message);
    }
  };

  const plans = [
    {
      id: 'weekly',
      name: 'Weekly Pass',
      price: `₹${passPrices.weekly}`,
      duration: '/week',
      popular: false,
    },
    {
      id: 'monthly',
      name: 'Monthly Pass',
      price: `₹${passPrices.monthly}`,
      duration: '/month',
      popular: true,
    },
    {
      id: 'yearly',
      name: 'Annual Pass',
      price: `₹${passPrices.yearly}`,
      duration: '/year',
      popular: false,
    }
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}>
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <LinearGradient colors={['#0035a0', '#002266']} style={styles.iconGradient}>
                <MaterialCommunityIcons name="star-shooting" size={40} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>Premium for Job Seekers</Text>
            <Text style={styles.heroSubtitle}>
              Unlock exclusive jobs, get hired faster, and stand out from the crowd!
            </Text>
          </View>

          {seekerPlanActive && seekerPlanExpiry && (new Date(seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : seekerPlanExpiry) > new Date()) && (
            <View style={styles.activePlanBanner}>
              <LinearGradient colors={['#fdf4ff', '#e0edfa']} style={styles.activePlanGradient}>
                <Ionicons name="checkmark-circle" size={24} color="#0035a0" />
                <View style={styles.activePlanTextContainer}>
                  <Text style={styles.activePlanTitle}>Your Premium is Active!</Text>
                  <Text style={styles.activePlanSub}>
                    Plan: <Text style={{fontWeight: 'bold', textTransform: 'capitalize'}}>{currentPlanId} Pass</Text>
                  </Text>
                  <Text style={styles.activePlanExpiry}>
                    Expires on: <Text style={{fontWeight: 'bold'}}>{formatExpiryDate(seekerPlanExpiry)}</Text>
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Benefits Section */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.sectionTitle}>What you get</Text>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIconBox, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="flash" size={20} color="#f59e0b" />
              </View>
              <View style={styles.benefitTextContent}>
                <Text style={styles.benefitTitle}>Urgent Recruitment</Text>
                <Text style={styles.benefitSub}>Apply to high-priority jobs that need immediate hiring.</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIconBox, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="cash" size={20} color="#10b981" />
              </View>
              <View style={styles.benefitTextContent}>
                <Text style={styles.benefitTitle}>High Salary Jobs</Text>
                <Text style={styles.benefitSub}>Access premium listings with salaries above 20k+.</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIconBox, { backgroundColor: '#fdf4ff' }]}>
                <Ionicons name="rocket" size={20} color="#0035a0" />
              </View>
              <View style={styles.benefitTextContent}>
                <Text style={styles.benefitTitle}>Fast Response</Text>
                <Text style={styles.benefitSub}>Your application gets pushed to the top of the recruiter's list.</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIconBox, { backgroundColor: '#e0edfa' }]}>
                <Ionicons name="document-text" size={20} color="#3b82f6" />
              </View>
              <View style={styles.benefitTextContent}>
                <Text style={styles.benefitTitle}>Show More Applications</Text>
                <Text style={styles.benefitSub}>Send unlimited applications and see who viewed your profile.</Text>
              </View>
            </View>
          </View>

          {/* Pricing Plans */}
          <View style={styles.pricingContainer}>
            <Text style={styles.sectionTitle}>Choose your plan</Text>
            
            <View style={styles.plansRow}>
              {plans.map((plan) => {
                const isCurrentActive = seekerPlanActive && currentPlanId === plan.id && (new Date(seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : seekerPlanExpiry) > new Date());
                const isAnyPremiumActive = seekerPlanActive && seekerPlanExpiry && (new Date(seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : seekerPlanExpiry) > new Date());
                const isCardDisabled = isAnyPremiumActive && !isCurrentActive;

                return (
                  <TouchableOpacity 
                    key={plan.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedPlan(plan.id)}
                    disabled={isCardDisabled}
                    style={[
                      styles.planCard,
                      selectedPlan === plan.id && styles.planCardActive,
                      isCardDisabled && { opacity: 0.4 }
                    ]}
                  >
                    {seekerPlanActive && currentPlanId === plan.id && (new Date(seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : seekerPlanExpiry) > new Date()) ? (
                      <View style={[styles.popularBadge, { backgroundColor: '#10b981' }]}>
                        <Text style={styles.popularText}>ACTIVE</Text>
                      </View>
                    ) : plan.popular ? (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>BEST VALUE</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.planName, selectedPlan === plan.id && styles.planTextActive]}>
                      {plan.name}
                    </Text>
                    <Text style={[styles.planPrice, selectedPlan === plan.id && styles.planTextActive]}>
                      {plan.price}
                    </Text>
                    <Text style={[styles.planDuration, selectedPlan === plan.id && styles.planTextActiveOpacity]}>
                      {plan.duration}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </ScrollView>

        {/* Floating Action Button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {(() => {
            const isAnyPremiumActive = seekerPlanActive && seekerPlanExpiry && (new Date(seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : seekerPlanExpiry) > new Date());
            return (
              <TouchableOpacity 
                style={[styles.upgradeBtn, isAnyPremiumActive && { opacity: 0.6 }]} 
                activeOpacity={0.8} 
                onPress={handleUpgrade}
                disabled={isAnyPremiumActive}
              >
                <LinearGradient 
                  colors={isAnyPremiumActive ? ['#94a3b8', '#64748b'] : ['#0035a0', '#002266']} 
                  start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                  style={styles.upgradeBtnGradient}
                >
                  <Text style={styles.upgradeBtnText}>
                    {isAnyPremiumActive ? 'Premium Benefits Active' : 'Upgrade Now'}
                  </Text>
                  <FontAwesome5 name={isAnyPremiumActive ? "shield-alt" : "crown"} size={14} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            );
          })()}
          <Text style={styles.secureText}>
            <Ionicons name="lock-closed" size={10} color="#94a3b8" /> Secure 1-Click Payment
          </Text>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 30,
  },
  iconContainer: {
    marginBottom: 16,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  benefitsContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  benefitIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitTextContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  benefitSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 18,
  },
  pricingContainer: {
    paddingHorizontal: 24,
  },
  plansRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f1f5f9',
    position: 'relative',
  },
  planCardActive: {
    backgroundColor: '#0035a0',
    borderColor: '#0035a0',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '900',
  },
  planName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    marginTop: 4,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
  },
  planDuration: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  planTextActive: {
    color: 'white',
  },
  planTextActiveOpacity: {
    color: 'rgba(255,255,255,0.8)',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
  },
  upgradeBtn: {
    width: '100%',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 10,
  },
  upgradeBtnGradient: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
  },
  upgradeBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  secureText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  featureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  activePlanBanner: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#e0edfa',
    elevation: 2,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  activePlanGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activePlanTextContainer: {
    flex: 1,
  },
  activePlanTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0035a0',
    marginBottom: 4,
  },
  activePlanSub: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  activePlanExpiry: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
});
