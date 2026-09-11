import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Search, ShieldCheck, Calendar, Link2, CreditCard } from 'lucide-react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';

export const GenuineVerifications = () => {
  const [verifications, setVerifications] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Users Map
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (querySnapshot) => {
      const uMap = {};
      querySnapshot.forEach((docSnap) => {
        uMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      setUsersMap(uMap);
    }, (error) => {
      console.error("Error fetching users:", error);
    });

    // Fetch Payments specifically for Genuine Verification from Jobs app
    const qVerifications = query(
      collection(db, 'payments'),
      where('description', '==', 'Genuine Verification Upgrade'),
      where('sourceApp', '==', 'Jobs')
    );

    const unsubVerifications = onSnapshot(qVerifications, (querySnapshot) => {
      const vData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort in JS because Firestore requires composite index if sorting on different field than where clause
      vData.sort((a, b) => {
         const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
         const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
         return dateB - dateA; // descending
      });

      setVerifications(vData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching verifications:", error);
      toast.error("Failed to load verifications");
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubVerifications();
    };
  }, []);

  const filteredVerifications = verifications.filter(v => {
    const userName = usersMap[v.userId]?.name || usersMap[v.userId]?.displayName || '';
    const phone = usersMap[v.userId]?.phoneNumber || '';
    const term = searchQuery.toLowerCase();
    
    return userName.toLowerCase().includes(term) || phone.toLowerCase().includes(term);
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Handle both Firestore Timestamp and string formats
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isExpired = (endDateTimestamp) => {
    if (!endDateTimestamp) return false;
    const endDate = endDateTimestamp.toDate ? endDateTimestamp.toDate() : new Date(endDateTimestamp);
    return new Date() > endDate;
  };

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen">
        {/* Compact Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-12 py-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
               <ShieldCheck className="w-6 h-6 text-emerald-500" />
               Genuine Verifications
            </h2>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest ml-8">Monitoring Verified Employers from Jobs App</p>
          </div>
          
          <div className="flex items-center space-x-5">
            <div className="hidden lg:flex items-center w-80 bg-slate-100/50 border border-slate-200/60 rounded-xl px-4 py-2.5 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search by User Name or Phone..." 
                className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full text-slate-600 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1400px] mx-auto">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left table-fixed">
                <thead>
                  <tr className="bg-slate-50/30">
                    <th className="w-[30%] px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                    <th className="w-[20%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Amount Paid</th>
                    <th className="w-[30%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Verification Validity</th>
                    <th className="w-[20%] px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="text-center py-12">
                        <div className="animate-pulse flex flex-col items-center">
                           <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                           <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Verifications...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVerifications.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-16">
                        <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-sm font-black text-slate-500">No genuine verifications found.</p>
                      </td>
                    </tr>
                  ) : filteredVerifications.map((v) => {
                    const userName = usersMap[v.userId]?.name || usersMap[v.userId]?.displayName || 'Unknown User';
                    const initials = userName.substring(0, 2).toUpperCase();
                    const userImg = usersMap[v.userId]?.profileImage;
                    const expired = isExpired(v.endDate);

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/40 transition-all group">

                        {/* User Details */}
                        <td className="px-8 py-6">
                           <div className="flex items-center">
                             <div className="w-12 h-12 bg-slate-100 rounded-full overflow-hidden flex-shrink-0 border-2 border-emerald-100 mr-4">
                               {userImg ? <img src={userImg} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-sm">{initials}</div>}
                             </div>
                             <div>
                               <h5 className="text-[14px] font-black text-slate-900 truncate flex items-center gap-1.5">
                                 {userName}
                                 {!expired && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                               </h5>
                               <div className="flex items-center mt-1">
                                  <span className="w-4 h-4 bg-slate-100 rounded-md flex items-center justify-center mr-1.5"><Link2 className="w-2 h-2 text-slate-400" /></span>
                                  <p className="text-[11px] font-bold text-slate-500">{usersMap[v.userId]?.phoneNumber || usersMap[v.userId]?.email || 'No Contact'}</p>
                               </div>
                             </div>
                           </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-6 text-center">
                          <span className="inline-flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[12px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                            ₹{v.amount || '99'}
                          </span>
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-6 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2">
                             <div className="flex items-center text-[11px] font-black text-slate-600">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest mr-2 w-10 text-right">Start</span>
                                <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{formatDate(v.startDate || v.createdAt)}</span>
                             </div>
                             <div className="flex items-center text-[11px] font-black text-rose-500">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest mr-2 w-10 text-right">End</span>
                                <span className="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">{formatDate(v.endDate)}</span>
                             </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-6 text-center">
                           {expired ? (
                             <span className="inline-flex items-center px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100">
                                EXPIRED
                             </span>
                           ) : (
                             <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                                ACTIVE
                             </span>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
