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
import { Picker } from '@react-native-picker/picker'; // Standard picker
import { useJobsStore } from '../../state/store';

const DISTRICTS = [
  'Adilabad',
  'Anantapur',
  'Chittoor',
  'Guntur',
  'Hyderabad',
  'Kakinada',
  'Karimnagar',
  'Khammam',
  'Kurnool',
  'Mahbubnagar',
  'Medak',
  'Nalgonda',
  'Nellore',
  'Nizamabad',
  'Rajahmundry',
  'Rangareddy',
  'Srikakulam',
  'Tirupati',
  'Vijayawada',
  'Vizianagaram',
  'Warangal'
];

export default function PostJobScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState(DISTRICTS[4]); // default Hyderabad
  const [loading, setLoading] = useState(false);
  const createJob = useJobsStore(state => state.createJob);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Fields Required', 'Please enter a job title and description.');
      return;
    }

    setLoading(true);
    try {
      await createJob(title, description, district);
      Alert.alert('Success', 'Your job listing was created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to list the job.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Create a Job Post</Text>
      
      <View style={styles.field}>
        <Text style={styles.label}>Job Title</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Sales Executive" 
          value={title} 
          onChangeText={setTitle} 
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Job Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Enter details, salary, requirements..." 
          value={description} 
          onChangeText={setDescription} 
          multiline
          numberOfLines={6}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Target District</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={district}
            onValueChange={(itemValue) => setDistrict(itemValue)}
          >
            {DISTRICTS.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.submitBtn} 
        onPress={handleSubmit} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitText}>Submit Job Listing</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
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
  textArea: { height: 120, textAlignVertical: 'top' },
  pickerContainer: { 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    borderRadius: 8, 
    overflow: 'hidden' 
  },
  submitBtn: { 
    backgroundColor: '#3b82f6', 
    paddingVertical: 14, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10 
  },
  submitText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});
