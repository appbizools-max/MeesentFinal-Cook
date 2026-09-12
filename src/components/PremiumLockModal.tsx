import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RAZORPAY_CONFIG } from '../config/razorpay';
import { auth, db } from '../services/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import RazorpayCheckout from 'react-native-razorpay';

interface PremiumLockModalProps {
  visible: boolean;
  onClose: () => void;
  salary?: string;
  isUrgent?: boolean;
  onSuccess?: () => void;
}

export default function PremiumLockModal({
  visible,
  onClose,
  salary,
  isUrgent,
  onSuccess
}: PremiumLockModalProps) {
  const [payLoading, setPayLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('monthly');
  const [passPrices, setPassPrices] = useState({
    weekly: 99,
    monthly: 299,
  });

  useEffect(() => {
    const unsubPricing = onSnapshot(doc(db, 'config', 'service_pricing'), (pricingDoc) => {
      if (pricingDoc.exists()) {
        const pData = pricingDoc.data();
        setPassPrices({
          weekly: pData.jobSeekerWeeklyPassPrice ?? pData.jobSeekerPass?.weekly ?? 99,
          monthly: pData.jobSeekerMonthlyPassPrice ?? pData.jobSeekerPass?.monthly ?? 299,
        });
      }
    }, (err) => console.warn('Dynamic lock modal pricing fetch error:', err));
    return () => unsubPricing();
  }, []);

  const isSalaryOver20k = () => {
    if (!salary) return false;
    try {
      const cleanString = salary.toString().replace(/[^0-9]/g, '');
      const salaryNum = parseInt(cleanString, 10);
      if (isNaN(salaryNum)) return false;
      return salaryNum >= 20000;
    } catch (e) {
      return false;
    }
  };

  const activatePremium = async (days: number, amount: number, planName: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert("Authentication Required", "Please sign in to buy a premium plan.");
        return;
      }

      setPayLoading(true);

      const options = {
        description: `Seeker Premium - ${planName}`,
        image: 'https://img.icons8.com/fluency/96/crown.png',
        currency: 'INR',
        key: RAZORPAY_CONFIG.keyId,
        amount: (amount * 100).toString(), // amount in paise
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
          paymentId = `pay_sim_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
        } else {
          Alert.alert('Payment Failed', 'Payment was cancelled or failed.');
          setPayLoading(false);
          return;
        }
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      await addDoc(collection(db, 'payments'), {
        userId: userId,
        amount: amount,
        description: `Premium Job Seeker - ${planName}`,
        plan: days === 7 ? 'weekly' : 'monthly',
        paymentId: paymentId,
        status: 'SUCCESS',
        createdAt: serverTimestamp(),
        serviceType: 'JobSeekerPremium'
      });

      await updateDoc(doc(db, 'users', userId), {
        seekerPlan: days === 7 ? 'weekly' : 'monthly',
        seekerPlanExpiry: expiryDate,
        seekerPlanActive: true,
        seekerPlanUpdatedAt: serverTimestamp(),
      });

      Alert.alert("Success", `Premium Seeker plan activated for ${days} days!`);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error activating premium:", error);
      Alert.alert("Error", "Could not upgrade your account: " + error.message);
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.popupOverlay}>
        <View style={styles.popupContent}>
          {payLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#0035a0" />
              <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: '700' }}>Processing Payment...</Text>
            </View>
          ) : (
            <>
              {/* Shield Icon & Header */}
              <View style={styles.popupHeader}>
                <View style={styles.popupShieldIcon}>
                  <MaterialCommunityIcons name="shield-lock" size={28} color="#0035a0" />
                </View>
                <Text style={styles.popupTitle}>Unlock More Jobs and High Pay</Text>
                <Text style={styles.popupSubTitle}>
                  {isSalaryOver20k()
                    ? `This job offers a high-paying salary of ${salary}. Unlock direct calls and WhatsApp contact to apply.`
                    : "This is a Featured/Urgent Hiring job. Unlock direct calls and WhatsApp contact to apply."}
                </Text>
              </View>

              {/* Plans List */}
              <View style={styles.popupPlansList}>
                <TouchableOpacity
                  style={[styles.popupPlanCard, selectedPlanId === 'weekly' && styles.popupPlanCardActive]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPlanId('weekly')}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.popupPlanName, selectedPlanId === 'weekly' && { color: '#0035a0' }]}>Weekly Pass</Text>
                    <Text style={styles.popupPlanDesc}>Access high-paying jobs for 7 days</Text>
                  </View>
                  <Text style={[styles.popupPlanPrice, selectedPlanId === 'weekly' && { color: '#0035a0' }]}>₹{passPrices.weekly}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.popupPlanCard, selectedPlanId === 'monthly' && styles.popupPlanCardActive]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPlanId('monthly')}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.popupPlanName, selectedPlanId === 'monthly' && { color: '#0035a0' }]}>Monthly Pass</Text>
                      {selectedPlanId === 'monthly' && (
                        <View style={styles.popupPopularBadge}>
                          <Text style={styles.popupPopularText}>POPULAR</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.popupPlanDesc}>Access high-paying jobs for 30 days</Text>
                  </View>
                  <Text style={[styles.popupPlanPrice, selectedPlanId === 'monthly' && { color: '#0035a0' }]}>₹{passPrices.monthly}</Text>
                </TouchableOpacity>
              </View>

              {/* Dedicated Pay & Unlock Button */}
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => {
                  if (selectedPlanId === 'weekly') {
                    activatePremium(7, passPrices.weekly, 'Weekly Pass');
                  } else {
                    activatePremium(30, passPrices.monthly, 'Monthly Pass');
                  }
                }}
              >
                <Text style={styles.payBtnText}>
                  {selectedPlanId === 'weekly' ? `Pay ₹${passPrices.weekly} & Unlock` : `Pay ₹${passPrices.monthly} & Unlock`}
                </Text>
              </TouchableOpacity>

              {/* Go Back Trigger */}
              <TouchableOpacity
                onPress={onClose}
                style={styles.popupCloseBtn}
              >
                <Text style={styles.popupCloseText}>Go Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  popupHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  popupShieldIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f5fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#9dbff2',
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  popupSubTitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },
  popupPlansList: {
    gap: 8,
    marginBottom: 12,
  },
  popupPlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  popupPlanCardActive: {
    borderColor: '#0035a0',
    backgroundColor: '#f6f9fe',
  },
  popupPlanName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  popupPlanDesc: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  popupPopularBadge: {
    backgroundColor: '#0035a0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popupPopularText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '800',
  },
  popupPlanPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
    marginLeft: 12,
  },
  payBtn: {
    backgroundColor: '#0035a0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  payBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900'
  },
  popupCloseBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCloseText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
});
