import React, { useState, useRef } from 'react';
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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { collection, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export default function ServicesSidebar({ visible, onClose, navigation }: SidebarProps) {
  const { t } = useTranslation();
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [profile, setProfile] = useState({ name: 'Guest User', email: 'Welcome to Messent' });
  const slideAnim = useRef(new Animated.Value(-width)).current;

  React.useEffect(() => {
    if (visible) {
      fetchProfile();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
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
          name: data.name || 'User Name',
          email: auth.currentUser?.email || 'user@example.com',
        });
      }
    } catch (error) {
      console.error("Error fetching sidebar profile:", error);
    }
  };

  const MenuItem = ({ icon, label, onPress, hasDropdown = false, expanded = false, children }: any) => (
    <View>
      <TouchableOpacity 
        onPress={onPress}
        style={styles.menuItem}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name={icon} size={22} color="#475569" />
          <Text style={styles.menuItemLabel}>{label}</Text>
        </View>
        {hasDropdown && (
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#94a3b8" />
        )}
      </TouchableOpacity>
      
      {hasDropdown && expanded && (
        <View style={styles.dropdownContainer}>
          {children}
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
          <SafeAreaView style={styles.safeArea}>
            {/* Sidebar Header - Profile */}
            <View style={styles.header}>
              <View style={styles.profileInfo}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={30} color="white" />
                </View>
                <View>
                  <Text style={styles.userName}>{profile.name}</Text>
                  <Text style={styles.userEmail}>{profile.email}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
              <MenuItem
                icon="home-outline"
                label={t('navigation.home')}
                onPress={() => {
                  onClose();
                  navigation.navigate('ServicesTabs', { screen: 'HomeTab' });
                }}
              />

              <MenuItem
                icon="grid-outline"
                label={t('sidebar.all_services')}
                onPress={() => {
                  onClose();
                  const parentNav = navigation.getParent();
                  if (parentNav) {
                    parentNav.navigate('ServicesList', { category: 'All' });
                  } else {
                    navigation.navigate('ServicesList', { category: 'All' });
                  }
                }}
              />

              <MenuItem
                icon="basket-outline"
                label={t('sidebar.shop_products')}
                onPress={() => {
                  onClose();
                  const parentNav = navigation.getParent();
                  if (parentNav) {
                    parentNav.navigate('ProductsList', { category: 'All' });
                  } else {
                    navigation.navigate('ProductsList', { category: 'All' });
                  }
                }}
              />

              <View style={styles.divider} />

              <MenuItem 
                icon="help-circle-outline" 
                label={t('sidebar.help_support')} 
                onPress={() => {}} 
              />
              
              <MenuItem 
                icon="document-text-outline" 
                label={t('sidebar.terms_conditions')} 
                onPress={() => {}} 
              />
              
              <MenuItem 
                icon="shield-checkmark-outline" 
                label={t('sidebar.privacy_policy')} 
                onPress={() => {}} 
              />

              <MenuItem 
                icon="language-outline" 
                label={t('sidebar.change_language')} 
                onPress={() => { onClose(); navigation.navigate('Language'); }} 
              />

              <View style={styles.spacer} />
            </ScrollView>

            <View style={styles.footer}>
              <Text style={styles.versionText}>{t('sidebar.version')} {Constants.expoConfig?.version || '1.1.8'}</Text>
              <Text style={styles.footerBrand}>Messent Services</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarContainer: {
    width: width * 0.8,
    height: '100%',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileInfo: {
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0035a0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  userEmail: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  dropdownContainer: {
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 64,
    gap: 12,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
    marginHorizontal: 24,
  },
  spacer: {
    height: 40,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  footerBrand: {
    fontSize: 12,
    color: '#0035a0',
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1,
  },
});
