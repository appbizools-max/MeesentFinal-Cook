import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../../services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const PRIMARY_COLOR = '#3b82f6';

export default function ProductCatalogScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorData, setVendorData] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const businessIdFromRoute = route.params?.businessId;

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [addMode, setAddMode] = useState<'form' | 'image'>('form');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemImage, setItemImage] = useState<string | null>(null);

  useEffect(() => {
    resolveBusinessId();
  }, [businessIdFromRoute]);

  const resolveBusinessId = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    let targetBusinessId = businessIdFromRoute;
    if (!targetBusinessId) {
      const userDocSnap = await getDoc(doc(db, 'users', userId));
      if (userDocSnap.exists()) {
        targetBusinessId = userDocSnap.data().businessId;
      }
    }
    if (!targetBusinessId) {
      targetBusinessId = userId;
    }
    setBusinessId(targetBusinessId);
    fetchCatalog(targetBusinessId);
  };

  const fetchCatalog = async (targetBusinessId: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'vendors', targetBusinessId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVendorData(data);
        setCatalog(data.catalog || []);
      }
    } catch (error) {
      console.error("Error fetching catalog:", error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load catalog' });
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingItemIndex(null);
    setAddMode('form');
    setItemName('');
    setItemPrice('');
    setItemDesc('');
    setItemBrand('');
    setItemImage(null);
    setModalVisible(true);
  };

  const openEditModal = (item: any, index: number) => {
    setEditingItemIndex(index);
    setItemName(item.name || '');
    setItemPrice(item.price !== null && item.price !== undefined ? String(item.price) : '');
    setItemDesc(item.description || '');
    setItemBrand(item.brand || '');
    const existingImg = item.imageUrl || item.image || null;
    setItemImage(existingImg);
    setAddMode(existingImg ? 'image' : 'form');
    setModalVisible(true);
  };

  // Image Picker Handlers
  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Please allow access to your photos.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setItemImage(result.assets[0].uri);
    }
  };

  const takePhotoWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Please allow camera access.' });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setItemImage(result.assets[0].uri);
    }
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: addMode === 'image' ? 'Title / Name is required' : 'Name is required',
      });
      return;
    }

    if (addMode === 'image' && !itemImage) {
      Toast.show({ type: 'error', text1: 'Image Required', text2: 'Please upload or select an image flyer.' });
      return;
    }

    let priceNum: number | null = null;
    if (itemPrice && String(itemPrice).trim()) {
      priceNum = parseFloat(String(itemPrice));
      if (isNaN(priceNum) || priceNum < 0) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid price' });
        return;
      }
    }

    setSaving(true);

    try {
      if (!businessId) throw new Error('Business ID not found');

      let finalImageUrl: string | null = itemImage;

      // Upload local image uri to Firebase Storage if newly selected
      if (itemImage && (itemImage.startsWith('file:') || itemImage.startsWith('content:') || itemImage.startsWith('ph:'))) {
        try {
          const response = await fetch(itemImage);
          const blob = await response.blob();
          const filename = `vendors/${businessId}/catalog_${Date.now()}.jpg`;
          const storageRef = ref(storage, filename);
          await uploadBytes(storageRef, blob);
          finalImageUrl = await getDownloadURL(storageRef);
        } catch (uploadErr) {
          console.error("Storage upload failed, fallback to local:", uploadErr);
        }
      }

      const newItem = {
        name: itemName.trim(),
        price: priceNum,
        description: itemDesc.trim(),
        brand: itemBrand.trim(),
        imageUrl: finalImageUrl,
        entryType: addMode,
      };

      let updatedCatalog = [...catalog];
      if (editingItemIndex !== null) {
        updatedCatalog[editingItemIndex] = newItem;
      } else {
        updatedCatalog.push(newItem);
      }

      const updateFields: any = { catalog: updatedCatalog };

      // Also sync uploaded flyer / photo into the business gallery (images field)
      if (finalImageUrl) {
        try {
          const vRef = doc(db, 'vendors', businessId);
          const vSnap = await getDoc(vRef);
          const currentData = vSnap.exists() ? vSnap.data() : (vendorData || {});
          const currentImages: string[] = Array.isArray(currentData.images) ? [...currentData.images] : [];
          if (!currentImages.includes(finalImageUrl)) {
            currentImages.unshift(finalImageUrl);
            updateFields.images = currentImages;
          }
        } catch (imgSyncErr) {
          console.warn('Could not sync image to business gallery:', imgSyncErr);
        }
      }

      if (itemBrand.trim()) {
        updateFields.brand = itemBrand.trim();
      }

      await updateDoc(doc(db, 'vendors', businessId), updateFields);

      if (updateFields.images) {
        setVendorData((prev: any) => ({ ...prev, images: updateFields.images }));
      }

      // Save brand name to 'brands' collection if specified
      if (itemBrand.trim() && vendorData) {
        const cleanBrand = itemBrand.trim();
        const subCat = vendorData.subCategory || '';
        const cat = vendorData.category || '';

        const brandQuery = query(
          collection(db, 'brands'),
          where('brandName', '==', cleanBrand),
          where('subCategory', '==', subCat)
        );
        const brandSnap = await getDocs(brandQuery);
        if (brandSnap.empty) {
          await addDoc(collection(db, 'brands'), {
            brandName: cleanBrand,
            category: cat,
            categoryName: cat,
            subCategory: subCat,
          });
        }
      }

      setCatalog(updatedCatalog);
      setModalVisible(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: editingItemIndex !== null ? 'Item updated successfully!' : 'Item added successfully!',
      });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Save Failed', text2: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (index: number) => {
    let updatedCatalog = catalog.filter((_, i) => i !== index);

    setSaving(true);
    try {
      if (!businessId) throw new Error('Business ID not found');

      await updateDoc(doc(db, 'vendors', businessId), {
        catalog: updatedCatalog,
      });

      setCatalog(updatedCatalog);
      setModalVisible(false);
      Toast.show({ type: 'success', text1: 'Deleted', text2: 'Item removed from catalog!' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Delete Failed', text2: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  const isProduct = vendorData?.type === 'product';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>MANAGE CATALOG</Text>
            <Text style={styles.headerTitle}>
              {isProduct ? 'Product Catalog' : 'Service List'}
            </Text>
          </View>
          <TouchableOpacity style={styles.addIconBtn} onPress={openAddModal}>
            <Ionicons name="add" size={26} color="white" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {catalog.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.emptyIconBox}>
              <Ionicons name={isProduct ? "cart-outline" : "construct-outline"} size={60} color="#3b82f6" />
            </View>
            <Text style={styles.emptyTitle}>Your Catalog is Empty</Text>
            <Text style={styles.emptyDesc}>
              List your {isProduct ? 'products' : 'services'} here by typing details or uploading menu flyers so customers can view them in the app!
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal}>
              <Text style={styles.emptyAddText}>
                Add First {isProduct ? 'Product' : 'Service'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <FlatList
            data={catalog}
            keyExtractor={(_, index) => String(index)}
            contentContainerStyle={{ ...styles.listPadding, paddingBottom: 50 + insets.bottom }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const img = item.imageUrl || item.image;
              return (
                <TouchableOpacity
                  style={styles.catalogCard}
                  onPress={() => openEditModal(item, index)}
                  activeOpacity={0.7}
                >
                  {img ? (
                    <Image source={{ uri: img }} style={styles.cardImageThumbnail} resizeMode="cover" />
                  ) : (
                    <View style={styles.cardIconBox}>
                      <Ionicons name={isProduct ? "cube-outline" : "construct-outline"} size={24} color="#3b82f6" />
                    </View>
                  )}

                  <View style={styles.cardInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.brand ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="pricetag-outline" size={11} color="#3b82f6" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#3b82f6' }}>
                          {item.brand}
                        </Text>
                      </View>
                    ) : null}
                    {item.description ? (
                      <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                    ) : (
                      <Text style={styles.itemDescEmpty}>No description provided</Text>
                    )}
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={[styles.itemPrice, (item.price === null || item.price === undefined || item.price === '') && { fontSize: 11, color: '#94a3b8' }]}>
                      {item.price !== null && item.price !== undefined && item.price !== '' ? `₹${item.price}` : 'Price on Request'}
                    </Text>
                    <View style={styles.editBadge}>
                      <Ionicons name="pencil" size={12} color="#3b82f6" />
                      <Text style={styles.editBadgeText}>EDIT</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>

      {/* Add / Edit Service Modal Popup */}
      <Modal visible={modalVisible} animationType="fade" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)} 
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItemIndex !== null ? (isProduct ? 'Edit Product' : 'Edit Service') : (isProduct ? 'Add Product' : 'Add Service')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={32} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Mode Switcher Segment Tabs */}
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[styles.segmentTab, addMode === 'form' && styles.segmentTabActive]}
                onPress={() => setAddMode('form')}
              >
                <Ionicons name="create-outline" size={16} color={addMode === 'form' ? 'white' : '#64748b'} />
                <Text style={[styles.segmentText, addMode === 'form' && styles.segmentTextActive]}>
                  Manual Details
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, addMode === 'image' && styles.segmentTabActive]}
                onPress={() => setAddMode('image')}
              >
                <Ionicons name="image-outline" size={16} color={addMode === 'image' ? 'white' : '#64748b'} />
                <Text style={[styles.segmentText, addMode === 'image' && styles.segmentTextActive]}>
                  Upload Flyer / Photo
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              {addMode === 'form' ? (
                /* WAY 1: PRESET FORM INPUTS */
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{isProduct ? 'Product Name' : 'Service Name'}</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder={isProduct ? "e.g. Premium Hair Oil" : "e.g. Classic Haircut & Massage"}
                      placeholderTextColor="#94a3b8"
                      value={itemName}
                      onChangeText={setItemName}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Brand Name (Optional)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Samsung, Nike, Local Brand"
                      placeholderTextColor="#94a3b8"
                      value={itemBrand}
                      onChangeText={setItemBrand}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Price (₹)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 299"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={itemPrice}
                      onChangeText={setItemPrice}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Description (Optional)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder={isProduct ? "Describe features, sizing, specifications..." : "Describe inclusions, duration, key benefits..."}
                      placeholderTextColor="#94a3b8"
                      multiline
                      numberOfLines={4}
                      value={itemDesc}
                      onChangeText={setItemDesc}
                    />
                  </View>
                </>
              ) : (
                /* WAY 2: IMAGE / FLYER UPLOAD WITH TITLE */
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Service / Flyer Title *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder={isProduct ? "e.g. Summer Special Product Banner" : "e.g. Complete Salon Price List / Flyer"}
                      placeholderTextColor="#94a3b8"
                      value={itemName}
                      onChangeText={setItemName}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Upload Photo / Menu Flyer *</Text>
                    {itemImage ? (
                      <View style={styles.imagePreviewWrapper}>
                        <Image source={{ uri: itemImage }} style={styles.imagePreview} resizeMode="cover" />
                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => setItemImage(null)}>
                          <Ionicons name="trash" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.imagePickerBox}>
                        <Ionicons name="cloud-upload-outline" size={38} color="#3b82f6" />
                        <Text style={styles.imagePickerTitle}>Select Service Menu / Flyer</Text>
                        <Text style={styles.imagePickerSubtitle}>Upload photo of your price list, menu card, or package</Text>

                        <View style={styles.imagePickerBtnRow}>
                          <TouchableOpacity style={styles.uploadChoiceBtn} onPress={pickImageFromGallery}>
                            <Ionicons name="images-outline" size={18} color="#3b82f6" />
                            <Text style={styles.uploadChoiceText}>Gallery</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.uploadChoiceBtn} onPress={takePhotoWithCamera}>
                            <Ionicons name="camera-outline" size={18} color="#3b82f6" />
                            <Text style={styles.uploadChoiceText}>Camera</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </>
              )}

              <View style={styles.btnRow}>
                {editingItemIndex !== null && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDeleteItem(editingItemIndex)}
                    disabled={saving}
                  >
                    <Ionicons name="trash-outline" size={18} color="white" />
                    <Text style={styles.btnText}>Delete</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, styles.saveBtn, editingItemIndex === null && { flex: 1 }]}
                  onPress={handleSaveItem}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="white" />
                      <Text style={styles.btnText}>Save Service</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  safeArea: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  addIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 80,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 12 },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  emptyAddBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyAddText: { color: 'white', fontSize: 14, fontWeight: 'bold' },

  // List View
  listPadding: { padding: 15, paddingBottom: 50 },
  catalogCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImageThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: '#e2e8f0',
  },
  cardIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: { flex: 1, marginRight: 10 },
  itemName: { fontSize: 15, fontWeight: '900', color: '#1e293b', marginBottom: 3 },
  itemDesc: { fontSize: 12, color: '#64748b', lineHeight: 17 },
  itemDescEmpty: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  itemPrice: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 8 },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editBadgeText: { fontSize: 9, fontWeight: '900', color: '#3b82f6' },

  // Modal Popup (Proper Centered Dialog)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 22,
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },

  // Segment Tabs
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  segmentTextActive: { color: 'white' },

  modalForm: { gap: 16 },
  inputGroup: { gap: 6, marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 50,
    fontSize: 14,
    color: '#1e293b',
  },
  textArea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },

  // Image Picker UI
  imagePickerBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginTop: 8 },
  imagePickerSubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4, marginBottom: 14 },
  imagePickerBtnRow: { flexDirection: 'row', gap: 12 },
  uploadChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  uploadChoiceText: { fontSize: 13, fontWeight: '700', color: '#3b82f6' },

  imagePreviewWrapper: { position: 'relative', borderRadius: 16, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 180, borderRadius: 16, backgroundColor: '#e2e8f0' },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ef4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 15, marginBottom: 10 },
  actionBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: { backgroundColor: '#ef4444', width: 100 },
  saveBtn: { backgroundColor: '#3b82f6', flex: 1 },
  btnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});
