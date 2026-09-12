import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SelectionScreen from '@screens/SelectionScreen';
import JobsHomeScreen from '@screens/jobs/JobsHomeScreen';
import JobsListScreen from '@screens/jobs/JobsListScreen';
import AppliedJobsScreen from '@screens/jobs/AppliedJobsScreen';
import ServicesHomeScreen from '@screens/services/ServicesHomeScreen';
import ServicesScreen from '@screens/services/ServicesScreen';
import JobsProfileScreen from '@screens/profile/JobsProfileScreen';
import ServicesProfileScreen from '@screens/profile/ServicesProfileScreen';
import PostAdScreen from '../screens/jobs/PostAdScreen';
import ServiceDetailScreen from '@screens/services/ServiceDetailScreen';
import JobDetailScreen from '@screens/jobs/JobDetailScreen';
import PostJobScreen from '@screens/jobs/PostJobScreen';
import ProductsScreen from '@screens/services/ProductsScreen';
import BusinessListScreen from '@screens/services/BusinessListScreen';
import VendorRegistrationScreen from '@screens/vendor/VendorRegistrationScreen';
import SelectPlanScreen from '@screens/vendor/SelectPlanScreen';
import VendorManagementDashboard from '@screens/vendor/VendorManagementDashboard';
import AvailableJobsScreen from '@screens/vendor/AvailableJobsScreen';
import ProductCatalogScreen from '@screens/vendor/ProductCatalogScreen';
import ServicesSearchScreen from '@screens/services/ServicesSearchScreen';
import PaymentHistoryScreen from '@screens/vendor/PaymentHistoryScreen';
import BusinessPhotosScreen from '@screens/vendor/BusinessPhotosScreen';
import HelpSupportScreen from '@screens/profile/HelpSupportScreen';
import PrivacyPolicyScreen from '@screens/profile/PrivacyPolicyScreen';
import TermsConditionsScreen from '@screens/profile/TermsConditionsScreen';
import UpgradeSeekerScreen from '@screens/jobs/UpgradeSeekerScreen';
import GenuineVerificationScreen from '@screens/profile/GenuineVerificationScreen';
import BusinessVerificationScreen from '@screens/profile/BusinessVerificationScreen';
import MyActivitiesScreen from '../screens/profile/MyActivitiesScreen';
import JobsPaymentHistoryScreen from '@screens/profile/JobsPaymentHistoryScreen';
import MyPostedJobsScreen from '@screens/profile/MyPostedJobsScreen';
import MyLeadsScreen from '@screens/profile/MyLeadsScreen';
import DeleteAccountScreen from '@screens/profile/DeleteAccountScreen';
import AdminChatListScreen from '@screens/admin/AdminChatListScreen';
import AdminChatScreen from '@screens/admin/AdminChatScreen';
import GovtJobInfoScreen from '@screens/jobs/GovtJobInfoScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const JobsStack = createNativeStackNavigator();

