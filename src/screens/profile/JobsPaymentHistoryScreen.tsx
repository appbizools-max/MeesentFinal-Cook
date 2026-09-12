import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

const { width } = Dimensions.get('window');

export default function JobsPaymentHistoryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(db, 'payments'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const fetched: any[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });

      // Sort by date descending
      const sortedPayments = fetched.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      // If no payments exist, add mock payment history data for demonstration
      if (sortedPayments.length === 0) {
        setPayments([
          {
            id: 'mock_job_1',
            paymentId: 'PAY-830291',
            description: 'Pincode Ad Campaign (Weekly Plan)',
            amount: 297,
            plan: 'week',
            pincodeCount: 3,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2).toISOString(), // 2 days ago
            status: 'success',
            paymentMethod: 'UPI (PhonePe)'
          },
          {
            id: 'mock_job_2',
            paymentId: 'PAY-749102',
            description: 'Pincode Ad Campaign (Monthly Plan)',
            amount: 99,
            plan: 'month',
            pincodeCount: 1,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 12).toISOString(), // 12 days ago
            status: 'success',
            paymentMethod: 'Netbanking (SBI)'
          },
          {
            id: 'mock_job_3',
            paymentId: 'PAY-F92812',
            description: 'Pincode Ad Campaign (Weekly Plan) - Failed',
            amount: 297,
            plan: 'week',
            pincodeCount: 3,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 18).toISOString(), // 18 days ago
            status: 'failed',
            paymentMethod: 'UPI (GPay)'
          }
        ]);
      } else {
        setPayments(sortedPayments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt) return 'N/A';
    try {
      let date: Date;
      if (createdAt?.seconds) {
        date = new Date(createdAt.seconds * 1000);
      } else if (createdAt?.toDate) {
        date = createdAt.toDate();
      } else {
        date = new Date(createdAt);
      }
      if (isNaN(date.getTime())) return 'N/A';
      const dateString = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeString = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${dateString}, ${timeString}`;
    } catch (e) {
      return 'N/A';
    }
  };



  const renderPaymentItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.paymentCard} 
      onPress={() => setSelectedPayment(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Ionicons 
            name="megaphone-outline" 
            size={20} 
            color="#0035a0" 
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.planName} numberOfLines={1}>
            {item.description || 'Pincode Ad Campaign'}
          </Text>
          <View style={styles.placedRow}>
            <Ionicons name="calendar-outline" size={11} color="#94a3b8" style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.planPrice}>₹{item.amount}</Text>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.txnIdRow}>
          <Text style={styles.txnIdLabel}>PAY ID: </Text>
          <Text style={styles.txnIdVal}>{item.paymentId || 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'success' ? '#e8f8f0' : '#fee2e2' }]}>
          <View style={[styles.statusDot, { backgroundColor: item.status === 'success' ? '#10b981' : '#ef4444' }]} />
          <Text style={[styles.statusText, { color: item.status === 'success' ? '#047857' : '#b91c1c' }]}>
            {item.status ? item.status.toUpperCase() : 'SUCCESS'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment History</Text>
          <View style={{ width: 40 }} />
        </View>



        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0035a0" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => item.id}
            renderItem={renderPaymentItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: 50 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0035a0']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Transactions Found</Text>
                <Text style={styles.emptyDesc}>You haven't made any purchases or campaign promotions yet.</Text>
              </View>
            }
          />
        )}

        {/* Invoice Modal */}
        <Modal
          visible={!!selectedPayment}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPayment(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderInner}>
                <View style={styles.modalHeaderTitleBox}>
                  <Ionicons name="document-text-outline" size={20} color="#0035a0" style={{ marginRight: 6 }} />
                  <Text style={styles.modalTitle}>MEESENT INVOICE</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPayment(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {selectedPayment && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.receiptContainer}>
                    <View style={styles.receiptStatusBox}>
                      <View style={styles.successIconWrapper}>
                        <Ionicons 
                          name={selectedPayment.status === 'success' ? "checkmark-circle" : "close-circle"} 
                          size={56} 
                          color={selectedPayment.status === 'success' ? "#10b981" : "#ef4444"} 
                        />
                      </View>
                      <Text style={[styles.receiptStatusText, { color: selectedPayment.status === 'success' ? '#10b981' : '#ef4444' }]}>
                        {selectedPayment.status === 'success' ? 'Transaction Successful' : 'Transaction Failed'}
                      </Text>
                      <Text style={styles.receiptAmount}>₹{selectedPayment.amount}</Text>
                    </View>

                    <View style={styles.receiptDetails}>
                      <ReceiptRow label="Payment For" value={selectedPayment.description || 'Pincode Ad Campaign'} />
                      {selectedPayment.plan && (
                        <ReceiptRow label="Plan Option" value={selectedPayment.plan === 'week' ? 'Weekly (7 Days)' : 'Monthly (30 Days)'} />
                      )}
                      {selectedPayment.pincodeCount !== undefined && (
                        <ReceiptRow label="Target Area Size" value={`${selectedPayment.pincodeCount} Pincode(s)`} />
                      )}
                      <ReceiptRow label="Transaction ID" value={selectedPayment.paymentId || 'N/A'} />
                      <ReceiptRow label="Payment Date" value={formatDate(selectedPayment.createdAt)} />
                      <ReceiptRow label="Payment Method" value={selectedPayment.paymentMethod || 'UPI / Netbanking'} />
                      <ReceiptRow 
                        label="Status" 
                        value={selectedPayment.status === 'success' ? "Success" : "Failed"} 
                        valueColor={selectedPayment.status === 'success' ? "#10b981" : "#ef4444"} 
                      />
                    </View>

                    <View style={styles.dashedDivider} />

                    <View style={styles.invoiceFooter}>
                      <Text style={styles.footerNote}>Thank you for using Meesent Jobs!</Text>
                      <Text style={styles.footerSupport}>For support, reach out to meesentonlineshoping@gmail.com</Text>
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const ReceiptRow = ({ label, value, valueColor }: any) => (
  <View style={styles.receiptRow}>
    <Text style={styles.receiptLabel}>{label}</Text>
    <Text style={[styles.receiptValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  refreshBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: '#f0f5fc',
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 5,
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 1,
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#64748b', marginTop: 12, fontWeight: '600' },
  listContent: { padding: 20 },
  paymentCard: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#f0f5fc',
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cardInfo: { flex: 1, marginLeft: 10, marginRight: 8 },
  planName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  placedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  planPrice: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txnIdRow: { flexDirection: 'row', alignItems: 'center' },
  txnIdLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  txnIdVal: { fontSize: 11, color: '#475569', fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f8f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#047857' },
  
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 15 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeaderInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 15 },
  modalHeaderTitleBox: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', letterSpacing: 0.5 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptContainer: { paddingBottom: 10 },
  receiptStatusBox: { alignItems: 'center', marginBottom: 25 },
  successIconWrapper: { marginBottom: 10 },
  receiptStatusText: { fontSize: 16, fontWeight: '700', color: '#10b981', marginTop: 4 },
  receiptAmount: { fontSize: 32, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  receiptDetails: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  receiptValue: { fontSize: 12, color: '#0f172a', fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 15 },
  dashedDivider: { height: 1, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', marginVertical: 20 },
  invoiceFooter: { alignItems: 'center', gap: 4 },
  footerNote: { fontSize: 13, fontWeight: '700', color: '#0035a0' },
  footerSupport: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
});
