import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
export default function PrivacyPolicyScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const handleEmailPress = () => {
    Linking.openURL('mailto:meesentonlineshoping@gmail.com');
  };

  const handleWebsitePress = () => {
    Linking.openURL('http://www.meesent.com');
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ paddingTop: insets.top, backgroundColor: '#ffffff' }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>
      </View>

        <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ ...styles.scrollContent, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.lastUpdated}>Last Updated: June 17, 2026</Text>
            
            {/* Government Entity Disclaimer Banner */}
            <View style={styles.govDisclaimerCard}>
              <View style={styles.govDisclaimerHeader}>
                <Ionicons name="alert-circle" size={20} color="#b91c1c" />
                <Text style={styles.govDisclaimerTitle}>Government Job Information & Non-Affiliation Disclaimer</Text>
              </View>
              <Text style={styles.govDisclaimerText}>
                MEESENT is not an official government app and has no affiliation with any government department, authority, or individual. This app only provides job information collected from trusted official portals and public domain sources. Users must always verify details on the respective official websites before applying.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.paragraph}>
              Welcome to <Text style={styles.boldText}>Meesent</Text> ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, store, disclose, and protect your information when you use our mobile application and related services.
            </Text>
            <Text style={styles.paragraph}>
              By accessing or using Meesent, you agree to the collection and use of information in accordance with this Privacy Policy.
            </Text>

            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            <Text style={styles.paragraph}>
              We may collect the following categories of information:
            </Text>

            <Text style={styles.subSectionTitle}>Personal Information</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Full Name</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Email Address</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Mobile Number</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Profile Picture</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Username and Account Details</Text>
              </View>
            </View>

            <Text style={styles.subSectionTitle}>Contact Information</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Address (if provided)</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>City, State, and Country</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Postal Code</Text>
              </View>
            </View>

            <Text style={styles.subSectionTitle}>Transaction Information</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Payment Details</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Purchase History</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Billing Information</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Subscription Information</Text>
              </View>
            </View>

            <Text style={styles.subSectionTitle}>Device Information</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Device Model</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Operating System</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Device Identifiers</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>IP Address</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Browser Information</Text>
              </View>
            </View>

            <Text style={styles.subSectionTitle}>Usage Information</Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>App Activity</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Search History</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Features Used</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Interaction Data</Text>
              </View>
            </View>

            <Text style={styles.subSectionTitle}>Location Information</Text>
            <Text style={styles.paragraph}>
              If enabled by the user, we may collect location information to provide location-based services and improve user experience.
            </Text>

            <Text style={styles.subSectionTitle}>Media and Files</Text>
            <Text style={styles.paragraph}>
              With your permission, we may access:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Camera</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Photo Gallery</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Files and Documents</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
            <Text style={styles.paragraph}>
              We use the information we collect to:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Create and manage user accounts</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Provide and improve our services</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Process transactions and payments</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Verify user identity</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Communicate important updates</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Send notifications and service-related messages</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Provide customer support</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Improve app performance and user experience</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Detect fraud, abuse, and security threats</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Comply with legal obligations</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>4. Permissions Used by the App</Text>
            <Text style={styles.paragraph}>
              Depending on the features you use, Meesent may request the following permissions:
            </Text>

            <Text style={styles.subSectionTitle}>Camera Permission</Text>
            <Text style={styles.paragraph}>
              Used for capturing photos, uploading images, and profile pictures.
            </Text>

            <Text style={styles.subSectionTitle}>Storage Permission</Text>
            <Text style={styles.paragraph}>
              Used for selecting and uploading files, documents, and images.
            </Text>

            <Text style={styles.subSectionTitle}>Location Permission</Text>
            <Text style={styles.paragraph}>
              Used to provide location-based services and improve user experience.
            </Text>

            <Text style={styles.subSectionTitle}>Notification Permission</Text>
            <Text style={styles.paragraph}>
              Used to send important updates, alerts, and service notifications.
            </Text>

            <Text style={styles.paragraph}>
              Users can manage these permissions through their device settings at any time.
            </Text>

            <Text style={styles.sectionTitle}>5. Data Sharing and Disclosure</Text>
            <Text style={styles.paragraph}>
              We do not sell your personal information.
            </Text>
            <Text style={styles.paragraph}>
              We may share information with:
            </Text>

            <Text style={styles.subSectionTitle}>Service Providers</Text>
            <Text style={styles.paragraph}>
              Trusted third-party service providers that help us operate our services.
            </Text>

            <Text style={styles.subSectionTitle}>Payment Processors</Text>
            <Text style={styles.paragraph}>
              To securely process transactions and payments.
            </Text>

            <Text style={styles.subSectionTitle}>Analytics Providers</Text>
            <Text style={styles.paragraph}>
              To understand app performance and improve user experience.
            </Text>

            <Text style={styles.subSectionTitle}>Legal Authorities</Text>
            <Text style={styles.paragraph}>
              When required by law, court order, or governmental request.
            </Text>

            <Text style={styles.subSectionTitle}>Business Transfers</Text>
            <Text style={styles.paragraph}>
              In connection with mergers, acquisitions, or sale of assets.
            </Text>

            <Text style={styles.sectionTitle}>6. Third-Party Services</Text>
            <Text style={styles.paragraph}>
              Our application may use third-party services including but not limited to:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Google Sign-In</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Firebase</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Google Analytics</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Payment Gateway Providers</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Cloud Storage Services</Text>
              </View>
            </View>
            <Text style={styles.paragraph}>
              These third parties may collect and process data according to their respective privacy policies.
            </Text>

            <Text style={styles.sectionTitle}>7. Data Security</Text>
            <Text style={styles.paragraph}>
              We implement reasonable technical, administrative, and organizational security measures to protect your information against:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Unauthorized access</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Loss of data</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Misuse</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Alteration</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Disclosure</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Destruction</Text>
              </View>
            </View>
            <Text style={styles.paragraph}>
              While we strive to protect your information, no method of transmission over the internet is completely secure.
            </Text>

            <Text style={styles.sectionTitle}>8. Data Retention</Text>
            <Text style={styles.paragraph}>
              We retain your personal information only for as long as necessary to:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Provide our services</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Fulfill legal obligations</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Resolve disputes</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Enforce agreements</Text>
              </View>
            </View>
            <Text style={styles.paragraph}>
              When data is no longer required, it will be securely deleted or anonymized.
            </Text>

            <Text style={styles.sectionTitle}>9. Your Rights</Text>
            <Text style={styles.paragraph}>
              Depending on applicable laws, you may have the right to:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Access your personal information</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Correct inaccurate information</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Request deletion of your information</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Restrict processing of your data</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Object to data processing</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Request data portability</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Withdraw consent where applicable</Text>
              </View>
            </View>
            <Text style={styles.paragraph}>
              To exercise these rights, please contact us using the information provided below.
            </Text>

            <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
            <Text style={styles.paragraph}>
              Meesent is not intended for children under the age of 13.
            </Text>
            <Text style={styles.paragraph}>
              We do not knowingly collect personal information from children under 13 years of age. If we become aware that such information has been collected, we will take appropriate steps to delete it promptly.
            </Text>

            <Text style={styles.sectionTitle}>11. International Data Transfers</Text>
            <Text style={styles.paragraph}>
              Your information may be processed and stored on servers located outside your country of residence. By using our services, you consent to such transfers where permitted by law.
            </Text>

            <Text style={styles.sectionTitle}>12. Cookies and Similar Technologies</Text>
            <Text style={styles.paragraph}>
              We may use cookies, analytics tools, and similar technologies to:
            </Text>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Improve functionality</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Analyze usage trends</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Personalize user experience</Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Enhance security</Text>
              </View>
            </View>
            <Text style={styles.paragraph}>
              Users may manage cookie preferences through device or browser settings where applicable.
            </Text>

            <Text style={styles.sectionTitle}>13. Account Deletion</Text>
            <Text style={styles.paragraph}>
              Users may request deletion of their account at any time through the application or by contacting us.
            </Text>
            <Text style={styles.paragraph}>
              Upon receiving a deletion request, the user's account will be deactivated and scheduled for permanent deletion. Personal data associated with the account may be retained for up to <Text style={styles.boldText}>30 days</Text> from the date of the deletion request for security, fraud prevention, dispute resolution, backup recovery, and legal compliance purposes.
            </Text>
            <Text style={styles.paragraph}>
              After the 30-day retention period, the user's personal data will be permanently deleted or anonymized from our active systems, unless a longer retention period is required by applicable law.
            </Text>
            <Text style={styles.paragraph}>
              During the retention period, the deleted account will not be accessible to the user.
            </Text>

            <Text style={styles.sectionTitle}>15. Government Job Information & Non-Affiliation Disclaimer</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.boldText}>MEESENT is not an official government app and has no affiliation with any government department, authority, or individual.</Text> This app only provides job information collected from trusted official portals and public domain sources. Users must always verify details on the respective official websites before applying.
            </Text>

            <Text style={styles.sectionTitle}>16. Changes to This Privacy Policy</Text>
            <Text style={styles.paragraph}>
              We may update this Privacy Policy from time to time.
            </Text>
            <Text style={styles.paragraph}>
              Any changes will be posted within the application and updated on this page. Continued use of the application after changes become effective constitutes acceptance of the revised Privacy Policy.
            </Text>

            <Text style={styles.sectionTitle}>17. Contact Us</Text>
            <Text style={styles.paragraph}>
              If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:
            </Text>

            <View style={styles.contactDetails}>
              <Text style={styles.boldText}>Meesent Technology</Text>
              <TouchableOpacity onPress={handleEmailPress}>
                <Text style={styles.paragraph}>Email: <Text style={styles.linkText}>meesentonlineshoping@gmail.com</Text></Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleWebsitePress}>
                <Text style={styles.paragraph}>Website: <Text style={styles.linkText}>www.meesent.com</Text></Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contactBox}>
              <Text style={styles.contactBoxTitle}>Questions about our Privacy Policy?</Text>
              <Text style={styles.contactBoxText}>If you have any questions, please contact our support team.</Text>
              <TouchableOpacity style={styles.contactBtn} onPress={() => navigation.navigate('HelpSupport')}>
                <Text style={styles.contactBtnText}>Contact Support</Text>
              </TouchableOpacity>
            </View>

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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  lastUpdated: { fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginTop: 15, marginBottom: 12 },
  subSectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginTop: 10, marginBottom: 8 },
  paragraph: { fontSize: 13, color: '#475569', lineHeight: 22, fontWeight: '500', marginBottom: 12 },
  bulletList: { marginBottom: 15, paddingLeft: 5 },
  bulletItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingRight: 15 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6', marginTop: 8, marginRight: 10 },
  bulletText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 22, fontWeight: '500' },
  boldText: { fontWeight: '800', color: '#1e293b' },
  linkText: { color: '#3b82f6', textDecorationLine: 'underline' },
  contactDetails: { marginVertical: 10, paddingLeft: 5 },
  contactBox: {
     marginTop: 25,
     backgroundColor: '#fef2f2',
     padding: 20,
     borderRadius: 16,
     alignItems: 'center',
     borderWidth: 1,
     borderColor: '#fee2e2'
  },
  contactBoxTitle: { fontSize: 14, fontWeight: '800', color: '#3b82f6', marginBottom: 6 },
  contactBoxText: { fontSize: 12, color: '#64748b', fontWeight: '500', textAlign: 'center', marginBottom: 15 },
  contactBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  contactBtnText: { color: 'white', fontSize: 12, fontWeight: '800' },
  govDisclaimerCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  govDisclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  govDisclaimerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#991b1b',
    flex: 1,
  },
  govDisclaimerText: {
    fontSize: 12.5,
    color: '#7f1d1d',
    lineHeight: 19,
    fontWeight: '500',
  }
});
