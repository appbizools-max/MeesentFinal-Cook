import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const LANGUAGES = [
  { id: 'en', name: 'English', nativeName: 'English', char: 'A', sub: 'Global Standard', colors: ['#dbeafe', '#3b82f6'] },
  { id: 'te', name: 'Telugu', nativeName: 'తెలుగు', char: 'అ', sub: 'ఆంధ్రప్రదేశ్ & తెలంగాణ', colors: ['#fef3c7', '#d97706'] },
  { id: 'hi', name: 'Hindi', nativeName: 'हिंदी', char: 'अ', sub: 'उत्तर & मध्य भारत', colors: ['#ffe4e6', '#e11d48'] },
  { id: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', char: 'ಅ', sub: 'ಕರ್ನಾಟಕ ರಾಜ್ಯ', colors: ['#d1fae5', '#059669'] },
];

const GREETINGS: Record<string, string> = {
  en: 'Welcome to Meesent',
  te: 'మీసెంట్ కి స్వాగతం',
  hi: 'मीसेंट में आपका स्वागत है',
  kn: 'ಮೀಸೆಂಟ್‌ಗೆ ಸುಸ್ವಾಗತ',
};

const LOCAL_TRANS: Record<string, Record<string, string>> = {
  en: { title: 'Choose Language', subtitle: 'Please select your preferred language to customize your app feed', continue: 'Continue' },
  te: { title: 'భాషను ఎంచుకోండి', subtitle: 'మీ ఫీడ్‌ను అనుకూలీకరించడానికి దయచేసి భాషను ఎంచుకోండి', continue: 'కొనసాగించండి' },
  hi: { title: 'भाषा चुनें', subtitle: 'अपने ऐप फीड को कस्टमाइज़ करने के लिए कृपया भाषा चुनें', continue: 'आगे बढ़ें' },
  kn: { title: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ', subtitle: 'ನಿಮ್ಮ ಫೀಡ್ ಅನ್ನು ಕಸ್ಟಮೈಸ್ ಮಾಡಲು ದಯವಿಟ್ಟು ಭಾಷೆಯನ್ನು ಆರಿಸಿ', continue: 'ಮುಂದುವರೆಯಿರಿ' },
};

export default function LanguageScreen({ onSelect }: { onSelect: () => void }) {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');

  const handleContinue = async () => {
    try {
      await i18n.changeLanguage(selectedLanguage);
      onSelect(); // Tell RootNavigator we are done
    } catch (e) {
      console.error("Failed to save language", e);
    }
  };

  const greeting = GREETINGS[selectedLanguage] || GREETINGS.en;
  const titleText = LOCAL_TRANS[selectedLanguage]?.title || LOCAL_TRANS.en.title;
  const subtitleText = LOCAL_TRANS[selectedLanguage]?.subtitle || LOCAL_TRANS.en.subtitle;
  const continueText = LOCAL_TRANS[selectedLanguage]?.continue || LOCAL_TRANS.en.continue;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Soft Premium Background Gradient */}
      <LinearGradient
        colors={['#f8fafc', '#eff6ff', '#e0f2fe']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Decorative Blur Spheres */}
      <View style={styles.bubbleTop} />
      <View style={styles.bubbleBottom} />

      <SafeAreaView style={styles.safeArea}>
        
        {/* Upper Header Card */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandText}>MEESENT</Text>
            <View style={styles.brandDot} />
          </View>
          
          <View style={styles.globeWrapper}>
            <LinearGradient
              colors={['#0035a0', '#1e40af']}
              style={styles.globeCircle}
            >
              <FontAwesome5 name="globe" size={24} color="#ffffff" />
            </LinearGradient>
          </View>

          <Text style={styles.dynamicGreeting}>{greeting}</Text>
          <Text style={styles.mainTitle}>{titleText}</Text>
          <Text style={styles.mainSubtitle}>{subtitleText}</Text>
        </View>

        {/* Card Options List */}
        <View style={styles.listContainer}>
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.id;
            const [bgAccent, textAccent] = lang.colors;

            return (
              <TouchableOpacity
                key={lang.id}
                activeOpacity={0.8}
                onPress={() => setSelectedLanguage(lang.id)}
                style={[
                  styles.cardOption,
                  isSelected && styles.cardOptionActive
                ]}
              >
                {/* Script icon container with custom colors */}
                <View style={[styles.charContainer, { backgroundColor: bgAccent }]}>
                  <Text style={[styles.charText, { color: textAccent }]}>
                    {lang.char}
                  </Text>
                </View>

                {/* Mid labels */}
                <View style={styles.cardCenter}>
                  <Text style={[styles.nativeLabel, isSelected && styles.nativeLabelActive]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={styles.englishLabel}>
                    {lang.name} • <Text style={styles.regionLabel}>{lang.sub}</Text>
                  </Text>
                </View>

                {/* Right select marker */}
                {isSelected ? (
                  <View style={styles.checkedCircle}>
                    <Ionicons name="checkmark-circle" size={24} color="#0035a0" />
                  </View>
                ) : (
                  <View style={styles.uncheckedCircle} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Button Section */}
        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinue}
            style={styles.continueShadow}
          >
            <LinearGradient
              colors={['#0035a0', '#1e40af']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtn}
            >
              <Text style={styles.continueText}>{continueText}</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" style={styles.arrowIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  bubbleTop: {
    position: 'absolute',
    top: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: 'rgba(0, 53, 160, 0.05)',
  },
  bubbleBottom: {
    position: 'absolute',
    bottom: -height * 0.05,
    right: -width * 0.1,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: (width * 0.5) / 2,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: height * 0.02,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 4,
  },
  brandDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0035a0',
    marginLeft: 2,
  },
  globeWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  globeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dynamicGreeting: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0035a0',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingHorizontal: 20,
    marginVertical: 20,
    gap: 12,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  cardOptionActive: {
    borderColor: '#0035a0',
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  charContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  charText: {
    fontSize: 18,
    fontWeight: '900',
  },
  cardCenter: {
    flex: 1,
    marginLeft: 16,
  },
  nativeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  nativeLabelActive: {
    color: '#0035a0',
    fontWeight: '800',
  },
  englishLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 1,
  },
  regionLabel: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  checkedCircle: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
  },
  continueShadow: {
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  continueBtn: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  arrowIcon: {
    marginLeft: 6,
    marginTop: 1,
  },
});
