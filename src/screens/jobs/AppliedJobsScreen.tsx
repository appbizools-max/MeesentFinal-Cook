import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, ScrollView, Image, Modal, Linking, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '@services/firebase';
import { collection, query, getDocs, where, orderBy, doc, getDoc, onSnapshot } from 'firebase/firestore';

const isJobGenuine = (item: any) => {
  if (!item) return false;
  if (!item.isGenuineVerified) return false;
  if (!item.genuineVerificationEndDate) return true; // fallback for legacy items
  const end = item.genuineVerificationEndDate.toDate
    ? item.genuineVerificationEndDate.toDate()
    : new Date(item.genuineVerificationEndDate);
  return end > new Date();
};

export default function AppliedJobsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobModalVisible, setJobModalVisible] = useState(false);

  const handleCall = (item: any) => {
    if (!item) return;
    const phoneNumber = item.contactNumber || item.phone || '';
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('No Contact', 'No contact phone number is available for this job.');
    }
  };

  const handleWhatsApp = (item: any) => {
    if (!item) return;
    const rawPhoneNumber = item.whatsappNumber || item.contactNumber || item.phone || '';
    const formattedPhone = rawPhoneNumber.replace(/\D/g, '');
    const phoneNumber = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;
    const message = `Hello, I applied for the "${item.title}" position at ${item.company || 'your company'}.`;
    if (phoneNumber) {
      Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`);
    } else {
      Alert.alert('No Contact', 'No WhatsApp contact number is available for this job.');
    }
  };

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'job_applications'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const appsData = await Promise.all(
          snapshot.docs.map(async (applicationDoc) => {
            const appData = { id: applicationDoc.id, ...applicationDoc.data() };

            try {
              const jobDoc = await getDoc(doc(db, 'jobs', appData.jobId));
              if (jobDoc.exists()) {
                const jobData = jobDoc.data();
                const category = jobData.category || '';
                if (category !== 'Central Govt' && category !== 'State Govt' &&
                  category !== 'Central Government' && category !== 'State Government') {
                  return {
                    ...appData,
                    imageUrl: jobData.imageUrl || null,
                    location: jobData.location || 'Remote',
                    jobType: jobData.jobType || 'Full-time',
                    isGenuineVerified: jobData.isGenuineVerified || false,
                    isVerified: jobData.isVerified || false,
                    genuineVerificationEndDate: jobData.genuineVerificationEndDate || null,
                    contactNumber: jobData.contactNumber || jobData.phone || '',
                    whatsappNumber: jobData.whatsappNumber || jobData.whatsapp || jobData.contactNumber || jobData.phone || '',
                    description: jobData.description || appData.description || '',
                    requirements: jobData.requirements || appData.requirements || '',
                    salary: jobData.salary || appData.salary || ''
                  };
                }
              }
            } catch (err) {
              console.error("Error fetching job details:", err);
            }
            return appData;
          })
        );
        const filteredApps = appsData
          .filter(app => app !== null)
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate() || new Date(0);
            const dateB = b.createdAt?.toDate() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          });

        setApplications(filteredApps);
      } catch (error) {
        console.error("Error processing real-time applications:", error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error listening to applications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    const s = status ? status.toLowerCase() : 'applied';
    switch (s) {
      case 'applied':
      case 'pending':
        return { textColor: '#0035a0', bgColor: '#fff7ed' };
      case 'shortlisted':
        return { textColor: '#16a34a', bgColor: '#f0fdf4' };
      case 'rejected':
        return { textColor: '#0035a0', bgColor: '#f0f5fc' };
      default:
        return { textColor: '#6b7280', bgColor: '#f9fafb' };
    }
  };

  const handleJobPress = async (appItem: any) => {
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', appItem.jobId));
      if (jobDoc.exists()) {
        setSelectedJob({
          id: appItem.jobId,
          status: appItem.status || 'Applied',
          ...jobDoc.data()
        });
        setJobModalVisible(true);
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
    }
  };

  const renderAppItem = ({ item }: any) => {
    const status = item.status || 'Applied';
    const statusColors = getStatusColor(status);
    const isShortlisted = status.toLowerCase() === 'shortlisted';
    const isRejected = status.toLowerCase() === 'rejected';

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isShortlisted && styles.cardShortlisted,
          isRejected && styles.cardRejected
        ]}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={styles.cardLogoContainer}>
            <View style={styles.cardLogoInner}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.fullImage} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name="bank" size={24} color="#0035a0" />
              )}
            </View>
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <Text style={[styles.jobTitle, { flexShrink: 1 }]} numberOfLines={1}>{item.title}</Text>
              {(isJobGenuine(item) || item.isVerified) && (
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#10b981', marginLeft: 4 }}>verified</Text>
              )}
            </View>
            <TouchableOpacity style={styles.menuButton}>
              <Ionicons name="ellipsis-vertical" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <Text style={styles.companyName}>{item.company}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#94a3b8" />
              <Text style={styles.metaText}>{item.location || 'Remote'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
              <Text style={styles.metaText}>{item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'N/A'}</Text>
            </View>
          </View>

          {isShortlisted && (
            <View style={styles.shortlistedBanner}>
              <Ionicons name="gift-outline" size={14} color="#15803d" />
              <Text style={styles.shortlistedBannerText}>🎉 You've been Shortlisted!</Text>
            </View>
          )}

          {isRejected && (
            <View style={styles.rejectedBanner}>
              <Ionicons name="close-circle-outline" size={14} color="#b91c1c" />
              <Text style={styles.rejectedBannerText}>Application not selected</Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={[styles.jobTypeBadge, { backgroundColor: '#f0f9ff' }]}>
              <Text style={[styles.jobTypeText, { color: '#0ea5e9' }]}>{item.jobType || 'Full-time'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bgColor }]}>
              <Text style={[styles.statusText, { color: statusColors.textColor }]}>{status}</Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={{ flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', paddingVertical: 8, borderRadius: 8, marginRight: 6 }}
              onPress={(e) => { e.stopPropagation(); handleCall(item); }}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={13} color="white" style={{ marginRight: 4 }} />
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Call HR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', paddingVertical: 8, borderRadius: 8, marginLeft: 6 }}
              onPress={(e) => { e.stopPropagation(); handleWhatsApp(item); }}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={13} color="white" style={{ marginRight: 4 }} />
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredApplications = applications.filter((app) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const titleMatch = app.title?.toLowerCase().includes(query);
    const companyMatch = app.company?.toLowerCase().includes(query);
    const locationMatch = app.location?.toLowerCase().includes(query);

    return titleMatch || companyMatch || locationMatch;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Applications</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search applications..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0035a0" />
        </View>
      ) : (
        <FlatList
          data={filteredApplications}
          renderItem={renderAppItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📄</Text>
              <Text style={styles.emptyTitle}>No Applications Yet</Text>
              <Text style={styles.emptyDescription}>
                You haven't applied to any private jobs yet
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Home')}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaButtonText}>Find Jobs</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Job Detail Modal */}
      <Modal
        visible={jobModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setJobModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Drag Indicator */}
            <View style={styles.dragIndicatorContainer}>
              <View style={styles.dragIndicator} />
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setJobModalVisible(false)}>
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>

            {selectedJob && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Top Section */}
                <View style={styles.topSection}>
                  <View style={styles.logoContainer}>
                    {selectedJob.imageUrl ? (
                      <Image source={{ uri: selectedJob.imageUrl }} style={styles.companyLogo} />
                    ) : (
                      <LinearGradient colors={['#0035a0', '#002980']} style={styles.logoGradient}>
                        <MaterialCommunityIcons name="bank" size={32} color="#fff" />
                      </LinearGradient>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    <Text style={styles.modalJobTitle}>{selectedJob.title}</Text>
                    {(isJobGenuine(selectedJob) || selectedJob.isVerified) && (
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#10b981' }}>verified</Text>
                    )}
                  </View>
                  <Text style={styles.modalCompanyName}>{selectedJob.company}</Text>

                  <View style={styles.statusRow}>
                    <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedJob.status || 'Applied').bgColor }]}>
                      <Text style={[styles.modalStatusText, { color: getStatusColor(selectedJob.status || 'Applied').textColor }]}>
                        {selectedJob.status || 'Applied'}
                      </Text>
                    </View>
                    <View style={styles.dateBadge}>
                      <Ionicons name="calendar-outline" size={14} color="#64748b" />
                      <Text style={styles.dateText}>
                        {selectedJob.createdAt ? new Date(selectedJob.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Info Cards Section */}
                <View style={styles.infoCardsRow}>
                  <View style={styles.infoCard}>
                    <View style={styles.infoIconBg}>
                      <Ionicons name="location-outline" size={20} color="#0035a0" />
                    </View>
                    <Text style={styles.infoCardLabel}>Location</Text>
                    <Text style={styles.infoCardValue}>{selectedJob.location || 'Remote'}</Text>
                  </View>

                  <View style={styles.infoCard}>
                    <View style={styles.infoIconBg}>
                      <Ionicons name="briefcase-outline" size={20} color="#0ea5e9" />
                    </View>
                    <Text style={styles.infoCardLabel}>Job Type</Text>
                    <Text style={styles.infoCardValue}>{selectedJob.jobType || 'Full-time'}</Text>
                  </View>

                  <View style={styles.infoCard}>
                    <View style={styles.infoIconBg}>
                      <Ionicons name="cash-outline" size={20} color="#10b981" />
                    </View>
                    <Text style={styles.infoCardLabel}>Salary</Text>
                    <Text style={styles.infoCardValue}>{selectedJob.salary || 'N/A'}</Text>
                  </View>

                  <View style={styles.infoCard}>
                    <View style={styles.infoIconBg}>
                      <Ionicons name="business-outline" size={20} color="#f59e0b" />
                    </View>
                    <Text style={styles.infoCardLabel}>Company</Text>
                    <Text style={styles.infoCardValue}>{selectedJob.company || 'N/A'}</Text>
                  </View>
                </View>

                {/* Company Section */}
                <View style={styles.companySection}>
                  <View style={styles.companyCard}>
                    <View style={styles.companyCardHeader}>
                      {selectedJob.imageUrl ? (
                        <Image source={{ uri: selectedJob.imageUrl }} style={styles.companyCardLogo} />
                      ) : (
                        <LinearGradient colors={['#0035a0', '#002980']} style={styles.companyCardLogo}>
                          <MaterialCommunityIcons name="bank" size={24} color="#fff" />
                        </LinearGradient>
                      )}
                      <View style={styles.companyCardInfo}>
                        <Text style={styles.companyCardName}>{selectedJob.company}</Text>
                        <Text style={styles.companyCardLocation}>{selectedJob.location || 'Remote'}</Text>
                      </View>
                    </View>

                    <Text style={styles.companyDescription}>
                      {selectedJob.source === 'User' || selectedJob.postedBy
                        ? "Verified employer on Meesent Jobs network."
                        : "Leading company in the industry with a strong commitment to innovation and employee growth."}
                    </Text>

                    {/* Company Stats */}
                    {!(selectedJob.source === 'User' || selectedJob.postedBy) && (
                      <View style={styles.companyStats}>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>2015</Text>
                          <Text style={styles.statLabel}>Founded</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>500+</Text>
                          <Text style={styles.statLabel}>Employees</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>4.5</Text>
                          <Text style={styles.statLabel}>Rating</Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity style={styles.viewCompanyBtn}>
                      <Text style={styles.viewCompanyBtnText}>View Company</Text>
                      <Ionicons name="chevron-forward" size={16} color="#0035a0" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Description Section */}
                <View style={styles.descriptionSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#0035a0" />
                    <Text style={styles.sectionTitle}>Job Description</Text>
                  </View>
                  <Text style={styles.descriptionText}>{selectedJob.description || 'No description available'}</Text>
                </View>

                {/* Requirements Section */}
                <View style={styles.descriptionSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#0035a0" />
                    <Text style={styles.sectionTitle}>Requirements</Text>
                  </View>
                  <Text style={styles.descriptionText}>{selectedJob.requirements || 'No requirements specified'}</Text>
                </View>

                {/* Contact Action Footer Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 }}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, gap: 6 }}
                    onPress={() => handleCall(selectedJob)}
                  >
                    <Ionicons name="call" size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Call HR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 12, gap: 6 }}
                    onPress={() => handleWhatsApp(selectedJob)}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom Button */}
                <TouchableOpacity
                  style={styles.bottomButton}
                  onPress={() => setJobModalVisible(false)}
                >
                  <LinearGradient colors={['#0035a0', '#002980']} style={styles.bottomButtonGradient}>
                    <Text style={styles.bottomButtonText}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    height: '100%',
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeft: {
    marginRight: 12,
  },
  cardLogoContainer: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLogoInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  logoImage: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  iconGradient: {
    width: 46,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  menuButton: {
    padding: 2,
  },
  companyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0035a0',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  jobTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jobTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  ctaButton: {
    backgroundColor: '#0035a0',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 9999,
    marginTop: 24,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  // Top Section
  topSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  logoContainer: {
    marginBottom: 16,
  },
  companyLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalJobTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalCompanyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0035a0',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  // Info Cards
  infoCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  // Company Section
  companySection: {
    marginBottom: 24,
  },
  companyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  companyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyCardLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyCardInfo: {
    flex: 1,
  },
  companyCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  companyCardLocation: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  companyDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  companyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  viewCompanyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#faf5ff',
    borderRadius: 12,
    gap: 8,
  },
  viewCompanyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0035a0',
  },
  // Description Section
  descriptionSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  // Bottom Button
  bottomButton: {
    marginBottom: 20,
  },
  bottomButtonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardShortlisted: {
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  cardRejected: {
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  shortlistedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
    gap: 6,
  },
  shortlistedBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5fc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
    gap: 6,
  },
  rejectedBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
});
