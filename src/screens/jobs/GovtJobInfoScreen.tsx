import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
export default function GovtJobInfoScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const officialWebsites = [
    { name: 'India Government Portal (National Portal)', url: 'https://india.gov.in/' },
    { name: 'UPSC (Union Public Service Commission)', url: 'https://upsc.gov.in/' },
    { name: 'IBPS (Banking Personnel Selection)', url: 'https://www.ibps.in/' },
    { name: 'NTA (National Testing Agency)', url: 'https://www.nta.ac.in/' },
    { name: 'Join Indian Army', url: 'https://joinindianarmy.nic.in/' },
    { name: 'Join Indian Navy', url: 'https://www.joinindiannavy.gov.in/' },
    { name: 'Indian Railways Portal', url: 'https://indianrailways.gov.in/' },
    { name: 'Indian Air Force', url: 'https://indianairforce.nic.in/' },
    { name: 'ISRO (Space Research)', url: 'https://www.isro.gov.in/' },
    { name: 'DRDO (Defence Research)', url: 'https://www.drdo.gov.in/' },
    { name: 'Employment News Portal', url: 'https://employmentnews.gov.in/' },
    { name: 'Supreme Court of India', url: 'https://www.sci.gov.in/' },
    { name: 'UPPSC (Uttar Pradesh PSC)', url: 'https://uppsc.up.nic.in/' },
    { name: 'HPSC (Haryana PSC)', url: 'https://hpsc.gov.in/' },
    { name: 'RPSC (Rajasthan PSC)', url: 'https://rpsc.rajasthan.gov.in/' },
    { name: 'MPPSC (Madhya Pradesh PSC)', url: 'https://mppsc.mp.gov.in/' },
    { name: 'CGPSC (Chhattisgarh PSC)', url: 'https://psc.cg.gov.in/' },
    { name: 'Agnipath Vayu (C-DAC)', url: 'https://agnipathvayu.cdac.in/AV/' },
    { name: 'National Government Services Portal', url: 'https://services.india.gov.in/' },
  ];
  const features = [
    'Daily updates on Government Jobs',
    'Easy browsing by qualification, category, and location',
    'Job updates for 10th Pass, 12th Pass, Diploma, ITI, Graduate & PG jobs',
    'Details for Banking, Defense, Railways, Police, Teaching & PSU jobs',
    'Covers SSC, UPSC, PSC, State Govt Exams, and other official exams',
    'Direct "get official link" links that redirect to official portals only',
    'Lightweight, free, and user-friendly.',
  ];

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Failed to open URL:", err));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ paddingTop: insets.top, backgroundColor: '#ffffff' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Government Jobs Info</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Main Title Badge */}
        <View style={styles.titleCard}>
          <View style={styles.badgeRow}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#0035a0" />
            <Text style={styles.badgeText}>OFFICIAL INFORMATION & SOURCES</Text>
          </View>
          <Text style={styles.mainTitle}>All India Government Job Details</Text>
        </View>

        {/* Disclaimer Box */}
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeaderRow}>
            <Ionicons name="alert-circle" size={22} color="#b91c1c" />
            <Text style={styles.disclaimerHeaderTitle}>Disclaimer (Read First):</Text>
          </View>
          <Text style={styles.disclaimerText}>
            MEESENT is not an official government app and has no affiliation with any government department, authority, or individual. This app only provides job information collected from trusted official portals and public domain sources. Users must always verify details on the respective official websites before applying.
          </Text>
        </View>

        {/* Sources of Information Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="globe-outline" size={20} color="#0035a0" />
            <Text style={styles.sectionHeaderTitle}>Sources of Information (Official Websites)</Text>
          </View>
          <Text style={styles.sectionSubtext}>We collect updates from these trusted portals:</Text>
          
          <View style={styles.numberedLinkList}>
            {officialWebsites.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.numberedLinkRow}
                onPress={() => handleOpenUrl(item.url)}
                activeOpacity={0.7}
              >
                <Text style={styles.linkNumber}>{index + 1}.</Text>
                <Text style={styles.linkUrlText}>{item.url}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Key Features Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="sparkles-outline" size={20} color="#0035a0" />
            <Text style={styles.sectionHeaderTitle}>Key Features</Text>
          </View>
          <View style={styles.featureList}>
            {features.map((feat, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" style={{ marginTop: 2 }} />
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Note Section */}
        <View style={styles.noteCard}>
          <View style={styles.noteHeaderRow}>
            <Ionicons name="document-text-outline" size={20} color="#854d0e" />
            <Text style={styles.noteHeaderTitle}>Note:</Text>
          </View>
          <View style={styles.noteList}>
            <View style={styles.noteItem}>
              <Text style={styles.noteNumber}>1.</Text>
              <Text style={styles.noteText}>We provide guidance only.</Text>
            </View>
            <View style={styles.noteItem}>
              <Text style={styles.noteNumber}>2.</Text>
              <Text style={styles.noteText}>We do not collect any fees or documents.</Text>
            </View>
            <View style={styles.noteItem}>
              <Text style={styles.noteNumber}>3.</Text>
              <Text style={styles.noteText}>Please apply only on official government websites.</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
  titleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0035a0',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 26,
  },
  disclaimerCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  disclaimerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  disclaimerHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991b1b',
  },
  disclaimerText: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  sectionSubtext: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
  },
  numberedLinkList: {
    gap: 8,
    marginTop: 4,
  },
  numberedLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    width: 28,
  },
  linkUrlText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0035a0',
    textDecorationLine: 'underline',
    flex: 1,
  },
  featureList: {
    gap: 10,
    marginTop: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
    lineHeight: 19,
  },
  noteCard: {
    backgroundColor: '#fefce8',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  noteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#854d0e',
  },
  noteList: {
    gap: 6,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  noteNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#854d0e',
  },
  noteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#713f12',
    flex: 1,
    lineHeight: 19,
  },
});
