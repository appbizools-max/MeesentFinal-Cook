import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Find Local Needs',
    description: 'Discover all the local services and needs right in your neighborhood. Quick and easy access to what matters most.',
    icon: 'location'
  },
  {
    id: '2',
    title: 'Discover Jobs',
    description: 'Explore verified government and private job listings. Find the perfect opportunity to advance your career.',
    icon: 'briefcase'
  },
  {
    id: '3',
    title: 'Grow Together',
    description: 'Connect with local vendors and professionals. Join our community and start making an impact today.',
    icon: 'people'
  }
];

export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      navigation.replace('Login');
    } catch (e) {
      console.error('Error saving onboarding status', e);
      // Fallback navigation if async storage fails
      navigation.replace('Login');
    }
  };

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    } else {
      completeOnboarding();
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={{ width, height: height * 0.7 }} className="justify-center items-center px-8">
            <View className="w-32 h-32 bg-blue-50 rounded-full justify-center items-center mb-10">
              <Ionicons name={slide.icon as any} size={64} color="#0035a0" />
            </View>
            <Text className="text-3xl font-bold text-center mb-4" style={{ color: '#0035a0' }}>
              {slide.title}
            </Text>
            <Text className="text-lg text-center text-gray-500 leading-7">
              {slide.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Controls */}
      <View style={{ height: height * 0.3 }} className="justify-between px-6 pb-12">
        {/* Pagination Dots */}
        <View className="flex-row justify-center space-x-2">
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={{
                width: currentIndex === index ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: currentIndex === index ? '#0035a0' : '#d1d5db',
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>

        {/* Buttons */}
        <View className="flex-row justify-between items-center mt-8">
          <TouchableOpacity 
            onPress={completeOnboarding}
            className="p-4"
          >
            <Text className="text-gray-500 font-semibold text-base">Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={nextSlide}
            style={{ backgroundColor: '#0035a0' }}
            className="px-8 py-4 rounded-xl flex-row items-center space-x-2"
          >
            <Text className="text-white font-bold text-base">
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            {currentIndex < SLIDES.length - 1 && (
              <Ionicons name="arrow-forward" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
