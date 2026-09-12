import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import * as Location from 'expo-location';
import { useServicesStore } from '../../state/store';
import { geofireHelper } from '../../services/geofire';
import { Ionicons } from '@expo/vector-icons';

export default function CreateServiceScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const createService = useServicesStore(state => state.createService);

  const handleGetCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permissions are required to fetch your coordinates.');
        setLocating(false);
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLat(locationData.coords.latitude.toString());
      setLng(locationData.coords.longitude.toString());
      ToastAndroidSuccess('Location acquired!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to acquire location.');
    } finally {
      setLocating(false);
    }
  };

  const ToastAndroidSuccess = (msg: string) => {
    Alert.alert('Location Update', msg);
  };

  const handleSubmit = async () => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (!title.trim() || !description.trim()) {
      Alert.alert('Fields Required', 'Please enter a service title and description.');
      return;
    }

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      Alert.alert('Coordinates Required', 'Please provide valid latitude and longitude coordinates.');
      return;
    }

    setLoading(true);
    try {
      // Compute geohash using geofire-common helper
      const geohash = geofireHelper.encodeLocation(parsedLat, parsedLng);

      await createService(title, description, parsedLat, parsedLng, geohash);
      Alert.alert('Success', 'Your service offering was listed successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to publish service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Register Your Service Listing</Text>
      
      <View style={styles.field}>
        <Text style={styles.label}>Service / Business Name</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Premium Plumber Services" 
          value={title} 
          onChangeText={setTitle} 
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Service Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="List your expertise, rates, working hours..." 
          value={description} 
          onChangeText={setDescription} 
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.coordinatesWrapper}>
        <Text style={styles.label}>Business Coordinates</Text>
        <View style={styles.coordRow}>
          <TextInput 
            style={[styles.input, styles.coordInput]} 
            placeholder="Latitude (e.g. 17.44)" 
            value={lat} 
            onChangeText={setLat}
            keyboardType="numeric"
          />
          <TextInput 
            style={[styles.input, styles.coordInput]} 
            placeholder="Longitude (e.g. 78.37)" 
            value={lng} 
            onChangeText={setLng}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity 
          style={styles.gpsBtn} 
          onPress={handleGetCurrentLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color="#3b82f6" />
          ) : (
            <>
              <Ionicons name="location" size={16} color="#3b82f6" />
              <Text style={styles.gpsBtnText}>Get GPS Coordinates</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.submitBtn} 
        onPress={handleSubmit} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitText}>List Service Offering</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 15,
    color: '#0f172a'
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  coordinatesWrapper: { marginBottom: 25 },
  coordRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  coordInput: { flex: 1 },
  gpsBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff', 
    paddingVertical: 10, 
    borderRadius: 8,
    gap: 6
  },
  gpsBtnText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  submitBtn: { 
    backgroundColor: '#3b82f6', 
    paddingVertical: 14, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  submitText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
