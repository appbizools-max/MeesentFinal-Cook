import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
export default function SelectionScreen({ navigation }: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Staggered slide up animated values for the three cards
  const fadeAnim1 = React.useRef(new Animated.Value(0)).current;
  const slideAnim1 = React.useRef(new Animated.Value(45)).current;

  const fadeAnim2 = React.useRef(new Animated.Value(0)).current;
  const slideAnim2 = React.useRef(new Animated.Value(45)).current;

  const fadeAnim3 = React.useRef(new Animated.Value(0)).current;
  const slideAnim3 = React.useRef(new Animated.Value(45)).current;

  React.useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeAnim1, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(slideAnim1, { toValue: 0, tension: 35, friction: 8, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim2, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(slideAnim2, { toValue: 0, tension: 35, friction: 8, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim3, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(slideAnim3, { toValue: 0, tension: 35, friction: 8, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#f8fafc', '#f4f2fdff']}
      style={{ flex: 1 }}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 10 }}
        showsVerticalScrollIndicator={false}
        className="px-4"
      >

        {/* Top Header */}
        <View className="mb-8 mt-2 relative">
          <View className="flex-row items-center justify-center mb-1 mt-2">
            <Text className="text-4xl font-black tracking-widest text-[#0035a0]">MEESENT</Text>
          </View>

          <TouchableOpacity className="absolute right-0 top-0 p-2">
            <Ionicons name="notifications-outline" size={26} color="#0035a0" />
            <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
          </TouchableOpacity>

          <Text className="text-2xl font-black text-black mb-1 text-center">
            {t('selection.header_title', 'What do you need today?')}
          </Text>
          <Text className="text-gray-500 text-[13px] font-medium mb-3 text-center">
            {t('selection.header_subtitle', 'Select a service to start your journey')}
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('Language')}
            className="flex-row items-center bg-white px-5 py-2.5 rounded-xl shadow-sm shadow-red-100/50 "
            style={{ alignSelf: 'center', borderWidth: 1, borderColor: '#0035a0' }}
          >
            <Ionicons name="globe-outline" size={18} color="#0035a0" />
            <Text className="text-[#0035a0] ml-2 font-bold text-[13px]">
              {t('sidebar.change_language', 'Change Language')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Jobs Card */}
        <Animated.View style={{ opacity: fadeAnim1, transform: [{ translateY: slideAnim1 }] }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('JobsWorld')}
            className="bg-white rounded-2xl shadow-sm shadow-red-100/50 mb-3 p-2.5 border border-red-50/50"
          >
            <View className="flex-row justify-between mb-2">
              <View className="flex-1 pr-2 mt-0.5">
                <Text className="text-[#0035a0] text-base font-bold mb-1">
                  {t('selection.jobs_title', 'Meesent Jobs')}
                </Text>
                <Text className="text-gray-500 text-[10px] leading-relaxed">
                  {t('selection.jobs_subtitle', 'Explore local opportunities &\ndaily work updates')}
                </Text>
              </View>
              <View style={{ width: 80, height: 40, position: 'relative' }}>
                <Image
                  source={{ uri: 'https://img.icons8.com/fluency/96/briefcase.png' }}
                  style={{ width: 24, height: 24, position: 'absolute', top: 2, left: 0 }}
                  resizeMode="contain"
                />
                <Image
                  source={{ uri: 'https://img.icons8.com/color/96/search-client.png' }}
                  style={{ width: 24, height: 24, position: 'absolute', top: 0, right: 0 }}
                  resizeMode="contain"
                />
                <Image
                  source={{ uri: 'https://img.icons8.com/color/96/handshake.png' }}
                  style={{ width: 24, height: 24, position: 'absolute', bottom: 0, left: 24 }}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Footer Tabs inside Jobs Card */}
            <View className="flex-row items-center justify-between pt-2 border-t border-gray-50 mt-0.5 pb-0.5">
              <View className="flex-row items-center flex-1 justify-center">
                <Image source={{ uri: 'https://img.icons8.com/fluency/48/museum.png' }} style={{ width: 14, height: 14, marginRight: 4 }} />
                <Text className="text-[9px] font-bold text-gray-800">Govt. Jobs</Text>
              </View>
              <View className="w-[1px] h-5 bg-gray-100" />
              <View className="flex-row items-center flex-1 justify-center">
                <Image source={{ uri: 'https://img.icons8.com/color/48/briefcase.png' }} style={{ width: 14, height: 14, marginRight: 4 }} />
                <Text className="text-[9px] font-bold text-gray-800">Private Jobs</Text>
              </View>
              <View className="w-[1px] h-5 bg-gray-100" />
              <View className="flex-row items-center flex-1 justify-center">
                <Ionicons name="time-outline" size={12} color="#6366f1" style={{ marginRight: 3 }} />
                <Text className="text-[9px] font-bold text-gray-800">Part-time Jobs</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>



        {/* MART Card */}
        <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: slideAnim2 }] }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ServicesWorld')}
            className="bg-white rounded-2xl shadow-sm shadow-red-100/50 mb-3 border border-red-50/50 overflow-hidden pb-2.5"
          >
            {/* Top Row: MART Tag, Avatars, Call Icon */}
            <View className="items-center">
              <View className="bg-[#0035a0] rounded-br-[20px] w-full py-1.5 self-center text-center ">
                <Text className="text-white font-black tracking-widest text-sm text-center"> Meesent Mart</Text>
              </View>

              <View className="flex-row items-center mt-2 justify-center" style={{ gap: 8 }}>
                <Image source={{ uri: 'https://img.icons8.com/color/96/worker-male--v1.png' }} style={{ width: 22, height: 22 }} />
                <Image source={{ uri: 'https://img.icons8.com/color/96/plumber.png' }} style={{ width: 22, height: 22 }} />
                <Image source={{ uri: 'https://img.icons8.com/color/96/mechanic.png' }} style={{ width: 22, height: 22 }} />
                <Image source={{ uri: 'https://img.icons8.com/color/96/medical-doctor.png' }} style={{ width: 22, height: 22 }} />
                <Image source={{ uri: 'https://img.icons8.com/color/96/housekeeper-female.png' }} style={{ width: 22, height: 22 }} />
              </View>
            </View>

            <View className="px-3 mt-2">
              <Text className="text-black text-[11px] font-bold mb-2 w-[65%] leading-tight">
                {t('selection.services_subtitle', 'Appliances, Tech &\nProfessional Mart')}
              </Text>

              {/* 3D Products Images with Labels */}
              <View className="flex-row items-end justify-between px-1 mb-3 mt-0.5">
                <View className="items-center w-1/3">
                  <Image source={require('../../assets/images/home_appliances.png')} style={{ width: 36, height: 36, marginBottom: 4 }} resizeMode="contain" />
                  <Text className="text-[8px] font-bold text-gray-600 text-center">Home Appliances</Text>
                </View>
                <View className="items-center w-1/3">
                  <Image source={require('../../assets/images/machinery_tools.png')} style={{ width: 54, height: 44, marginBottom: 4 }} resizeMode="contain" />
                  <Text className="text-[8px] font-bold text-gray-600 text-center">Machinery & Tools</Text>
                </View>
                <View className="items-center w-1/3">
                  <Image source={require('../../assets/images/industrial_supplies.png')} style={{ width: 54, height: 44, marginBottom: 4 }} resizeMode="contain" />
                  <Text style={{ display: 'none' }} className="text-[8px] font-bold text-gray-600 text-center">Industrial Supplies</Text>
                </View>
              </View>

              {/* Bottom Gradient Button */}
              <LinearGradient
                colors={['#0035a0', '#0035a0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 8, paddingVertical: 7.5, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}
              >
                <Text className="text-white font-bold text-xs tracking-wide mr-1.5">
                  Explore Services & Products
                </Text>
                <Ionicons name="chevron-forward" size={14} color="white" />
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </Animated.View>


        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-gray-300"></View>
          <Text className="text-[15px] font-bold text-gray-600 mx-4">Just Call</Text>
          <View className="flex-1 h-px bg-gray-300"></View>
        </View>


        {/* Promo Banner */}
        <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: slideAnim3 }] }}>
          <LinearGradient
            colors={['#0035a0', '#9fc9fcff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              marginTop: -5,
              position: 'relative',
              overflow: 'hidden',
              height: 110,
              shadowColor: '#0035a0',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <View style={{ flex: 1, paddingRight: 80, zIndex: 10, height: '100%', justifyContent: 'center' }}>
              <Text style={{ color: '#ffffffff', fontSize: 13, fontWeight: '800', marginBottom: 8, lineHeight: 18, width: '100%' }}>
                Get best prices from your local service experts quickly and fast.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
                <Ionicons name="location" size={14} color="#0035a0" />
                <Text style={{ color: '#0035a0', fontSize: 10, fontWeight: 'bold', marginLeft: 4, letterSpacing: 0.5 }}>Connecting INDIA</Text>
              </View>
            </View>

            {/* Man Image */}
            <Image
              source={require('../../assets/LocalNeeds_Jobs_2.png')}
              style={{
                position: 'absolute',
                bottom: -5,
                right: -10,
                width: 120,
                height: 120,
              }}
              resizeMode="contain"
            />
          </LinearGradient>
        </Animated.View>

      </ScrollView>
    </LinearGradient>
  );
}
