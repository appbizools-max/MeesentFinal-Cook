import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function MyLeadsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    // 1. Fetch user's registered businesses
    const bizQuery = query(
      collection(db, 'vendors'),
      where('userId', '==', userId)
    );

    const unsubscribeBiz = onSnapshot(bizQuery, (snapshot) => {
      if (!snapshot || !snapshot.docs) {
        console.warn("MyLeadsScreen: bizQuery snapshot or docs is null/undefined");
        setLoading(false);
        return;
      }
      const bizList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBusinesses(bizList);

      const ids = bizList.map(b => b.id);
      setBusinessIds(ids);

      if (bizList.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(bizList[0].id);
      }

      if (ids.length === 0) {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching businesses for leads:", error);
      setLoading(false);
    });

    return () => unsubscribeBiz();
  }, []);

  useEffect(() => {
    if (businessIds.length === 0) {
      setLeads([]);
      return;
    }

    setLoading(true);

    // 2. Listen to leads collection for user's businesses
    const sliceIds = businessIds.slice(0, 10);
    const leadsQuery = query(
      collection(db, 'leads'),
      where('vendorId', 'in', sliceIds)
    );

    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      if (!snapshot || !snapshot.docs) {
        console.warn("MyLeadsScreen: leadsQuery snapshot or docs is null/undefined");
        setLoading(false);
        return;
      }
      const leadsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by date descending
      const sortedLeads = leadsList.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setLeads(sortedLeads);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to leads:", error);
      setLoading(false);
    });

    return () => unsubscribeLeads();
  }, [businessIds]);

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleWhatsApp = (phone: string) => {
    if (phone) {
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const formatLeadTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Just now';
    }
  };

  // Selected active business
  const activeBusiness = (businesses && businesses.find(b => b.id === selectedBusinessId)) || (businesses && businesses.length > 0 ? businesses[0] : null);

  // Active Plan Name for selected business
  const activePlanName = (() => {
    if (!activeBusiness) return 'NO ACTIVE PLAN';
    const pId = (activeBusiness.planId || activeBusiness.plan || '').toLowerCase();
    if (pId === 'big') return 'BIG PLAN (PREMIUM)';
    if (pId === 'small') return 'SMALL PLAN (SMART)';
    if (pId === 'growth' || activeBusiness.isBoosted) return 'BOOSTED PLAN';
    return 'FREE PLAN';
  })();

  // Plan active check
  const isPlanActive = (() => {
    if (!activeBusiness) return false;
    const pId = (activeBusiness.planId || activeBusiness.plan || '').toLowerCase();
    const hasPlan = pId === 'big' || pId === 'small' || pId === 'growth' || activeBusiness.status === 'active' || activeBusiness.subscriptionStatus === 'active';
    if (!hasPlan) return false;

    if (activeBusiness.planExpiry) {
      try {
        const exp = activeBusiness.planExpiry?.toDate ? activeBusiness.planExpiry.toDate() : new Date(activeBusiness.planExpiry);
        if (isNaN(exp.getTime())) return false;
        return exp > new Date();
      } catch (e) {
        return false;
      }
    }
    return true;
  })();

  // Selected business plan start date
  const activePlanStartDate = (() => {
    if (!activeBusiness) return null;
    const raw = activeBusiness.planStartDate || activeBusiness.paymentDate || activeBusiness.createdAt;
    if (!raw) return null;
    try {
      const d = raw?.toDate ? raw.toDate() : new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  })();

  // Selected business plan expiry date
  const activePlanExpiryDate = (() => {
    if (!activeBusiness) return null;
    const rawExp = activeBusiness.planExpiry || activeBusiness.currentPeriodEnd || activeBusiness.planEndDate || activeBusiness.expiryDate;
    if (rawExp) {
      try {
        const d = rawExp?.toDate ? rawExp.toDate() : new Date(rawExp);
        if (!isNaN(d.getTime())) return d;
      } catch (e) { }
    }
    if (activePlanStartDate) {
      const months = activeBusiness.planDurationMonths || activeBusiness.billingCycleMonths || 1;
      const d = new Date(activePlanStartDate);
      d.setMonth(d.getMonth() + parseInt(months, 10));
      return d;
    }
    return null;
  })();

  // Filter leads for selected business ONLY
  const subscriptionLeads = leads.filter((l: any) => {
    if (!activeBusiness) return false;
    return l.vendorId === activeBusiness.id;
  });

  const displayViews = subscriptionLeads.filter(l => (l.type === 'view' || l.type === 'profile_view')).length;
  const displayCalls = subscriptionLeads.filter(l => l.type === 'call').length;
  const displayWhatsApp = subscriptionLeads.filter(l => l.type === 'whatsapp').length;
  const displayTotal = subscriptionLeads.length;

  const activeBadgeLabel = activePlanStartDate
    ? `Active from ${activePlanStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    : new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Customer Leads</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0035a0" />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      ) : businesses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="business-outline" size={50} color="#cbd5e1" />
          </View>
          <Text style={styles.emptyTitle}>No Business Registered</Text>
          <Text style={styles.emptyDesc}>
            Register your business profile first to start receiving customer leads.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('VendorRegistration')}
          >
            <Text style={styles.actionBtnText}>Register Business Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Business Selector Tabs (Shown if user has registered 1 or more businesses) */}
          {businesses.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Registered Businesses ({businesses.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {businesses.map((biz) => {
                  const isSelected = biz.id === (activeBusiness?.id);
                  return (
                    <TouchableOpacity
                      key={biz.id}
                      onPress={() => setSelectedBusinessId(biz.id)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#0035a0' : '#e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.03,
                        shadowRadius: 3,
                        elevation: 1
                      }}
                    >
                      <Ionicons
                        name={isSelected ? "business" : "business-outline"}
                        size={16}
                        color={isSelected ? "#0035a0" : "#64748b"}
                      />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? '#0035a0' : '#334155' }}>
                          {biz.businessName}
                        </Text>
                        <Text style={{ fontSize: 10, color: isSelected ? '#2563EB' : '#94a3b8', fontWeight: '600' }}>
                          {biz.subCategory || biz.category || 'Business Profile'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Active Subscription Plan Banner for Selected Business (Shown ONLY if business has a plan) */}
          {isPlanActive && (
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="ribbon" size={20} color="#2563EB" />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                    {activePlanName}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: '#dcfce7',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#bbf7d0'
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#166534' }}>
                    ACTIVE
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
                <View>
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>PLAN START DATE</Text>
                  <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: '700', marginTop: 2 }}>
                    {activePlanStartDate
                      ? activePlanStartDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'N/A'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>PLAN EXPIRY DATE</Text>
                  <Text style={{ fontSize: 13, color: '#2563EB', fontWeight: '700', marginTop: 2 }}>
                    {activePlanExpiryDate
                      ? activePlanExpiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Active Plan'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* If selected business plan is INACTIVE/EXPIRED, Lock Leads & Show Upgrade Prompt */}
          {!isPlanActive ? (
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: '#fed7aa',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 3,
              marginTop: 10
            }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#fff7ed',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 14
              }}>
                <Ionicons name="lock-closed" size={30} color="#f97316" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
                Leads Locked for {activeBusiness?.businessName}
              </Text>
              <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19, marginBottom: 20, paddingHorizontal: 10 }}>
                The upgrade plan for <Text style={{ fontWeight: '700', color: '#334155' }}>"{activeBusiness?.businessName}"</Text> is currently inactive or has expired. Upgrade or renew your plan for this business to unlock customer leads, call logs, and WhatsApp messages.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#0035a0',
                  paddingHorizontal: 22,
                  paddingVertical: 13,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#0035a0',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4
                }}
                onPress={() => navigation.navigate('SelectPlan', { businessId: activeBusiness?.id })}
              >
                <Ionicons name="sparkles" size={18} color="white" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: 'white' }}>
                  Upgrade / Renew Plan for {activeBusiness?.businessName?.split(' ')[0] || 'Business'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Analytics Overview Cards Grid */}
              <View style={styles.analyticsHeaderRow}>
                <Text style={styles.sectionHeader}>Analytics Overview</Text>
                <View style={styles.monthBadge}>
                  <Ionicons name="calendar-outline" size={12} color="#0035a0" style={{ marginRight: 4 }} />
                  <Text style={styles.monthBadgeText}>{activeBadgeLabel}</Text>
                </View>
              </View>
              <View style={styles.analyticsGrid}>
                <View style={[styles.metricCard, { borderLeftColor: '#3b82f6' }]}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>My Profile Opens</Text>
                    <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="eye" size={14} color="#3b82f6" />
                    </View>
                  </View>
                  <Text style={styles.metricValue}>{displayViews}</Text>
                  <Text style={styles.metricPeriod}>Profile Opens</Text>
                </View>

                <View style={[styles.metricCard, { borderLeftColor: '#ef4444' }]}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>Call Inquiries</Text>
                    <View style={[styles.iconContainer, { backgroundColor: '#fef2f2' }]}>
                      <Ionicons name="call" size={14} color="#ef4444" />
                    </View>
                  </View>
                  <Text style={styles.metricValue}>{displayCalls}</Text>
                  <Text style={styles.metricPeriod}>Direct Calls</Text>
                </View>

                <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>WhatsApp Chats</Text>
                    <View style={[styles.iconContainer, { backgroundColor: '#ecfdf5' }]}>
                      <Ionicons name="logo-whatsapp" size={14} color="#10b981" />
                    </View>
                  </View>
                  <Text style={styles.metricValue}>{displayWhatsApp}</Text>
                  <Text style={styles.metricPeriod}>WhatsApp Messages</Text>
                </View>

                <View style={[styles.metricCard, { borderLeftColor: '#8b5cf6' }]}>
                  <View style={styles.metricHeader}>
                    <Text style={styles.metricLabel}>Total Leads</Text>
                    <View style={[styles.iconContainer, { backgroundColor: '#faf5ff' }]}>
                      <Ionicons name="people" size={14} color="#8b5cf6" />
                    </View>
                  </View>
                  <Text style={styles.metricValue}>{displayTotal}</Text>
                  <Text style={styles.metricPeriod}>Total Interactions</Text>
                </View>
              </View>

              {/* Customer Leads List Section */}
              <Text style={[styles.sectionHeader, { marginTop: 10 }]}>Customer Leads ({subscriptionLeads.length})</Text>

              {subscriptionLeads.length === 0 ? (
                <View style={[styles.emptyContainer, { paddingVertical: 40 }]}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="people-outline" size={44} color="#cbd5e1" />
                  </View>
                  <Text style={styles.emptyTitle}>No Active Leads Yet</Text>
                  <Text style={styles.emptyDesc}>
                    Customer inquiries will populate automatically here when users view your business, tap Call, or message on WhatsApp.
                  </Text>
                </View>
              ) : (
                subscriptionLeads.map((lead) => {
                  let badgeBg = '#f3e8ff';
                  let badgeColor = '#7c3aed';
                  let badgeIcon = 'eye-outline';
                  let badgeLabel = 'Profile Open';

                  if (lead.type === 'call') {
                    badgeBg = '#fef2f2';
                    badgeColor = '#dc2626';
                    badgeIcon = 'call-outline';
                    badgeLabel = 'Call Click';
                  } else if (lead.type === 'whatsapp') {
                    badgeBg = '#ecfdf5';
                    badgeColor = '#10b981';
                    badgeIcon = 'logo-whatsapp';
                    badgeLabel = 'WhatsApp';
                  }

                  return (
                    <View key={lead.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                          <Text style={styles.customerName}>{lead.userName || 'Guest User'}</Text>
                          <Text style={styles.businessScope}>Listing: {lead.vendorName}</Text>
                        </View>
                        <View style={styles.cardHeaderRight}>
                          <View style={[styles.methodBadge, { backgroundColor: badgeBg }]}>
                            <Ionicons name={badgeIcon as any} size={11} color={badgeColor} />
                            <Text style={[styles.methodBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <View style={styles.infoRow}>
                          <View style={styles.infoCol}>
                            <Text style={styles.infoLabel}>PHONE NUMBER</Text>
                            <Text style={styles.infoValue}>{lead.userPhone || 'Not Shared'}</Text>
                          </View>
                          <View style={styles.infoColRight}>
                            <Text style={styles.infoLabel}>TIMESTAMP</Text>
                            <Text style={styles.infoValueDate}>{formatLeadTime(lead.createdAt)}</Text>
                          </View>
                        </View>

                        {lead.userPhone ? (
                          <>
                            <View style={styles.divider} />
                            <View style={styles.actionRow}>
                              <TouchableOpacity
                                style={[styles.callbackBtn, styles.callColor]}
                                onPress={() => handleCall(lead.userPhone)}
                              >
                                <Ionicons name="call" size={14} color="white" />
                                <Text style={styles.callbackBtnText}>Call Back</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.callbackBtn, styles.whatsappColor]}
                                onPress={() => handleWhatsApp(lead.userPhone)}
                              >
                                <Ionicons name="logo-whatsapp" size={14} color="white" />
                                <Text style={styles.callbackBtnText}>WhatsApp</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0035a0',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Analytics grid styles
  analyticsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  monthBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0035a0',
    textTransform: 'uppercase',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: (width - 42) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.015,
    shadowRadius: 5,
    elevation: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  metricPeriod: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 4,
  },

  // Empty list styles
  emptyLeadsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#eff2f6',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLeadsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 4,
  },
  emptyLeadsDesc: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Lead Card list item styles
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#eff2f6',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1.5,
    borderBottomColor: '#eff2f6',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e293b',
  },
  businessScope: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  methodBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardContent: {
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1.2,
  },
  infoColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  infoValueDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  divider: {
    height: 1.5,
    backgroundColor: '#eff2f6',
    marginVertical: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callbackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 10,
    gap: 6,
  },
  callColor: {
    backgroundColor: '#0035a0',
  },
  whatsappColor: {
    backgroundColor: '#10b981',
  },
  callbackBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
