import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

const DELETION_POINTS = [
  'Your account will be permanently deactivated immediately after you confirm deletion.',
  'Your personal data and account information will be scheduled for deletion from our systems.',
  'Some data may remain in our secure databases and backups for up to 90 days for legal, security, fraud prevention, and operational purposes.',
  'During this retention period, your data will not be used for marketing or regular app operations.',
  'After the retention period ends, your data will be permanently deleted or anonymized unless we are required by law to retain certain records.',
  'Account deletion cannot be undone. You will lose access to your account, settings, history, and associated data.',
  'If you wish to use the app again, you may need to create a new account.',
];

export default function DeleteAccountScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [accepted, setAccepted] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [doneModalVisible, setDoneModalVisible] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    let firestoreMarked = false;
    const user = auth.currentUser;

    try {
      if (!user) throw new Error('No user logged in');

      // Step 1: Mark account in Firestore FIRST (we still have auth session here)
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          accountDeleted: true,
          deletedAt: serverTimestamp(),
          // 90 days from now — server will permanently delete after this date
          scheduledPermanentDeleteAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });
        firestoreMarked = true;
      } catch (fsErr) {
        // Firestore mark failed — proceed anyway, server can still clean up via Auth UID
        console.warn('Firestore mark failed:', fsErr);
      }

      // Step 2: Delete the Firebase Auth account
      await deleteUser(user);

      // Step 3: Write to deleted_accounts so re-login is detected during 90-day window
      // Phone stored as cleaned digits (e.g. "919876543210")
      try {
        const rawPhone = user.phoneNumber || user.email?.replace('phone_', '').replace('@messent.com', '') || '';
        const cleanedPhone = rawPhone.replace(/[^0-9]/g, '');
        if (cleanedPhone) {
          const permanentDeleteDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
          await setDoc(doc(db, 'deleted_accounts', cleanedPhone), {
            originalUid: user.uid,
            deletedAt: serverTimestamp(),
            scheduledPermanentDeleteAt: permanentDeleteDate,
          });
        }
      } catch (_) {
        // Non-fatal — cleanup will still happen via users collection
      }

      // Auth deleted successfully → show success
      setConfirmModalVisible(false);
      setDoneModalVisible(true);

    } catch (error: any) {
      // Auth deletion failed — REVERT the Firestore mark so account is NOT wiped after 90 days
      if (firestoreMarked && user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            accountDeleted: false,
            deletedAt: null,
            scheduledPermanentDeleteAt: null,
          });
        } catch (_) {
          // Best-effort revert
        }
      }

      setConfirmModalVisible(false);
      setDeleting(false);

      if (error.code === 'auth/requires-recent-login') {
        Toast.show({
          type: 'error',
          text1: 'Session Expired',
          text2: 'Please log out and log back in, then try deleting your account again.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Deletion Failed',
          text2: error.message || 'Could not delete account. Please try again.',
        });
      }
    }
  };


  const handleDoneAndSignOut = async () => {
    setDoneModalVisible(false);
    try {
      await signOut(auth);
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delete Account</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        >
          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="warning" size={32} color="#dc2626" />
            </View>
            <Text style={styles.warningTitle}>Delete Your Account</Text>
            <Text style={styles.warningSubtitle}>
              Please read the following information carefully before proceeding.
            </Text>
          </View>

          {/* Description Points Card */}
          <View style={styles.pointsCard}>
            <Text style={styles.pointsCardTitle}>What happens when you delete your account:</Text>
            {DELETION_POINTS.map((point, index) => (
              <View key={index} style={styles.pointRow}>
                <View style={styles.pointNumber}>
                  <Text style={styles.pointNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.pointText}>{point}</Text>
              </View>
            ))}
          </View>

          {/* Checkbox Acceptance */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAccepted(prev => !prev)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and understood all the above points and I agree to permanently delete my account.
            </Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteBtn, !accepted && styles.deleteBtnDisabled]}
            disabled={!accepted}
            onPress={() => setConfirmModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.deleteBtnText}>Delete My Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelBtnText}>Cancel — Keep My Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="trash" size={32} color="#dc2626" />
            </View>
            <Text style={styles.modalTitle}>Are you sure?</Text>
            <Text style={styles.modalMessage}>
              This action is{' '}
              <Text style={{ fontWeight: '800', color: '#dc2626' }}>irreversible</Text>
              . Your account will be permanently deleted and you will lose all your data.
            </Text>

            {deleting ? (
              <View style={styles.deletingRow}>
                <ActivityIndicator color="#dc2626" />
                <Text style={styles.deletingText}>Deleting your account…</Text>
              </View>
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>No, Keep Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleDeleteAccount}
                >
                  <Text style={styles.modalConfirmText}>Yes, Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Success / Done Modal */}
      <Modal
        visible={doneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={[styles.modalIconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
            </View>
            <Text style={styles.modalTitle}>Account Deleted</Text>
            <Text style={styles.modalMessage}>
              Your account has been successfully deleted. We're sorry to see you go. Your data will be permanently removed within 90 days.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={handleDoneAndSignOut}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  warningBanner: {
    margin: 16,
    backgroundColor: '#fff1f2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 6,
    textAlign: 'center',
  },
  warningSubtitle: {
    fontSize: 14,
    color: '#7f1d1d',
    textAlign: 'center',
    lineHeight: 20,
  },
  pointsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  pointsCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  pointNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
    flexShrink: 0,
  },
  pointNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
    fontWeight: '500',
  },
  deleteBtn: {
    marginHorizontal: 16,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 12,
  },
  deleteBtnDisabled: {
    backgroundColor: '#94a3b8',
    shadowColor: '#94a3b8',
    elevation: 0,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelBtn: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deletingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  deletingText: {
    fontSize: 15,
    color: '#dc2626',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
