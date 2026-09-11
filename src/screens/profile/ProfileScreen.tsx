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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>({
    name: 'User Name',
    email: '',
    phone: '',
    verified: false
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const docSnap = await getDoc(doc(db, 'users', userId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profileData = {
          name: data.name || '',
          email: data.email || '',
          phone: data.phoneNumber || '',
          verified: Boolean(data.isVerified || data.tookVerification || data.hasVerificationBadge),
        };
        setProfile(profileData);
        setEditName(profileData.name);
        setEditPhone(profileData.phone);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName || !editPhone) {
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
        phoneNumber: editPhone
      });

      setProfile({ ...profile, name: editName, phone: editPhone });
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

  const menuItems = [
    { id: 'profile', label: 'My Profile', sub: 'Personal information and profile settings', icon: 'person-outline', color: '#3b82f6' },
    { id: 'apps', label: 'My Applications', sub: 'Track your job applications', icon: 'document-text-outline', color: '#3b82f6' },
    { id: 'alerts', label: 'Job Alerts', sub: 'Manage your job alert preferences', icon: 'notifications-outline', color: '#3b82f6' },
    { id: 'bookings', label: 'My Services Bookings', sub: 'View your service bookings and history', icon: 'briefcase-outline', color: '#3b82f6' },
    { id: 'wallet', label: 'Wallet', sub: 'Manage payments and transactions', icon: 'wallet-outline', color: '#3b82f6' },
    { id: 'settings', label: 'Settings & Privacy', sub: 'Account settings and privacy options', icon: 'shield-checkmark-outline', color: '#3b82f6' },
    { id: 'help', label: 'Help & Support', sub: 'Get help and contact support', icon: 'help-circle-outline', color: '#3b82f6', route: 'HelpSupport' },
    { id: 'privacy', label: 'Privacy Policy', sub: 'Read our privacy policy', icon: 'shield-checkmark-outline', color: '#3b82f6', route: 'PrivacyPolicy' },
    { id: 'terms', label: 'Terms & Conditions', sub: 'Read our terms of service', icon: 'document-text-outline', color: '#3b82f6', route: 'TermsConditions' },
  ];

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* Top App Bar */}
        <View style={styles.appBar}>
          <Text style={styles.logoText}>Meesent</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Profile Card */}
          <LinearGradient
            colors={['#dfe9ff', '#eef3ff', '#ffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Image
                  source={require('../../../assets/images/ir_logo.png')} // Fallback image or user image
                  style={styles.avatar}
                />
                <TouchableOpacity style={styles.editIconBadge}>
                  <Ionicons name="pencil" size={14} color="#3b82f6" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile.name}</Text>
                {profile.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="white" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
                <Text style={styles.profileSubText}>{profile.email}</Text>
                <Text style={styles.profileSubText}>{profile.phone}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setEditModalVisible(true)}
                style={styles.editBtn}
              >
                <Ionicons name="create-outline" size={16} color="#3b82f6" />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Quick Stats Row */}
          <View style={styles.statsRow}>
            <StatCard icon="briefcase" label="Jobs Applied" value="24" color="#3b82f6" />
            <StatCard icon="document-text" label="Applications" value="6" color="#34d399" />
            <StatCard icon="notifications" label="Alerts" value="3" color="#fbbf24" />
          </View>

          {/* Menu Items List */}
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => {
                  if (item.route) {
                    navigation.navigate(item.route);
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

            {/* Logout Item */}
            <TouchableOpacity onPress={handleLogout} style={[styles.menuItem, styles.logoutItem]}>
              <View style={styles.logoutIconWrapper}>
                <Ionicons name="log-out-outline" size={22} color="#3b82f6" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuLabel, { color: '#3b82f6' }]}>Logout</Text>
                <Text style={styles.menuSub}>Sign out from your account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close-circle" size={32} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#3b82f6" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter your name"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color="#3b82f6" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      placeholder="Enter phone number"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, updating && { opacity: 0.7 }]}
                  onPress={handleSaveProfile}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const StatCard = ({ icon, label, value, color }: any) => (
  <TouchableOpacity style={styles.statCard}>
    <View style={[styles.statIconWrapper, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  logoText: { fontSize: 28, fontWeight: '900', color: '#3b82f6', letterSpacing: -1 },
  appBarIcons: { flexDirection: 'row', gap: 15 },
  iconContainer: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  profileCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    marginTop: 5,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: '#f1f5f9' },
  editIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInfo: { marginLeft: 15, flex: 1 },
  profileName: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 6
  },
  verifiedText: { color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  profileSubText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  editBtn: {
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    position: 'absolute',
    top: -5,
    right: -5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editBtnText: { color: '#3b82f6', fontSize: 12, fontWeight: '900', marginLeft: 6 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 25,
    gap: 10
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrapper: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: 'bold', textAlign: 'center', marginTop: 2, textTransform: 'uppercase' },
  menuContainer: {
    marginTop: 25,
    marginHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 40
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  menuIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuTextContainer: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  menuSub: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  logoutItem: { borderBottomWidth: 0, marginTop: 10 },
  logoutIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
  },
  modalForm: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: 55,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
