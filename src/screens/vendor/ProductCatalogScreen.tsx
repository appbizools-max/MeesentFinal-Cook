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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
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
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemBrand, setItemBrand] = useState('');
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
    setItemName('');
    setItemPrice('');
    setItemDesc('');
    setItemBrand('');
    setModalVisible(true);
  };
  const openEditModal = (item: any, index: number) => {
    setEditingItemIndex(index);
    setItemName(item.name);
    setItemPrice(item.price !== null && item.price !== undefined ? String(item.price) : '');
    setItemDesc(item.description || '');
    setItemBrand(item.brand || '');
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Name is required' });
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

    const newItem = {
      name: itemName.trim(),
      price: priceNum,
      description: itemDesc.trim(),
      brand: itemBrand.trim(),
    };

    let updatedCatalog = [...catalog];
    if (editingItemIndex !== null) {
      updatedCatalog[editingItemIndex] = newItem;
    } else {
      updatedCatalog.push(newItem);
    }

    setSaving(true);
    try {
      if (!businessId) throw new Error('Business ID not found');

      const updateFields: any = {
        catalog: updatedCatalog,
      };

      if (itemBrand.trim()) {
        updateFields.brand = itemBrand.trim();
      }

      await updateDoc(doc(db, 'vendors', businessId), updateFields);

      // Save/Register Brand name to 'brands' collection for this subCategory if it doesn't exist
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
            subCategory: subCat
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
              List your {isProduct ? 'products' : 'services'} here so customers can view and request them in the user app!
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
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.catalogCard}
                onPress={() => openEditModal(item, index)}
                activeOpacity={0.7}
              >
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
            )}
          />
        )}
      </SafeAreaView>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
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
                  placeholder={isProduct ? "Describe features, sizing, or specifications..." : "Describe inclusions, duration, or key benefits..."}
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  value={itemDesc}
                  onChangeText={setItemDesc}
                />
              </View>

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
                      <Text style={styles.btnText}>Save Details</Text>
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
    backgroundColor: '#fef2f2',
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
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardInfo: { flex: 1, marginRight: 15 },
  itemName: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  itemDesc: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  itemDescEmpty: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  itemPrice: { fontSize: 18, fontWeight: '950', color: '#1e293b' },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editBadgeText: { fontSize: 9, fontWeight: '900', color: '#3b82f6' },

  // Modal Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  modalForm: { gap: 18 },
  inputGroup: { gap: 8, marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#1e293b',
  },
  textArea: { height: 100, paddingTop: 14, textAlignVertical: 'top' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 15 },
  actionBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: { backgroundColor: '#ef4444', width: 110 },
  saveBtn: { backgroundColor: '#3b82f6', flex: 1 },
  btnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});
