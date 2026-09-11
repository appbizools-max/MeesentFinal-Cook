import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@services/firebase';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { PINCODES } from '../../data/pincodes';

export default function ProfileSetupScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const [detectedLocation, setDetectedLocation] = useState<any>(null);
  const [fullAddress, setFullAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser?.phoneNumber) {
      // Strip +91 prefix for cleaner presentation
      const formatted = currentUser.phoneNumber.replace('+91', '');
      setPhone(formatted);
    }
  }, []);

  const handlePincodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setPincode(cleaned);
    
    if (cleaned.length === 6) {
      const match = PINCODES.find(item => item.pincode === cleaned);
      if (match) {
        setDetectedLocation(match);
        setPincodeError('');
        // Automatically fill the address field with the matched location details
        setFullAddress(`${match.area}, ${match.city}, ${match.state}`);
      } else {
        setDetectedLocation(null);
        setPincodeError('Invalid or unsupported pincode');
      }
    } else {
      setDetectedLocation(null);
      if (cleaned.length > 0 && cleaned.length < 6) {
        setPincodeError('Pincode must be 6 digits');
      } else {
        setPincodeError('');
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!name || !pincode || pincode.length !== 6 || !detectedLocation || !fullAddress) {
      Toast.show({
        type: 'error',
        text1: t('profile_setup.required_fields'),
        text2: 'Please fill in name, valid 6-digit pincode, and full address.',
      });
      return;
    }

    setLoading(true);
    const userId = auth.currentUser?.uid;
    try {
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          name,
          email,
          phoneNumber: auth.currentUser?.phoneNumber || '',
          fullAddress,
          pincode,
          city: detectedLocation.city,
          state: detectedLocation.state,
          area: detectedLocation.area,
          location: `${detectedLocation.city}, ${detectedLocation.state}`,
          profileImage: '',
          profileCompleted: true,
          updatedAt: serverTimestamp(),
        });

        Toast.show({
          type: 'success',
          text1: t('profile_setup.profile_updated'),
          text2: t('profile_setup.account_ready'),
        });

        // Navigation to main app is handled by RootNavigator observing auth state
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: t('profile_setup.update_failed'),
        text2: error.message || t('profile_setup.something_wrong'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('profile_setup.complete_profile')}</Text>
          <Text style={styles.subtitle}>{t('profile_setup.tell_us_about_you')}</Text>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Full Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('profile_setup.full_name')} *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#3b82f6" style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('profile_setup.john_doe')}
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>{t('profile_setup.email_address')} (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#3b82f6" style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('profile_setup.john_email')}
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Mobile Number (Prefilled, read-only) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={[styles.inputWrapper, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="call-outline" size={20} color="#64748b" style={styles.fieldIcon} />
                <TextInput
                  style={[styles.input, { color: '#64748b' }]}
                  value={phone}
                  editable={false}
                />
              </View>
            </View>

            {/* Pincode (Mandatory) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Pincode *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="pin-outline" size={20} color="#3b82f6" style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 500001"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pincode}
                  onChangeText={handlePincodeChange}
                />
              </View>
              {detectedLocation && (
                <Text style={{ color: '#16a34a', fontSize: 12, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>
                  ✓ Located: {detectedLocation.area}, {detectedLocation.city}, {detectedLocation.state}
                </Text>
              )}
              {pincodeError ? (
                <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>
                  ⚠ {pincodeError}
                </Text>
              ) : null}
            </View>

            {/* Full Address */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Full Address (House No, Street, Landmark) *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="home-outline" size={20} color="#3b82f6" style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Flat 101, Malleshwaram Road"
                  placeholderTextColor="#94a3b8"
                  value={fullAddress}
                  onChangeText={setFullAddress}
                />
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={loading}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                {t('profile_setup.start_exploring')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 24,
  },
  formContainer: {
    marginBottom: 16,
    gap: 16,
  },
  fieldContainer: {
    position: 'relative',
  },
  label: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    backgroundColor: '#0035a0',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 14,
  },
});
