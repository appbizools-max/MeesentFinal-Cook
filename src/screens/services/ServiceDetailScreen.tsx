import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc, getDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';

const { width } = Dimensions.get('window');

export default function ServiceDetailScreen({ route, navigation }: any) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { service } = route.params;

  const [currentService, setCurrentService] = useState<any>(service);
  const displayService = currentService || service;

  const [userRating, setUserRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  const serviceLocationName = String(displayService.location || '').split(',')[0] || 'Local';
  const serviceSubCategory = String(displayService.subCategory || '').toLowerCase();

  const totalReviews = reviewsList.length;
  const averageRating = totalReviews > 0
    ? (reviewsList.reduce((acc, curr) => acc + (curr.rating || 0), 0) / totalReviews).toFixed(1)
    : (displayService.rating ? Number(displayService.rating).toFixed(1) : '5.0');

  const tabs = [
    t('service_detail.overview'),
    displayService.type === 'product' ? t('service_detail.featured_products') : t('service_detail.featured_services'),
    t('service_detail.gallery')
  ];

  const [activeTab, setActiveTab] = useState(t('service_detail.overview'));

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'vendors', service.id), (snapshot) => {
      if (snapshot.exists()) {
        setCurrentService({ id: snapshot.id, ...snapshot.data() });
      }
    });
    return () => unsub();
  }, [service.id]);

  useEffect(() => {
    const logProfileView = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        // Make exception: if the vendor owner views their own profile, do not count
        const vendorOwnerId = displayService.ownerId || displayService.userId;
        if (currentUser.uid === vendorOwnerId) {
          console.log("Visitor is the vendor owner themselves, skipping lead log.");
          return;
        }

        // Check if we logged a view lead in the last 1 hour
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        let recentView = false;

        try {
          const q = query(
            collection(db, 'leads'),
            where('vendorId', '==', displayService.id || service.id),
            where('userId', '==', currentUser.uid),
            where('type', '==', 'view')
          );
          const querySnap = await getDocs(q);
          querySnap.forEach(docSnap => {
            const data = docSnap.data();
            const viewTime = new Date(data.createdAt);
            if (viewTime > oneHourAgo) {
              recentView = true;
            }
          });
        } catch (queryErr) {
          // If query fails due to rule constraints, log warning and proceed to add lead if possible
          console.warn("Could not query existing view leads:", queryErr);
        }

        if (recentView) {
          console.log("Profile view lead logged recently, skipping.");
          return;
        }

        // Fetch viewer's user profile details
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        let userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Guest User';
        let userPhone = currentUser.phoneNumber || '';

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.name) userName = userData.name;
          if (userData.phoneNumber) userPhone = userData.phoneNumber;
        }

        await addDoc(collection(db, 'leads'), {
          vendorId: displayService.id || service.id,
          vendorName: displayService.businessName || service.businessName,
          vendorOwnerId: displayService.ownerId || displayService.userId || service.ownerId || service.userId || '',
          userId: currentUser.uid,
          userName,
          userPhone,
          type: 'view',
          createdAt: new Date().toISOString(),
        });

        const targetVendorDocId = displayService.id || service.id;
        if (targetVendorDocId) {
          updateDoc(doc(db, 'vendors', targetVendorDocId), {
            viewsCount: increment(1),
            views: increment(1)
          }).catch(err => console.log('Error incrementing view count:', err));
        }

        // Send notification to the VENDOR OWNER (not the visitor)
        const targetVendorOwnerId = vendorOwnerId || service.ownerId || service.userId;
        if (targetVendorOwnerId && targetVendorOwnerId !== currentUser.uid) {
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: targetVendorOwnerId,
              title: 'New Profile Visitor 👀',
              message: `${userName} just viewed your business profile "${displayService.businessName || service.businessName}". Check details in My Leads!`,
              type: 'profile_view',
              read: false,
              createdAt: new Date().toISOString(),
            });
          } catch (notifErr) {
            console.warn('Could not save visitor notification for vendor owner:', notifErr);
          }
        }
      } catch (error) {
        console.warn('Silent note: Profile view lead log skipped:', error);
      }
    };

    if (displayService && (displayService.id || service.id)) {
      logProfileView();
    }
  }, [displayService.id, service.id]);

  useEffect(() => {
    // Query reviews for this vendor/service ID globally
    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef,
      where('vendorId', '==', service.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setReviewsList(items);
    }, (error) => {
      console.log("Error loading reviews dynamically: ", error);
    });

    return () => unsubscribe();
  }, [service.id]);

  const logLead = async (type: 'call' | 'whatsapp' | 'direction') => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      let userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Guest User';
      let userPhone = currentUser.phoneNumber || '';

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.name) userName = userData.name;
        if (userData.phoneNumber) userPhone = userData.phoneNumber;
      }

      const targetVendorId = displayService.id || service.id;

      await addDoc(collection(db, 'leads'), {
        vendorId: targetVendorId,
        vendorName: displayService.businessName || service.businessName,
        userId: currentUser.uid,
        userName,
        userPhone,
        type,
        createdAt: new Date().toISOString(),
      });

      if (targetVendorId) {
        const updateData: any = {};
        if (type === 'call') {
          updateData.callsCount = increment(1);
          updateData.calls = increment(1);
        } else if (type === 'whatsapp') {
          updateData.whatsappCount = increment(1);
          updateData.whatsapp = increment(1);
        } else if (type === 'direction') {
          updateData.directionsCount = increment(1);
          updateData.directions = increment(1);
        }
        await updateDoc(doc(db, 'vendors', targetVendorId), updateData);
      }
    } catch (error) {
      console.error('Error logging lead: ', error);
    }
  };

  const handleCall = () => {
    logLead('call');
    Linking.openURL(`tel:${service.phone}`);
  };
  const handleWhatsApp = () => {
    logLead('whatsapp');
    Linking.openURL(`whatsapp://send?phone=${service.phone}`);
  };

  const handleDirections = () => {
    logLead('direction');
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.location)}`;
    Linking.openURL(mapsUrl);
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) {
      Alert.alert("Review Content Required", "Please type a review before submitting.");
      return;
    }
    try {
      const authorName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Guest User';
      
      // 1. Add review doc
      await addDoc(collection(db, 'reviews'), {
        vendorId: service.id,
        author: authorName,
        authorId: auth.currentUser?.uid || 'guest',
        rating: userRating,
        text: reviewText,
        createdAt: Date.now()
      });

      // 2. Fetch all reviews to calculate genuine rating and count
      const reviewsQ = query(
        collection(db, 'reviews'),
        where('vendorId', '==', service.id)
      );
      const querySnapshot = await getDocs(reviewsQ);
      const allReviews = querySnapshot.docs.map(doc => doc.data());
      const count = allReviews.length;
      const average = count > 0
        ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / count
        : 5;

      // 3. Update the vendor document in Firestore
      await updateDoc(doc(db, 'vendors', service.id), {
        rating: average,
        reviewsCount: count
      });

      setReviewText('');
      setUserRating(5);
      Alert.alert('Review Submitted', 'Thank you! Your review has been posted globally.');
    } catch (e: any) {
      console.error("Error submitting review to firestore: ", e);
      Alert.alert("Submission Error", e.message);
    }
  };

  const PRIMARY_COLOR = '#2563EB';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}>

        {/* 1. Translucent Back Button and Luxury Hero Cover */}
        <View style={styles.imageGallery}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {displayService.images && displayService.images.length > 0 ? (
              displayService.images.map((imgUri: string, idx: number) => (
                <Image key={idx} source={{ uri: imgUri }} style={styles.heroImage} />
              ))
            ) : (
              <>
                <Image source={{ uri: displayService.image || `https://picsum.photos/seed/${displayService.id}1/800/600` }} style={styles.heroImage} />
                <Image source={{ uri: `https://picsum.photos/seed/${displayService.id}2/800/600` }} style={styles.heroImage} />
                <Image source={{ uri: `https://picsum.photos/seed/${displayService.id}3/800/600` }} style={styles.heroImage} />
              </>
            )}
          </ScrollView>
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(15, 23, 42, 0.95)']}
            style={styles.imageOverlay}
          />

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.titleOverlay}>
            <View style={styles.badgeRow}>
              {service.tookVerification && (
                <View style={styles.genuinePill}>
                  <Ionicons name="shield-checkmark" size={10} color="white" />
                  <Text style={styles.genuinePillText}>Genuine Verified</Text>
                </View>
              )}
              {service.plan === 'big' && (
                <View style={styles.premiumPill}>
                  <Ionicons name="heart" size={10} color="#fbbf24" />
                  <Text style={styles.premiumText}>{t('service_detail.trusted')}</Text>
                </View>
              )}
              {service.plan === 'small' && (
                <View style={styles.recommendedPill}>
                  <Ionicons name="thumbs-up" size={10} color="white" />
                  <Text style={styles.verifiedPillText}>{t('service_detail.recommended')}</Text>
                </View>
              )}
              <View style={styles.openPill}><Text style={styles.openPillText}>{t('service_detail.open')}</Text></View>
            </View>

            <Text style={styles.titleText}>{service.businessName}</Text>

            {/* Real-time Rating and Live Indicator */}
            <View style={styles.realTimeRatingContainer}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.ratingNumber}>{averageRating}</Text>
              <Text style={styles.ratingReviewsText}>
                ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
              </Text>
              <View style={styles.dotSeparator} />
              <Text style={styles.liveNowText}>Live Now 🟢</Text>
            </View>

            <View style={styles.locationTag}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.categoryText}>
                {(() => {
                  const safeServiceSubCategory = String(service.subCategory || '').toLowerCase();
                  const subKey = safeServiceSubCategory
                    .replace(/ & /g, '_')
                    .replace(/ \/ /g, '_')
                    .replace(/ /g, '_')
                    .replace(/-/g, '_')
                    .replace(/[^a-z0-9_]/g, '');
                  const translated = t(`subcategories.${subKey}`);
                  const displaySub = translated === `subcategories.${subKey}` ? String(service.subCategory || '') : translated;
                  return displaySub;
                })()} • {String(service.location || '').split(',')[0] || 'Local'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Premium Capsule Tab Bar */}
        <View style={styles.tabBarWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
            {tabs.map(tab => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabCapsule, isActive && styles.tabCapsuleActive]}
                >
                  <Text style={[styles.tabCapsuleText, isActive && styles.tabCapsuleTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. Elite Content Sections */}
        <View style={styles.contentArea}>
          {activeTab === t('service_detail.overview') && (
            <>
              {/* Quick Details Desk - Compact & Modern Card */}
              <View style={styles.compactDeskCard}>
                
                {/* 1. Address Section */}
                <View style={styles.deskRow}>
                  <View style={[styles.deskIconWrapper, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="location" size={16} color="#2563EB" />
                  </View>
                  <View style={styles.deskContent}>
                    <Text style={styles.deskLabel}>ADDRESS & LOCATION</Text>
                    <Text style={styles.deskValue} numberOfLines={2}>{displayService.location}</Text>
                  </View>
                  <TouchableOpacity style={styles.deskActionBtnBlue} onPress={handleDirections}>
                    <Ionicons name="navigate" size={12} color="#2563EB" style={{ marginRight: 2 }} />
                    <Text style={styles.deskActionTextBlue}>Map</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.deskDivider} />

                {/* 2. Contact Section */}
                <View style={styles.deskRow}>
                  <View style={[styles.deskIconWrapper, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="call" size={16} color="#10b981" />
                  </View>
                  <View style={styles.deskContent}>
                    <Text style={styles.deskLabel}>CONTACT MOBILE</Text>
                    <Text style={styles.deskValue}>{displayService.phone || '+91 98765 43210'}</Text>
                  </View>
                  <TouchableOpacity style={styles.deskActionBtnGreen} onPress={handleCall}>
                    <Ionicons name="call" size={12} color="#10b981" style={{ marginRight: 2 }} />
                    <Text style={styles.deskActionTextGreen}>Call</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.deskDivider} />

                {/* 3. Timings Section */}
                <View style={styles.deskRow}>
                  <View style={[styles.deskIconWrapper, { backgroundColor: '#fffbeb' }]}>
                    <Ionicons name="time" size={16} color="#d97706" />
                  </View>
                  <View style={styles.deskContent}>
                    <Text style={styles.deskLabel}>BUSINESS HOURS & DAYS</Text>
                    <Text style={styles.deskValue}>
                      {displayService.openingTime && displayService.closingTime
                        ? `${displayService.openingTime} - ${displayService.closingTime}`
                        : (displayService.timings || '09:00 AM - 09:00 PM')}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 2 }}>
                      Days: {Array.isArray(displayService.workingDays) && displayService.workingDays.length > 0
                        ? displayService.workingDays.join(', ')
                        : 'Mon, Tue, Wed, Thu, Fri, Sat, Sun'}
                    </Text>
                  </View>
                  {(() => {
                    const wDays = Array.isArray(displayService.workingDays) && displayService.workingDays.length > 0
                      ? displayService.workingDays
                      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const now = new Date();
                    const cDay = dayNames[now.getDay()];
                    const isOpenToday = wDays.includes(cDay);

                    return (
                      <View style={[styles.deskBadgeOpen, !isOpenToday && { backgroundColor: '#fee2e2' }]}>
                        <View style={[styles.deskBadgeDot, !isOpenToday && { backgroundColor: '#ef4444' }]} />
                        <Text style={[styles.deskBadgeText, !isOpenToday && { color: '#dc2626' }]}>
                          {isOpenToday ? 'Open' : 'Closed'}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              </View>

              {/* 4. About Us Card */}
              <View style={styles.cardSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="business" size={20} color="#8eabeb" />
                  </View>
                  <Text style={styles.structuredSectionTitle}>About Us</Text>
                </View>
                <Text style={styles.descriptionText}>
                  {service.description || (() => {
                    const subKey = serviceSubCategory
                      .replace(/ & /g, '_')
                      .replace(/ \/ /g, '_')
                      .replace(/ /g, '_')
                      .replace(/-/g, '_')
                      .replace(/[^a-z0-9_]/g, '');
                    const translated = t(`subcategories.${subKey}`);
                    const dispSub = translated === `subcategories.${subKey}` ? displayService.subCategory || 'service' : translated;

                    if (i18n.language === 'te') {
                      return `${serviceLocationName} లో ప్రముఖ ${dispSub} గా, మేము అసాధారణమైన నాణ్యత మరియు కస్టమర్-ఫస్ట్ సర్వీస్ పై గర్వపడుతున్నాము.`;
                    } else if (i18n.language === 'hi') {
                      return `${serviceLocationName} में एक प्रमुख ${dispSub} के रूप में, हम असाधरण गुणवत्ता और ग्राहक-प्रथम सेवा पर गर्व करते हैं।`;
                    } else if (i18n.language === 'kn') {
                      return `${serviceLocationName} ನಲ್ಲಿ ಪ್ರಮುಖ ${dispSub} ಆಗಿ, ನಾವು ಅಸಾಧಿಕ ಗುಣಮಟ್ಟ ಮತ್ತು ಗ್ರಾಹಕ-ಮೊದಲ ಸೇವೆಗೆ ಹೆಮ್ಮೆಪಡುತ್ತೇವೆ.`;
                    }
                    return "As a leading " + (displayService.subCategory || 'service') + " in " + serviceLocationName + ", we pride ourselves on exceptional quality and customer-first service.";
                  })()}
                </Text>
              </View>
            </>
          )}

        {activeTab === (displayService.type === 'product' ? t('service_detail.featured_products') : t('service_detail.featured_services')) && (
          <View style={styles.cardSection}>
            <Text style={styles.cardTitle}>{displayService.type === 'product' ? t('service_detail.featured_products') : t('service_detail.featured_services')}</Text>
            {(!displayService.catalog || displayService.catalog.length === 0) ? (
              <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginVertical: 20 }}>
                {displayService.type === 'product' ? 'No featured products listed yet.' : 'No featured services listed yet.'}
              </Text>
            ) : (
              displayService.catalog.map((item: any, i: number) => (
                <View key={i} style={styles.serviceCard}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <Text style={styles.serviceDesc}>{item.description || t('service_detail.includes_support')}</Text>
                  </View>
                  <Text style={[styles.servicePrice, (item.price === null || item.price === undefined || item.price === '') && { fontSize: 11, color: '#94a3b8' }]}>
                    {item.price !== null && item.price !== undefined && item.price !== '' ? `₹${item.price}` : 'Price on Request'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}


        {(activeTab === t('service_detail.gallery')) && (
          <View style={{ gap: 20 }}>
            {/* Photos Showcase */}
            <View style={styles.cardSection}>
              <Text style={styles.cardTitle}>Photos & Work Showcase</Text>
              <View style={styles.galleryGrid}>
                {displayService.images && displayService.images.length > 0 ? (
                  displayService.images.map((imgUri: string, idx: number) => (
                    <TouchableOpacity 
                      key={idx} 
                      onPress={() => { setPreviewImage(imgUri); setPreviewIndex(idx); }}
                      activeOpacity={0.8}
                      style={styles.galleryImageWrapper}
                    >
                      <Image source={{ uri: imgUri }} style={styles.galleryImage} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <>
                    <TouchableOpacity 
                      onPress={() => { setPreviewImage(displayService.image || `https://picsum.photos/seed/${displayService.id}1/400/300`); setPreviewIndex(0); }}
                      activeOpacity={0.8}
                      style={styles.galleryImageWrapper}
                    >
                      <Image source={{ uri: displayService.image || `https://picsum.photos/seed/${displayService.id}1/400/300` }} style={styles.galleryImage} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => { setPreviewImage(`https://picsum.photos/seed/${displayService.id}2/400/300`); setPreviewIndex(1); }}
                      activeOpacity={0.8}
                      style={styles.galleryImageWrapper}
                    >
                      <Image source={{ uri: `https://picsum.photos/seed/${displayService.id}2/400/300` }} style={styles.galleryImage} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => { setPreviewImage(`https://picsum.photos/seed/${displayService.id}3/400/300`); setPreviewIndex(2); }}
                      activeOpacity={0.8}
                      style={styles.galleryImageWrapper}
                    >
                      <Image source={{ uri: `https://picsum.photos/seed/${displayService.id}3/400/300` }} style={styles.galleryImage} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => { setPreviewImage(`https://picsum.photos/seed/${displayService.id}4/400/300`); setPreviewIndex(3); }}
                      activeOpacity={0.8}
                      style={styles.galleryImageWrapper}
                    >
                      <Image source={{ uri: `https://picsum.photos/seed/${displayService.id}4/400/300` }} style={styles.galleryImage} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Videos Showcase */}
            <View style={styles.cardSection}>
              <Text style={styles.cardTitle}>Promotional Videos</Text>
              {displayService.videos && displayService.videos.length > 0 ? (
                <View style={styles.galleryGrid}>
                  {displayService.videos.map((vidUri: string, idx: number) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.galleryImage, { backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}
                      onPress={() => Linking.openURL(vidUri)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play-circle" size={48} color="#10b981" />
                      <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 4, alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Play Video {idx + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginVertical: 10 }}>
                  No promotional videos uploaded yet.
                </Text>
              )}
            </View>
          </View>
        )}
<View style={{ height: 150 + insets.bottom }} />
        </View>
      </ScrollView>

      {/* 5. Translucent Blur Floating bottom Action Bar */}
      <View style={[styles.footerWrap, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
    <View style={styles.actionBar}>
      <TouchableOpacity style={styles.circleActionButton} onPress={handleWhatsApp}>
        <Ionicons name="logo-whatsapp" size={22} color="#10b981" />
        <Text style={styles.circleActionText}>WhatsApp</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.mainCallButton} onPress={handleCall}>
        <LinearGradient
          colors={['#2563EB', '#1d4ed8']}
          style={styles.mainCallGradient}
        >
          <Ionicons name="call" size={18} color="white" />
          <Text style={styles.mainCallText}>{t('service_detail.call_business')}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.circleActionButton} onPress={handleDirections}>
        <Ionicons name="navigate-circle" size={22} color="#3b82f6" />
        <Text style={styles.circleActionText}>Directions</Text>
      </TouchableOpacity>
    </View>
      </View >

      {/* Fullscreen Image Viewer Modal */}
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
            <Text style={styles.imageCounterText}>
              {previewIndex + 1} / {displayService.images?.length || 4}
            </Text>
          </View>

          {/* Navigation Buttons */}
          {previewIndex > 0 && (
            <TouchableOpacity 
              style={styles.navButtonLeft}
              onPress={() => {
                const newIndex = previewIndex - 1;
                setPreviewIndex(newIndex);
                setPreviewImage(displayService.images?.[newIndex] || `https://picsum.photos/seed/${displayService.id}${newIndex + 1}/400/300`);
              }}
            >
              <Ionicons name="chevron-back" size={32} color="white" />
            </TouchableOpacity>
          )}
          
          {previewIndex < (displayService.images?.length || 4) - 1 && (
            <TouchableOpacity 
              style={styles.navButtonRight}
              onPress={() => {
                const newIndex = previewIndex + 1;
                setPreviewIndex(newIndex);
                setPreviewImage(displayService.images?.[newIndex] || `https://picsum.photos/seed/${displayService.id}${newIndex + 1}/400/300`);
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
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // Hero Image gallery
  imageGallery: { height: 380, position: 'relative' },
  heroImage: { width: width, height: 380 },
  imageOverlay: { position: 'absolute', top: 0, bottom: 0, width: '100%' },

  // Custom Floating Back button
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },

  // Hero Overlay
  titleOverlay: { position: 'absolute', bottom: 30, left: 20, right: 20 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  premiumPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#fbbf24' },
  premiumText: { color: '#fbbf24', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  recommendedPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  verifiedPillText: { color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  openPill: { backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  openPillText: { color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

  titleText: { fontSize: 28, fontWeight: 'bold', color: 'white', lineHeight: 34, letterSpacing: -0.5 },

  // Real-time Rating Row
  realTimeRatingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5 },
  ratingNumber: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  ratingReviewsText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 },
  dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.4)' },
  liveNowText: { color: '#4ade80', fontWeight: 'bold', fontSize: 13 },

  locationTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  categoryText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  // Premium Capsule Tab Bar
  tabBarWrapper: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12
  },
  tabBarScroll: { paddingHorizontal: 15, gap: 8 },
  tabCapsule: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 6
  },
  tabCapsuleActive: {
    backgroundColor: '#2563EB'
  },
  tabCapsuleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569'
  },
  tabCapsuleTextActive: {
    color: 'white'
  },

  contentArea: { padding: 15 },

  // Premium contact Card
  premiumContactCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 15,
    elevation: 3,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  premiumContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  contactDetails: { flex: 1 },
  contactLabel: { fontSize: 9, color: '#94a3b8', fontWeight: 'bold', letterSpacing: 0.5 },
  contactVal: { fontSize: 14, color: '#1e293b', fontWeight: '700', marginTop: 2 },

  // Regular Cards
  cardSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    width: '100%'
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 15 },
  descriptionText: { fontSize: 14, color: '#475569', lineHeight: 24, fontWeight: '500' },

  serviceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  serviceDesc: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  servicePrice: { fontSize: 16, fontWeight: '800', color: '#2563EB' },

  // Review Form styles
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    height: 90,
    textAlignVertical: 'top',
    marginBottom: 15,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc'
  },
  submitReviewBtn: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  submitGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitReviewBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  // Reviews List
  reviewItem: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 15 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewAuthor: { fontWeight: 'bold', color: '#1e293b', fontSize: 14 },
  reviewDate: { fontSize: 11, color: '#94a3b8' },
  reviewStarsRow: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  reviewTextContent: { color: '#475569', fontSize: 13, lineHeight: 18 },

  // Gallery
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', width: '100%' },
  galleryImageWrapper: { width: (width - 50) / 2, height: (width - 50) / 2 },
  galleryImage: { width: '100%', height: '100%', borderRadius: 12 },

  // Fullscreen Image Modal
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

  // Translucent blurring floating bottom action bar
  footerWrap: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 15,
    paddingBottom: 35,
    paddingTop: 12
  },
  actionBar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  circleActionButton: { flex: 1.2, alignItems: 'center', gap: 4 },
  circleActionText: { fontSize: 11, fontWeight: '700', color: '#475569' },

  mainCallButton: { flex: 2, height: 48, borderRadius: 12, overflow: 'hidden', elevation: 4 },
  mainCallGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mainCallText: { color: 'white', fontWeight: '800', fontSize: 14 },

  // Structured Details Styles
  structuredSectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  structuredText: { fontSize: 13, color: '#475569', lineHeight: 20, marginTop: 4 },
  structuredSubText: { fontSize: 12, color: '#94a3b8', marginTop: 4, marginBottom: 8 },
  directionsInlineBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 10
  },
  directionsInlineBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  callInlineBtn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 8
  },
  callInlineBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  timingsFlexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  timingsDayText: { fontSize: 13, color: '#475569', fontWeight: 'bold' },
  timingsTimeText: { fontSize: 13, color: '#1e293b', fontWeight: '800' },
  genuinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genuinePillText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  
  // Compact Details Desk Card Styles
  compactDeskCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  deskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  deskIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deskContent: {
    flex: 1,
    marginRight: 10,
  },
  deskLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  deskValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
  },
  deskActionBtnBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  deskActionTextBlue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  deskActionBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  deskActionTextGreen: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10b981',
  },
  deskDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  deskBadgeOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  deskBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  deskBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065f46',
  },
  
  // Premium Interactive Review Styles
  premiumReviewContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  reviewFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumReviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  ratingDashboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#faf5ff',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  starTouch: {
    padding: 2,
  },
  ratingLabelWrapper: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  ratingLabelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  reviewInputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  premiumReviewInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    paddingBottom: 24,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#0f172a',
  },
  charCountText: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  premiumSubmitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  premiumSubmitGradient: {
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumSubmitBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