// Custom Center Tab Button (The Purple Search FAB)
const SearchButton = ({ children, onPress, title }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      top: -25,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: { shadowColor: '#0035a0', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 15 },
        android: { elevation: 12 },
      }),
    }}
  >
    <View style={{ width: 65, height: 65, borderRadius: 32.5, backgroundColor: '#0035a0', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' }}>
      <Ionicons name="search" size={30} color="white" />
    </View>
    <Text style={{ fontSize: 10, color: '#0035a0', fontWeight: '900', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
  </TouchableOpacity>
);

function JobsTabNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#0035a0',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '900', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
        tabBarStyle: {
          height: 75 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 20 + insets.bottom,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'white',
          elevation: 30,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -15 },
          shadowOpacity: 0.08,
          shadowRadius: 25,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={JobsHomeScreen}
        options={{
          tabBarLabel: t('navigation.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={24} color={color} />
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsListScreen}
        options={{
          tabBarLabel: t('navigation.jobs'),
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={24} color={color} />
        }}
      />
      <Tab.Screen
        name="Search"
        component={JobsListScreen} // Placeholder for search
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <SearchButton {...props} title={t('navigation.search')} />
        }}
      />
      <Tab.Screen
        name="Applications"
        component={AppliedJobsScreen}
        options={{
          tabBarLabel: t('navigation.applications'),
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={24} color={color} />
        }}
      />
      <Tab.Screen
        name="Profile"
        component={JobsProfileScreen}
        options={{
          tabBarLabel: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={24} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

const ServicesStack = createNativeStackNavigator();

function ServicesStackNavigator() {
  return (
    <ServicesStack.Navigator screenOptions={{ headerShown: false }}>
      <ServicesStack.Screen name="ServicesHome" component={ServicesHomeScreen} />
      <ServicesStack.Screen name="ServicesList" component={ServicesScreen} />
      <ServicesStack.Screen name="ProductsList" component={ProductsScreen} />
      <ServicesStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
    </ServicesStack.Navigator>
  );
}

function ServicesTabNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: '#0035a0',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          marginBottom: 6
        },
        tabBarStyle: {
          height: 75 + insets.bottom,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          paddingBottom: 20 + insets.bottom,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={ServicesHomeScreen}
        options={{
          tabBarLabel: t('navigation.home'),
          tabBarIcon: ({ color }) => <FontAwesome5 name="home" size={20} color={color} />
        }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServicesScreen}
        options={{
          tabBarLabel: t('navigation.services'),
          tabBarIcon: ({ color }) => <FontAwesome5 name="th-large" size={20} color={color} />
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ServicesProfileScreen}
        options={{
          tabBarLabel: t('navigation.profile'),
          tabBarIcon: ({ color }) => <FontAwesome5 name="user-alt" size={20} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

function JobsWorldNavigator() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShown: false }}>
      <JobsStack.Screen name="JobsTabs" component={JobsTabNavigator} />
      <JobsStack.Screen 
        name="JobDetail" 
        component={JobDetailScreen} 
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade'
        }}
      />
      <JobsStack.Screen name="PostJob" component={PostJobScreen} />
      <JobsStack.Screen name="PostAd" component={PostAdScreen} />
      <JobsStack.Screen name="MyActivities" component={MyActivitiesScreen} />
      <JobsStack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <JobsStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <JobsStack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <JobsStack.Screen name="UpgradeSeeker" component={UpgradeSeekerScreen} />
      <JobsStack.Screen name="GenuineVerification" component={GenuineVerificationScreen} />
      <JobsStack.Screen name="JobsPaymentHistory" component={JobsPaymentHistoryScreen} />
      <JobsStack.Screen name="MyPostedJobs" component={MyPostedJobsScreen} />
      <JobsStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <JobsStack.Screen name="AdminChatList" component={AdminChatListScreen} />
      <JobsStack.Screen name="AdminChat" component={AdminChatScreen} />
      <JobsStack.Screen name="GovtJobInfo" component={GovtJobInfoScreen} />
    </JobsStack.Navigator>
  );
}

function ServicesWorldNavigator() {
  return (
    <ServicesStack.Navigator screenOptions={{ headerShown: false }}>
      <ServicesStack.Screen name="ServicesTabs" component={ServicesTabNavigator} />
      <ServicesStack.Screen name="ServicesSearch" component={ServicesSearchScreen} />
      <ServicesStack.Screen name="ServicesList" component={ServicesScreen} />
      <ServicesStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <ServicesStack.Screen name="ProductsList" component={ProductsScreen} />
      <ServicesStack.Screen name="BusinessList" component={BusinessListScreen} />
      <ServicesStack.Screen name="VendorRegistration" component={VendorRegistrationScreen} />
      <ServicesStack.Screen name="SelectPlan" component={SelectPlanScreen} />
      <ServicesStack.Screen name="VendorDashboard" component={VendorManagementDashboard} />
      <ServicesStack.Screen name="ProductCatalog" component={ProductCatalogScreen} />
      <ServicesStack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <ServicesStack.Screen name="BusinessPhotos" component={BusinessPhotosScreen} />
      <ServicesStack.Screen name="MyActivities" component={MyActivitiesScreen} />
      <ServicesStack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <ServicesStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <ServicesStack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <ServicesStack.Screen name="BusinessVerification" component={BusinessVerificationScreen} />
      <ServicesStack.Screen name="PostAd" component={PostAdScreen} />
      <ServicesStack.Screen name="MyLeads" component={MyLeadsScreen} />
      <ServicesStack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <ServicesStack.Screen name="AvailableJobs" component={AvailableJobsScreen} />
      <ServicesStack.Screen name="AdminChatList" component={AdminChatListScreen} />
      <ServicesStack.Screen name="AdminChat" component={AdminChatScreen} />
      <ServicesStack.Screen name="GovtJobInfo" component={GovtJobInfoScreen} />
    </ServicesStack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Selection" component={SelectionScreen} />
      <Stack.Screen name="JobsWorld" component={JobsWorldNavigator} options={{ animation: 'none' }} />
      <Stack.Screen name="ServicesWorld" component={ServicesWorldNavigator} options={{ animation: 'none' }} />
    </Stack.Navigator>
  );
}
