import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../../services/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2; // Two columns grid with nice paddings

export default function BusinessPhotosScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [showImageRemoveModal, setShowImageRemoveModal] = useState(false);
  const [imageToRemove, setImageToRemove] = useState<number | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const businessIdFromRoute = route.params?.businessId;

  useEffect(() => {
    resolveBusinessId();
  }, [businessIdFromRoute]);

  const resolveBusinessId = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      let targetBusinessId = businessIdFromRoute;

      if (!targetBusinessId) {
        const userDocSnap = await getDoc(doc(db, 'users', userId));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          targetBusinessId = userData.businessId;
        }
      }

      if (!targetBusinessId) {
        targetBusinessId = userId;
      }

      setBusinessId(targetBusinessId);
      fetchBusinessImages(targetBusinessId);
    } catch (error) {
      console.error("Error resolving business ID:", error);
    }
  };

  const fetchBusinessImages = async (targetBusinessId: string) => {
    try {
      if (!targetBusinessId) return;

      const docSnap = await getDoc(doc(db, 'vendors', targetBusinessId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: 'Could not load your business photos.'
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permission Required',
        text2: 'Please allow access to your photos to upload media!'
      });
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setUpdating(true);
        const newUris = result.assets.map(asset => asset.uri);
        const uploadedUrls: string[] = [];

        for (let i = 0; i < newUris.length; i++) {
          const uri = newUris[i];
          try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const filename = `vendors/${businessId}/showcase_${Date.now()}_${i}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            const downloadUrl = await getDownloadURL(storageRef);
            uploadedUrls.push(downloadUrl);
          } catch (uploadError) {
            console.error('Error uploading photo:', uploadError);
            uploadedUrls.push(uri); // fallback
          }
        }

        const updatedImages = [...images, ...uploadedUrls];

        if (businessId) {
          const vendorDocRef = doc(db, 'vendors', businessId);
          const docSnap = await getDoc(vendorDocRef);
          
          if (docSnap.exists()) {
            await updateDoc(vendorDocRef, {
              images: updatedImages
            });
          } else {
            await setDoc(vendorDocRef, {
              images: updatedImages
            }, { merge: true });
          }
          
          setImages(updatedImages);
          Toast.show({
            type: 'success',
            text1: 'Photos Uploaded',
            text2: `Successfully added ${newUris.length} photos!`
          });
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: 'Something went wrong while uploading.'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageToRemove(index);
    setShowImageRemoveModal(true);
  };

  const confirmRemoveImage = async () => {
    if (imageToRemove !== null) {
      try {
        setUpdating(true);
        const updatedImages = images.filter((_, idx) => idx !== imageToRemove);

        if (businessId) {
          const vendorDocRef = doc(db, 'vendors', businessId);
          const docSnap = await getDoc(vendorDocRef);
          
          if (docSnap.exists()) {
            await updateDoc(vendorDocRef, {
              images: updatedImages
            });
          } else {
            await setDoc(vendorDocRef, {
              images: updatedImages
            }, { merge: true });
          }
          
          setImages(updatedImages);
          setShowImageRemoveModal(false);
          setImageToRemove(null);
          Toast.show({
            type: 'success',
            text1: 'Photo Deleted',
            text2: 'Photo removed from your showcase.'
          });
        }
      } catch (error) {
        console.error("Delete error:", error);
        Toast.show({
          type: 'error',
          text1: 'Delete Failed',
          text2: 'Could not remove the photo.'
        });
      } finally {
        setUpdating(false);
      }
    }
  };

  const cancelRemoveImage = () => {
    setShowImageRemoveModal(false);
    setImageToRemove(null);
  };

  const reorderPhoto = async (index: number, direction: 'prev' | 'next') => {
    try {
      setUpdating(true);
      const updatedImages = [...images];
      const targetIndex = direction === 'prev' ? index - 1 : index + 1;
      
      // Swap positions
      const temp = updatedImages[index];
      updatedImages[index] = updatedImages[targetIndex];
      updatedImages[targetIndex] = temp;

      if (businessId) {
        const vendorDocRef = doc(db, 'vendors', businessId);
        const docSnap = await getDoc(vendorDocRef);
        
        if (docSnap.exists()) {
          await updateDoc(vendorDocRef, {
            images: updatedImages
          });
        } else {
          await setDoc(vendorDocRef, {
            images: updatedImages
          }, { merge: true });
        }
        
        setImages(updatedImages);
        Toast.show({
          type: 'success',
          text1: 'Sequence Updated',
          text2: `Photo moved to position #${targetIndex + 1}`
        });
      }
    } catch (error) {
      console.error("Reorder error:", error);
      Toast.show({
        type: 'error',
        text1: 'Reorder Failed',
        text2: 'Could not update photo sequence.'
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loaderText}>Loading your gallery...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>MANAGE SHOWCASE</Text>
          <Text style={styles.headerTitle}>Photos & Showcase</Text>
        </View>
        {updating && <ActivityIndicator size="small" color="#3b82f6" />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ ...styles.scrollContent, paddingBottom: 60 + insets.bottom }}>
        
        {/* Dynamic Card Info */}
        <View style={styles.infoCard}>
          <LinearGradient colors={['#fef2f2', '#fee2e2']} style={styles.infoGradient}>
            <Ionicons name="images" size={24} color="#3b82f6" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Arrange Photos Sequence ({images.length})</Text>
              <Text style={styles.infoDesc}>
                Tapping back/forward arrows on each image changes its sequence. The first image (★ Cover) is shown as the primary listing photo.
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Upload Button Card */}
        <TouchableOpacity style={styles.addImagesButton} onPress={uploadPhotos} activeOpacity={0.8}>
          <Ionicons name="images-outline" size={24} color="#3b82f6" />
          <Text style={styles.addImagesButtonText}>Add Business Images</Text>
          <Text style={styles.addImagesButtonSub}>Tap to select multiple photos</Text>
        </TouchableOpacity>

        {/* Media Grid Section */}
        {images.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="image-outline" size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No Photos Yet</Text>
            <Text style={styles.emptyDesc}>
              Your showcase gallery is empty. Upload your first business photos today!
            </Text>
          </View>
        ) : (
          <View style={styles.mediaGrid}>
            {images.map((uri, index) => (
              <View key={index} style={styles.gridItem}>
                <TouchableOpacity onPress={() => { setPreviewImage(uri); setPreviewIndex(index); }} activeOpacity={0.9} style={{ width: '100%', height: '100%' }}>
                  <Image source={{ uri }} style={styles.gridImage} />
                </TouchableOpacity>

                {/* Sequence Indicator Badge */}
                <View style={[styles.sequenceBadge, index === 0 && styles.coverBadge]}>
                  <Text style={styles.sequenceText}>
                    {index === 0 ? '★ Cover' : `#${index + 1}`}
                  </Text>
                </View>

                {/* Frosted Control Toolbar */}
                <View style={styles.cardToolbar}>
                  {index > 0 ? (
                    <TouchableOpacity
                      style={styles.toolbarBtn}
                      onPress={() => reorderPhoto(index, 'prev')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={16} color="white" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.toolbarPlaceholder} />
                  )}

                  <TouchableOpacity
                    style={[styles.toolbarBtn, styles.deleteBtn]}
                    onPress={() => handleRemoveImage(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={14} color="#fecaca" />
                  </TouchableOpacity>

                  {index < images.length - 1 ? (
                    <TouchableOpacity
                      style={styles.toolbarBtn}
                      onPress={() => reorderPhoto(index, 'next')}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={16} color="white" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.toolbarPlaceholder} />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Modern Immersive Fullscreen Preview Modal with Slider */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity 
            style={styles.modalCloseBtn} 
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          
          {/* Image Counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>{previewIndex + 1} / {images.length}</Text>
          </View>

          {/* Navigation Buttons */}
          {previewIndex > 0 && (
            <TouchableOpacity 
              style={styles.navButtonLeft}
              onPress={() => {
                setPreviewIndex(previewIndex - 1);
                setPreviewImage(images[previewIndex - 1]);
              }}
            >
              <Ionicons name="chevron-back" size={32} color="white" />
            </TouchableOpacity>
          )}
          
          {previewIndex < images.length - 1 && (
            <TouchableOpacity 
              style={styles.navButtonRight}
              onPress={() => {
                setPreviewIndex(previewIndex + 1);
                setPreviewImage(images[previewIndex + 1]);
              }}
            >
              <Ionicons name="chevron-forward" size={32} color="white" />
            </TouchableOpacity>
          )}

          {previewImage && (
            <Image 
              source={{ uri: previewImage }} 
              style={styles.fullscreenImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

      {/* Image Removal Confirmation Modal */}
      <Modal visible={showImageRemoveModal} transparent animationType="fade">
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalIconContainer}>
              <Ionicons name="warning-outline" size={48} color="#f59e0b" />
            </View>
            <Text style={styles.confirmModalTitle}>Remove Image?</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to remove this image permanently? This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={cancelRemoveImage}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalConfirmButton}
                onPress={confirmRemoveImage}
              >
                <Text style={styles.confirmModalConfirmText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loaderText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: 'bold' },
  
  header: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: { flex: 1 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', color: '#3b82f6', letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  
  scrollContent: { padding: 16, paddingBottom: 60 },
  
  infoCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  infoGradient: { padding: 16, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#991b1b', marginBottom: 2 },
  infoDesc: { fontSize: 12, color: '#3b82f6', lineHeight: 18 },
  
  // Multi-Image Upload Button
  addImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#fecaca',
    borderStyle: 'dashed',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 24,
    justifyContent: 'center',
    gap: 12,
  },
  addImagesButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3b82f6',
  },
  addImagesButtonSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: 'white', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#cbd5e1' },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  gridItem: { width: (width - 48) / 2, height: (width - 48) / 2, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e8f0', borderWidth: 2, borderColor: '#e2e8f0', position: 'relative' },
  gridImage: { width: '100%', height: '100%' },
  
  sequenceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  coverBadge: {
    backgroundColor: '#d97706',
    borderColor: '#fbbf24',
  },
  sequenceText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  cardToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    zIndex: 2,
  },
  toolbarBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  toolbarPlaceholder: {
    width: 28,
  },
  
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center' },
  modalCloseBtn: { position: 'absolute', top: 50, right: 24, zIndex: 10 },
  imageCounter: {
    position: 'absolute',
    top: 50,
    left: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  imageCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  navButtonLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navButtonRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenImage: { width: width, height: width * 1.3 },

  // Image Removal Confirmation Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  confirmModalCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
  },
  confirmModalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalConfirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
