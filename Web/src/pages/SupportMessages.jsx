import React, { useState, useEffect, useRef } from 'react';
import { Mail, Trash2, Send, Calendar, Loader2, User, Phone, Briefcase, Search, MessageSquare, Clock, Sparkles } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Layout } from '../components/layout/Layout';

export const SupportMessages = () => {
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'vendor'
  const [searchQuery, setSearchQuery] = useState('');

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // 1. Fetch active chat sessions from parent `chats` collection
  useEffect(() => {
    const q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatList);
      setLoadingChats(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch messages for the selected chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(db, 'chats', selectedChat.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoadingMessages(false);

      // Auto scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Mark as read if admin opens it
      if (selectedChat.unreadByAdmin === true) {
        updateDoc(doc(db, 'chats', selectedChat.id), { unreadByAdmin: false }).catch(() => { });
      }
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChat) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      // Add message to subcollection
      const messagesRef = collection(db, 'chats', selectedChat.id, 'messages');
      await addDoc(messagesRef, {
        senderId: auth.currentUser?.uid || 'admin',
        senderRole: 'admin',
        sender: 'admin',
        text: textToSend,
        createdAt: serverTimestamp(),
        read: true
      });

      // Update parent document
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: textToSend,
        lastMessageAt: serverTimestamp(),
        unreadByUser: true,
        unreadByAdmin: false,
        status: 'open',
        closedAt: null,
        closedBy: null
      });

      // Dispatch FCM Push Notification to the specific User
      try {
        const idToken = await auth.currentUser?.getIdToken();
        fetch('http://localhost:5000/api/admin/send-chat-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            senderId: auth.currentUser?.uid || 'admin',
            senderRole: 'admin',
            text: textToSend,
            userId: selectedChat.id.replace('admin_', '')
          })
        }).then(res => res.json())
          .then(res => console.log('[FCM Support] Notification Dispatch Result:', res))
          .catch(err => console.error('[FCM Support] Push error:', err));
      } catch (pushErr) {
        console.error('[FCM Support] Push trigger failed:', pushErr);
      }
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    }
  };

  const deleteChatSession = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this entire chat history permanently?')) {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const response = await fetch('http://localhost:5000/api/admin/delete-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ chatId: id })
        });
        const result = await response.json();
        if (result.success) {
          toast.success('Chat deleted');
          if (selectedChat?.id === id) {
            setSelectedChat(null);
          }
        } else {
          toast.error(result.error || 'Failed to delete chat');
        }
      } catch (error) {
        toast.error('Failed to delete chat');
      }
    }
  };

  const endChatSession = async () => {
    if (!selectedChat) return;
    if (!window.confirm('End this conversation for the user? They will be notified.')) return;
    try {
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        status: 'closed',
        closedAt: serverTimestamp(),
        closedBy: auth.currentUser?.uid || 'admin'
      });
      const idToken = await auth.currentUser?.getIdToken();
      fetch('http://localhost:5000/api/admin/close-chat-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ userId: selectedChat.id.replace('admin_', '') })
      }).catch(err => console.error('Close notification failed:', err));
      toast.success('Chat closed — user has been notified.');
    } catch (error) {
      toast.error('Failed to close chat');
      console.error(error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    }).format(date);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Filter chats based on selected tab and search query
  const filteredChats = chats.filter(chat => {
    const matchesTab = activeTab === 'user' ? chat.userType !== 'vendor' : chat.userType === 'vendor';
    const matchesSearch =
      (chat.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.userPhone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Calculate live stats for the current tab
  const tabStats = {
    total: filteredChats.length,
    unread: filteredChats.filter(chat => chat.unreadByAdmin === true).length,
    vendors: chats.filter(chat => chat.userType === 'vendor').length,
    users: chats.filter(chat => chat.userType !== 'vendor').length,
  };

  return (
    <Layout>
      <div className="flex-grow bg-[#F8FAFC] min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-10 py-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-[#bc36ad]" />
              Live Support Center
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Manage real-time questions, resolve complaints, and chat with customers
            </p>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 max-w-[1700px] w-full mx-auto flex gap-6 h-[calc(100vh-100px)] overflow-hidden">

          {/* Active Chats Sidebar (Left Pane) */}
          <div className="w-[360px] bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200/30 overflow-hidden flex flex-col h-full shrink-0">

            {/* Header, Search & Segment Tabs */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/30">
              {/* Custom Segmented Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button
                  onClick={() => { setActiveTab('user'); setSelectedChat(null); }}
                  className={`flex-grow py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'user'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Users
                  {tabStats.users > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === 'user' ? 'bg-[#bc36ad]/10 text-[#bc36ad]' : 'bg-slate-200 text-slate-500'}`}>
                      {chats.filter(c => c.userType !== 'vendor').length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setActiveTab('vendor'); setSelectedChat(null); }}
                  className={`flex-grow py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'vendor'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Vendors
                  {tabStats.vendors > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === 'vendor' ? 'bg-[#bc36ad]/10 text-[#bc36ad]' : 'bg-slate-200 text-slate-500'}`}>
                      {chats.filter(c => c.userType === 'vendor').length}
                    </span>
                  )}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#bc36ad]/30 focus:ring-0 transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>
            </div>

            {/* Chat List Scroll Container */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {loadingChats ? (
                <div className="flex flex-col justify-center items-center h-48 gap-2">
                  <Loader2 className="animate-spin text-[#bc36ad] w-6 h-6" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Syncing conversations...</span>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-20 px-5">
                  <Mail className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">No active chats</p>
                  <p className="text-[10px] text-slate-400 mt-1">Chat history is empty or matches no results</p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isSelected = selectedChat?.id === chat.id;
                  const initials = getInitials(chat.userName);
                  const isUnread = chat.unreadByAdmin === true;

                  return (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`p-4 cursor-pointer transition-all hover:bg-slate-50/80 flex items-start gap-3 border-l-4 ${isSelected
                          ? 'bg-[#bc36ad]/5 border-[#bc36ad]'
                          : 'border-transparent bg-white'
                        }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white ${chat.userType === 'vendor'
                            ? 'bg-gradient-to-tr from-orange-500 to-amber-400'
                            : 'bg-gradient-to-tr from-[#bc36ad] to-purple-400'
                          }`}>
                          {initials}
                        </div>
                        {isUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                        )}
                      </div>

                      {/* Chat Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className={`text-xs truncate ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                            {chat.userName || 'Customer'}
                          </h4>
                          <span className="text-[9px] font-semibold text-slate-400 shrink-0 ml-2">
                            {formatDate(chat.lastMessageAt)}
                          </span>
                        </div>

                        {/* Phone & Email Info */}
                        <div className="flex items-center gap-2 mb-1 text-[9px] font-bold text-slate-400">
                          <span className="flex items-center"><Phone className="w-2.5 h-2.5 mr-0.5 text-slate-400" /> {chat.userPhone || 'N/A'}</span>
                        </div>

                        <p className={`text-[10px] truncate leading-relaxed ${isUnread ? 'font-black text-slate-800' : 'text-slate-500 font-medium'}`}>
                          {chat.lastMessage || 'Open discussion'}
                        </p>
                      </div>

                      {/* Action buttons on hover */}
                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        {isUnread ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[8px] font-black uppercase">
                            New
                          </span>
                        ) : (
                          <div style={{ height: 10 }} />
                        )}
                        <button
                          onClick={(e) => deleteChatSession(chat.id, e)}
                          className="text-slate-300 hover:text-rose-500 p-1 transition-colors mt-1"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Live Chat Pane (Right Pane) */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200/30 overflow-hidden flex flex-col h-full">
            {selectedChat ? (
              <>
                {/* Chat Panel Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/20 flex justify-between items-center shrink-0">
                  <div className="flex items-center space-x-3.5">
                    {/* Header Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white ${selectedChat.userType === 'vendor'
                        ? 'bg-gradient-to-tr from-orange-500 to-amber-400'
                        : 'bg-gradient-to-tr from-[#bc36ad] to-purple-400'
                      }`}>
                      {getInitials(selectedChat.userName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-800">
                          {selectedChat.userName || 'Anonymous'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${selectedChat.userType === 'vendor'
                            ? 'bg-orange-50 text-orange-600 border border-orange-100'
                            : 'bg-purple-50 text-[#bc36ad] border border-purple-100'
                          }`}>
                          {selectedChat.userType || 'User'}
                        </span>
                      </div>
                      <div className="flex items-center mt-1 space-x-3 text-[10px] font-bold text-slate-400">
                        <span className="flex items-center"><Phone className="w-3 h-3 mr-1 text-slate-400" /> {selectedChat.userPhone || 'No Contact'}</span>
                        <span className="flex items-center"><Mail className="w-3 h-3 mr-1 text-slate-400" /> {selectedChat.userEmail || 'No Email'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={endChatSession}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> End Chat
                  </button>
                  <button
                    onClick={(e) => deleteChatSession(selectedChat.id, e)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                  </button>
                </div>

                {/* Chat Message Scroll Space */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50/20">
                  {loadingMessages ? (
                    <div className="flex flex-col justify-center items-center h-full gap-3">
                      <Loader2 className="animate-spin text-[#bc36ad] w-6 h-6" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching messages...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Chat Genesis Date */}
                      <div className="flex items-center justify-center space-x-2 text-slate-400 mb-6 py-2 border-b border-slate-100/50">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Support Ticket Opened</span>
                      </div>

                      {messages.map((msg) => {
                        const isAdmin = msg.sender === 'admin' || msg.senderRole === 'admin';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                          >
                            <div className="max-w-[70%]">
                              <div className={`px-4.5 py-3 rounded-2xl text-xs font-medium leading-relaxed ${isAdmin
                                  ? 'bg-[#bc36ad] text-white rounded-tr-none shadow-sm shadow-[#bc36ad]/10'
                                  : 'bg-white border border-slate-200/70 text-slate-700 rounded-tl-none shadow-sm'
                                }`}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                              </div>
                              <div className={`flex items-center gap-1.5 mt-1 px-1 text-[9px] font-bold text-slate-400 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatDate(msg.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Chat Reply Input Bar */}
                <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100 shrink-0">
                  <div className="flex items-center bg-slate-50 border border-slate-200 focus-within:border-[#bc36ad]/50 rounded-2xl p-1.5 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#bc36ad]/5 transition-all">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={`Type a professional reply to ${selectedChat.userName}...`}
                      className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 px-4 text-xs font-semibold text-slate-700 placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${inputText.trim()
                          ? 'bg-[#bc36ad] text-white shadow-md shadow-[#bc36ad]/20 hover:opacity-90'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Support Dashboard Welcome Screen */
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/20 p-8">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-slate-100">
                  <MessageSquare className="w-6 h-6 text-[#bc36ad]" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-2">Select a Conversation</h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm text-center leading-relaxed mb-6">
                  Select an active customer query from the left sidebar to answer questions, handle complaints, or give updates.
                </p>

                {/* Live Stats Display */}
                <div className="grid grid-cols-2 gap-4 max-w-md w-full">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 text-center shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Open Tickets</span>
                    <span className="text-xl font-black text-slate-800">{tabStats.total}</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 text-center shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Unread Alerts</span>
                    <span className={`text-xl font-black ${tabStats.unread > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                      {tabStats.unread}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-8 text-[10px] font-bold text-slate-400 bg-slate-100/50 px-4 py-2 rounded-full border border-slate-200/50">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Real-time firebase sync is active</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
};
