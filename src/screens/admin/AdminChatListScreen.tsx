import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function AdminChatListScreen({ navigation }: any) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Subscribe to all chats inside the chats collection, sorted by lastMessageAt
  useEffect(() => {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('lastMessageAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setChats(chatList);
      setLoading(false);
    }, (error) => {
      console.warn("Chats listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      let date: Date;
      if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return '';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Filter list based on segmented tab and search query
  const filteredChats = chats.filter(chat => {
    // 1. Tab Status Filter
    if (activeTab === 'open' && chat.status !== 'open') return false;
    if (activeTab === 'closed' && chat.status !== 'closed') return false;

    // 2. Search query filter
    const matchesSearch = 
      (chat.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const renderChatRow = ({ item }: { item: any }) => {
    const initials = getInitials(item.userName || 'User');
    const isUnread = item.unreadByAdmin === true;

    return (
      <TouchableOpacity 
        style={styles.chatRow} 
        onPress={() => navigation.navigate('AdminChat', { chatId: item.id })}
      >
        {/* Initials Avatar */}
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initials}</Text>
          {isUnread && <View style={styles.unreadBadge} />}
        </View>

        {/* Text Details */}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={styles.rowHeader}>
            <Text style={[styles.userName, isUnread && styles.unreadText]}>
              {item.userName || 'Unknown Client'}
            </Text>
            <Text style={styles.timeText}>{getRelativeTime(item.lastMessageAt)}</Text>
          </View>

          <Text style={[styles.lastMessage, isUnread && styles.unreadText]} numberOfLines={1}>
            {item.lastMessage || 'Open support request'}
          </Text>

          {/* Status Badge */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, item.status === 'closed' ? styles.statusClosed : styles.statusOpen]}>
              <Text style={[styles.statusBadgeText, item.status === 'closed' ? styles.statusClosedText : styles.statusOpenText]}>
                {item.status || 'open'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Support Inbox</Text>
            <Text style={styles.headerSubtitle}>Admin Control Dashboard</Text>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client name, preview text..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Segmented Control Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'all' && styles.tabActive]} 
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'open' && styles.tabActive]} 
            onPress={() => setActiveTab('open')}
          >
            <Text style={[styles.tabText, activeTab === 'open' && styles.tabTextActive]}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'closed' && styles.tabActive]} 
            onPress={() => setActiveTab('closed')}
          >
            <Text style={[styles.tabText, activeTab === 'closed' && styles.tabTextActive]}>Closed</Text>
          </TouchableOpacity>
        </View>

        {/* Chats Feed */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#0035a0" />
          </View>
        ) : filteredChats.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="chatbubbles-outline" size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No conversations found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            renderItem={renderChatRow}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  headerSubtitle: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 1 },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#cbd5e1',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0035a0',
  },

  // Chat Row
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#0369a1',
    fontWeight: '900',
    fontSize: 14,
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  unreadText: {
    fontWeight: '900',
    color: '#0f172a',
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: '#ecfdf5',
  },
  statusOpenText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusClosed: {
    backgroundColor: '#f1f5f9',
  },
  statusClosedText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  // Centered utilities
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  }
});
