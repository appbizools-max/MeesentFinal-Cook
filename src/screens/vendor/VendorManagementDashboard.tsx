import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, updateDoc, collection, setDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';

export default function VendorManagementDashboard({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [monthlyMetrics, setMonthlyMetrics] = useState<any>(null);
  const [verificationPrice, setVerificationPrice] = useState<number>(199);
  const businessIdFromRoute = route.params?.businessId;

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
      console.warn("Vendor dashboard pricing snapshot notice, using API fallback:", err);
      fetchPricing();
    });
    return () => unsubPricing();
  }, []);

  const getDaysRemaining = () => {
    if (!subscription?.currentPeriodEnd) return 0;
    const end = subscription.currentPeriodEnd.toDate ? subscription.currentPeriodEnd.toDate() : new Date(subscription.currentPeriodEnd);
    const diffTime = end.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  useEffect(() => {
    let unsubscribeVendor: () => void = () => {};
    let unsubscribeSub: () => void = () => {};
    let unsubscribeMetrics: () => void = () => {};

    const setupListener = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        let targetBusinessId = businessIdFromRoute;

        if (!targetBusinessId) {
          const userDocSnap = await getDoc(doc(db, 'users', userId));
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            targetBusinessId = userData.businessId;
          }
        }

        const docId = targetBusinessId || userId;
        if (docId) {
          // 1. Vendor snapshot listener
          unsubscribeVendor = onSnapshot(doc(db, 'vendors', docId), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const newData = { id: docId, ...data };

              
              // Detect approval status transition
              setVendorData((prevData: any) => {
                if (prevData && 
                    (prevData.status === 'pending_approval' || prevData.status === 'pending_verification') && 
                    (newData.status === 'approved' || newData.status === 'active')) {
                  // Trigger local notification
                  import('../../services/notification.service').then(({ default: ns }) => {
                    ns.sendLocalNotification(
                      'Business Approved! 🎉',
                      `Your business "${newData.businessName}" has been successfully approved by the admin. You now have full access.`
                    );
                  });
                }
                return newData;
              });
            }
            setLoading(false);
          });

          // 2. Subscription snapshot listener
          unsubscribeSub = onSnapshot(doc(db, 'vendorSubscriptions', docId), (subSnap) => {
            if (subSnap.exists()) {
              setSubscription(subSnap.data());
            }
          });

          // 3. Monthly Metrics snapshot listener
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const monthKey = `${yyyy}-${mm}`;
          const metricId = `${docId}_${monthKey}`;
          unsubscribeMetrics = onSnapshot(doc(db, 'vendorMonthlyMetrics', metricId), (metricSnap) => {
            if (metricSnap.exists()) {
              setMonthlyMetrics(metricSnap.data());
            }
          });

        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error setting up vendor listener:", error);
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      unsubscribeVendor();
      unsubscribeSub();
      unsubscribeMetrics();
    };
  }, [businessIdFromRoute]);

  const handleVerificationPayment = () => {
    if (vendorData?.id) {
      navigation.navigate('BusinessVerification', { vendorId: vendorData.id });
    } else {
      navigation.navigate('BusinessVerification');
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // --- PENDING APPROVAL SCREEN ---
  if (vendorData?.status === 'pending_verification' || vendorData?.status === 'pending_approval') {
    return (
      <View style={styles.pendingContainer}>
        <StatusBar style="dark" />
        <View style={styles.pendingHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <View style={styles.pendingContent}>
          <View style={styles.pendingIconBox}>
            <Ionicons name="time" size={60} color="#f59e0b" />
          </View>
          <Text style={styles.pendingTitle}>Under Review</Text>
          <Text style={styles.pendingDesc}>
            Your business profile <Text style={{ fontWeight: 'bold' }}>{vendorData?.businessName}</Text> is currently under review by our admin team.
          </Text>
          <Text style={styles.pendingSubDesc}>
            This usually takes 24-48 hours. You will be notified once your business is approved and live!
          </Text>
        </View>

        <TouchableOpacity style={styles.pendingActionBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.pendingActionText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- REJECTED SCREEN ---
  if (vendorData?.status === 'rejected') {
    return (
      <View style={styles.pendingContainer}>
        <StatusBar style="dark" />
        <View style={styles.pendingHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <View style={styles.pendingContent}>
          <View style={[styles.pendingIconBox, { backgroundColor: '#fef2f2' }]}>
            <Ionicons name="close-circle" size={60} color="#ef4444" />
          </View>
          <Text style={[styles.pendingTitle, { color: '#ef4444' }]}>Submission Rejected</Text>
          <Text style={styles.pendingDesc}>
            Your business details for <Text style={{ fontWeight: 'bold' }}>{vendorData?.businessName}</Text> were rejected by our admin team.
          </Text>
          <Text style={styles.pendingSubDesc}>
            Please review and correct your business name, logo, categories, or documents and resubmit them for approval.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.pendingActionBtn, { backgroundColor: '#ef4444' }]} 
          onPress={() => navigation.navigate('VendorRegistration', { isEditing: true, businessId: vendorData.id })}
        >
          <Text style={styles.pendingActionText}>Edit & Resubmit Details</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- ACTIVE DASHBOARD SCREEN (LIST VIEW) ---
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar style="dark" />

      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>MANAGE BUSINESS</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{vendorData?.businessName}</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>ACTIVE</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>

        {/* Verification Status Card */}
        {(() => {
          const isVendorVerified = Boolean(
            vendorData?.tookVerification === true ||
            vendorData?.isVerified === true ||
            vendorData?.verifyMark === true ||
            vendorData?.verificationStatus === 'verified' ||
            (vendorData?.planId && vendorData.planId !== 'free') ||
            (vendorData?.plan && vendorData.plan !== 'none' && vendorData.plan !== 'free')
          );
          return (
            <>
              <View style={{
                marginHorizontal: 16,
                marginTop: 14,
                marginBottom: 4,
                borderRadius: 16,
                backgroundColor: isVendorVerified ? '#f0fdf4' : '#fff7ed',
                borderWidth: 1.5,
                borderColor: isVendorVerified ? '#86efac' : '#fed7aa',
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isVendorVerified ? '#dcfce7' : '#ffedd5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons
                    name={isVendorVerified ? 'shield-checkmark' : 'shield-outline'}
                    size={24}
                    color={isVendorVerified ? '#16a34a' : '#ea580c'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>
                    Business Verification
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {isVendorVerified
                      ? 'Your business is officially verified ✓'
                      : 'Not verified yet — tap below to get verified'}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                  backgroundColor: isVendorVerified ? '#16a34a' : '#ea580c',
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                    {isVendorVerified ? 'VERIFIED' : 'UNVERIFIED'}
                  </Text>
                </View>
              </View>

              {/* Dynamic Verification / Upgrade Banner */}
              <TouchableOpacity
                style={styles.boostBanner}
                onPress={() => {
                  if (isVendorVerified) {
                    navigation.navigate('SelectPlan', { vendorId: vendorData.id, isUpgrade: true });
                  } else {
                    navigation.navigate('BusinessVerification', { vendorId: vendorData.id });
                  }
                }}
              >
                <LinearGradient
                  colors={isVendorVerified ? ['#3b82f6', '#1d4ed8'] : ['#10b981', '#059669']}
                  style={styles.boostGradient}
                >
                  <View style={styles.boostContent}>
                    <Text style={styles.boostTitle}>
                      {isVendorVerified ? 'Upgrade Your Plan' : 'Get Verified Badge!'}
                    </Text>
                    <Text style={styles.boostSub}>
                      {isVendorVerified ? 'Boost visibility and unlock premium features' : 'Build customer trust with a Genuine Verified symbol'}
                    </Text>
                    <View style={styles.boostBtn}>
                      <Text style={[styles.boostBtnText, { color: isVendorVerified ? '#3b82f6' : '#10b981' }]}>
                        {isVendorVerified ? 'VIEW PLANS' : `GET VERIFIED - ₹${verificationPrice}`}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isVendorVerified ? "rocket" : "shield-checkmark"}
                    size={80}
                    color="rgba(255,255,255,0.2)"
                    style={styles.boostIcon}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </>
          );
        })()}

        {/* Plan & Guarantee Progress Card */}
        {subscription && subscription.planId !== 'free' && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressLabel}>CURRENT ACTIVE PLAN</Text>
                <Text style={styles.progressPlanName}>{subscription.planId.toUpperCase()} PLAN</Text>
              </View>
              <View style={styles.daysBadge}>
                <Ionicons name="time" size={14} color="#3b82f6" style={{ marginRight: 4 }} />
                <Text style={styles.daysText}>{getDaysRemaining()} Days Left</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Ionicons name="eye" size={20} color="#3b82f6" />
                <Text style={styles.metricVal}>{monthlyMetrics?.viewCount || 0}</Text>
                <Text style={styles.metricLbl}>Views</Text>
              </View>
              <View style={styles.metricBox}>
                <Ionicons name="call" size={20} color="#10b981" />
                <Text style={styles.metricVal}>{monthlyMetrics?.callCount || 0}</Text>
                <Text style={styles.metricLbl}>Calls / Leads</Text>
              </View>
            </View>

            {/* Progress Guarantee Bar */}
            <View style={styles.progressBarSection}>
              {((monthlyMetrics?.viewCount || 0) >= 5 || (monthlyMetrics?.callCount || 0) >= 1) ? (
                <View style={styles.guaranteeSuccessBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={styles.guaranteeSuccessText}>Lead Guarantee Met for this month ✓</Text>
                </View>
              ) : (
                <View>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${Math.min(100, ((monthlyMetrics?.viewCount || 0) / 5) * 100)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressDescText}>
                    {monthlyMetrics?.viewCount || 0}/5 views this month — {Math.max(0, 5 - (monthlyMetrics?.viewCount || 0))} more views or 1 call to renew plan at no cost!
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 3. Action List (Line Wise UI) */}
        <View style={styles.listSection}>
          <Text style={styles.sectionHeaderTitle}>BUSINESS MANAGEMENT</Text>

          <ActionRow
            icon="people"
            title="My Leads"
            subtitle="Manage your customer enquiries"
            color="#3b82f6"
            onPress={() => navigation.navigate('MyLeads')}
          />

          <ActionRow
            icon="storefront"
            title="Edit Business Profile"
            subtitle="Update details, location & hours"
            color="#3b82f6"
            onPress={() => navigation.navigate('VendorRegistration', { isEditing: true, businessId: vendorData.id })}
          />
          <ActionRow
            icon="images"
            title="Photos & Videos"
            subtitle="Showcase your work and premises"
            color="#06b6d4"
            onPress={() => navigation.navigate('BusinessPhotos', { businessId: vendorData.id })}
          />
          <ActionRow
            icon="pricetags"
            title="Product Catalog"
            subtitle="Add or edit your services/products"
            color="#10b981"
            onPress={() => navigation.navigate('ProductCatalog', { businessId: vendorData.id })}
          />


          <Text style={[styles.sectionHeaderTitle, { marginTop: 15 }]}>BILLING & PAYMENTS</Text>

          <ActionRow
            icon="wallet"
            title="Payments & Subscription"
            subtitle={vendorData?.planId ? `Active Plan: ${vendorData.planId.toUpperCase()}` : "Manage billing and active plans"}
            color="#6366f1"
            onPress={() => navigation.navigate('SelectPlan', { isUpgrade: true })}
          />
          <ActionRow
            icon="receipt"
            title="Payment History"
            subtitle="View invoices and past transactions"
            color="#0ea5e9"
            onPress={() => navigation.navigate('PaymentHistory')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Action Row Component
const ActionRow = ({ icon, title, subtitle, color, badge, onPress }: any) => (
  <TouchableOpacity style={styles.actionRow} onPress={onPress}>
    <View style={[styles.actionIconBox, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </View>
    {badge && (
      <View style={styles.actionBadge}>
        <Text style={styles.actionBadgeText}>{badge}</Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Pending Screen Styles
  pendingContainer: { flex: 1, backgroundColor: 'white', padding: 20 },
  pendingHeader: { paddingTop: 40, paddingBottom: 20, alignItems: 'flex-start' },
  backBtn: { padding: 10, marginLeft: -10 },
  pendingContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  pendingIconBox: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  pendingTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b', marginBottom: 12 },
  pendingDesc: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 10 },
  pendingSubDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  pendingActionBtn: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  pendingActionText: { color: '#475569', fontSize: 14, fontWeight: 'bold' },

  // Active Dashboard Styles
  header: {
    backgroundColor: 'white',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleContainer: { flex: 1 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#166534' },

  trustSignals: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  trustItem: { flex: 1, alignItems: 'center' },
  trustValue: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  trustLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 },
  trustDivider: { width: 1, height: '100%', backgroundColor: '#f1f5f9' },

  listSection: { paddingHorizontal: 15, marginTop: 10 },
  sectionHeaderTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 15, marginLeft: 5 },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  actionIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
  actionSubtitle: { fontSize: 12, color: '#64748b' },
  actionBadge: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 10 },
  actionBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },

  boostBanner: { margin: 15, borderRadius: 16, overflow: 'hidden', marginTop: 20 },
  boostGradient: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  boostContent: { flex: 1 },
  boostTitle: { color: 'white', fontSize: 18, fontWeight: '900' },
  boostSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', marginTop: 4, marginBottom: 15 },
  boostBtn: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  boostBtnText: { color: '#3b82f6', fontSize: 11, fontWeight: '900' },
  boostIcon: { position: 'absolute', right: -10, bottom: -20 },

  progressCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 15,
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  progressPlanName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 2,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  daysText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 4,
  },
  metricLbl: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginTop: 2,
  },
  progressBarSection: {
    marginTop: 5,
  },
  guaranteeSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  guaranteeSuccessText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#065f46',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressDescText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    fontWeight: '600',
  },
});

