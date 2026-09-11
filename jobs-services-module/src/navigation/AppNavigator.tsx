import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import Screens
import BrowseJobsScreen from '../screens/jobs/BrowseJobsScreen';
import PostJobScreen from '../screens/jobs/PostJobScreen';
import NearbyServicesScreen from '../screens/services/NearbyServicesScreen';
import CreateServiceScreen from '../screens/services/CreateServiceScreen';

const Tab = createBottomTabNavigator();
const JobsStack = createNativeStackNavigator();
const ServicesStack = createNativeStackNavigator();

function JobsStackNavigator() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShown: true }}>
      <JobsStack.Screen 
        name="BrowseJobs" 
        component={BrowseJobsScreen} 
        options={{ title: 'Jobs in Your District' }} 
      />
      <JobsStack.Screen 
        name="PostJob" 
        component={PostJobScreen} 
        options={{ title: 'Post a New Job' }} 
      />
    </JobsStack.Navigator>
  );
}

function ServicesStackNavigator() {
  return (
    <ServicesStack.Navigator screenOptions={{ headerShown: true }}>
      <ServicesStack.Screen 
        name="NearbyServices" 
        component={NearbyServicesScreen} 
        options={{ title: 'Services Near You (8km)' }} 
      />
      <ServicesStack.Screen 
        name="CreateService" 
        component={CreateServiceScreen} 
        options={{ title: 'Register a Service' }} 
      />
    </ServicesStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'briefcase';

          if (route.name === 'JobsTab') {
            iconName = 'briefcase';
          } else if (route.name === 'ServicesTab') {
            iconName = 'construct';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
      })}
    >
      <Tab.Screen 
        name="JobsTab" 
        component={JobsStackNavigator} 
        options={{ tabBarLabel: 'Jobs Feed' }} 
      />
      <Tab.Screen 
        name="ServicesTab" 
        component={ServicesStackNavigator} 
        options={{ tabBarLabel: 'Services Directory' }} 
      />
    </Tab.Navigator>
  );
}
