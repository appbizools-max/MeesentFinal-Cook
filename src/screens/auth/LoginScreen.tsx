import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import authService from '@services/auth.service';
import app from '@services/firebase';
import { useTranslation } from 'react-i18next';
export default function LoginScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaVerifier = useRef<any>(null);

  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      // ReCAPTCHA is removed, passing null or a mock if needed by the service
      const confirmation = await authService.sendOTP(`+91${phoneNumber}`, null);
      authService.setConfirmationResult(confirmation);



      navigation.navigate('OTP', {
        phoneNumber: `+91${phoneNumber}`,
      });
    } catch (error: any) {
      console.error('LoginScreen handleSendOTP error:', error);
      const errorMessage = error.message || 'Failed to send OTP';
      const errorCode = error.code || '';
      if (errorCode === 'auth/too-many-requests' || errorMessage.includes('too-many-requests')) {
        Alert.alert(
          "Too Many Attempts",
          "You have reached the security limit (up to 5 OTPs allowed). Please try again after some time.",
          [{ text: "OK" }]
        );
      } else if (errorCode === 'auth/app-not-authorized') {
        Alert.alert(
          "App Not Authorized in Firebase",
          "Your app's SHA-1 fingerprint is missing in Firebase Console. Please add your SHA-1 fingerprint to Firebase Project Settings.",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert('Error', errorCode ? `[${errorCode}] ${errorMessage}` : errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View className="items-center mb-12">

            <Image source={require('../../../assets/App_Icon.png')} className="w-40 h-40 rounded-3xl" />
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.welcome_back')}
          </Text>
          <Text className="text-gray-600 mb-8">
            {t('auth.enter_mobile')}
          </Text>

          {/* Phone Input */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, width: '100%', flexWrap: 'nowrap' }}>
            <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 16, height: 56, borderRadius: 8, marginRight: 8, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#374151', fontWeight: '600' }}>+91</Text>
            </View>
            <TextInput
              style={{ flex: 1, color: '#000000', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 16, height: 56, fontSize: 16 }}
              placeholder="9876543210"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setPhoneNumber(cleaned);
              }}
            />
          </View>
          {/* Send OTP Button */}
          <TouchableOpacity
            onPress={handleSendOTP}
            disabled={loading || phoneNumber.length !== 10}
            style={{
              paddingVertical: 16,
              borderRadius: 8,
              backgroundColor: phoneNumber.length === 10 && !loading ? '#0035a0' : '#d1d5db'
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-base">
                {t('auth.send_otp')}
              </Text>
            )}
          </TouchableOpacity>
          {/* Terms */}
          <Text className="text-center text-xs text-gray-500 mt-6">
            {t('auth.terms_prefix')}{' '}
            <Text
              style={{ color: '#0035a0', fontWeight: '600' }}
              onPress={() => Alert.alert("Coming Soon", "Terms & Conditions will be available soon.")}
            >
              {t('auth.tos')}
            </Text>{' '}
            {t('auth.and')}{' '}
            <Text
              style={{ color: '#0035a0', fontWeight: '600' }}
              onPress={() => Alert.alert("Coming Soon", "Privacy Policy will be available soon.")}
            >
              {t('auth.privacy')}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}