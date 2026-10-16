import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { Ionicons } from '@expo/vector-icons';

interface AdMobJobCardProps {
  adUnitId?: string;
  style?: any;
}

// User's Production AdMob IDs
export const ADMOB_APP_ID = 'ca-app-pub-6882525720998233~4642776918';
export const ADMOB_JOB_AD_UNIT_ID = 'ca-app-pub-6882525720998233/7801266607';

export const AdMobJobCard: React.FC<AdMobJobCardProps> = ({ adUnitId, style }) => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  // Use the user's registered production ad unit ID (or test ID if explicitly testing)
  const resolvedAdUnitId = adUnitId || ADMOB_JOB_AD_UNIT_ID;

  return (
    <View style={[styles.adCardContainer, style]}>
      {/* Top Header Badge */}
      <View style={styles.adHeader}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>SPONSORED</Text>
        </View>
        <Text style={styles.adDisclaimerText}>Ad • Google AdMob</Text>
      </View>

      {/* Ad Box - Always visible, never disappears */}
      <View style={styles.adMediaBox}>
        <BannerAd
          unitId={resolvedAdUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={() => {
            console.log('✅ Google AdMob ad loaded successfully');
            setAdLoaded(true);
            setAdError(null);
          }}
          onAdFailedToLoad={(error) => {
            console.warn('⚠️ Google AdMob waiting for fill:', error);
            setAdError('Ad loading or initializing...');
          }}
        />

        {/* Placeholder displayed while ad is fetching or waiting for AdMob network fill */}
        {!adLoaded && (
          <View style={styles.placeholderBox}>
            <View style={styles.adIconCircle}>
              <Ionicons name="megaphone-outline" size={26} color="#0035a0" />
            </View>
            <Text style={styles.placeholderTitle}>Sponsored Opportunity</Text>
            <Text style={styles.placeholderSubtitle}>
              {adError ? 'Google AdMob • Verified Partner' : 'Loading advertisement...'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Specifications from user:
  // Shape: Rounded rectangle
  // Corner radius: 10–14 dp (12 dp)
  // Outer margin: 12–16 dp (16 dp horizontal, 10 dp vertical)
  // Inner padding: 12 dp
  // Image/media: Full card width, often 16:9
  adCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  adHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  adBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  adBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  adDisclaimerText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  adMediaBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  placeholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  adIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  placeholderSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});

export default AdMobJobCard;
