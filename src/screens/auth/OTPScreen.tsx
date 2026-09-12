import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import authService from '@services/auth.service';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import notificationService from '../../services/notification.service';
import { Ionicons } from '@expo/vector-icons';

export default function OTPScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { phoneNumber } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    // Auto-focus on mount
    const keyboardTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 450);
    return () => clearTimeout(keyboardTimer);
  }, []);

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const confirmation = await authService.sendOTP(phoneNumber, null);
      authService.setConfirmationResult(confirmation);
      setTimer(60);
      setCanResend(false);
      setOtp('');
      inputRef.current?.focus();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp;

    if (code.length !== 6) {
      Alert.alert(t('auth.invalid_otp_title'), t('auth.enter_6_digits'));
      return;
    }

    setLoading(true);

    try {
      const confirmation = authService.getConfirmationResult();
      if (!confirmation) {
        Alert.alert(
          t('auth.session_expired', 'Session Expired'),
          'Your verification session has expired. Please go back and re-enter your mobile number to get a new code.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }
      const { isNewUser } = await authService.verifyOTP(confirmation, code);

      try {
        if (isNewUser) {
          await notificationService.sendLocalNotification(
            t('auth.register_success_title', 'Welcome to Meesent! 🎉'),
            t('auth.register_success_body', 'Your account has been created successfully. Let\'s set up your profile!')
          );
        } else {
          await notificationService.sendLocalNotification(
            t('auth.login_success_title', 'Login Successful 🎉'),
            t('auth.login_success_body', 'Welcome back to Meesent! Enjoy exploring local needs and jobs.')
          );
        }
      } catch (notifErr) {
        console.error('Error sending login notification:', notifErr);
      }
    } catch (error: any) {
      console.error('OTP Verification Error:', error);
      const msg = (error.message || '').toLowerCase();
      const isInvalidCode = error.code === 'auth/invalid-verification-code' || 
                            msg.includes('otp') || 
                            msg.includes('code') || 
                            msg.includes('invalid') || 
                            msg.includes('incorrect') ||
                            msg.includes('verification');
      
      Alert.alert(
        isInvalidCode ? t('auth.invalid_otp_title', 'Wrong OTP') : "Error During Sign In",
        isInvalidCode 
          ? t('auth.invalid_otp_retry', 'Wrong OTP entered. Please check the code and try again.')
          : (error.message || "An unexpected error occurred. Please try again."),
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const otpArray = Array(6).fill('');

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Navigation Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, height: 60 }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ 
              width: 36, 
              height: 36, 
              justifyContent: 'center', 
              alignItems: 'center', 
              borderRadius: 18,
              backgroundColor: '#f8fafc'
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 10, paddingBottom: 40 }} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title & Description Header */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 10, letterSpacing: -0.5 }}>
                Verify mobile
              </Text>
              <Text style={{ fontSize: 15, color: '#475569', lineHeight: 22, fontWeight: '400' }}>
                We've sent a 6-digit verification code to the number{' '}
                <Text style={{ fontWeight: '700', color: '#0f172a' }}>{phoneNumber}</Text>
              </Text>
            </View>

            {/* OTP Digit Boxes */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, width: '100%' }}
            >
              {otpArray.map((_, index) => {
                const char = otp[index] || '';
                const isFocused = otp.length === index;
                return (
                  <View
                    key={index}
                    style={{
                      width: 44,
                      height: 56,
                      borderRadius: 12,
                      borderWidth: isFocused ? 2 : 1.5,
                      borderColor: isFocused ? '#0035a0' : '#e2e8f0',
                      backgroundColor: '#f8fafc',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 22, fontWeight: '700', color: '#0f172a' }}>
                      {char}
                    </Text>
                    {isFocused && (
                      <View style={{ position: 'absolute', bottom: 10, width: 14, height: 2, backgroundColor: '#0035a0', borderRadius: 1 }} />
                    )}
                  </View>
                );
              })}
            </TouchableOpacity>

            {/* Hidden Input field */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(val) => {
                const cleaned = val.replace(/[^0-9]/g, '');
                setOtp(cleaned);
              }}
              keyboardType="number-pad"
              maxLength={6}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />

            {/* Submit Action Button */}
            <TouchableOpacity
              onPress={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
              style={{
                height: 54,
                borderRadius: 12,
                backgroundColor: otp.length === 6 && !loading ? '#0035a0' : '#f1f5f9',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: otp.length === 6 ? '#ffffff' : '#94a3b8', fontWeight: '700', fontSize: 16 }}>
                  Verify & Continue
                </Text>
              )}
            </TouchableOpacity>

            {/* Inline resend label */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 28, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#64748b' }}>
                Didn't get the code?{' '}
              </Text>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOTP}>
                  <Text style={{ color: '#0035a0', fontWeight: '700', fontSize: 14 }}>Resend code</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: '#0035a0', fontWeight: '700', fontSize: 14 }}>
                  Resend in 00:{timer < 10 ? `0${timer}` : timer}
                </Text>
              )}
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
