import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Search, CreditCard, Calendar, User, Link2, DollarSign } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';

export const JobPayments = () => {
  const [payments, setPayments] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  const tabs = [
    'All', 
    'Genuine Verification', 
    'Job Seeker', 
    'Post Ads', 
    'Top Visibility'
  ];

  useEffect(() => {
    // Fetch Users Map
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (querySnapshot) => {
      const uMap = {};
      querySnapshot.forEach((docSnap) => {
        uMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      setUsersMap(uMap);
    }, (error) => console.error("Error fetching users:", error));

    // Fetch All Payments
    const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (querySnapshot) => {
      const pData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPayments(pData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments");
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubPayments();
    };
  }, []);

  const getPaymentCategory = (payment) => {
    const desc = payment.description || '';
    if (desc.includes('Genuine Verification')) return 'Genuine Verification';
    if (desc.includes('Premium Job Seeker') || payment.serviceType === 'JobSeekerPremium') return 'Job Seeker';
    if (desc.includes('Pincode Ad Campaign') || payment.targetType) return 'Post Ads';
    if (desc.includes('Top Visibility')) return 'Top Visibility';
    return 'Other';
  };

  const filteredPayments = payments.filter(p => {
    // Filter out payments that are not related to Jobs (except if they are missing sourceApp but match job-related descriptions)
    const category = getPaymentCategory(p);
    if (category === 'Other' && p.sourceApp !== 'Jobs') return false;

    // Tab Filter
    if (activeTab !== 'All' && category !== activeTab) return false;

    // Search Filter
    const userName = usersMap[p.userId]?.name || usersMap[p.userId]?.displayName || '';
    const phone = usersMap[p.userId]?.phoneNumber || '';
    const term = searchQuery.toLowerCase();
    
    return userName.toLowerCase().includes(term) || 
           phone.toLowerCase().includes(term) || 
           (p.paymentId && p.paymentId.toLowerCase().includes(term));
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-12 py-5 flex flex-col border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                 <CreditCard className="w-6 h-6 text-purple-600" />
                 Job Payments Ledger
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest ml-8">
                Monitoring All Premium Transactions from Meesent Jobs
              </p>
            </div>
            
            <div className="flex items-center space-x-5">
              <div className="hidden lg:flex items-center w-80 bg-slate-100/50 border border-slate-200/60 rounded-xl px-4 py-2.5 focus-within:bg-white transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Search by User, Phone or Razorpay ID..." 
                  className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full text-slate-600 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center mt-6 space-x-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left table-fixed">
                <thead>
                  <tr className="bg-slate-50/30">
                    <th className="w-[20%] px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                    <th className="w-[20%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaction Details</th>
                    <th className="w-[25%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Description / Plan</th>
                    <th className="w-[10%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Amount</th>
                    <th className="w-[25%] px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Duration / Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12">
                        <div className="animate-pulse flex flex-col items-center">
                           <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                           <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Payments...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-16">
                        <DollarSign className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-sm font-black text-slate-500">No payment records found.</p>
                      </td>
                    </tr>
                  ) : filteredPayments.map((p) => {
                    const userName = usersMap[p.userId]?.name || usersMap[p.userId]?.displayName || 'Unknown User';
                    const initials = userName.substring(0, 2).toUpperCase();
                    const userImg = usersMap[p.userId]?.profileImage;
                    const cat = getPaymentCategory(p);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/40 transition-all group">

                        {/* User Details */}
                        <td className="px-8 py-6">
                           <div className="flex items-center">
                             <div className="w-10 h-10 bg-slate-100 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 mr-3">
                               {userImg ? <img src={userImg} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-xs">{initials}</div>}
                             </div>
                             <div>
                               <h5 className="text-[13px] font-black text-slate-900 truncate">{userName}</h5>
                               <div className="flex items-center mt-1">
                                  <span className="w-4 h-4 bg-slate-100 rounded-md flex items-center justify-center mr-1.5"><Link2 className="w-2 h-2 text-slate-400" /></span>
                                  <p className="text-[10px] font-bold text-slate-500">{usersMap[p.userId]?.phoneNumber || usersMap[p.userId]?.email || 'No Contact'}</p>
                               </div>
                             </div>
                           </div>
                        </td>

                        {/* Transaction Details */}
                        <td className="px-4 py-6">
                          <div className="flex flex-col space-y-1.5">
                             <span className="text-[11px] font-black text-slate-800">ID: {p.paymentId || 'N/A'}</span>
                             <span className="text-[10px] font-bold text-slate-500">{formatDate(p.createdAt)}</span>
                             <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black uppercase tracking-widest w-fit border border-emerald-100">
                               {p.status || 'SUCCESS'}
                             </span>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-4 py-6 text-center">
                           <div className="flex flex-col items-center">
                             <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg text-center max-w-full">
                               {p.description || cat}
                             </span>
                             <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest mt-2">
                               Category: {cat}
                             </span>
                           </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-6 text-center">
                          <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[12px] font-black tracking-widest border border-emerald-100 shadow-sm">
                            ₹{p.amount || '0'}
                          </span>
                        </td>

                        {/* Dates */}
                        <td className="px-6 py-6 text-center">
                          {p.startDate || p.endDate ? (
                            <div className="flex flex-col items-center justify-center space-y-1.5">
                               <div className="flex items-center text-[10px] font-black text-slate-600">
                                  <span className="text-[8px] text-slate-400 uppercase tracking-widest mr-2 w-8 text-right">Start</span>
                                  <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">{formatDate(p.startDate || p.createdAt)}</span>
                               </div>
                               {p.endDate && (
                                 <div className="flex items-center text-[10px] font-black text-rose-500">
                                    <span className="text-[8px] text-slate-400 uppercase tracking-widest mr-2 w-8 text-right">End</span>
                                    <span className="bg-rose-50 px-2 py-1 rounded border border-rose-100">{formatDate(p.endDate)}</span>
                                 </div>
                               )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">Not Applicable</span>
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
