import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  Linking,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const isJobGenuine = (item: any) => {
  if (!item) return false;
  if (!item.isGenuineVerified) return false;
  if (!item.genuineVerificationEndDate) return true; // fallback for legacy items
  try {
    const end = item.genuineVerificationEndDate?.toDate
      ? item.genuineVerificationEndDate.toDate()
      : new Date(item.genuineVerificationEndDate);
    if (isNaN(end.getTime())) return true;
    return end > new Date();
  } catch (e) {
    return true;
  }
};

export default function MyPostedJobsScreen({ navigation }: any) {
  const getApplicantStatusStyle = (status: string) => {
    switch (status) {
      case 'shortlisted': return { backgroundColor: '#ecfdf5', borderColor: '#10b981' };
      case 'rejected': return { backgroundColor: '#fef2f2', borderColor: '#ef4444' };
      default: return { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' };
    }
  };

  const getApplicantStatusTextStyle = (status: string) => {
    switch (status) {
      case 'shortlisted': return { color: '#10b981' };
      case 'rejected': return { color: '#ef4444' };
      default: return { color: '#64748b' };
    }
  };

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [postedJobs, setPostedJobs] = useState<any[]>([]);
  
  // Selection / Overlay states
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<any | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  
  const [selectedApplicantResume, setSelectedApplicantResume] = useState<any | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    fetchPostedJobs();
  }, []);

  const fetchPostedJobs = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(db, 'jobs'),
        where('postedBy', '==', userId)
      );

      const snapshot = await getDocs(q);
      const jobsList: any[] = [];
      snapshot.forEach((docSnap) => {
        jobsList.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort by date descending
      const sortedJobs = jobsList.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });

      setPostedJobs(sortedJobs);
    } catch (error) {
      console.error('Error fetching posted jobs:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load posted jobs' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (job: any) => {
    try {
      const newStatus = job.status === 'Active' ? 'Inactive' : 'Active';
      const jobRef = doc(db, 'jobs', job.id);
      await updateDoc(jobRef, { status: newStatus });
      
      setPostedJobs(prev => prev.map(item => 
        item.id === job.id ? { ...item, status: newStatus } : item
      ));

      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `Job status is now ${newStatus}`
      });
    } catch (error) {
      console.error('Error toggling status:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update job status' });
    }
  };

  const handleFetchApplicants = async (job: any) => {
    setSelectedJobForApplicants(job);
    setApplicantsLoading(true);
    setApplicants([]);
    
    try {
      // Query applications for this job
      const qApps = query(
        collection(db, 'job_applications'),
        where('jobId', '==', job.id)
      );
      const appsSnap = await getDocs(qApps);
      
      const applicantsList: any[] = [];
      
      // Fetch user details for each applicant
      for (const appDoc of appsSnap.docs) {
        const appData = appDoc.data();
        const candidateId = appData.userId;
        
        if (candidateId) {
          const userSnap = await getDoc(doc(db, 'users', candidateId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            applicantsList.push({
              applicationId: appDoc.id,
              userId: candidateId,
              appliedAt: appData.createdAt,
              appliedVia: appData.appliedVia || null,
              resumeUrl: appData.resumeUrl || null,
              status: appData.status || 'Applied',
              name: userData.name || 'Anonymous Seeker',
              email: userData.email || 'N/A',
              phone: userData.phoneNumber || userData.phone || 'N/A',
              profileImage: userData.profileImage || null,
              location: userData.location || userData.city || 'N/A',
            });
          }
        }
      }

      setApplicants(applicantsList);
    } catch (error) {
      console.error('Error fetching applicants:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load applicants' });
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handleShortlist = async (applicant: any) => {
    try {
      const appRef = doc(db, 'job_applications', applicant.applicationId);
      await updateDoc(appRef, { status: 'shortlisted' });
      
      // Add notification for applicant
      await addDoc(collection(db, 'notifications'), {
        userId: applicant.userId,
        type: 'job_shortlisted',
        title: 'Application Shortlisted! 🎉',
        body: `Congratulations! Your application for "${selectedJobForApplicants?.title}" at ${selectedJobForApplicants?.company} has been shortlisted.`,
        jobId: selectedJobForApplicants?.id || '',
        jobTitle: selectedJobForApplicants?.title || '',
        read: false,
        createdAt: serverTimestamp()
      });

      // Update local state
      setApplicants(prev => prev.map(app => 
        app.applicationId === applicant.applicationId ? { ...app, status: 'shortlisted' } : app
      ));

      Toast.show({
        type: 'success',
        text1: 'Candidate Shortlisted',
        text2: `${applicant.name} has been shortlisted.`
      });
    } catch (error) {
      console.error('Error shortlisting candidate:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to shortlist candidate' });
    }
  };

  const handleReject = async (applicant: any) => {
    try {
      const appRef = doc(db, 'job_applications', applicant.applicationId);
      await updateDoc(appRef, { status: 'rejected' });
      
      // Add notification for applicant
      await addDoc(collection(db, 'notifications'), {
        userId: applicant.userId,
        type: 'job_rejected',
        title: 'Application Update',
        body: `Thank you for your interest. Your application for "${selectedJobForApplicants?.title}" at ${selectedJobForApplicants?.company} was not selected.`,
        jobId: selectedJobForApplicants?.id || '',
        jobTitle: selectedJobForApplicants?.title || '',
        read: false,
        createdAt: serverTimestamp()
      });

      // Update local state
      setApplicants(prev => prev.map(app => 
        app.applicationId === applicant.applicationId ? { ...app, status: 'rejected' } : app
      ));

      Toast.show({
        type: 'info',
        text1: 'Application Rejected',
        text2: `${applicant.name} has been rejected.`
      });
    } catch (error) {
      console.error('Error rejecting candidate:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to reject candidate' });
    }
  };

  const handleFetchResume = async (applicant: any) => {
    if (applicant.resumeUrl) {
      setSelectedApplicantResume({
        fullName: applicant.name,
        imageUrl: applicant.resumeUrl,
        isImageResume: true,
      });
      return;
    }

    setResumeLoading(true);
    setSelectedApplicantResume(null);
    
    try {
      const qResume = query(
        collection(db, 'resumes'),
        where('userId', '==', applicant.userId)
      );
      const resumeSnap = await getDocs(qResume);
      
      if (!resumeSnap.empty) {
        setSelectedApplicantResume(resumeSnap.docs[0].data());
      } else {
        // Fallback: Create a basic profile resume if no resume document is found
        setSelectedApplicantResume({
          fullName: applicant.name,
          email: applicant.email,
          phoneNumber: applicant.phone,
          location: applicant.location,
          isFallback: true,
        });
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load resume details' });
    } finally {
      setResumeLoading(false);
    }
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt) return 'N/A';
    try {
      const date = createdAt.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const renderJobItem = ({ item }: { item: any }) => (
    <View style={styles.jobCard}>
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={styles.jobTitleText}>{item.title}</Text>
            {isJobGenuine(item) && (
              <Ionicons name="shield-checkmark" size={14} color="#10b981" />
            )}
            {item.isTopVisibility && (
              <View style={styles.premiumBadge}>
                <Ionicons name="flash" size={8} color="#d97706" />
                <Text style={styles.premiumBadgeText}>TOP</Text>
              </View>
            )}
          </View>
          <Text style={styles.companyText}>{item.company}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.statusToggleBtn, { backgroundColor: item.status === 'Active' ? '#ecfdf5' : '#f1f5f9' }]}
          onPress={() => handleToggleStatus(item)}
        >
          <View style={[styles.statusDot, { backgroundColor: item.status === 'Active' ? '#10b981' : '#64748b' }]} />
          <Text style={[styles.statusToggleText, { color: item.status === 'Active' ? '#166534' : '#475569' }]}>
            {item.status === 'Active' ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Ionicons name="grid-outline" size={13} color="#3b82f6" />
          <Text style={styles.detailText} numberOfLines={1}>{item.category}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={13} color="#3b82f6" />
          <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
        </View>
        {item.address ? (
          <View style={[styles.detailItem, { width: '100%' }]}>
            <Ionicons name="map-outline" size={13} color="#3b82f6" />
            <Text style={styles.detailText} numberOfLines={2}>{item.address}</Text>
          </View>
        ) : null}
        <View style={styles.detailItem}>
          <Ionicons name="wallet-outline" size={13} color="#3b82f6" />
          <Text style={styles.detailText} numberOfLines={1}>₹{item.salary} {item.salaryType}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={13} color="#3b82f6" />
          <Text style={styles.detailText} numberOfLines={1}>Posted: {formatDate(item.createdAt)}</Text>
        </View>
        {item.vacancies ? (
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={13} color="#3b82f6" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.vacancies} {item.vacancies === 1 ? 'Vacancy' : 'Vacancies'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooterRow}>
        <TouchableOpacity 
          style={styles.applicantsTriggerBtn}
          onPress={() => handleFetchApplicants(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={18} color="#3b82f6" style={{ marginRight: 6 }} />
          <Text style={styles.applicantsBtnText}>
            View Applicants ({item.applicationsCount || 0})
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#3b82f6" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Posted Jobs</Text>
          <TouchableOpacity onPress={fetchPostedJobs} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading your posted jobs...</Text>
          </View>
        ) : (
          <FlatList
            data={postedJobs}
            keyExtractor={(item) => item.id}
            renderItem={renderJobItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: 50 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="briefcase-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Posted Jobs</Text>
                <Text style={styles.emptyDesc}>You haven't posted any job openings yet. Tap 'Post a Job' in the profile menu to list one.</Text>
              </View>
            }
          />
        )}

        {/* Applicants List Sheet Modal */}
        <Modal
          visible={!!selectedJobForApplicants}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedJobForApplicants(null)}
        >
          <View style={styles.sheetOverlay}>
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle} numberOfLines={1}>Job Applicants</Text>
                  <Text style={styles.sheetSubtitle} numberOfLines={1}>{selectedJobForApplicants?.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedJobForApplicants(null)} style={styles.sheetCloseBtn}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {applicantsLoading ? (
                <View style={styles.sheetLoader}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading candidates details...</Text>
                </View>
              ) : (
                <FlatList
                  data={applicants}
                  keyExtractor={(item) => item.applicationId}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 }}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.sheetEmptyContainer}>
                      <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                      <Text style={styles.sheetEmptyTitle}>No Applicants Yet</Text>
                      <Text style={styles.sheetEmptyDesc}>No candidates have applied to this job posting yet. Active visibility boosts applications.</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.applicantCard}>
                      <View style={styles.applicantHeaderRow}>
                        <View style={styles.applicantAvatarBox}>
                          {item.profileImage ? (
                            <Image source={{ uri: item.profileImage }} style={styles.applicantAvatar} />
                          ) : (
                            <View style={styles.applicantAvatarPlaceholder}>
                              <Text style={styles.avatarInitial}>
                                {item.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.applicantInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={[styles.applicantName, { flex: 1, marginRight: 8 }]} numberOfLines={1}>{item.name}</Text>
                            <View style={[styles.applicantStatusBadge, getApplicantStatusStyle(item.status)]}>
                              <Text style={[styles.applicantStatusText, getApplicantStatusTextStyle(item.status)]}>
                                {item.status || 'Applied'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.applicantMetaRow}>
                            <Ionicons name="location-outline" size={11} color="#64748b" />
                            <Text style={styles.applicantMetaText} numberOfLines={1}>{item.location}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                            <Text style={styles.applicantDate}>Applied: {formatDate(item.appliedAt)}</Text>
                            {item.appliedVia && (
                              <View style={[styles.appliedViaBadge, { backgroundColor: item.appliedVia === 'WhatsApp' ? '#ecfdf5' : '#fef2f2', borderColor: item.appliedVia === 'WhatsApp' ? '#a7f3d0' : '#fecaca' }]}>
                                <Ionicons 
                                  name={item.appliedVia === 'WhatsApp' ? 'logo-whatsapp' : 'call'} 
                                  size={9} 
                                  color={item.appliedVia === 'WhatsApp' ? '#047857' : '#b71c1c'} 
                                />
                                <Text style={[styles.appliedViaText, { color: item.appliedVia === 'WhatsApp' ? '#047857' : '#b71c1c' }]}>
                                  via {item.appliedVia}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      <View style={styles.applicantActionsRow}>
                        <TouchableOpacity 
                          style={[styles.applicantActionBtn, styles.callBtn]}
                          onPress={() => {
                            if (item.phone && item.phone !== 'N/A') {
                              Linking.openURL(`tel:${item.phone}`);
                            } else {
                              Alert.alert('Not Available', 'Candidate phone number not provided.');
                            }
                          }}
                        >
                          <Ionicons name="call" size={14} color="#1e293b" />
                          <Text style={styles.applicantActionText}>Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.applicantActionBtn, styles.whatsappBtn]}
                          onPress={() => {
                            if (item.phone && item.phone !== 'N/A') {
                              const message = `Hello ${item.name}, regarding your application for the "${selectedJobForApplicants?.title}" job post on Meesent Jobs...`;
                              Linking.openURL(`whatsapp://send?phone=${item.phone}&text=${encodeURIComponent(message)}`);
                            } else {
                              Alert.alert('Not Available', 'Candidate phone number not provided.');
                            }
                          }}
                        >
                          <MaterialCommunityIcons name="whatsapp" size={16} color="white" />
                          <Text style={[styles.applicantActionText, { color: 'white' }]}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.applicantActionBtn, styles.resumeBtn]}
                          onPress={() => handleFetchResume(item)}
                        >
                          <Ionicons name="document-text" size={14} color="white" />
                          <Text style={[styles.applicantActionText, { color: 'white' }]}>View Resume</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.applicantDecisionRow}>
                        <TouchableOpacity 
                          style={[styles.decisionBtn, styles.shortlistBtn]}
                          onPress={() => handleShortlist(item)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                          <Text style={styles.decisionBtnText}>Shortlist</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.decisionBtn, styles.rejectBtn]}
                          onPress={() => handleReject(item)}
                        >
                          <Ionicons name="close-circle-outline" size={16} color="white" />
                          <Text style={styles.decisionBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Candidate Resume Full Overlay Modal */}
        <Modal
          visible={!!selectedApplicantResume}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedApplicantResume(null)}
        >
          <View style={styles.resumeOverlay}>
            <View style={styles.resumeContainer}>
              <View style={styles.resumeHeader}>
                <View>
                  <Text style={styles.resumeHeaderTitle}>Candidate CV / Resume</Text>
                  <Text style={styles.resumeHeaderSub}>Job Application Profile</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedApplicantResume(null)} style={styles.resumeCloseBtn}>
                  <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
              </View>

              {resumeLoading ? (
                <View style={styles.resumeLoader}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              ) : selectedApplicantResume && (
                selectedApplicantResume.isImageResume ? (
                  <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={styles.resumeImageName}>{selectedApplicantResume.fullName}'s Uploaded Resume</Text>
                    <Image
                      source={{ uri: selectedApplicantResume.imageUrl }}
                      style={styles.uploadedResumeImage}
                      resizeMode="contain"
                    />
                    <TouchableOpacity 
                      style={[styles.closeResumeBtn, { width: '100%' }]} 
                      onPress={() => setSelectedApplicantResume(null)}
                    >
                      <Text style={styles.closeResumeBtnText}>Close Resume</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                    
                    {/* Candidate Profile Details */}
                    <View style={styles.resumeCandidateHeader}>
                      <View style={styles.resumeAvatarLarge}>
                        <Text style={styles.resumeAvatarLargeText}>
                          {selectedApplicantResume.fullName?.charAt(0).toUpperCase() || 'C'}
                        </Text>
                      </View>
                      <Text style={styles.resumeName}>{selectedApplicantResume.fullName}</Text>
                      <Text style={styles.resumeDetailsText}>{selectedApplicantResume.location || 'Location: N/A'}</Text>
                      <Text style={styles.resumeDetailsText}>✉️ {selectedApplicantResume.email}  |  📞 {selectedApplicantResume.phoneNumber}</Text>
                    </View>

                    {selectedApplicantResume.isFallback && (
                      <View style={styles.fallbackNoticeBox}>
                        <Ionicons name="information-circle-outline" size={16} color="#d97706" style={{ marginRight: 6 }} />
                        <Text style={styles.fallbackNoticeText}>
                          This candidate has not set up a detailed resume doc yet. Displaying basic application profile details.
                        </Text>
                      </View>
                    )}

                    {!selectedApplicantResume.isFallback && (
                      <>
                        <View style={styles.resumeDivider} />

                        {/* Career Objective */}
                        {selectedApplicantResume.careerObjective && (
                          <View style={styles.resumeSection}>
                            <Text style={styles.resumeSectionTitle}>Career Objective</Text>
                            <Text style={styles.resumeBodyText}>{selectedApplicantResume.careerObjective}</Text>
                          </View>
                        )}

                        {/* Skills */}
                        {selectedApplicantResume.skills && (
                          <View style={styles.resumeSection}>
                            <Text style={styles.resumeSectionTitle}>Key Skills</Text>
                            <View style={styles.skillsWrapper}>
                              {selectedApplicantResume.skills.split(',').map((skill: string, index: number) => (
                                <View key={index} style={styles.skillChip}>
                                  <Text style={styles.skillChipText}>{skill.trim()}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        {/* Education */}
                        {selectedApplicantResume.educations && selectedApplicantResume.educations.length > 0 && (
                          <View style={styles.resumeSection}>
                            <Text style={styles.resumeSectionTitle}>Education Details</Text>
                            {selectedApplicantResume.educations.map((edu: any, index: number) => (
                              <View key={index} style={styles.resumeHistoryItem}>
                                <Text style={styles.resumeItemBoldText}>{edu.degree} {edu.branch ? `in ${edu.branch}` : ''}</Text>
                                <Text style={styles.resumeItemSubText}>{edu.collegeName}</Text>
                                <Text style={styles.resumeItemTimeText}>Year: {edu.startYear} - {edu.endYear}  |  Grade: {edu.percentage || 'N/A'}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Experience */}
                        {selectedApplicantResume.experiences && selectedApplicantResume.experiences.length > 0 && (
                          <View style={styles.resumeSection}>
                            <Text style={styles.resumeSectionTitle}>Work Experience</Text>
                            {selectedApplicantResume.experiences.map((exp: any, index: number) => (
                              <View key={index} style={styles.resumeHistoryItem}>
                                <Text style={styles.resumeItemBoldText}>{exp.role}</Text>
                                <Text style={styles.resumeItemSubText}>{exp.companyName}  ({exp.duration})</Text>
                                {exp.description && (
                                  <Text style={styles.resumeItemDescText}>{exp.description}</Text>
                                )}
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    )}

                    <TouchableOpacity 
                      style={styles.closeResumeBtn} 
                      onPress={() => setSelectedApplicantResume(null)}
                    >
                      <Text style={styles.closeResumeBtnText}>Close CV Details</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )
              )}
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  refreshBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#64748b', marginTop: 12, fontWeight: '600' },
  listContent: { padding: 20 },
  jobCard: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  jobTitleText: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', flexShrink: 1 },
  companyText: { fontSize: 12, color: '#3b82f6', fontWeight: '700', marginTop: 2 },
  statusToggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 5, borderWidth: 1, borderColor: '#e2e8f0' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusToggleText: { fontSize: 10, fontWeight: 'bold' },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, gap: 1 },
  premiumBadgeText: { fontSize: 8, fontWeight: '900', color: '#d97706' },
  
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  detailItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  applicantsTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
  },
  applicantsBtnText: { fontSize: 13, fontWeight: 'bold', color: '#3b82f6' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#475569', marginTop: 15 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // Applicants Sheet Overlay styles
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  sheetSubtitle: { fontSize: 12, color: '#3b82f6', fontWeight: '700', marginTop: 2 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  sheetLoader: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  
  sheetEmptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  sheetEmptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#475569', marginTop: 12 },
  sheetEmptyDesc: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  applicantCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  applicantHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  applicantAvatarBox: { marginRight: 12 },
  applicantAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e2e8f0' },
  applicantAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  applicantInfo: { flex: 1 },
  applicantName: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  applicantMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  applicantMetaText: { fontSize: 11, color: '#64748b', fontWeight: '500', flexShrink: 1 },
  applicantDate: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 3 },
  appliedViaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  appliedViaText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  
  applicantActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10 },
  applicantActionBtn: { flex: 1, flexDirection: 'row', height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1 },
  callBtn: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  whatsappBtn: { backgroundColor: '#128c7e', borderColor: '#075e54' },
  resumeBtn: { backgroundColor: '#3b82f6', borderColor: '#a22d94' },
  applicantActionText: { fontSize: 11, fontWeight: 'bold', color: '#475569' },

  // Resume overlay styles
  resumeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  resumeContainer: { backgroundColor: 'white', borderRadius: 28, maxHeight: '90%', overflow: 'hidden' },
  resumeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resumeHeaderTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  resumeHeaderSub: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 1 },
  resumeCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  resumeLoader: { paddingVertical: 60, justifyContent: 'center', alignItems: 'center' },
  resumeCandidateHeader: { alignItems: 'center', marginBottom: 20 },
  resumeAvatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  resumeAvatarLargeText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  resumeName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  resumeDetailsText: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  
  fallbackNoticeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', borderRadius: 12, padding: 10, marginTop: 10 },
  fallbackNoticeText: { flex: 1, fontSize: 11, color: '#b45309', fontWeight: '600', lineHeight: 15 },
  
  resumeDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  resumeSection: { marginBottom: 20, width: '100%' },
  resumeSectionTitle: { fontSize: 13, fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  resumeBodyText: { fontSize: 12, color: '#475569', lineHeight: 18, fontWeight: '500' },
  
  skillsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  skillChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  skillChipText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  
  resumeHistoryItem: { borderLeftWidth: 2, borderLeftColor: '#3b82f6', paddingLeft: 12, marginBottom: 15 },
  resumeItemBoldText: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  resumeItemSubText: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  resumeItemTimeText: { fontSize: 10, color: '#94a3b8', fontWeight: '500', marginTop: 3 },
  resumeItemDescText: { fontSize: 11, color: '#475569', lineHeight: 16, marginTop: 6, fontWeight: '500' },
  
  closeResumeBtn: { backgroundColor: '#f1f5f9', height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  closeResumeBtnText: { color: '#475569', fontSize: 13, fontWeight: 'bold' },
  uploadedResumeImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    marginVertical: 16,
    backgroundColor: '#f1f5f9',
  },
  resumeImageName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  applicantDecisionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  decisionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  shortlistBtn: {
    backgroundColor: '#10b981',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  decisionBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  applicantStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  applicantStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
