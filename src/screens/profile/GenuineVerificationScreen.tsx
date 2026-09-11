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
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import notificationService from '../../services/notification.service';

export default function GenuineVerificationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [verificationPrice, setVerificationPrice] = useState<number>(99);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch('http://10.0.2.2:5000/api/pricing');
        const data = await res.json();
        if (data.success && data.pricing) {
          setVerificationPrice(Number(data.pricing.jobsVerification || 99));
        }
      } catch (_) {}
    };

    fetchPricing();

    const unsubPricing = onSnapshot(doc(db, 'config', 'service_pricing'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setVerificationPrice(Number(data.jobsVerification || 99));
      }
    }, (err) => {
      console.warn("Jobs verification pricing listener notice, using API fallback:", err);
      fetchPricing();
    });
    return () => unsubPricing();
  }, []);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const active = data.isGenuineVerified || false;
        
        let expired = false;
        let endVal = null;
        let startVal = null;
        
        if (data.genuineVerificationEndDate) {
          try {
            const end = data.genuineVerificationEndDate?.toDate 
              ? data.genuineVerificationEndDate.toDate() 
              : new Date(data.genuineVerificationEndDate);
            if (!isNaN(end.getTime())) {
              endVal = end;
              if (end < new Date()) {
                expired = true;
              }
            }
          } catch (e) { }
        }
        
        if (data.genuineVerificationStartDate) {
          try {
            const start = data.genuineVerificationStartDate?.toDate 
              ? data.genuineVerificationStartDate.toDate() 
              : new Date(data.genuineVerificationStartDate);
            if (!isNaN(start.getTime())) {
              startVal = start;
            }
          } catch (e) { }
        }

        if (active && !expired) {
          setIsVerified(true);
          setStartDate(startVal);
          setEndDate(endVal);
        } else {
          setIsVerified(false);
          setStartDate(null);
          setEndDate(null);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to verification status:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (dateObj: any) => {
    if (!dateObj) return 'N/A';
    try {
      const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const handlePurchase = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Toast.show({ type: 'error', text1: 'Not logged in', text2: 'Please log in to continue.' });
      return;
    }

    setLoading(true);

    const options = {
      description: 'Genuine Verification Upgrade - 1 Month',
      image: 'https://img.icons8.com/fluency/96/shield.png',
      currency: 'INR',
      key: RAZORPAY_CONFIG.keyId,
      amount: (verificationPrice * 100).toString(),
      name: 'Meesent Technology',
      prefill: {
        email: auth.currentUser?.email || 'user@example.com',
        contact: auth.currentUser?.phoneNumber || '',
        name: auth.currentUser?.displayName || 'User'
      },
      theme: { color: '#10b981' }
    };
    try {
      // Call native Razorpay module
      const data = await RazorpayCheckout.open(options);
      
      // Payment Successful
      await saveVerificationToDatabase(data.razorpay_payment_id);
    } catch (error: any) {
      console.warn('Razorpay Error:', error);
      setLoading(false);
      
      if (error?.code !== 0) { // Code 0 is user cancellation
        Alert.alert(
          'Payment Cancelled or Failed',
          error.description || 'The payment was not completed. Please try again.'
        );
      }
    }
  };
  const saveVerificationToDatabase = async (paymentId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // 1 Month = 30 Days

      // 1. Update user profile document in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isGenuineVerified: true,
        hasVerificationBadge: true,
        genuineVerificationStartDate: startDate,
        genuineVerificationEndDate: endDate,
      });

      // 2. Save payment record to payments collection
      await addDoc(collection(db, 'payments'), {
        userId,
        amount: verificationPrice,
        paymentId: paymentId,
        status: 'success',
        description: 'Genuine Verification Upgrade',
        plan: 'month',
        createdAt: serverTimestamp(),
        startDate: startDate,
        endDate: endDate,
        sourceApp: 'Jobs',
      });

      // 3. Update all jobs posted by the user to be genuine verified
      const qJobs = query(collection(db, 'jobs'), where('postedBy', '==', userId));
      const jobsSnap = await getDocs(qJobs);
      const updatePromises = jobsSnap.docs.map(jobDoc => 
        updateDoc(jobDoc.ref, { isGenuineVerified: true })
      );
      await Promise.all(updatePromises);

      // 4. Send local push notification
      try {
        await notificationService.sendLocalNotification(
          'Genuine Verification Active 🛡️',
          'Congratulations! Your profile is now Genuine Verified for 30 days.'
        );
      } catch (pushError) {
        console.error('Error sending local notification:', pushError);
      }

      Toast.show({
        type: 'success',
        text1: 'Verification Active',
        text2: 'You are now Genuine Verified!'
      });
    } catch (error: any) {
      console.error('Error saving verification:', error);
      Alert.alert('Database Error', 'Failed to activate verification in database.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Checking verification status...</Text>
      </View>
    );
  }

  if (isVerified) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Genuine Verification</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.verifiedScroll}>
            <View style={styles.verifiedCard}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.verifiedIconGradient}>
                <Ionicons name="shield-checkmark" size={36} color="white" />
              </LinearGradient>
              
              <Text style={styles.verifiedTitleText}>You are Verified!</Text>
              <Text style={styles.verifiedSubtitleText}>
                Your genuine verification is active. Employers can now see the green verification tick next to your job postings, building immediate trust.
              </Text>

              <View style={styles.verifiedDivider} />

              <Text style={styles.detailsHeader}>Plan Details</Text>
              
              <View style={styles.detailRowItem}>
                <Text style={styles.detailLabel}>Plan Option</Text>
                <Text style={styles.detailValue}>1 Month Subscription</Text>
              </View>
              
              <View style={styles.detailRowItem}>
                <Text style={styles.detailLabel}>Start Date</Text>
                <Text style={styles.detailValue}>{formatDate(startDate)}</Text>
              </View>
              
              <View style={styles.detailRowItem}>
                <Text style={styles.detailLabel}>End Date</Text>
                <Text style={styles.detailValue}>{formatDate(endDate)}</Text>
              </View>

              <View style={styles.detailRowItem}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={styles.activeStatusBadge}>
                  <View style={styles.statusDotGreen} />
                  <Text style={styles.statusBadgeTextGreen}>ACTIVE</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.verifiedFooter}>
            <TouchableOpacity 
              style={styles.backToProfileBtn} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.backToProfileBtnText}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Genuine Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.iconGradient}>
                <Ionicons name="shield-checkmark" size={36} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>Get Verified</Text>
            <Text style={styles.heroSubtitle}>
              Build trust with employers and stand out from the crowd
            </Text>
          </View>

          {/* Benefits Section */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.sectionTitle}>Benefits</Text>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIconBox, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="shield-checkmark" size={18} color="#10b981" />
              </View>
              <View style={styles.benefitTextContent}>
                <Text style={styles.benefitTitle}>Verified Badge</Text>
                <Text style={styles.benefitSub}>Display a trusted verification badge on your profile</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIconBox, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="star" size={18} color="#f59e0b" />
              </View>
              <View style={styles.benefitTextContent}>
                <Text style={styles.benefitTitle}>Build Trust</Text>
                <Text style={styles.benefitSub}>Employers trust verified profiles more</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIconBox, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="trending-up" size={18} color="#3b82f6" />
              </View>
              <View style={styles.benefitTextContent}>
                <Text style={styles.benefitTitle}>Higher Ranking</Text>
                <Text style={styles.benefitSub}>Appear higher in employer search results</Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <View style={[styles.benefitIconBox, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="flash" size={18} color="#3b82f6" />
              </View>
              <View style={styles.benefitTextContent}>
                <Text style={styles.benefitTitle}>Priority Applications</Text>
                <Text style={styles.benefitSub}>Your applications get priority attention</Text>
              </View>
            </View>
          </View>

          {/* Pricing Card */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>Monthly Plan</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.pricingPrice}>₹{verificationPrice}</Text>
                <Text style={styles.pricingPeriod}>/month</Text>
              </View>
            </View>
            <View style={styles.pricingFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.featureText}>Verified Badge</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.featureText}>Profile Boost</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.featureText}>Priority Support</Text>
              </View>
            </View>
          </View>

        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.purchaseBtn} 
            activeOpacity={0.8} 
            onPress={handlePurchase}
          >
            <LinearGradient 
              colors={['#10b981', '#059669']} 
              start={{x: 0, y: 0}} end={{x: 1, y: 0}}
              style={styles.purchaseBtnGradient}
            >
              <Ionicons name="shield-checkmark" size={18} color="white" />
              <Text style={styles.purchaseBtnText}>Get Verified - ₹{verificationPrice}/month</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.secureText}>
            <Ionicons name="lock-closed" size={12} color="#94a3b8" /> Secure Payment
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
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 15,
    marginBottom: 20,
  },
  iconContainer: {
    marginBottom: 15,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  iconGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  benefitsContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  benefitIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  benefitTextContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  benefitSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 16,
  },
  pricingCard: {
    marginHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  pricingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  pricingPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
  },
  pricingPeriod: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  pricingFeatures: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
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
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
  },
  purchaseBtn: {
    width: '100%',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 8,
  },
  purchaseBtnGradient: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 8,
  },
  purchaseBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  secureText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  
  // Loader & Already Taken Screens
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '600',
  },
  verifiedScroll: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  verifiedCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  verifiedIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifiedTitleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 10,
  },
  verifiedSubtitleText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  verifiedDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#e2e8f0',
    marginVertical: 20,
  },
  detailsHeader: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 15,
  },
  detailRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusBadgeTextGreen: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#166534',
  },
  verifiedFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  backToProfileBtn: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backToProfileBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
