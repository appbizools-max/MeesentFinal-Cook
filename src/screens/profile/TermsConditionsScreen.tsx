import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function TermsConditionsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const termsList = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing, downloading, or using Meesent, you accept and agree to be bound by all the terms, policies, and provisions of this agreement.",
      icon: "checkmark-circle-outline"
    },
    {
      title: "2. Non-Government App Disclaimer",
      content: "MEESENT is not an official government app and has no affiliation with any government department, authority, or individual. This app only provides job information collected from trusted official portals and public domain sources. Users must always verify details on the respective official websites before applying.",
      icon: "shield-half-outline"
    },
    {
      title: "3. Service Modifications",
      content: "Meesent reserves the right to modify, upgrade, suspend, or discontinue, temporarily or permanently, the service (or any part thereof) with or without prior notice.",
      icon: "settings-outline"
    },
    {
      title: "4. User Registration and Account",
      content: "You agree to provide accurate, current, and complete information during registration. You are solely responsible for safeguarding your credentials and managing all activities under your account.",
      icon: "person-outline"
    },
    {
      title: "5. Vendor Responsibilities",
      content: "Vendors must provide truthful, authentic descriptions of services/products. Fraudulent postings, false advertisements, or failure to fulfill engagements will result in immediate suspension.",
      icon: "briefcase-outline"
    },
    {
      title: "6. Limitation of Liability",
      content: "To the maximum extent permitted by law, Meesent and its affiliates shall not be liable for any indirect, special, consequential, or punitive damages, including loss of profits, data, or reputation.",
      icon: "shield-outline"
    },
    {
      title: "7. Governing Law",
      content: "These Terms and Conditions shall be governed, interpreted, and construed in accordance with the laws of the jurisdiction, without regard to conflict of law provisions.",
      icon: "globe-outline"
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ paddingTop: insets.top, backgroundColor: '#ffffff' }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

        <ScrollView 
          style={{ flex: 1, backgroundColor: '#f8fafc' }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
        >
          {/* Minimal Document Header Info */}
          <View style={styles.docHeader}>
            <View style={styles.docBadge}>
              <Ionicons name="document-text-outline" size={14} color="#475569" />
              <Text style={styles.docBadgeText}>Official Agreement</Text>
            </View>
            <Text style={styles.docTitle}>Terms & Conditions</Text>
            <Text style={styles.docSubtitle}>Last Updated: May 15, 2026</Text>
            <View style={styles.docLine} />
          </View>

          <Text style={styles.introParagraph}>
            Please review the following rules and regulations carefully. By continuing to use the Meesent platform, you agree to comply with all terms stated herein.
          </Text>

          {/* Government Entity Disclaimer Banner */}
          <View style={styles.disclaimerCard}>
            <View style={styles.disclaimerHeaderRow}>
              <Ionicons name="alert-circle-outline" size={20} color="#b91c1c" />
              <Text style={styles.disclaimerHeaderTitle}>Government Entity Disclaimer</Text>
            </View>
            <Text style={styles.disclaimerText}>
              MEESENT is not an official government app and has no affiliation with any government department, authority, or individual. This app only provides job information collected from trusted official portals and public domain sources. Users must always verify details on the respective official websites before applying.
            </Text>
          </View>

          {/* Clean Flat Section Cards */}
          {termsList.map((term, index) => (
            <View key={index} style={styles.termCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrapper}>
                  <Ionicons name={term.icon as any} size={18} color="#0035a0" />
                </View>
                <Text style={styles.sectionTitle}>{term.title}</Text>
              </View>
              <Text style={styles.paragraph}>{term.content}</Text>
            </View>
          ))}

          {/* Professional Minimal Contact Card */}
          <View style={styles.contactCard}>
            <Ionicons name="help-circle-outline" size={32} color="#475569" style={{ marginBottom: 12 }} />
            <Text style={styles.contactTitle}>Questions about our Terms?</Text>
            <Text style={styles.contactDescription}>
              If you require clarification on any of these sections, contact our support team for official assistance.
            </Text>
            <TouchableOpacity 
              style={styles.contactBtn} 
              onPress={() => navigation.navigate('HelpSupport')}
              activeOpacity={0.7}
            >
              <Text style={styles.contactBtnText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  scrollContent: { padding: 20 },
  
  // Minimal doc header style
  docHeader: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  docBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    marginBottom: 10,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  docTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  docSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 4,
  },
  docLine: {
    width: 60,
    height: 3,
    backgroundColor: '#0035a0',
    borderRadius: 2,
    marginTop: 15,
  },
  introParagraph: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 15,
  },
  
  // Clean flat card style
  termCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#f0f5fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  paragraph: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '500',
  },
  
  // Professional minimal contact card
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  contactDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 16,
    paddingHorizontal: 15,
  },
  contactBtn: {
    width: '100%',
    backgroundColor: '#0035a0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  contactBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  disclaimerCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  disclaimerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  disclaimerHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
  },
  disclaimerText: {
    fontSize: 12.5,
    color: '#7f1d1d',
    lineHeight: 19,
    fontWeight: '500',
  }
});
