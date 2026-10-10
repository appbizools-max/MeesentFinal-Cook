// UI Refined - Footer Overhaul
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { db, auth, storage } from '../../services/firebase';
import { doc, updateDoc, increment, onSnapshot, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import RazorpayCheckout from 'react-native-razorpay';
import { RAZORPAY_CONFIG } from '../../config/razorpay';

const renderRichText = (text: string) => {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();

    // Check if bullet point
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('-');

    // Check if numbered list (starts with digit and a dot, e.g. "1.")
    const numberMatch = trimmed.match(/^(\d+)\./);
    const isNumbered = !!numberMatch;

    const displayLine = isBullet
      ? trimmed.replace(/^[\s•*-]+/, '')
      : isNumbered
        ? trimmed.replace(/^[\s\d+.-]+/, '')
        : line;

    const elements: React.ReactNode[] = [];
    let currentText = displayLine;
    let keyCounter = 0;

    // Tokenize bold tags and links
    const tokenRegex = /(<b>.*?<\/b>|<strong>.*?<\/strong>|\*\*.*?\*\*|\[.*?\]\(https?:\/\/[^\s)]+\)|<a\s+href=["']https?:\/\/[^"']+["']>.*?<\/a>)/g;
    const parts = currentText.split(tokenRegex);

    parts.forEach((part) => {
      if (!part) return;

      // Bold text
      const partLower = part.toLowerCase().trim();
      if (
        (partLower.startsWith('<b>') && partLower.endsWith('</b>')) ||
        (partLower.startsWith('<strong>') && partLower.endsWith('</strong>')) ||
        (part.startsWith('**') && part.endsWith('**'))
      ) {
        let boldContent = '';
        if (partLower.startsWith('<b>')) boldContent = part.slice(part.indexOf('>') + 1, part.lastIndexOf('<'));
        else if (partLower.startsWith('<strong>')) boldContent = part.slice(part.indexOf('>') + 1, part.lastIndexOf('<'));
        else boldContent = part.slice(2, -2);

        elements.push(
          <Text key={`bold-${lineIdx}-${keyCounter++}`} style={{ fontWeight: 'bold' }}>
            {boldContent}
          </Text>
        );
      }
      // Hyperlink
      else if (
        (part.startsWith('[') && part.includes('](')) ||
        (part.startsWith('<a ') && part.includes('href='))
      ) {
        let label = '';
        let url = '';

        if (part.startsWith('[')) {
          const closeBracketIdx = part.indexOf(']');
          label = part.slice(1, closeBracketIdx);
          url = part.slice(closeBracketIdx + 2, -1);
        } else {
          const hrefMatch = part.match(/href=["'](https?:\/\/[^"']+)["']/);
          url = hrefMatch ? hrefMatch[1] : '';
          const labelMatch = part.match(/>([^<]+)<\/a>/);
          label = labelMatch ? labelMatch[1] : url;
        }

        elements.push(
          <Text
            key={`link-${lineIdx}-${keyCounter++}`}
            style={{ color: '#2563EB', textDecorationLine: 'underline', fontWeight: '700' }}
            onPress={() => {
              if (url) {
                Linking.openURL(url).catch((err) =>
                  console.error('Failed to open link:', err)
                );
              }
            }}
          >
            {label}
          </Text>
        );
      }
      // Plain text
      else {
        elements.push(
          <Text key={`text-${lineIdx}-${keyCounter++}`}>
            {part}
          </Text>
        );
      }
    });

    if (isBullet || isNumbered) {
      const marker = isBullet ? '•' : `${numberMatch[1]}.`;
      return (
        <View key={`line-${lineIdx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 6, marginVertical: 2 }}>
          <Text style={{ fontSize: 13, marginRight: 6, color: '#334155', fontWeight: 'bold' }}>{marker}</Text>
          <Text style={{ flex: 1, fontSize: 13, color: '#334155', lineHeight: 19 }}>
            {elements}
          </Text>
        </View>
      );
    }

    return (
      <Text key={`line-${lineIdx}`} style={{ fontSize: 13, color: '#334155', lineHeight: 19, marginVertical: 2 }}>
        {elements}
      </Text>
    );
  });
};

const JobDetailScreen = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { jobId } = route.params as { jobId: string };
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState(t('job_detail.job_details_tab'));
  const [imageLoaded, setImageLoaded] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [seekerPlanActive, setSeekerPlanActive] = useState<boolean>(false);
  const [seekerPlanExpiry, setSeekerPlanExpiry] = useState<any>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('monthly');
  const [passPrices, setPassPrices] = useState({
    weekly: 99,
    monthly: 299,
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Recently';
    }
  };

  const getSkillsList = () => {
    if (job?.skills) {
      return job.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    const titleLower = (job?.title || '').toLowerCase();
    if (titleLower.includes('developer') || titleLower.includes('software') || titleLower.includes('it') || titleLower.includes('coder') || titleLower.includes('programmer')) {
      return ['Software Development', 'Programming', 'Problem Solving', 'Computer Literacy', 'IT Support'];
    }
    if (titleLower.includes('driver') || titleLower.includes('cab') || titleLower.includes('auto')) {
      return ['Driving License', 'Route Navigation', 'Road Safety', 'Time Management', 'Vehicle Maintenance'];
    }
    if (titleLower.includes('delivery') || titleLower.includes('courier')) {
      return ['Delivery Operations', 'Punctuality', 'Customer Relations', 'Map Reading', 'Time Management'];
    }
    if (titleLower.includes('sales') || titleLower.includes('marketing') || titleLower.includes('tele') || titleLower.includes('retail')) {
      return ['Sales Pitching', 'Communication', 'Customer Relationship (CRM)', 'Negotiation', 'Customer Service'];
    }
    if (titleLower.includes('nurse') || titleLower.includes('doctor') || titleLower.includes('clinic') || titleLower.includes('medical') || titleLower.includes('health')) {
      return ['Patient Care', 'Medical Knowledge', 'Communication', 'First Aid', 'Patient Relations'];
    }
    return ['Communication Skills', 'Punctuality', 'Problem Solving', 'Team Work', 'Basic Computer Skills'];
  };

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    const userId = auth.currentUser?.uid;

    // Set up real-time listener for job details
    const unsubscribe = onSnapshot(doc(db, 'jobs', jobId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setJob({ id: doc.id, ...data });
      } else {
        console.warn("Job document does not exist");
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to job details:", error);
      setLoading(false);
    });

    // Check if Saved
    let unsubscribeSaved = () => { };
    if (userId) {
      const qSaved = query(collection(db, 'saved_jobs'), where('userId', '==', userId), where('jobId', '==', jobId));
      unsubscribeSaved = onSnapshot(qSaved, (snapshot) => {
        setIsSaved(snapshot && !snapshot.empty);
      });
    }

    // Check if Favorite
    let unsubscribeFav = () => { };
    if (userId) {
      const qFav = query(collection(db, 'favorite_jobs'), where('userId', '==', userId), where('jobId', '==', jobId));
      unsubscribeFav = onSnapshot(qFav, (snapshot) => {
        setIsFavorite(snapshot && !snapshot.empty);
      });
    }

    // Check if already applied / uploaded resume
    let unsubscribeApp = () => { };
    if (userId) {
      const qApp = query(collection(db, 'job_applications'), where('userId', '==', userId), where('jobId', '==', jobId));
      unsubscribeApp = onSnapshot(qApp, (snapshot) => {
        if (snapshot && !snapshot.empty) {
          const appDoc = snapshot.docs[0].data();
          setHasApplied(true);
          setResumeUrl(appDoc.resumeUrl || null);
        } else {
          setHasApplied(false);
          setResumeUrl(null);
        }
      });
    }

    // Fetch user details from Firestore in real-time
    let unsubscribeUser = () => { };
    if (userId) {
      unsubscribeUser = onSnapshot(doc(db, 'users', userId), (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSeekerPlanActive(data?.seekerPlanActive || false);
          setSeekerPlanExpiry(data?.seekerPlanExpiry || null);
        }
      }, (error) => {
        console.error('Error listening to user doc in JobDetailScreen:', error);
      });
    }

    // Dynamic pricing listener for weekly/monthly seeker passes
    const unsubPricing = onSnapshot(doc(db, 'config', 'service_pricing'), (pricingDoc) => {
      if (pricingDoc.exists()) {
        const pData = pricingDoc.data();
        setPassPrices({
          weekly: pData.jobSeekerWeeklyPassPrice ?? pData.jobSeekerPass?.weekly ?? 99,
          monthly: pData.jobSeekerMonthlyPassPrice ?? pData.jobSeekerPass?.monthly ?? 299,
        });
      }
    }, (err) => console.warn('Dynamic pricing fetch error in JobDetailScreen:', err));

    // Increment View Count (one-time action)
    const updateViewCount = async () => {
      try {
        await updateDoc(doc(db, 'jobs', jobId), { viewCount: increment(1) });
      } catch (err) {
        console.warn("View count increment failed", err);
      }
    };
    updateViewCount();

    return () => {
      unsubscribe();
      unsubscribeSaved();
      unsubscribeFav();
      unsubscribeApp();
      unsubscribeUser();
      unsubPricing();
    };
  }, [jobId]);

  const toggleSave = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      if (isSaved) {
        // Remove
        const q = query(collection(db, 'saved_jobs'), where('userId', '==', userId), where('jobId', '==', jobId));
        const snap = await getDocs(q);
        snap.forEach(async (d) => await deleteDoc(d.ref));
      } else {
        // Add
        await addDoc(collection(db, 'saved_jobs'), {
          userId,
          jobId,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Toggle save error:", error);
    }
  };

  const handleShare = async () => {
    if (!job) return;
    try {
      const playStoreUrl = `https://play.google.com/store/apps/details?id=com.messent.app&hl=en_IN`;
      const titleText = job.title || 'Job Opening';
      const companyText = job.company ? `\n🏢 Company: ${job.company}` : '';
      const salaryText = job.salary ? `\n💰 Salary: ₹${job.salary}` : '';
      const locationText = job.location ? `\n📍 Location: ${job.location}` : '';

      const shareContent = `💼 Job Title: ${titleText}${companyText}${salaryText}${locationText}\n\n📲 Apply now on Messent App:\n${playStoreUrl}`;

      await Share.share({
        message: shareContent,
        title: titleText,
        url: playStoreUrl,
      });
    } catch (error) {
      console.error("Error sharing job:", error);
    }
  };

  const toggleFavorite = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      if (isFavorite) {
        // Remove
        const q = query(collection(db, 'favorite_jobs'), where('userId', '==', userId), where('jobId', '==', jobId));
        const snap = await getDocs(q);
        snap.forEach(async (d) => await deleteDoc(d.ref));
      } else {
        // Add
        await addDoc(collection(db, 'favorite_jobs'), {
          userId,
          jobId,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Toggle favorite error:", error);
    }
  };
  const handleApply = async () => {
    if (!job) return;
    const userId = auth.currentUser?.uid;
    if (userId) {
      // Track application
      try {
        const q = query(collection(db, 'job_applications'), where('userId', '==', userId), where('jobId', '==', jobId));
        const snap = await getDocs(q);
        if (!snap || snap.empty) {
          await addDoc(collection(db, 'job_applications'), {
            userId,
            jobId,
            company: job.company,
            title: job.title,
            appliedVia: 'WhatsApp',
            status: 'Applied',
            createdAt: serverTimestamp()
          });
        }
      } catch (err) {
        console.warn("Failed to track application in Firestore:", err);
      }
    }
    try {
      await updateDoc(doc(db, 'jobs', jobId), { whatsappClicks: increment(1) });
    } catch (e) {
      console.warn("Failed to increment whatsapp clicks:", e);
    }
    const rawPhoneNumber = job.whatsappNumber || job.contactNumber || '';
    const formattedPhone = rawPhoneNumber.replace(/\D/g, '');
    const phoneNumber = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone;
    const message = `Hello, I'm interested in the "${job.title}" position at ${job.company}.`;
    try {
      if (phoneNumber) {
        const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
        await Linking.openURL(url);
      } else if (job.applyLink) {
        await Linking.openURL(job.applyLink);
      } else {
        Alert.alert('No Contact', 'No WhatsApp number or apply link is available for this job.');
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      Alert.alert('Error', 'Could not open WhatsApp. Please make sure WhatsApp is installed.');
    }
  };

  const handleCall = async () => {
    if (!job) return;

    const userId = auth.currentUser?.uid;
    if (userId) {
      // Track application
      try {
        const q = query(collection(db, 'job_applications'), where('userId', '==', userId), where('jobId', '==', jobId));
        const snap = await getDocs(q);
        if (!snap || snap.empty) {
          await addDoc(collection(db, 'job_applications'), {
            userId,
            jobId,
            company: job.company,
            title: job.title,
            appliedVia: 'Call',
            status: 'Applied',
            createdAt: serverTimestamp()
          });
        }
      } catch (err) {
        console.warn("Failed to track call application in Firestore:", err);
      }
    }

    try {
      await updateDoc(doc(db, 'jobs', jobId), { callClicks: increment(1) });
    } catch (e) {
      console.warn("Failed to increment call clicks:", e);
    }
    const phoneNumber = job.contactNumber || '';
    try {
      if (phoneNumber) {
        await Linking.openURL(`tel:${phoneNumber}`);
      } else {
        Alert.alert('No Contact', 'No contact number is available for this job.');
      }
    } catch (error) {
      console.error("Error opening phone:", error);
      Alert.alert('Error', 'Could not initiate the call. Please try again.');
    }
  };

  const handleUploadResume = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Login Required', 'Please log in to apply for jobs.');
      return;
    }

    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your gallery to upload a resume image.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setResumeUploading(true);
      const uri = result.assets[0].uri;

      // Convert image URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to storage
      const filename = `resumes/${userId}/${jobId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);

      // Save/Update job application doc
      const q = query(
        collection(db, 'job_applications'),
        where('userId', '==', userId),
        where('jobId', '==', jobId)
      );
      const snap = await getDocs(q);

      if (!snap || snap.empty) {
        await addDoc(collection(db, 'job_applications'), {
          userId,
          jobId,
          company: job.company,
          title: job.title,
          appliedVia: 'Resume',
          resumeUrl: downloadUrl,
          status: 'Applied',
          createdAt: serverTimestamp(),
        });
      } else {
        const appDocRef = snap.docs[0].ref;
        await updateDoc(appDocRef, {
          resumeUrl: downloadUrl,
          appliedVia: 'Resume',
          status: 'Applied',
          updatedAt: serverTimestamp(),
        });
      }

      setResumeUrl(downloadUrl);
      Alert.alert('Success', 'Your resume has been uploaded successfully!');
    } catch (error) {
      console.error('Error uploading resume:', error);
      Alert.alert('Error', 'Failed to upload resume. Please try again.');
    } finally {
      setResumeUploading(false);
    }
  };

  const onShare = handleShare;

  if (loading) return (
    <View style={styles.loaderContainer}><ActivityIndicator size="large" color="#0035a0" /></View>
  );

  if (!job) return (
    <View style={styles.errorContainer}><Text>Job not found</Text></View>
  );

  const isPremium = seekerPlanActive && seekerPlanExpiry && (seekerPlanExpiry.toDate ? seekerPlanExpiry.toDate() : new Date(seekerPlanExpiry)) > new Date();

  // Salary Gate: Monthly salary >= 20,000
  const isSalaryOver20k = () => {
    if (!job || !job.salary) return false;
    try {
      const cleanString = job.salary.toString().replace(/[^0-9]/g, '');
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
          // Simulated success for development testing
          paymentId = `pay_sim_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
        } else {
          Alert.alert('Payment Failed', 'Payment was cancelled or failed.');
          setPayLoading(false);
          return;
        }
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      // Save payment
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

      // Update user details
      await updateDoc(doc(db, 'users', userId), {
        seekerPlan: days === 7 ? 'weekly' : 'monthly',
        seekerPlanExpiry: expiryDate,
        seekerPlanActive: true,
        seekerPlanUpdatedAt: serverTimestamp(),
      });

      Alert.alert("Success", `Premium Seeker plan activated for ${days} days!`);
    } catch (error: any) {
      console.error("Error activating premium:", error);
      Alert.alert("Error", "Could not upgrade your account: " + error.message);
    } finally {
      setPayLoading(false);
    }
  };
  const renderBullets = (text: string, fallbackText: string) => {
    const rawText = text || fallbackText;
    if (!rawText) return null;
    return rawText.split('\n').map((line) => line.trim()).filter(Boolean).map((line, i) => (
      <View key={i} style={styles.bulletItemRow}>
        <Ionicons name="checkmark-circle" size={16} color="#2563EB" style={styles.bulletCheckIcon} />
        <Text style={styles.bulletDescriptionText}>{line.replace(/^[•\-\*\s]+/, '')}</Text>
      </View>
    ));
  };

  const defaultOverview = "We are looking for a talented professional to join our dynamic team and create exceptional experiences. You will be responsible for executing key deliverables and collaborating across teams to implement solutions.";
  const defaultResponsibilities = "Take ownership of end-to-end task execution and delivery.\nCollaborate with cross-functional teams to implement design solutions.\nIdentify process improvements and optimize workflows for enhanced performance.\nMaintain high-quality standards and comprehensive documentation.";
  const defaultRequirements = "1-3 years of professional experience in a similar role.\nProficiency in industry-standard tools and methodologies.\nStrong problem-solving, communication, and collaboration skills.\nAbility to adapt in a fast-paced team environment.";

  const benefitsList = [
    { label: 'Health Insurance', icon: 'heart' },
    { label: 'Flexible Work', icon: 'sync-circle' },
    { label: 'Paid Time Off', icon: 'briefcase' },
    { label: 'Learning Budget', icon: 'book' },
    { label: 'Performance Bonus', icon: 'gift' },
    { label: 'Work from Home', icon: 'home' }
  ];

  const currentUserId = auth.currentUser?.uid;
  const isJobOwner = Boolean(
    currentUserId && (
      job?.userId === currentUserId ||
      job?.postedBy === currentUserId ||
      job?.createdBy === currentUserId ||
      job?.employerId === currentUserId
    )
  );

  const isLocked = (job?.isUrgentHiring || isSalaryOver20k()) && !isPremium && !isJobOwner;

  if (isLocked) {
    return (
      <View style={styles.popupOverlay}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(15, 23, 42, 0.5)" />
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
                    ? `This job offers a high-paying salary of ${job.salary}. Unlock direct calls and WhatsApp contact to apply.`
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
                style={{
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
                }}
                onPress={() => {
                  if (selectedPlanId === 'weekly') {
                    activatePremium(7, passPrices.weekly, 'Weekly Pass');
                  } else {
                    activatePremium(30, passPrices.monthly, 'Monthly Pass');
                  }
                }}
              >
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '900' }}>
                  {selectedPlanId === 'weekly' ? `Pay ₹${passPrices.weekly} & Unlock` : `Pay ₹${passPrices.monthly} & Unlock`}
                </Text>
              </TouchableOpacity>

              {/* Go Back Trigger */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.popupCloseBtn}
              >
                <Text style={styles.popupCloseText}>Go Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Corporate Header Nav */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Job Details</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={onShare}>
            <Ionicons name="share-social-outline" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 + insets.bottom }} style={{ backgroundColor: '#FFF' }}>

        <View style={[styles.topJobHeader, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={[styles.headerLeftCol, { paddingRight: 0, width: '100%' }]}>
            {/* Job Type Badge */}
            <View style={styles.jobTypeBadge}>
              <Text style={styles.jobTypeBadgeText}>
                {job.jobType || job.type || "Full Time"}
              </Text>
            </View>
            {/* Job Title */}
            <Text style={styles.jobTitleText}>{job.title || "UI/UX Designer"}</Text>
            {/* Company Info */}
            <View style={styles.companyRow}>
              <Text style={styles.companyNameText}>{job.company || "TechNova Solutions"}</Text>
              {(job.isGenuineVerified || job.hasVerificationBadge || job.isVerified || job.verificationStatus === 'verified') ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#a7f3d0', marginLeft: 6 }}>
                  <Ionicons name="shield-checkmark" size={12} color="#059669" style={{ marginRight: 3 }} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669', letterSpacing: 0.5 }}>GENUINE VERIFIED</Text>
                </View>
              ) : (
                <MaterialCommunityIcons name="check-decagram" size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
              )}
            </View>
          </View>

          {/* Header Action Buttons (mockup style) */}
          <View style={[styles.headerRightCol, { marginTop: 12, justifyContent: 'flex-start', alignSelf: 'flex-start' }]}>
            <TouchableOpacity style={styles.saveBadgeBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={14} color="#2563EB" />
              <Text style={styles.saveBadgeText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.applyBadgeBtn,
                hasApplied && { backgroundColor: '#16a34a', shadowColor: '#16a34a' }
              ]}
              onPress={handleApply}
              disabled={hasApplied}
            >
              {hasApplied ? (
                <Ionicons name="checkmark-circle" size={12} color="#FFF" style={{ marginRight: 2 }} />
              ) : (
                <FontAwesome5 name="paper-plane" size={11} color="#FFF" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.applyBadgeText}>{hasApplied ? "Applied" : "Apply Now"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Inline Highlights row (mockup style) */}
        <View style={styles.inlineHighlightsRow}>
          <View style={styles.inlineHighlightItem}>
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text style={styles.inlineHighlightText}>{job.location || "Bangalore, India"}</Text>
          </View>
          <View style={styles.inlineHighlightItem}>
            <Ionicons name="briefcase-outline" size={14} color="#64748B" />
            <Text style={styles.inlineHighlightText}>{job.experience || "3-5 Years"}</Text>
          </View>
          <View style={styles.inlineHighlightItem}>
            <Ionicons name="wallet-outline" size={14} color="#64748B" />
            <Text style={styles.inlineHighlightText}>{job.salary || "₹ 6 - 10 LPA"}</Text>
          </View>
          {job.vacancies ? (
            <View style={styles.inlineHighlightItem}>
              <Ionicons name="people-outline" size={14} color="#64748B" />
              <Text style={styles.inlineHighlightText}>
                {job.vacancies} {job.vacancies === 1 ? 'Vacancy' : 'Vacancies'}
              </Text>
            </View>
          ) : null}
          <View style={styles.inlineHighlightItem}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.inlineHighlightText}>Posted recently</Text>
          </View>
        </View>

        {/* Full Address Highlight Box right below Posted Recently */}
        {job.address ? (
          <View style={{ paddingHorizontal: 20, marginTop: 12, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', gap: 8 }}>
              <Ionicons name="location-sharp" size={18} color="#2563EB" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                  Full Job Address / Location
                </Text>
                <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '600', lineHeight: 19 }}>
                  {job.address}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Job Overview */}
        <View style={styles.flatSectionBlock}>
          <Text style={styles.flatSectionHeader}>Job Overview / Description</Text>
          <View style={{ gap: 4, marginTop: 4 }}>
            {renderRichText(job.description || defaultOverview)}
          </View>
        </View>

        {/* Qualifications & Requirements */}
        <View style={styles.flatSectionBlock}>
          <Text style={styles.flatSectionHeader}>Qualifications & Requirements</Text>
          {job.qualification ? (
            <View style={{ gap: 4, marginTop: 4 }}>
              {renderRichText(job.qualification)}
            </View>
          ) : (
            renderBullets(job.requirements, defaultRequirements)
          )}
        </View>

        {/* Government App Disclaimer Box */}
        <View style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 10 }}>
          <View style={{
            backgroundColor: '#FEF2F2',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: '#FECACA',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
              <Ionicons name="information-circle-outline" size={18} color="#991B1B" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#991B1B' }}>
                Important Disclaimer
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 17, fontWeight: '500' }}>
              MEESENT is not an official government app and has no government affiliation. Job info is gathered from public official portals. Please verify details on official websites before applying.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* Action Footer for Calls, WhatsApp, and Resume uploads */}
      <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>

        {/* Upload Resume Box (LinkedIn/Naukri style inline bar) */}
        <View style={styles.resumeRowContainer}>
          {resumeUploading ? (
            <View style={styles.resumeLoadingBox}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.resumeLoadingText}>Uploading resume...</Text>
            </View>
          ) : resumeUrl ? (
            <View style={styles.resumeSuccessBox}>
              <Ionicons name="checkmark-done-circle" size={18} color="#059669" />
              <Text style={styles.resumeSuccessText}>Resume attached successfully</Text>
              <TouchableOpacity onPress={handleUploadResume}>
                <Text style={styles.resumeChangeLink}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resumeUploadBox}>
              <Ionicons name="document-text-outline" size={18} color="#64748B" />
              <Text style={styles.resumeUploadText}>Attach your resume to apply</Text>
              <TouchableOpacity onPress={handleUploadResume}>
                <Text style={styles.resumeUploadLink}>Upload</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons (Call HR / WhatsApp) */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={[styles.contactBtn, styles.callHrBtn]} onPress={handleCall}>
            <Ionicons name="call" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.contactBtnText}>Call HR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.contactBtn, styles.whatsappBtn]} onPress={handleApply}>
            <FontAwesome5 name="whatsapp" size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.contactBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1, marginLeft: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerActionBtn: { padding: 4 },

  // Top Header Area (with badge, title, company, save/apply buttons)
  topJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerLeftCol: {
    flex: 1,
    paddingRight: 12,
  },
  jobTypeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  jobTypeBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  jobTitleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 28,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  companyNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  saveBadgeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  applyBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  applyBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Highlights row (Location, Experience, Salary, Posted Date)
  inlineHighlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inlineHighlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineHighlightText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  // Flat Minimal Sections
  flatSectionBlock: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  flatSectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  flatSectionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontWeight: '500',
  },

  // Bullet items (responsibilities and requirements)
  bulletItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 10,
  },
  bulletCheckIcon: {
    marginTop: 3,
    marginRight: 8,
  },
  bulletDescriptionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontWeight: '500',
  },

  // Benefits
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  benefitPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },

  // About Company links
  viewCompanyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  viewCompanyLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },

  // Footer Actions
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 20,
  },
  resumeRowContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resumeUploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeUploadText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 8,
  },
  resumeUploadLink: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '800',
  },
  resumeSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 2,
  },
  resumeSuccessText: {
    flex: 1,
    fontSize: 13,
    color: '#047857',
    fontWeight: '700',
    marginLeft: 8,
  },
  resumeChangeLink: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '800',
  },
  resumeLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resumeLoadingText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  footerRow: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    flex: 0.5,
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callHrBtn: { backgroundColor: '#2563EB' },
  whatsappBtn: { backgroundColor: '#10B981' },
  contactBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },

  // ─── Modal Popup Gating Styles ──────────────────────────────────────────────
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)', // Semi-transparent overlay to show home screen behind it
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupContent: {
    width: '90%', // Reduced popup card size
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

export default JobDetailScreen;
