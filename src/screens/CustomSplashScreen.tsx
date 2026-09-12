import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions, Image } from 'react-native';

const { width } = Dimensions.get('window');

export default function CustomSplashScreen({ onFinish }: { onFinish: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    try {
      // 1. Logo zoom & fade in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 10,
          friction: 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 2. Text slide up
        Animated.spring(textTranslateY, {
          toValue: 0,
          tension: 20,
          friction: 5,
          useNativeDriver: true,
        }).start();

        // 3. Finish splash screen after 2 seconds
        setTimeout(() => {
          try {
            onFinish();
          } catch (error) {
            console.error('Error in onFinish:', error);
            // Force finish even if there's an error
            onFinish();
          }
        }, 2000);
      });
    } catch (error) {
      console.error('Error in splash screen animation:', error);
      // If animation fails, finish immediately
      setTimeout(() => onFinish(), 100);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <Image
          source={require('../../assets/Meesent App logo .png')}
          style={styles.actualLogo}
          resizeMode="contain"
          onError={(error) => console.error('Error loading splash image:', error)}
        />
        <Text style={styles.brandName}>Meesent</Text>
      </Animated.View>

      <Animated.View style={{ transform: [{ translateY: textTranslateY }], opacity: opacityAnim }}>
        <Text style={styles.tagline}>Local Needs and Jobs</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actualLogo: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0035a0',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 2,
    textTransform: 'uppercase',
  }
});