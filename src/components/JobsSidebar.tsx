import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export default function JobsSidebar({ visible, onClose, navigation }: SidebarProps) {
  const { t } = useTranslation();
  const [jobsExpanded, setJobsExpanded] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Guest User',
    email: 'user@example.com',
    isVerified: true
  });
  const slideAnim = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    if (visible) {
      fetchProfile();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const docSnap = await getDoc(doc(db, 'users', userId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          name: data.name || 'Store1',
          email: auth.currentUser?.email || 'user@example.com',
          isVerified: data.isVerified !== false
        });
      }
    } catch (error) {
      console.error("Error fetching sidebar profile:", error);
    }
  };

  const handleLogout = async () => {
    try {
      onClose();
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const MenuItem = ({ icon, label, onPress, hasDropdown = false, expanded = false, isActive = false }: any) => (
    <View>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons
            name={icon}
            size={20}
            color={isActive ? "#0035a0" : "#475569"}
          />
          <Text style={[styles.menuItemLabel, isActive && styles.menuItemLabelActive]}>
            {label}
          </Text>
        </View>
        {hasDropdown && (
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
        )}
      </TouchableOpacity>

      {hasDropdown && expanded && (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => { onClose(); navigation.navigate('JobsTabs', { screen: 'Jobs', params: { category: 'State Govt' } }); }}
          >
            <View style={styles.dropdownBullet} />
            <Text style={styles.dropdownLabel}>{t('sidebar.state_govt_jobs')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => { onClose(); navigation.navigate('JobsTabs', { screen: 'Jobs', params: { category: 'Central Govt' } }); }}
          >
            <View style={styles.dropdownBullet} />
            <Text style={styles.dropdownLabel}>{t('sidebar.central_govt_jobs')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => { onClose(); navigation.navigate('JobsTabs', { screen: 'Jobs', params: { category: 'Private Jobs' } }); }}
          >
            <View style={styles.dropdownBullet} />
            <Text style={styles.dropdownLabel}>{t('sidebar.private_jobs')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.sidebarContainer,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: 'white' }}>
            {/* Header Profile Section - Compact & Elegant */}
            <View style={styles.headerProfileSection}>
              <View style={styles.headerTopRow}>
                <TouchableOpacity
                  style={styles.profileAvatarCircle}
                  onPress={() => { onClose(); navigation.navigate('Profile'); }}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarInner}>
                    <Ionicons name="person" size={26} color="#0035a0" />
                  </View>
                  <View style={styles.activeIndicatorDot} />
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close-outline" size={22} color="#475569" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileMetaInfo}>
                <Text style={styles.profileNameText} numberOfLines={1}>{profile.name}</Text>
                <Text style={styles.profileEmailText} numberOfLines={1}>{profile.email}</Text>
                {profile.isVerified && (
                  <View style={styles.verifiedBadgeRow}>
                    <MaterialCommunityIcons name="shield-check" size={14} color="#0035a0" />
                    <Text style={styles.verifiedBadgeText}>{t('sidebar.verified_account')}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.horizontalDivider} />

            <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.menuSection}>
                <MenuItem
                  icon="home-outline"
                  label={t('navigation.home')}
                  isActive={true}
                  onPress={() => { onClose(); navigation.navigate('JobsTabs', { screen: 'Home' }); }}
                />

                <MenuItem
                  icon="briefcase-outline"
                  label={t('navigation.jobs')}
                  hasDropdown
                  expanded={jobsExpanded}
                  onPress={() => setJobsExpanded(!jobsExpanded)}
                />
              </View>

              <View style={styles.horizontalDivider} />

              <View style={styles.menuSection}>
                <MenuItem
                  icon="headset-outline"
                  label={t('sidebar.help_support')}
                  onPress={() => { onClose(); navigation.navigate('HelpSupport'); }}
                />

                <MenuItem
                  icon="document-text-outline"
                  label={t('sidebar.terms_conditions')}
                  onPress={() => { onClose(); navigation.navigate('TermsConditions'); }}
                />

                <MenuItem
                  icon="shield-checkmark-outline"
                  label={t('sidebar.privacy_policy')}
                  onPress={() => { onClose(); navigation.navigate('PrivacyPolicy'); }}
                />

                <MenuItem
                  icon="information-circle-outline"
                  label={t('sidebar.about_us')}
                  onPress={() => { onClose(); }}
                />

                <MenuItem
                  icon="language-outline"
                  label={t('sidebar.change_language')}
                  onPress={() => { onClose(); navigation.navigate('Language'); }}
                />
              </View>



            </ScrollView>

            {/* Bottom Section - Logout & Footer */}
            <View style={styles.sidebarBottomArea}>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={styles.logoutText}>{t('sidebar.logout')}</Text>
              </TouchableOpacity>

              <View style={styles.footerContainer}>
                <Text style={styles.versionText}>{t('sidebar.version')} {Constants.expoConfig?.version || '1.1.8'}</Text>
                <Text style={styles.brandText}>Messent App</Text>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  sidebarContainer: {
    width: width * 0.80,
    height: '100%',
    backgroundColor: 'white',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  headerProfileSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 1.5,
    backgroundColor: 'white',
    position: 'relative',
  },
  avatarInner: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicatorDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: 'white',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMetaInfo: {
    marginTop: 4,
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  profileEmailText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f5fc',
    borderWidth: 1,
    borderColor: '#9dbff2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0035a0',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
    marginVertical: 4,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 8,
  },
  menuSection: {
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: '#f0f5fc',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  menuItemLabelActive: {
    color: '#0035a0',
    fontWeight: '800',
  },
  dropdownContainer: {
    paddingLeft: 40,
    paddingBottom: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  dropdownBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#94a3b8',
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  upgradeCardWrapper: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  premiumCardContainer: {
    borderRadius: 16,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  sparkleOverlay: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  premiumCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  premiumBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: 'white',
  },
  premiumCardSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 1,
  },
  premiumCardBtn: {
    backgroundColor: '#fbbf24',
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumCardBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 6,
  },
  footerContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  sidebarBottomArea: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  versionText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  brandText: {
    fontSize: 12,
    color: '#0035a0',
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
