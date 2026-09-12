import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { BACKEND_CONFIG } from '../../config/backend';

export default function AdminChatScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { chatId } = route.params;
  const userId = chatId.replace('admin_', '');

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState<any>(null);

  const currentUser = auth.currentUser;
  const adminUid = currentUser?.uid || 'admin';

  // 1. Fetch parent chat details & update read status
  useEffect(() => {
    const chatDocRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(chatDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChatInfo(data);
        
        // Mark read by admin
        if (data.unreadByAdmin === true) {
          updateDoc(chatDocRef, { unreadByAdmin: false }).catch(() => {});
        }
      }
    });

    return () => unsubscribe();
  }, [chatId]);

  // 2. Fetch messages ordered by createdAt desc for inverted FlatList
  useEffect(() => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.warn("Admin messages snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      const chatDocRef = doc(db, 'chats', chatId);
      const messagesRef = collection(db, 'chats', chatId, 'messages');

      // Add message
      await addDoc(messagesRef, {
        senderId: adminUid,
        senderRole: 'admin',
        text: textToSend,
        createdAt: serverTimestamp(),
        read: false
      });

      // Update parent metadata, always reopening the chat if admin sends a message
      await updateDoc(chatDocRef, {
        lastMessage: textToSend,
        lastMessageAt: serverTimestamp(),
        unreadByAdmin: false,
        unreadByUser: true,
        status: 'open',
        closedAt: null,
        closedBy: null
      });

      // Dispatch direct FCM notification to user
      const idToken = await currentUser?.getIdToken();
      fetch(`${BACKEND_CONFIG.API_URL}/api/admin/send-chat-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          senderId: adminUid,
          senderRole: 'admin',
          text: textToSend,
          userId: userId
        })
      }).catch(err => console.log('Admin FCM user alert failed:', err.message));

    } catch (error) {
      console.error("Admin send error:", error);
      setInputText(textToSend); // restore input
      Alert.alert('Message not sent', 'Please check your connection and try again.');
    }
  };

  const endChatSession = () => {
    Alert.alert(
      "End Chat",
      "End this conversation for the user?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "End Chat", 
          style: "destructive",
          onPress: async () => {
            try {
              const chatDocRef = doc(db, 'chats', chatId);
              await updateDoc(chatDocRef, {
                status: 'closed',
                closedAt: serverTimestamp(),
                closedBy: adminUid
              });

              // Dispatch direct close alert FCM via backend
              const idToken = await currentUser?.getIdToken();
              fetch(`${BACKEND_CONFIG.API_URL}/api/admin/close-chat-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId })
              }).catch(err => console.log('Close notification failed:', err.message));

              Alert.alert("Chat Closed", "This conversation has been closed.");
            } catch (error) {
              console.error("Error closing chat:", error);
            }
          }
        }
      ]
    );
  };

  const deleteChatSession = () => {
    Alert.alert(
      "Delete Chat Permanently",
      "This permanently deletes the entire conversation. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const idToken = await currentUser?.getIdToken();
              const response = await fetch(`${BACKEND_CONFIG.API_URL}/api/admin/delete-chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ chatId })
              });
              const result = await response.json();
              if (result.success) {
                Alert.alert("Success", "Conversation deleted permanently.");
                navigation.goBack();
              } else {
                Alert.alert("Error", result.error || "Failed to delete chat.");
              }
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to reach server.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Sending...';
    try {
      let date: Date;
      if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const renderMessageItem = ({ item }: { item: any }) => {
    const isAdmin = item.senderRole === 'admin';
    return (
      <View style={isAdmin ? styles.messageWrapperAdmin : styles.messageWrapperUser}>
        <View style={isAdmin ? styles.messageBubbleAdmin : styles.messageBubbleUser}>
          <Text style={isAdmin ? styles.messageTextAdmin : styles.messageTextUser}>
            {item.text}
          </Text>
        </View>
        <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
      </View>
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
            <Text style={styles.headerTitle} numberOfLines={1}>
              {chatInfo?.userName || 'Client support'}
            </Text>
            <View style={styles.statusBadgeRow}>
              <View style={[styles.statusIndicator, chatInfo?.status === 'closed' ? styles.indicatorClosed : styles.indicatorOpen]} />
              <Text style={styles.statusIndicatorText}>{chatInfo?.status || 'open'}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={endChatSession} style={[styles.actionBtn, { marginRight: 8 }]}>
              <Ionicons name="close-circle-outline" size={22} color="#b45309" />
            </TouchableOpacity>
            <TouchableOpacity onPress={deleteChatSession} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#0035a0" />
            </View>
          ) : (
            <FlatList
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={(item) => item.id}
              inverted
              contentContainerStyle={styles.flatListContent}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={() => (
                <View style={styles.messageWrapperUser}>
                  <View style={styles.messageBubbleUser}>
                    <Text style={styles.messageTextUser}>
                      Chat session initialized.
                    </Text>
                  </View>
                </View>
              )}
            />
          )}

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a professional reply..."
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  headerTitleContainer: { flex: 1, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  statusBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  statusIndicator: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  indicatorOpen: { backgroundColor: '#10b981' },
  indicatorClosed: { backgroundColor: '#94a3b8' },
  statusIndicatorText: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatListContent: { padding: 20, paddingBottom: 10 },

  // Message Bubbles (Mirrored - admin own message is right-aligned)
  messageWrapperUser: { alignItems: 'flex-start', marginBottom: 16, maxWidth: '85%' },
  messageWrapperAdmin: { alignItems: 'flex-end', marginBottom: 16, maxWidth: '85%', alignSelf: 'flex-end' },
  
  messageBubbleUser: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  messageTextUser: { color: '#334155', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  
  messageBubbleAdmin: {
    backgroundColor: '#0035a0', // Royal Brand Blue
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopRightRadius: 4,
  },
  messageTextAdmin: { color: '#fff', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  
  timeText: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '600', paddingHorizontal: 4 },

  // Input Area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 48,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0035a0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#0035a0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  }
});
