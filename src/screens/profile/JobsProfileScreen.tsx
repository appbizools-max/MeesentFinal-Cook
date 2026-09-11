import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { auth, db, storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BACKEND_CONFIG } from '../../config/backend';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where, deleteDoc, addDoc, serverTimestamp, limit, orderBy, getDocs } from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import razorpayService from '../../services/razorpay.service';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PINCODES } from '../../data/pincodes';

export default function JobsProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const [pincodeAdPrice, setPincodeAdPrice] = useState<number>(99);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch('http://10.0.2.2:5000/api/pricing');
        const data = await res.json();
        if (data.success && data.pricing) {
          setPincodeAdPrice(Number(data.pricing.jobsPincodeAdPrice || data.pricing.pincodeAdPrice || 99));
        }
      } catch (_) { }
    };

    fetchPricing();

    const unsubPricing = onSnapshot(doc(db, 'config', 'service_pricing'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPincodeAdPrice(Number(data.jobsPincodeAdPrice || data.pincodeAdPrice || 99));
      }
    }, (err) => {
      console.warn("Jobs profile pricing snapshot notice, using API fallback:", err);
      fetchPricing();
    });
    return () => unsubPricing();
  }, []);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>({
    name: 'Rahul Sharma',
    email: 'rahulsharma@gmail.com',
    phone: '+91 98765 43210',
    fullAddress: '',
    pincode: '',
    city: '',
    state: '',
    area: '',
    location: '',
    profileImage: '',
    verified: false,
    hasVerificationBadge: false,
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFullAddress, setEditFullAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editLocationQuery, setEditLocationQuery] = useState('');
  const [editSelectedPincode, setEditSelectedPincode] = useState<any>(null);
  const [editSuggestions, setEditSuggestions] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);
  const [modalFocusedField, setModalFocusedField] = useState<string | null>(null);


  // Real-time Counts
  const [appliedCount, setAppliedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [postedJobsCount, setPostedJobsCount] = useState(0);
  const [postedJobs, setPostedJobs] = useState<any[]>([]);
  const [userPincode, setUserPincode] = useState<string | null>(null);
  const [pincodeAds, setPincodeAds] = useState<any[]>([]);
  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [myActivitiesLoading, setMyActivitiesLoading] = useState(true);



  // Resume builder state
  const [resumeBuilderModalVisible, setResumeBuilderModalVisible] = useState(false);
  const [editModalScrollKey, setEditModalScrollKey] = useState(0);
  const [resumeModalScrollKey, setResumeModalScrollKey] = useState(0);
  const [resumeData, setResumeData] = useState({
    // Personal Info
    fullName: '',
    phoneNumber: '',
    email: '',
    location: '',

    // Professional Summary
    careerObjective: '',

    // Education
    educations: [] as Array<{
      collegeName: string;
      degree: string;
      branch: string;
      startYear: string;
      endYear: string;
      percentage: string;
    }>,

    // Skills
    skills: '',

    // Experience
    experiences: [] as Array<{
      companyName: string;
      role: string;
      duration: string;
      description: string;
    }>,
  });

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    // Real-time listener for user profile
    const userRef = doc(db, 'users', userId);
    const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileData = {
          name: data.name || '',
          email: data.email || '',
          phone: data.phoneNumber || '',
          fullAddress: data.fullAddress || '',
          pincode: data.pincode || '',
          city: data.city || '',
          state: data.state || '',
          area: data.area || '',
          location: data.location || '',
          profileImage: data.profileImage || '',
          verified: data.isVerified !== undefined ? data.isVerified : false,
          hasVerificationBadge: data.hasVerificationBadge || false,
          isGenuineVerified: data.isGenuineVerified || false,
        };
        setProfile(profileData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to profile:", error);
      setLoading(false);
    });

    // Real-time listener for Applied Jobs
    const qApplied = query(collection(db, 'job_applications'), where('userId', '==', userId));
    const unsubscribeApplied = onSnapshot(qApplied, (snapshot) => {
      setAppliedCount(snapshot.size);
    });

    // Real-time listener for Saved Jobs
    const qSaved = query(collection(db, 'saved_jobs'), where('userId', '==', userId));
    const unsubscribeSaved = onSnapshot(qSaved, (snapshot) => {
      setSavedCount(snapshot.size);
    });

    // Real-time listener for Favorite Jobs
    const qFav = query(collection(db, 'favorite_jobs'), where('userId', '==', userId));
    const unsubscribeFav = onSnapshot(qFav, (snapshot) => {
      setFavCount(snapshot.size);
    });

    // Real-time listener for Posted Jobs
    const qPosted = query(collection(db, 'jobs'), where('postedBy', '==', userId));
    const unsubscribePosted = onSnapshot(qPosted, (snapshot) => {
      setPostedJobsCount(snapshot.size);
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
      setPostedJobs(jobs);

      // Get pincode from most recent job if available
      if (jobs.length > 0 && jobs[0].pincode) {
        setUserPincode(jobs[0].pincode);

        // Fetch pincode ads based on user's pincode
        const qAds = query(
          collection(db, 'pincode_ads'),
          where('pincode', '==', jobs[0].pincode),
          where('status', '==', 'active'),
          limit(5)
        );
        const unsubscribeAds = onSnapshot(qAds, (adsSnapshot) => {
          const ads = adsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
          setPincodeAds(ads.slice(0, 5)); // Show max 5 ads
        });
      }
    });

    return () => {
      unsubscribeProfile();
      unsubscribeApplied();
      unsubscribeSaved();
      unsubscribeFav();
      unsubscribePosted();
    };
  }, []);

  // Fetch user's ad activities
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setMyActivitiesLoading(false);
      return;
    }

    const q = query(
      collection(db, 'pincode_ads'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ads = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by createdAt descending
      const sortedAds = ads.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setMyActivities(sortedAds);
      setMyActivitiesLoading(false);
    }, (error) => {
      console.error("Error fetching my activities:", error);
      setMyActivitiesLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Prefill edit modal inputs when it is opened
  useEffect(() => {
    if (editModalVisible) {
      setIsEditingProfile(false);
      setEditName(profile.name || '');
      setEditPhone(profile.phone || '');
      setEditEmail(profile.email || '');
      setEditFullAddress(profile.fullAddress || '');
      setEditCity(profile.city || '');
      setEditLocationQuery(profile.pincode || '');
      setEditSelectedPincode({
        pincode: profile.pincode,
        city: profile.city,
        state: profile.state,
        area: profile.area,
      });
      setEditSuggestions([]);
    }
  }, [editModalVisible, profile]);

  // Handle location search in edit modal
  useEffect(() => {
    if (!editLocationQuery) {
      setEditSuggestions([]);
      return;
    }
    const currentPincodeString = editSelectedPincode ? editSelectedPincode.pincode : '';
    if (editLocationQuery === currentPincodeString) {
      setEditSuggestions([]);
      return;
    }

    const queryLower = editLocationQuery.toLowerCase();
    const uniqueMap = new Map();
    for (const item of PINCODES) {
      const match = item.pincode.startsWith(queryLower) ||
        item.city.toLowerCase().includes(queryLower) ||
        item.area.toLowerCase().includes(queryLower);
      if (match) {
        if (!uniqueMap.has(item.pincode)) {
          uniqueMap.set(item.pincode, item);
        }
        if (uniqueMap.size >= 15) {
          break;
        }
      }
    }
    setEditSuggestions(Array.from(uniqueMap.values()));
  }, [editLocationQuery, editSelectedPincode]);

  const handleUpdateProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setUpdating(true);
        const selectedUri = result.assets[0].uri;
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const response = await fetch(selectedUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `profiles/${userId}`);
        await uploadBytes(storageRef, blob);
        const profileImageUrl = await getDownloadURL(storageRef);

        await updateDoc(doc(db, 'users', userId), {
          profileImage: profileImageUrl,
          updatedAt: new Date(),
        });

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile picture updated successfully',
        });
      }
    } catch (error: any) {
      console.error("Error updating profile image:", error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error.message || 'Failed to update profile picture',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName || !editPhone || !editEmail || !editFullAddress || !editLocationQuery || !editCity) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill in all fields' });
      return;
    }

    setUpdating(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        name: editName,
        email: editEmail,
        phoneNumber: editPhone,
        fullAddress: editFullAddress,
        pincode: editLocationQuery,
        city: editCity,
        state: editSelectedPincode?.state || profile.state || '',
        area: editSelectedPincode?.area || profile.area || '',
        location: `${editCity}${editSelectedPincode?.state ? ', ' + editSelectedPincode.state : (profile.state ? ', ' + profile.state : '')}`,
        updatedAt: new Date(),
      });

      setEditModalVisible(false);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to update profile' });
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    console.log('Delete button pressed for job:', jobId);

    // Direct deletion without confirmation for testing
    try {
      console.log('Attempting direct delete for job:', jobId);
      const jobRef = doc(db, 'jobs', jobId);
      await deleteDoc(jobRef);
      console.log('Job deleted successfully');
      Toast.show({ type: 'success', text1: 'Success', text2: 'Job deleted successfully' });
    } catch (error: any) {
      console.error('Delete error:', error);
      console.error('Error details:', JSON.stringify(error));
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to delete job' });
    }
  };

  const getAdStatusBadge = (endDate: any) => {
    if (!endDate) return { label: 'Active', color: '#10b981' };
    try {
      const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
      if (isNaN(end.getTime())) return { label: 'Active', color: '#10b981' };
      if (end < new Date()) {
        return { label: 'Expired', color: '#64748b' };
      }
      return { label: 'Running', color: '#10b981' };
    } catch (e) {
      return { label: 'Active', color: '#10b981' };
    }
  };

  const formatAdDate = (endDate: any) => {
    if (!endDate) return 'N/A';
    try {
      const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
      if (isNaN(end.getTime())) return 'N/A';
      return end.toLocaleDateString();
    } catch (e) {
      return 'N/A';
    }
  };

  // Resume builder functions
  const handleSaveResume = async () => {
    if (!resumeData.fullName || !resumeData.email || !resumeData.phoneNumber) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill required fields (Full Name, Email, Phone)' });
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await addDoc(collection(db, 'resumes'), {
        userId,
        ...resumeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Toast.show({ type: 'success', text1: 'Success', text2: 'Resume saved successfully' });
      setResumeBuilderModalVisible(false);
      setResumeData({
        fullName: '',
        phoneNumber: '',
        email: '',
        location: '',
        careerObjective: '',
        educations: [],
        skills: '',
        experiences: [],
      });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to save resume' });
    }
  };

  const addExperience = () => {
    setResumeData({
      ...resumeData,
      experiences: [...resumeData.experiences, {
        companyName: '',
        role: '',
        duration: '',
        description: '',
      }]
    });
  };

  const removeExperience = (index: number) => {
    setResumeData({
      ...resumeData,
      experiences: resumeData.experiences.filter((_, i) => i !== index)
    });
  };

  const updateExperience = (index: number, field: string, value: string) => {
    const updatedExperiences = [...resumeData.experiences];
    updatedExperiences[index] = {
      ...updatedExperiences[index],
      [field]: value
    };
    setResumeData({
      ...resumeData,
      experiences: updatedExperiences
    });
  };

  const addEducation = () => {
    setResumeData({
      ...resumeData,
      educations: [...resumeData.educations, {
        collegeName: '',
        degree: '',
        branch: '',
        startYear: '',
        endYear: '',
        percentage: '',
      }]
    });
  };

  const removeEducation = (index: number) => {
    setResumeData({
      ...resumeData,
      educations: resumeData.educations.filter((_, i) => i !== index)
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const updatedEducations = [...resumeData.educations];
    updatedEducations[index] = {
      ...updatedEducations[index],
      [field]: value
    };
    setResumeData({
      ...resumeData,
      educations: updatedEducations
    });
  };

  const handleDownloadResume = async () => {
    if (!resumeData.fullName || !resumeData.email || !resumeData.phoneNumber) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill required fields (Full Name, Email, Phone)' });
      return;
    }

    try {
      Toast.show({ type: 'info', text1: 'Generating PDF', text2: 'Please wait...' });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 3px solid #0035a0; padding-bottom: 20px; margin-bottom: 30px; }
            .name { font-size: 32px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }
            .contact-info { font-size: 14px; color: #64748b; margin-top: 10px; line-height: 1.8; }
            .section { margin-top: 30px; }
            .section-title { font-size: 20px; font-weight: bold; color: #0035a0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
            .content { font-size: 14px; line-height: 1.6; color: #475569; }
            .skills-list { margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px; }
            .skill { background: #f1f5f9; padding: 8px 16px; border-radius: 20px; font-size: 13px; color: #334155; font-weight: 500; }
            .education-item { margin-bottom: 15px; }
            .education-item .degree { font-weight: bold; font-size: 15px; color: #1e293b; }
            .education-item .college { color: #64748b; font-size: 14px; }
            .education-item .details { color: #94a3b8; font-size: 13px; margin-top: 5px; }
            .experience-item { margin-bottom: 20px; padding-left: 20px; border-left: 3px solid #0035a0; }
            .experience-item .company { font-weight: bold; font-size: 16px; color: #1e293b; }
            .experience-item .role { color: #0035a0; font-size: 14px; font-weight: 500; margin-top: 5px; }
            .experience-item .duration { color: #64748b; font-size: 13px; margin-top: 5px; }
            .experience-item .description { color: #475569; font-size: 14px; margin-top: 10px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="name">${resumeData.fullName}</div>
            <div class="contact-info">
              ${resumeData.email} | ${resumeData.phoneNumber} ${resumeData.location ? '| ' + resumeData.location : ''}
            </div>
          </div>

          ${resumeData.careerObjective ? `
          <div class="section">
            <div class="section-title">Career Objective</div>
            <div class="content">${resumeData.careerObjective.replace(/\n/g, '<br>')}</div>
          </div>
          ` : ''}

          ${resumeData.experiences && resumeData.experiences.length > 0 ? `
          <div class="section">
            <div class="section-title">Experience</div>
            ${resumeData.experiences.map(exp => `
              <div class="experience-item">
                <div class="company">${exp.companyName}</div>
                <div class="role">${exp.role}</div>
                <div class="duration">${exp.duration}</div>
                <div class="description">${exp.description.replace(/\n/g, '<br>')}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${resumeData.educations && resumeData.educations.length > 0 ? `
          <div class="section">
            <div class="section-title">Education</div>
            ${resumeData.educations.map(edu => `
              <div class="education-item">
                <div class="degree">${edu.degree} ${edu.branch ? 'in ' + edu.branch : ''}</div>
                <div class="college">${edu.collegeName}</div>
                <div class="details">${edu.startYear} - ${edu.endYear} ${edu.percentage ? '| ' + edu.percentage : ''}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${resumeData.skills ? `
          <div class="section">
            <div class="section-title">Skills</div>
            <div class="skills-list">
              ${resumeData.skills?.split(',').map(skill => `<span class="skill">${skill.trim()}</span>`).join('') ?? ''}
            </div>
          </div>
          ` : ''}
        </body>
        </html>
      `;

      const file = await Print.printToFileAsync({ html });

      await Sharing.shareAsync(file.uri);

      Toast.show({ type: 'success', text1: 'Success', text2: 'Resume PDF generated successfully' });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to generate PDF' });
    }
  };

  const menuItems = [
    { id: 'profile', label: 'My Profile', sub: 'Personal information and profile settings', icon: 'person-outline', color: '#0035a0' },
    { id: 'upgradeSeeker', label: 'Urgent Hiring', sub: 'Unlock exclusive jobs & get hired faster', icon: 'flash-outline', color: '#0035a0', route: 'UpgradeSeeker' },
    { id: 'genuineVerification', label: 'Genuine Verification', sub: 'Get verified badge • Build trust • Higher ranking', icon: 'shield-checkmark-outline', color: '#10b981', route: 'GenuineVerification' },
    { id: 'postJob', label: 'Post a Job', sub: 'Reach the right talent — free to post!', icon: 'add-circle-outline', color: '#10b981', route: 'PostJob' },
    { id: 'posted', label: 'Job Posted', sub: `View your posted jobs (${postedJobsCount})`, icon: 'briefcase-outline', color: '#0035a0', route: 'MyPostedJobs' },
    { id: 'myActivities', label: 'My Ad Campaigns', sub: 'Manage your targeted pincode ads', icon: 'megaphone-outline', color: '#34d399', route: 'MyActivities' },
    { id: 'apps', label: 'My Applications', sub: 'Track your job applications', icon: 'document-text-outline', color: '#0035a0' },
    { id: 'paymentHistory', label: 'Payment History', sub: 'View all your payment records', icon: 'receipt-outline', color: '#059669', route: 'JobsPaymentHistory' },
    { id: 'resumeBuilder', label: 'Resume Builder', sub: 'Create and manage your resume', icon: 'create-outline', color: '#0035a0' },
    { id: 'help', label: 'Help & Support', sub: 'Get assistance and FAQ', icon: 'help-circle-outline', color: '#0035a0', route: 'HelpSupport' },
    { id: 'privacy', label: 'Privacy Policy', sub: 'Read our privacy policy', icon: 'shield-checkmark-outline', color: '#0035a0', route: 'PrivacyPolicy' },
    { id: 'terms', label: 'Terms & Conditions', sub: 'Read our terms of service', icon: 'document-text-outline', color: '#0035a0', route: 'TermsConditions' },
  ];

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0035a0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Top App Bar */}
        <View style={styles.appBar}>
          <Text style={styles.logoText}>Messent Jobs</Text>
          <View style={styles.appBarIcons}>
            <TouchableOpacity style={styles.iconContainer}>
              <Ionicons name="notifications-outline" size={26} color="#333" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconContainer} onPress={() => { }}>
              <Ionicons name="settings-outline" size={26} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>

          {/* Professional Profile Card */}
          <View style={[styles.profileCard, { padding: 0, overflow: 'hidden', backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10 }]}>
            {/* Header Accent Bar */}
            <View style={{ height: 6, backgroundColor: '#0035a0' }} />

            <View style={{ padding: 20 }}>
              {/* Top Row: Name and Edit Button */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>{profile.name}</Text>

                  {/* Status Indicator */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    {profile.isGenuineVerified ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Ionicons name="shield-checkmark" size={11} color="#059669" />
                        <Text style={{ color: '#047857', fontSize: 9, fontWeight: '800', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Genuine Verified</Text>
                      </View>
                    ) : profile.verified ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Ionicons name="checkmark-circle" size={11} color="#2563eb" />
                        <Text style={{ color: '#1d4ed8', fontSize: 9, fontWeight: '800', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Verified Account</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Ionicons name="person-outline" size={11} color="#64748b" />
                        <Text style={{ color: '#475569', fontSize: 9, fontWeight: '800', marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Standard Account</Text>
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={{ padding: 8, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }}
                  onPress={() => {
                    setEditName(profile.name);
                    setEditPhone(profile.phone);
                    setEditEmail(profile.email);
                    setEditFullAddress(profile.fullAddress);
                    setEditLocationQuery(profile.pincode);
                    setEditCity(profile.city);
                    setEditModalVisible(true);
                  }}
                >
                  <Ionicons name="create-outline" size={18} color="#0035a0" />
                </TouchableOpacity>
              </View>

              {/* Info Grid Rows */}
              <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14, gap: 12 }}>
                {/* Phone */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#f0f5fc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <Ionicons name="call-outline" size={14} color="#0035a0" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone Number</Text>
                    <Text style={{ fontSize: 13, color: '#334155', fontWeight: '700', marginTop: 1 }}>{profile.phone}</Text>
                  </View>
                </View>

                {/* Email */}
                {profile.email ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#f0f5fc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="mail-outline" size={14} color="#0035a0" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Email Address</Text>
                      <Text style={{ fontSize: 13, color: '#334155', fontWeight: '700', marginTop: 1 }}>{profile.email}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Address Info */}
                {(profile.fullAddress || profile.city) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#f0f5fc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="location-outline" size={14} color="#0035a0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Address</Text>
                      <Text style={{ fontSize: 13, color: '#334155', fontWeight: '700', marginTop: 1 }} numberOfLines={2}>
                        {[profile.fullAddress, profile.city, profile.state].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Add Post Banner */}
          <TouchableOpacity
            style={styles.addPostBanner}
            onPress={() => navigation.navigate('PostAd')}
          >
            <LinearGradient
              colors={['#0035a0', '#0035a0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerContent}>
                <View style={styles.bannerLeft}>
                  <Ionicons name="megaphone" size={28} color="#fff" />
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>Post your special ads</Text>
                    <Text style={styles.bannerSubtitle}>Reach targeted candidates at ₹{pincodeAdPrice}/pincode</Text>
                  </View>
                </View>
                <View style={styles.bannerRight}>
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Stats Row - Real Time Specialized for Jobs */}
          <View style={styles.statsRow}>
            <StatCard
              icon="briefcase"
              label="Applied"
              value={appliedCount}
              color="#0035a0"
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('Applications' as any);
                } else {
                  navigation.navigate('Applications');
                }
              }}
            />
            <StatCard
              icon="megaphone"
              label="My Activities"
              value={myActivities.length}
              color="#34d399"
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('MyActivities' as any);
                } else {
                  navigation.navigate('MyActivities');
                }
              }}
            />
            <StatCard
              icon="heart"
              label="Favorites"
              value={favCount}
              color="#ef4444"
            />
            <StatCard
              icon="add-circle"
              label="Posted"
              value={postedJobsCount}
              color="#f59e0b"
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('MyPostedJobs');
                } else {
                  navigation.navigate('MyPostedJobs');
                }
              }}
            />
          </View>

          {/* Menu Items List */}
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  if (item.id === 'profile') {
                    setEditModalVisible(true);
                  } else if (item.id === 'apps') {
                    // Navigate to Applications screen
                    const parent = navigation.getParent();
                    if (parent) {
                      parent.navigate('Applications' as any);
                    }
                  } else if (item.id === 'resumeBuilder') {
                    setResumeBuilderModalVisible(true);
                  } else if (item.route) {
                    // Navigate to parent stack navigator
                    const parent = navigation.getParent();
                    if (parent) {
                      parent.navigate(item.route as any);
                    }
                  }
                }}
              >
                <View style={[styles.menuIconWrapper, { backgroundColor: item.color + '10' }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={handleLogout} style={[styles.menuItem, styles.logoutItem]}>
              <View style={styles.logoutIconWrapper}>
                <Ionicons name="log-out-outline" size={22} color="#0035a0" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuLabel, { color: '#000000ff' }]}>Logout</Text>
                <Text style={styles.menuSub}>Sign out from your account</Text>
              </View>
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('DeleteAccount' as any);
                } else {
                  navigation.navigate('DeleteAccount');
                }
              }}
              style={[styles.menuItem, { backgroundColor: '#fff1f2', marginTop: 4 }]}
            >
              <View style={[styles.logoutIconWrapper, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuLabel, { color: '#dc2626' }]}>Delete Account</Text>
                <Text style={styles.menuSub}>Permanently delete your account and data</Text>
              </View>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEditModalVisible(false)}
        onShow={() => setEditModalScrollKey(prev => prev + 1)}
      >
        <SafeAreaView style={styles.modalFullScreenContainer} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            {/* Cobalt accent bar */}
            <View style={{ height: 4, backgroundColor: '#0035a0' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
              <TouchableOpacity
                style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={20} color="#0035a0" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Edit Profile</Text>
                <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 1 }}>{profile.name}</Text>
              </View>
              <View style={{ width: 38 }} />
            </View>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView
              key={`edit-scroll-${editModalScrollKey}`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
              nestedScrollEnabled={true}
            >
              {/* Form Card */}
              <View style={{ marginTop: 20, marginHorizontal: 16 }}>

                {/* Section: Personal Info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginLeft: 2 }}>
                  <View style={{ width: 3, height: 14, backgroundColor: '#0035a0', borderRadius: 2, marginRight: 8 }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0035a0', letterSpacing: 1.2, textTransform: 'uppercase' }}>Personal Info</Text>
                </View>

                {/* Full Name */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6, marginLeft: 2, letterSpacing: 0.5 }}>Full Name</Text>
                  <View style={[{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#ffffff', borderWidth: 1.5,
                    borderColor: modalFocusedField === 'name' ? '#0035a0' : '#e2e8f0',
                    borderRadius: 14, paddingHorizontal: 14, height: 54,
                    shadowColor: modalFocusedField === 'name' ? '#0035a0' : '#000',
                    shadowOpacity: modalFocusedField === 'name' ? 0.08 : 0.03,
                    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: modalFocusedField === 'name' ? 2 : 1,
                  }]}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: modalFocusedField === 'name' ? '#e8eef9' : '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="person" size={16} color={modalFocusedField === 'name' ? '#0035a0' : '#94a3b8'} />
                    </View>
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '600' }}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#c1ccd8"
                      onFocus={() => setModalFocusedField('name')}
                      onBlur={() => setModalFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Phone Number */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6, marginLeft: 2, letterSpacing: 0.5 }}>Phone Number</Text>
                  <View style={[{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#ffffff', borderWidth: 1.5,
                    borderColor: modalFocusedField === 'phone' ? '#0035a0' : '#e2e8f0',
                    borderRadius: 14, paddingHorizontal: 14, height: 54,
                    shadowColor: modalFocusedField === 'phone' ? '#0035a0' : '#000',
                    shadowOpacity: modalFocusedField === 'phone' ? 0.08 : 0.03,
                    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: modalFocusedField === 'phone' ? 2 : 1,
                  }]}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: modalFocusedField === 'phone' ? '#e8eef9' : '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="call" size={16} color={modalFocusedField === 'phone' ? '#0035a0' : '#94a3b8'} />
                    </View>
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '600' }}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="+91 XXXXX XXXXX"
                      keyboardType="phone-pad"
                      placeholderTextColor="#c1ccd8"
                      onFocus={() => setModalFocusedField('phone')}
                      onBlur={() => setModalFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginLeft: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 }}>Email Address</Text>
                    <View style={{ marginLeft: 6, backgroundColor: '#f0f5fc', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#0035a0', letterSpacing: 0.3 }}>OPTIONAL</Text>
                    </View>
                  </View>
                  <View style={[{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#ffffff', borderWidth: 1.5,
                    borderColor: modalFocusedField === 'email' ? '#0035a0' : '#e2e8f0',
                    borderRadius: 14, paddingHorizontal: 14, height: 54,
                    shadowColor: modalFocusedField === 'email' ? '#0035a0' : '#000',
                    shadowOpacity: modalFocusedField === 'email' ? 0.08 : 0.03,
                    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: modalFocusedField === 'email' ? 2 : 1,
                  }]}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: modalFocusedField === 'email' ? '#e8eef9' : '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="mail" size={16} color={modalFocusedField === 'email' ? '#0035a0' : '#94a3b8'} />
                    </View>
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '600' }}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="your@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#c1ccd8"
                      onFocus={() => setModalFocusedField('email')}
                      onBlur={() => setModalFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: '#f1f5f9', marginBottom: 18 }} />

                {/* Section: Location */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginLeft: 2 }}>
                  <View style={{ width: 3, height: 14, backgroundColor: '#0ea5e9', borderRadius: 2, marginRight: 8 }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0ea5e9', letterSpacing: 1.2, textTransform: 'uppercase' }}>Location</Text>
                </View>

                {/* Pincode */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6, marginLeft: 2, letterSpacing: 0.5 }}>Pincode</Text>
                  <View style={[{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#ffffff', borderWidth: 1.5,
                    borderColor: modalFocusedField === 'pincode' ? '#0035a0' : '#e2e8f0',
                    borderRadius: 14, paddingHorizontal: 14, height: 54,
                    shadowColor: modalFocusedField === 'pincode' ? '#0035a0' : '#000',
                    shadowOpacity: modalFocusedField === 'pincode' ? 0.08 : 0.03,
                    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: modalFocusedField === 'pincode' ? 2 : 1,
                  }]}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: modalFocusedField === 'pincode' ? '#e8eef9' : '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="navigate" size={16} color={modalFocusedField === 'pincode' ? '#0035a0' : '#94a3b8'} />
                    </View>
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '600' }}
                      value={editLocationQuery}
                      onChangeText={setEditLocationQuery}
                      placeholder="Enter 6-digit pincode"
                      keyboardType="numeric"
                      maxLength={6}
                      placeholderTextColor="#c1ccd8"
                      onFocus={() => setModalFocusedField('pincode')}
                      onBlur={() => setModalFocusedField(null)}
                    />
                  </View>

                  {/* Suggestions List */}
                  {editSuggestions.length > 0 && (
                    <View style={{ marginTop: 6, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }}>
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                        {editSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={`${item.pincode}-${index}`}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: index < editSuggestions.length - 1 ? 1 : 0, borderBottomColor: '#f1f5f9' }}
                            onPress={() => {
                              setEditSelectedPincode(item);
                              setEditLocationQuery(item.pincode);
                              setEditCity(item.city);
                              const extraAddress = `${item.area ? item.area + ', ' : ''}${item.city}, ${item.state}`;
                              setEditFullAddress(prev => prev ? `${prev}, ${extraAddress}` : extraAddress);
                              setEditSuggestions([]);
                            }}
                          >
                            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#e8eef9', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                              <Ionicons name="location" size={14} color="#0035a0" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{item.area || item.city}</Text>
                              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{item.city}, {item.state} · {item.pincode}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* City */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6, marginLeft: 2, letterSpacing: 0.5 }}>City</Text>
                  <View style={[{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#ffffff', borderWidth: 1.5,
                    borderColor: modalFocusedField === 'city' ? '#0035a0' : '#e2e8f0',
                    borderRadius: 14, paddingHorizontal: 14, height: 54,
                    shadowColor: modalFocusedField === 'city' ? '#0035a0' : '#000',
                    shadowOpacity: modalFocusedField === 'city' ? 0.08 : 0.03,
                    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: modalFocusedField === 'city' ? 2 : 1,
                  }]}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: modalFocusedField === 'city' ? '#e8eef9' : '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="business" size={16} color={modalFocusedField === 'city' ? '#0035a0' : '#94a3b8'} />
                    </View>
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '600' }}
                      value={editCity}
                      onChangeText={setEditCity}
                      placeholder="Enter your city"
                      placeholderTextColor="#c1ccd8"
                      onFocus={() => setModalFocusedField('city')}
                      onBlur={() => setModalFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Full Address */}
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6, marginLeft: 2, letterSpacing: 0.5 }}>Full Address</Text>
                  <View style={[{
                    flexDirection: 'row', alignItems: 'flex-start',
                    backgroundColor: '#ffffff', borderWidth: 1.5,
                    borderColor: modalFocusedField === 'address' ? '#0035a0' : '#e2e8f0',
                    borderRadius: 14, paddingHorizontal: 14, paddingTop: 14, minHeight: 100,
                    shadowColor: modalFocusedField === 'address' ? '#0035a0' : '#000',
                    shadowOpacity: modalFocusedField === 'address' ? 0.08 : 0.03,
                    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: modalFocusedField === 'address' ? 2 : 1,
                  }]}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: modalFocusedField === 'address' ? '#e8eef9' : '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="home" size={16} color={modalFocusedField === 'address' ? '#0035a0' : '#94a3b8'} />
                    </View>
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '600', textAlignVertical: 'top', paddingTop: 4 }}
                      value={editFullAddress}
                      onChangeText={setEditFullAddress}
                      placeholder={"House No, Building,\nStreet, Area..."}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor="#c1ccd8"
                      onFocus={() => setModalFocusedField('address')}
                      onBlur={() => setModalFocusedField(null)}
                    />
                  </View>
                </View>

              </View>

              {/* Buttons Container */}
              <View style={{ paddingHorizontal: 20, marginTop: 25, gap: 10, marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={updating}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: updating ? '#cbd5e1' : '#0035a0',
                    borderRadius: 14,
                    height: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#0035a0',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: updating ? 0 : 0.2,
                    shadowRadius: 10,
                    elevation: updating ? 0 : 4,
                  }}
                >
                  {updating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="white" style={{ marginRight: 8 }} />
                      <Text style={{ color: 'white', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 }}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{ backgroundColor: '#f8fafc', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={{ color: '#64748b', fontSize: 15, fontWeight: '700' }}>Discard Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>







      <Modal
        visible={resumeBuilderModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setResumeBuilderModalVisible(false)}
        onShow={() => setResumeModalScrollKey(prev => prev + 1)}
      >
        <View style={{ flex: 1, backgroundColor: '#fdfdfd', paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <StatusBar style="dark" />

          {/* Header */}
          <View style={[styles.fullScreenHeader, { paddingHorizontal: width * 0.05, paddingVertical: width * 0.035 }]}>
            <TouchableOpacity
              onPress={() => setResumeBuilderModalVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={width * 0.07} color="#1e293b" />
            </TouchableOpacity>
            <Text style={[styles.fullScreenTitle, { fontSize: width * 0.05 }]}>Resume Builder</Text>
            <View style={{ width: width * 0.07 }} />
          </View>

          {/* Scrollable content */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView
              key={`resume-scroll-${resumeModalScrollKey}`}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: width * 0.05, paddingTop: width * 0.025, paddingBottom: 40 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              overScrollMode="always"
              scrollEnabled={true}
              nestedScrollEnabled={true}
            >
              {/* Personal Info Section */}
              <View style={[styles.sectionHeader, { marginTop: width * 0.05, marginBottom: width * 0.035 }]}>
                <Text style={[styles.sectionTitle, { fontSize: width * 0.045, marginBottom: width * 0.025 }]}>Personal Information</Text>
              </View>

              <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Full Name *</Text>
                <TextInput
                  style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94a3b8"
                  value={resumeData.fullName}
                  onChangeText={(text) => setResumeData({ ...resumeData, fullName: text })}
                />
              </View>

              <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Phone Number *</Text>
                <TextInput
                  style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#94a3b8"
                  value={resumeData.phoneNumber}
                  onChangeText={(text) => setResumeData({ ...resumeData, phoneNumber: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Email *</Text>
                <TextInput
                  style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                  placeholder="Enter your email"
                  placeholderTextColor="#94a3b8"
                  value={resumeData.email}
                  onChangeText={(text) => setResumeData({ ...resumeData, email: text })}
                  keyboardType="email-address"
                />
              </View>

              <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Location</Text>
                <TextInput
                  style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                  placeholder="Enter your location"
                  placeholderTextColor="#94a3b8"
                  value={resumeData.location}
                  onChangeText={(text) => setResumeData({ ...resumeData, location: text })}
                />
              </View>

              {/* Professional Summary Section */}
              <View style={[styles.sectionHeader, { marginTop: width * 0.05, marginBottom: width * 0.035 }]}>
                <Text style={[styles.sectionTitle, { fontSize: width * 0.045, marginBottom: width * 0.025 }]}>Career Objective</Text>
              </View>

              <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>About Me / Career Objective</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035, minHeight: width * 0.25 }]}
                  placeholder="Write a brief summary about yourself and your career goals"
                  placeholderTextColor="#94a3b8"
                  value={resumeData.careerObjective}
                  onChangeText={(text) => setResumeData({ ...resumeData, careerObjective: text })}
                  multiline
                  numberOfLines={4}
                  scrollEnabled={false}
                />
              </View>

              {/* Education Section */}
              <View style={[styles.sectionHeader, { marginTop: width * 0.05, marginBottom: width * 0.035 }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { fontSize: width * 0.045, marginBottom: width * 0.025 }]}>Education</Text>
                  <TouchableOpacity style={[styles.addButton, { width: width * 0.09, height: width * 0.09, borderRadius: width * 0.045 }]} onPress={addEducation}>
                    <Ionicons name="add" size={width * 0.05} color="#0035a0" />
                  </TouchableOpacity>
                </View>
              </View>

              {resumeData.educations.map((edu, index) => (
                <View key={index} style={[styles.experienceCard, { borderRadius: width * 0.03, padding: width * 0.035, marginBottom: width * 0.035 }]}>
                  <View style={styles.experienceCardHeader}>
                    <Text style={[styles.experienceCardTitle, { fontSize: width * 0.04 }]}>Education {index + 1}</Text>
                    <TouchableOpacity style={[styles.removeButton, { width: width * 0.07, height: width * 0.07, borderRadius: width * 0.035 }]} onPress={() => removeEducation(index)}>
                      <Ionicons name="close" size={width * 0.045} color="#0035a0" />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                    <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>College Name</Text>
                    <TextInput
                      style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                      placeholder="Enter your college/university name"
                      placeholderTextColor="#94a3b8"
                      value={edu.collegeName}
                      onChangeText={(text) => updateEducation(index, 'collegeName', text)}
                    />
                  </View>

                  <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                    <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Degree</Text>
                    <TextInput
                      style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                      placeholder="Enter your degree (e.g., B.Tech, MCA)"
                      placeholderTextColor="#94a3b8"
                      value={edu.degree}
                      onChangeText={(text) => updateEducation(index, 'degree', text)}
                    />
                  </View>

                  <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                    <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Branch</Text>
                    <TextInput
                      style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                      placeholder="Enter your branch/specialization"
                      placeholderTextColor="#94a3b8"
                      value={edu.branch}
                      onChangeText={(text) => updateEducation(index, 'branch', text)}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginBottom: width * 0.035 }]}>
                      <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Start Year</Text>
                      <TextInput
                        style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                        placeholder="YYYY"
                        placeholderTextColor="#94a3b8"
                        value={edu.startYear}
                        onChangeText={(text) => updateEducation(index, 'startYear', text)}
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1, marginLeft: width * 0.025, marginBottom: width * 0.035 }]}>
                      <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>End Year</Text>
                      <TextInput
                        style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                        placeholder="YYYY"
                        placeholderTextColor="#94a3b8"
                        value={edu.endYear}
                        onChangeText={(text) => updateEducation(index, 'endYear', text)}
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>
                  </View>

                  <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                    <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Percentage / CGPA</Text>
                    <TextInput
                      style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                      placeholder="Enter your percentage or CGPA"
                      placeholderTextColor="#94a3b8"
                      value={edu.percentage}
                      onChangeText={(text) => updateEducation(index, 'percentage', text)}
                    />
                  </View>
                </View>
              ))}

              {resumeData.educations.length === 0 && (
                <View style={[styles.emptyExperience, { borderRadius: width * 0.03, padding: width * 0.07 }]}>
                  <Text style={[styles.emptyExperienceText, { fontSize: width * 0.04, marginBottom: width * 0.012 }]}>No education added yet</Text>
                  <Text style={[styles.emptyExperienceSub, { fontSize: width * 0.032 }]}>Tap + to add your first education</Text>
                </View>
              )}

              {/* Skills Section */}
              <View style={[styles.sectionHeader, { marginTop: width * 0.05, marginBottom: width * 0.035 }]}>
                <Text style={[styles.sectionTitle, { fontSize: width * 0.045, marginBottom: width * 0.025 }]}>Skills</Text>
              </View>

              <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Skills List</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035, minHeight: width * 0.25 }]}
                  placeholder="Enter your skills (comma separated)"
                  placeholderTextColor="#94a3b8"
                  value={resumeData.skills}
                  onChangeText={(text) => setResumeData({ ...resumeData, skills: text })}
                  multiline
                  numberOfLines={3}
                  scrollEnabled={false}
                />
              </View>

              {/* Experience Section */}
              <View style={[styles.sectionHeader, { marginTop: width * 0.05, marginBottom: width * 0.035 }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { fontSize: width * 0.045, marginBottom: width * 0.025 }]}>Experience</Text>
                  <TouchableOpacity style={[styles.addButton, { width: width * 0.09, height: width * 0.09, borderRadius: width * 0.045 }]} onPress={addExperience}>
                    <Ionicons name="add" size={width * 0.05} color="#0035a0" />
                  </TouchableOpacity>
                </View>
              </View>

              {resumeData.experiences.map((exp, index) => (
                <View key={index} style={[styles.experienceCard, { borderRadius: width * 0.03, padding: width * 0.035, marginBottom: width * 0.035 }]}>
                  <View style={styles.experienceCardHeader}>
                    <Text style={[styles.experienceCardTitle, { fontSize: width * 0.04 }]}>Experience {index + 1}</Text>
                    <TouchableOpacity style={[styles.removeButton, { width: width * 0.07, height: width * 0.07, borderRadius: width * 0.035 }]} onPress={() => removeExperience(index)}>
                      <Ionicons name="close" size={width * 0.045} color="#0035a0" />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                    <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Company Name</Text>
                    <TextInput
                      style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                      placeholder="Enter company name"
                      placeholderTextColor="#94a3b8"
                      value={exp.companyName}
                      onChangeText={(text) => updateExperience(index, 'companyName', text)}
                    />
                  </View>

                  <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                    <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Role</Text>
                    <TextInput
                      style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                      placeholder="Enter your role/job title"
                      placeholderTextColor="#94a3b8"
                      value={exp.role}
                      onChangeText={(text) => updateExperience(index, 'role', text)}
                    />
                  </View>

                  <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                    <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Duration</Text>
                    <TextInput
                      style={[styles.formInput, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035 }]}
                      placeholder="e.g., 2 years, Jan 2020 - Dec 2022"
                      placeholderTextColor="#94a3b8"
                      value={exp.duration}
                      onChangeText={(text) => updateExperience(index, 'duration', text)}
                    />
                  </View>

                  <View style={[styles.formGroup, { marginBottom: width * 0.035 }]}>
                    <Text style={[styles.formLabel, { fontSize: width * 0.035, marginBottom: width * 0.02 }]}>Description</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea, { borderRadius: width * 0.025, paddingHorizontal: width * 0.035, paddingVertical: width * 0.03, fontSize: width * 0.035, minHeight: width * 0.25 }]}
                      placeholder="Describe your responsibilities and achievements"
                      placeholderTextColor="#94a3b8"
                      value={exp.description}
                      onChangeText={(text) => updateExperience(index, 'description', text)}
                      multiline
                      numberOfLines={3}
                      scrollEnabled={false}
                    />
                  </View>
                </View>
              ))}

              {resumeData.experiences.length === 0 && (
                <View style={[styles.emptyExperience, { borderRadius: width * 0.03, padding: width * 0.07 }]}>
                  <Text style={[styles.emptyExperienceText, { fontSize: width * 0.04, marginBottom: width * 0.012 }]}>No experience added yet</Text>
                  <Text style={[styles.emptyExperienceSub, { fontSize: width * 0.032 }]}>Tap + to add your first experience</Text>
                </View>
              )}

              <View style={[styles.fullScreenButtonContainer, { paddingHorizontal: width * 0.05, paddingBottom: width * 0.07, paddingTop: width * 0.05 }]}>
                <TouchableOpacity style={[styles.saveBtn, { height: width * 0.14 }]} onPress={handleSaveResume}>
                  <Text style={[styles.saveBtnText, { fontSize: width * 0.04 }]}>Save Resume</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#0035a0', marginTop: width * 0.025, height: width * 0.14 }]} onPress={handleDownloadResume}>
                  <Text style={[styles.saveBtnText, { fontSize: width * 0.04 }]}>Save as PDF</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const StatCard = ({ icon, label, value, color, onPress }: any) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <View style={[styles.statIconWrapper, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  logoText: { fontSize: 24, fontWeight: '900', color: '#0035a0', letterSpacing: -1 },
  appBarIcons: { flexDirection: 'row', gap: 15 },
  iconContainer: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#0035a0', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  profileCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginTop: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0035a0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'white',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fee2e2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: { marginLeft: 15, flex: 1 },
  profileName: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  verifiedText: { color: '#2E7D32', fontSize: 10, fontWeight: '800', marginLeft: 4 },
  profileSubText: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 1 },
  editBtn: {
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editBtnText: { color: '#64748b', fontSize: 12, fontWeight: '700', marginLeft: 4 },

  // Add Post Button Styles
  addPostBanner: { marginHorizontal: 20, marginTop: 15, borderRadius: 16, overflow: 'hidden', shadowColor: '#3b82f6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  bannerGradient: { padding: 20 },
  bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bannerTextContainer: { marginLeft: 15, flex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  bannerSubtitle: { fontSize: 13, color: '#e0e0e0' },
  bannerRight: { flexDirection: 'row', alignItems: 'center' },
  bannerPrice: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginRight: 8 },

  // Payment Modal Styles
  paymentInfo: { alignItems: 'center', paddingVertical: 20 },
  priceTag: { backgroundColor: '#dcfce7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginBottom: 15 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#166534' },
  paymentTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  paymentDesc: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  featuresList: { width: '100%', gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  payBtn: { backgroundColor: '#0035a0', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  payBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Ad Form Styles
  imageUploadBox: { height: 150, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e2e8f0', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadedImage: { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { fontSize: 12, color: '#94a3b8', marginTop: 8 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: 20,
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 8,
    color: '#94a3b8',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },


  menuContainer: { marginTop: 25, marginHorizontal: 20, backgroundColor: 'white', borderRadius: 24, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  menuIconWrapper: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextContainer: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  menuSub: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  logoutItem: { borderBottomWidth: 0 },
  logoutIconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginRight: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, minHeight: 350 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  modalForm: { gap: 15 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
  textInput: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 15, height: 50, fontSize: 16 },
  saveBtn: { backgroundColor: '#0035a0', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Posted Jobs Modal Styles
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 16, fontWeight: 'bold', color: '#64748b', marginTop: 15 },
  emptyStateSub: { fontSize: 12, color: '#94a3b8', marginTop: 5 },
  jobCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  jobCardTitleContainer: { flex: 1 },
  jobTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  statusText: { fontSize: 8, fontWeight: 'bold' },
  deleteJobBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  jobDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  jobDetailText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  applicantsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#e2e8f0' },
  applicantsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  applicantsTitle: { fontSize: 12, fontWeight: 'bold', color: '#1e293b' },
  viewApplicantsText: { fontSize: 11, color: '#0035a0', fontWeight: '600' },
  noApplicantsText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  jobVerifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 8 },
  verifiedBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#166534', marginLeft: 4 },


  // Resume Builder Modal Styles
  fullScreenContainer: { flex: 1, backgroundColor: '#fdfdfd' },
  fullScreenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  fullScreenTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  fullScreenButtonContainer: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 20 },
  resumeForm: { flex: 1, width: '100%' },
  resumeFormContent: { paddingHorizontal: 20, paddingTop: 10 },
  sectionHeader: { marginTop: 20, marginBottom: 15 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0035a0', marginBottom: 10 },
  row: { flexDirection: 'row' },
  formGroup: { marginBottom: 15 },
  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 8 },
  formInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  textArea: { height: 100, textAlignVertical: 'top' },
  addButton: { backgroundColor: '#fee2e2', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  experienceCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  experienceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  experienceCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  removeButton: { backgroundColor: '#fee2e2', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyExperience: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 30, alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#e2e8f0' },
  emptyExperienceText: { fontSize: 16, fontWeight: 'bold', color: '#64748b', marginBottom: 5 },
  emptyExperienceSub: { fontSize: 13, color: '#94a3b8' },

  // Common Modal Styles
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 14, color: '#64748b', marginTop: 12 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#64748b', marginTop: 15 },
  emptySubText: { fontSize: 12, color: '#94a3b8', marginTop: 5 },

  // Pincode Suggestions and Chips Styles
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
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
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  chipRemoveBtn: {
    padding: 2,
  },
  targetTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 4,
  },
  targetTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#f8fafc',
  },
  targetTypeBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  targetTypeBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
  },
  targetTypeBtnTextActive: {
    color: 'white',
  },
  selectedAreaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f0f5fc',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginVertical: 4,
  },
  selectedAreaName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#8C1752',
  },
  selectedAreaSub: {
    fontSize: 12,
    color: '#0035a0',
    marginTop: 2,
  },
  clearAreaBtn: {
    padding: 4,
  },
  pricingSummaryCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 8,
    gap: 6,
  },
  pricingSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingSummaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  pricingSummaryValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  pricingTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 4,
  },
  pricingTotalLabel: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '900',
  },
  pricingTotalValue: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '900',
  },
  inlinePricingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    gap: 6,
  },
  inlinePricingText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500',
  },
  inlinePricingValue: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalFullScreenContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalFullScreenHeader: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalGradientHeaderEdit: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  modalHeaderProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatarContainer: {
    position: 'relative',
  },
  modalAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  modalAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'white',
  },
  modalAvatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalHeaderTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  modalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalProfileName: {
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
  },
  modalProfileSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '600',
  },
  modalStatusCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  modalStatusCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  modalStatusIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  modalStatusTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  modalStatusSub: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  modalDetailsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  modalDetailsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalDetailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f0f5fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  modalDetailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  modalEditDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalEditDetailsBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalAvatarSection: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 25,
  },
  modalAvatarContainer: {
    position: 'relative',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalAvatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#0035a0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  modalAvatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: 'white',
  },
  modalAvatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0035a0',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalUserTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 12,
  },
  modalUserSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  modalFormCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0f5fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inputIcon: {
    marginRight: 12,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalSaveBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalCancelBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalCancelBtnText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
    height: '100%',
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  myActivitiesSection: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
  },
  myActivitiesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 16,
  },
  myActivitiesList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
  },
  activityImage: {
    width: 60,
    height: 45,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  activityMeta: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    lineHeight: 14,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  emptyActivities: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyActivitiesText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
});