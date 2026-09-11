import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_CONFIG } from '../../config/razorpay';
import { auth, db } from '../../services/firebase';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';

export default function BusinessVerificationScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [verificationPrice, setVerificationPrice] = useState<number>(199);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch('http://10.0.2.2:5000/api/pricing');
        const data = await res.json();
        if (data.success && data.pricing) {
          setVerificationPrice(Number(data.pricing.servicesVerification || data.pricing.verification || 199));
        }
      } catch (_) {}
    };

    fetchPricing();

    const unsubPricing = onSnapshot(doc(db, 'config', 'service_pricing'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setVerificationPrice(Number(data.servicesVerification || data.verification || 199));
      }
    }, (err) => {
      console.warn("Verification pricing listener notice, using API fallback:", err);
      fetchPricing();
    });

    return () => unsubPricing();
  }, []);

  const fetchUserBusinesses = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(db, 'vendors'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const bizList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBusinesses(bizList);

      // Pre-select the passed business if available, or first unverified
      const passedVendorId = route.params?.vendorId;
      if (passedVendorId && bizList.some(b => b.id === passedVendorId)) {
        setSelectedBusinessId(passedVendorId);
      } else {
        const firstUnverified = bizList.find((b: any) => b.tookVerification !== true && b.isVerified !== true);
        if (firstUnverified) {
          setSelectedBusinessId(firstUnverified.id);
        } else if (bizList.length > 0) {
          setSelectedBusinessId(bizList[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching user businesses:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load your businesses'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserBusinesses();
  }, []);

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);
  const isSelectedBusinessVerified = selectedBusiness ? (selectedBusiness.tookVerification === true || selectedBusiness.isVerified === true) : false;

  const handleUpgrade = () => {
    if (selectedBusinessId) {
      navigation.navigate('SelectPlan', { businessId: selectedBusinessId });
    } else {
      navigation.navigate('SelectPlan');
    }
  };

  const handlePurchase = async () => {
    if (!selectedBusinessId) {
      Toast.show({
        type: 'error',
        text1: 'No Business Selected',
        text2: 'Please select a business to verify.'
      });
      return;
    }

    const selectedBiz = businesses.find(b => b.id === selectedBusinessId);
    if (!selectedBiz) return;

    const isAlreadyVerified = Boolean(selectedBiz.tookVerification === true || selectedBiz.isVerified === true);
    if (isAlreadyVerified) {
      Alert.alert(
        'Already Verified',
        `"${selectedBiz.businessName}" is already verified.\n\nWould you like to upgrade your business plan for more features?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Plan', onPress: () => handleUpgrade() }
        ]
      );
      return;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) {
      Toast.show({ type: 'error', text1: 'Not logged in', text2: 'Please log in to continue.' });
      return;
    }

    const options = {
      description: `Lifetime Verification Badge for "${selectedBiz.businessName}"`,
      image: 'https://img.icons8.com/fluency/96/shield.png',
      currency: 'INR',
      key: RAZORPAY_CONFIG.keyId,
      amount: (verificationPrice * 100).toString(), // Price in paise
      name: 'Meesent Technology',
      prefill: {
        email: auth.currentUser?.email || 'user@example.com',
        contact: auth.currentUser?.phoneNumber || '',
        name: auth.currentUser?.displayName || 'User'
      },
      theme: { color: '#3b82f6' }
    };

    Alert.alert(
      'Business Verification',
      `Get verified badge for "${selectedBiz.businessName}" • Build trust • Higher ranking\n\nPrice: ₹${verificationPrice} (Lifetime)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            try {
              setLoading(true);
              // Call native Razorpay module
              const data = await RazorpayCheckout.open(options);

              // Payment Successful
              await saveVerificationToDatabase(data.razorpay_payment_id);
            } catch (error: any) {
              console.warn('Razorpay Error:', error);
              setLoading(false);

              if (error?.code !== 0) {
                Alert.alert(
                  'Payment Cancelled or Failed',
                  error.description || 'The payment was not completed. Please try again.'
                );
              }
            }
          }
        }
      ]
    );
  };

  const saveVerificationToDatabase = async (paymentId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !selectedBusinessId) return;

    const selectedBiz = businesses.find(b => b.id === selectedBusinessId);
    if (!selectedBiz) return;

    try {
      setLoading(true);

      // Update the vendor doc
      const vendorRef = doc(db, 'vendors', selectedBusinessId);
      await updateDoc(vendorRef, {
        isVerified: true,
        tookVerification: true,
        verifyMark: true,
        verificationStatus: 'verified',
        verificationPaymentId: paymentId,
        verificationBadgePurchasedAt: new Date().toISOString()
      });

      // Update user doc for backward compatibility
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        hasVerificationBadge: true,
        verificationBadgePurchasedAt: new Date().toISOString()
      });

      // Log payment in payments collection
      await addDoc(collection(db, 'payments'), {
        vendorId: selectedBusinessId,
        amount: verificationPrice,
        planId: 'verification',
        planName: 'Genuine Verification',
        duration: 'Lifetime',
        status: 'success',
        transactionId: paymentId,
        createdAt: new Date().toISOString(),
        paymentMethod: 'Razorpay'
      });

      Toast.show({
        type: 'success',
        text1: 'Verification Purchased',
        text2: `${selectedBiz.businessName} is now verified!`
      });

      await fetchUserBusinesses();
    } catch (error: any) {
      console.error('Error saving verification to database:', error);
      Toast.show({
        type: 'error',
        text1: 'Database Error',
        text2: error.message || 'Failed to save verification status.'
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>

            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.iconContainer}>
                <LinearGradient colors={['#3b82f6', '#3b82f6']} style={styles.iconGradient}>
                  <Ionicons name="shield-checkmark" size={50} color="white" />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>Get Your Business Verified</Text>
              <Text style={styles.heroSubtitle}>
                Build trust with customers and stand out from the competition
              </Text>
            </View>

            {/* Business Selection Section */}
            <View style={styles.businessSelectContainer}>
              <Text style={styles.sectionTitle}>Select Business to Verify</Text>
              {businesses.length === 0 ? (
                <View style={styles.noBusinessCard}>
                  <Ionicons name="alert-circle-outline" size={32} color="#64748b" />
                  <Text style={styles.noBusinessText}>
                    You don't have any registered businesses (Services / Products).
                  </Text>
                  <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={() => navigation.navigate('VendorRegistration')}
                  >
                    <Text style={styles.registerBtnText}>Register Your Business</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                businesses.map((biz) => {
                  const isVerified = (biz.tookVerification === true || biz.isVerified === true);
                  const isSelected = selectedBusinessId === biz.id;

                  return (
                    <TouchableOpacity
                      key={biz.id}
                      style={[
                        styles.businessOptionCard,
                        isVerified && styles.businessOptionCardVerified,
                        isSelected && !isVerified && styles.businessOptionCardSelected,
                      ]}
                      disabled={isVerified}
                      onPress={() => setSelectedBusinessId(biz.id)}
                    >
                      <View style={styles.businessOptionLeft}>
                        <View style={[
                          styles.businessIconBox,
                          isVerified ? styles.businessIconBoxVerified :
                            (isSelected ? styles.businessIconBoxSelected : styles.businessIconBoxDefault)
                        ]}>
                          <Ionicons
                            name={isVerified ? "shield-checkmark" : "business"}
                            size={22}
                            color={isVerified ? "#10b981" : (isSelected ? "#3b82f6" : "#64748b")}
                          />
                        </View>
                        <View style={styles.businessOptionInfo}>
                          <Text style={styles.businessOptionName} numberOfLines={1}>
                            {biz.businessName}
                          </Text>
                          <Text style={styles.businessOptionCat} numberOfLines={1}>
                            {biz.category || (biz.type === 'product' ? 'Product Business' : 'Service Business')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.businessOptionRight}>
                        {isVerified ? (
                          <View style={styles.verifiedStatusBadge}>
                            <Text style={styles.verifiedStatusText}>VERIFIED</Text>
                          </View>
                        ) : (
                          <View style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected
                          ]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Benefits Section */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.sectionTitle}>Benefits</Text>

              <View style={styles.benefitItem}>
                <View style={[styles.benefitIconBox, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                </View>
                <View style={styles.benefitTextContent}>
                  <Text style={styles.benefitTitle}>Verified Badge</Text>
                  <Text style={styles.benefitSub}>Display a trusted verification badge on your business profile</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={[styles.benefitIconBox, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="star" size={24} color="#f59e0b" />
                </View>
                <View style={styles.benefitTextContent}>
                  <Text style={styles.benefitTitle}>Build Customer Trust</Text>
                  <Text style={styles.benefitSub}>Customers trust verified businesses more</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={[styles.benefitIconBox, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="trending-up" size={24} color="#3b82f6" />
                </View>
                <View style={styles.benefitTextContent}>
                  <Text style={styles.benefitTitle}>Higher Ranking</Text>
                  <Text style={styles.benefitSub}>Appear higher in customer search results</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={[styles.benefitIconBox, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="flash" size={24} color="#3b82f6" />
                </View>
                <View style={styles.benefitTextContent}>
                  <Text style={styles.benefitTitle}>Priority Leads</Text>
                  <Text style={styles.benefitSub}>Get priority access to customer inquiries</Text>
                </View>
              </View>
            </View>

            {/* Pricing Card */}
            {!isSelectedBusinessVerified && businesses.length > 0 && (
              <View style={styles.pricingCard}>
                <View style={styles.pricingHeader}>
                  <View>
                    <Text style={styles.pricingTitle}>Lifetime Verification</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 2 }}>One-Time Onboarding Fee</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={styles.pricingPrice}>₹{verificationPrice}</Text>
                    <Text style={styles.pricingPeriod}> (Lifetime)</Text>
                  </View>
                </View>
                <View style={styles.pricingFeatures}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureText}>Verified Badge</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureText}>Business Boost</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureText}>Priority Support</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Already Verified State */}
            {isSelectedBusinessVerified && (
              <View style={styles.verifiedCard}>
                <Ionicons name="shield-checkmark" size={40} color="#10b981" />
                <Text style={styles.verifiedTitle}>Already Verified!</Text>
                <Text style={styles.verifiedSubtitle}>
                  "{selectedBusiness?.businessName}" is already verified. You can upgrade to premium features for more benefits.
                </Text>
              </View>
            )}

          </ScrollView>
        )}

        {/* Footer */}
        {!loading && businesses.length > 0 && (
          <View style={styles.footer}>
            {!isSelectedBusinessVerified ? (
              <TouchableOpacity
                style={styles.purchaseBtn}
                activeOpacity={0.8}
                onPress={handlePurchase}
              >
                <LinearGradient
                  colors={['#3b82f6', '#3b82f6']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.purchaseBtnGradient}
                >
                  <Ionicons name="shield-checkmark" size={20} color="white" />
                  <Text style={styles.purchaseBtnText}>Get Verified - ₹{verificationPrice} Lifetime</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.purchaseBtn}
                activeOpacity={0.8}
                onPress={handleUpgrade}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.purchaseBtnGradient}
                >
                  <Ionicons name="rocket" size={20} color="white" />
                  <Text style={styles.purchaseBtnText}>Upgrade to Premium</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <Text style={styles.secureText}>
              <Ionicons name="lock-closed" size={12} color="#94a3b8" /> Secure Payment
            </Text>
          </View>
        )}

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
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 30,
  },
  iconContainer: {
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  businessSelectContainer: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  businessOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  businessOptionCardVerified: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    opacity: 0.7,
  },
  businessOptionCardSelected: {
    backgroundColor: '#fef2f2',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  businessOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  businessIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessIconBoxDefault: {
    backgroundColor: '#f1f5f9',
  },
  businessIconBoxSelected: {
    backgroundColor: '#fef2f2',
  },
  businessIconBoxVerified: {
    backgroundColor: '#dcfce7',
  },
  businessOptionInfo: {
    flex: 1,
  },
  businessOptionName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  businessOptionCat: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  businessOptionRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedStatusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  verifiedStatusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#3b82f6',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  noBusinessCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  noBusinessText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 20,
  },
  registerBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  registerBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  benefitsContainer: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  benefitIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitTextContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  benefitSub: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 18,
  },
  pricingCard: {
    marginHorizontal: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginBottom: 30,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  pricingPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#3b82f6',
  },
  pricingPeriod: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  pricingFeatures: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
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
  purchaseBtn: {
    width: '100%',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 10,
  },
  purchaseBtnGradient: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  purchaseBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secureText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  verifiedCard: {
    marginHorizontal: 24,
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
    marginBottom: 30,
  },
  verifiedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 12,
    marginBottom: 8,
  },
  verifiedSubtitle: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 22,
  },
});

