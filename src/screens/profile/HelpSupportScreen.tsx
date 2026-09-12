import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { auth, db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

export default function HelpSupportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const SUPPORT_PHONE = '+91 9573838144';
  const SUPPORT_PHONE_RAW = '+919573838144';
  const SUPPORT_EMAIL = 'meesentonlineshoping@gmail.com';

  const handleCallSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE_RAW}`).catch(() => {
      Alert.alert('Error', 'Unable to open phone dialer.');
    });
  };

  const handleWhatsAppSupport = () => {
    const url = `whatsapp://send?phone=${SUPPORT_PHONE_RAW}&text=${encodeURIComponent('Hello Meesent Support, I need assistance with...')}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${SUPPORT_PHONE_RAW.replace('+', '')}`);
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Meesent App Support Request`).catch(() => {
      Alert.alert('Error', 'Unable to open mail client.');
    });
  };

  const handleSendMessage = async () => {
    if (!subject.trim()) {
      Alert.alert('Required Field', 'Please enter a subject for your request.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Required Field', 'Please enter your message or query.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'support_messages'), {
        userId: user?.uid || 'guest',
        userName: user?.displayName || user?.email?.split('@')[0] || 'Guest User',
        userEmail: user?.email || '',
        userPhone: user?.phoneNumber || '',
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Toast.show({
        type: 'success',
        text1: 'Message Sent Successfully',
        text2: 'Our support team will get back to you shortly.',
      });

      setSubject('');
      setMessage('');
    } catch (error: any) {
      console.error('Error sending support message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again or call us directly.');
    } finally {
      setLoading(false);
    }
  };

  const FAQS = [
    {
      question: 'How do I register my business on Meesent?',
      answer: 'Go to your Profile or Vendor section and tap "Register Business". Fill in your business name, logo, category, address, working hours, and handled brands, then submit for verification.'
    },
    {
      question: 'How do I post a job opening?',
      answer: 'Navigate to the Jobs tab, tap "Post a Job", enter job title, salary range, qualification requirements, and contact details to list your vacancy.'
    },
    {
      question: 'How can I upgrade my business plan?',
      answer: 'Open Vendor Management Dashboard or tap "Upgrade Plan". Choose between Small Vendor and Big Vendor plans for maximum visibility and verified badge.'
    },
    {
      question: 'How do I contact customer support directly?',
      answer: 'You can tap the Call button above to speak to us at +91 9573838144, chat with us on WhatsApp, or email meesentonlineshoping@gmail.com.'
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'white' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Help & Contact Support</Text>
            <Text style={styles.headerSub}>We are here to help you 24/7</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Support Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerBadge}>
            <Ionicons name="headset" size={16} color="#0035a0" />
            <Text style={styles.bannerBadgeText}>Direct Customer Support</Text>
          </View>
          <Text style={styles.bannerTitle}>How can we assist you today?</Text>
          <Text style={styles.bannerSub}>
            Reach out via Call, WhatsApp, or Email for quick assistance with services or jobs.
          </Text>
        </View>

        {/* Quick Contact Action Cards */}
        <Text style={styles.sectionHeader}>CONTACT US DIRECTLY</Text>

        {/* Call Support Card */}
        <TouchableOpacity style={styles.contactCard} onPress={handleCallSupport}>
          <View style={[styles.contactIconBg, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="call" size={24} color="#2563eb" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Call Customer Support</Text>
            <Text style={styles.contactValue}>{SUPPORT_PHONE}</Text>
            <Text style={styles.contactSub}>Tap to call our support line directly</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* WhatsApp Support Card */}
        <TouchableOpacity style={styles.contactCard} onPress={handleWhatsAppSupport}>
          <View style={[styles.contactIconBg, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="logo-whatsapp" size={24} color="#10b981" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>WhatsApp Support</Text>
            <Text style={styles.contactValue}>{SUPPORT_PHONE}</Text>
            <Text style={styles.contactSub}>Chat with our support team on WhatsApp</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* Email Support Card */}
        <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport}>
          <View style={[styles.contactIconBg, { backgroundColor: '#f3e8ff' }]}>
            <Ionicons name="mail" size={24} color="#7c3aed" />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Email Support</Text>
            <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
            <Text style={styles.contactSub}>Send us an email anytime</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* Send Support Request Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Ionicons name="chatbubbles-outline" size={20} color="#2563eb" />
            <Text style={styles.formTitle}>Send Us a Message</Text>
          </View>
          <Text style={styles.formSub}>Submit your inquiry and our team will get back to you.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SUBJECT *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="bookmark-outline" size={18} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Issue with business profile or payment"
                placeholderTextColor="#94a3b8"
                value={subject}
                onChangeText={setSubject}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>YOUR MESSAGE / QUERY *</Text>
            <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 10 }]}>
              <Ionicons name="document-text-outline" size={18} color="#64748b" style={[styles.inputIcon, { marginTop: 2 }]} />
              <TextInput
                style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                placeholder="Describe your issue or question in detail..."
                placeholderTextColor="#94a3b8"
                multiline
                value={message}
                onChangeText={setMessage}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.7 }]}
            onPress={handleSendMessage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Submit Support Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <Text style={styles.sectionHeader}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <TouchableOpacity
                key={index}
                style={styles.faqCard}
                onPress={() => setExpandedFaq(isExpanded ? null : index)}
                activeOpacity={0.8}
              >
                <View style={styles.faqQuestionRow}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#64748b"
                  />
                </View>
                {isExpanded && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: 'white',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 10,
  },
  bannerBadgeText: {
    color: '#0035a0',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bannerTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  bannerSub: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  contactIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  contactValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 2,
  },
  contactSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    marginTop: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  formSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    height: 48,
    marginTop: 6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  faqList: {
    gap: 8,
  },
  faqCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    paddingRight: 10,
  },
  faqAnswer: {
    fontSize: 12,
    color: '#475569',
    marginTop: 10,
    lineHeight: 18,
    fontWeight: '500',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
});
