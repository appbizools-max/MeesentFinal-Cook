import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Search, CreditCard, Link2, DollarSign, Store, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { toast } from 'react-hot-toast';

export const VendorTransactions = () => {
  const [payments, setPayments] = useState([]);
  const [vendorsMap, setVendorsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'success', 'pending', 'failed'

  useEffect(() => {
    // 0. Enforce Auth Role checks
    const checkRole = onAuthStateChanged(auth, async (user) => {
      const localAuth = localStorage.getItem('messent_admin_auth');
      if (!user) {
        if (!localAuth) {
          toast.error("Access Denied: Please log in.");
          window.location.href = '/login';
        }
        return;
      }
      try {
        const idTokenResult = await user.getIdTokenResult();
        const isAdmin = idTokenResult.claims.role === 'admin' || localAuth === 'admin';
        if (!isAdmin) {
          toast.error("Access Denied: Admin privileges required.");
          window.location.href = '/login';
        }
      } catch (err) {
        console.error("Error checking claims:", err);
        if (!localAuth) {
          window.location.href = '/login';
        }
      }
    });

    // 1. Fetch Vendors Map to link business details
    const qVendors = query(collection(db, 'vendors'));
    const unsubVendors = onSnapshot(qVendors, (querySnapshot) => {
      const vMap = {};
      querySnapshot.forEach((docSnap) => {
        vMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
      });
      setVendorsMap(vMap);
    }, (error) => console.error("Error fetching vendors map:", error));

    // 2. Fetch All Payments ordered by date
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
      toast.error("Failed to load vendor transactions");
      setLoading(false);
    });

    return () => {
      checkRole();
      unsubVendors();
      unsubPayments();
    };
  }, []);

  const isVendorPayment = (p) => {
    // If it has vendorId or references vendor plans (small, big, etc.)
    if (p.vendorId) return true;
    if (p.planId === 'small' || p.planId === 'big' || p.planId === 'none') return true;
    return false;
  };

  const filteredPayments = payments.filter(p => {
    if (!isVendorPayment(p)) return false;

    // Status Filter
    if (statusFilter !== 'All') {
      const pStatus = (p.status || 'success').toLowerCase();
      if (pStatus !== statusFilter.toLowerCase()) return false;
    }

    // Search Filter
    const vId = p.vendorId || p.id;
    const vendor = vendorsMap[vId];
    const bizName = vendor?.businessName || 'Merchant Business';
    const ownerName = vendor?.ownerName || '';
    const phone = vendor?.phoneNumber || vendor?.phone || p.phone || '';
    const term = searchQuery.toLowerCase();

    return bizName.toLowerCase().includes(term) || 
           ownerName.toLowerCase().includes(term) || 
           phone.toLowerCase().includes(term) || 
           ((p.transactionId || p.paymentId || p.orderId) && 
            (p.transactionId || p.paymentId || p.orderId).toLowerCase().includes(term));
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-12 py-5 flex flex-col border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                 <Store className="w-6 h-6 text-blue-600" />
                 Vendor Transactions Ledger
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest ml-8">
                Monitoring plan upgrades, verification payments and transaction history
              </p>
            </div>
            
            <div className="flex items-center space-x-5">
              <div className="hidden lg:flex items-center w-80 bg-slate-100/50 border border-slate-200/60 rounded-xl px-4 py-2.5 focus-within:bg-white transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Search by Business, Phone or Order ID..." 
                  className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full text-slate-600 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Navigation Filters */}
          <div className="flex items-center mt-6 space-x-2 overflow-x-auto scrollbar-hide">
            {['All', 'Success', 'Pending', 'Failed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === status 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                {status}
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
                    <th className="w-[25%] px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Business & Contact</th>
                    <th className="w-[20%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Transaction Details</th>
                    <th className="w-[20%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Plan Purchased</th>
                    <th className="w-[15%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Amount</th>
                    <th className="w-[20%] px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status & Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12">
                        <div className="animate-pulse flex flex-col items-center">
                           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                           <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading transactions...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-16">
                        <DollarSign className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-sm font-black text-slate-500">No transactions recorded yet.</p>
                      </td>
                    </tr>
                  ) : filteredPayments.map((p) => {
                    const vId = p.vendorId || p.id;
                    const vendor = vendorsMap[vId];
                    const bizName = vendor?.businessName || 'Registered Vendor';
                    const initials = bizName.substring(0, 2).toUpperCase();
                    const phone = vendor?.phoneNumber || vendor?.phone || p.phone || 'No Contact';
                    
                    const pStatus = (p.status || 'success').toLowerCase();

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/40 transition-all group">

                        {/* Business Details */}
                        <td className="px-8 py-6">
                           <div className="flex items-center">
                             <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 mr-3">
                               {vendor?.businessImage ? (
                                 <img src={vendor.businessImage} className="w-full h-full object-cover" alt="" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-xs">{initials}</div>
                               )}
                             </div>
                             <div>
                               <h5 className="text-[13px] font-black text-slate-900 truncate">{bizName}</h5>
                               <div className="flex items-center mt-1">
                                  <span className="w-4 h-4 bg-slate-100 rounded-md flex items-center justify-center mr-1.5"><Link2 className="w-2 h-2 text-slate-400" /></span>
                                  <p className="text-[10px] font-bold text-slate-500">{phone}</p>
                               </div>
                             </div>
                           </div>
                        </td>

                        {/* Transaction ID & Date */}
                        <td className="px-4 py-6">
                          <div className="flex flex-col space-y-1">
                             <span className="text-[11px] font-black text-slate-800 break-all">Order ID: {p.orderId || 'N/A'}</span>
                             {p.transactionId && <span className="text-[9px] font-bold text-slate-500 truncate">Txn ID: {p.transactionId}</span>}
                             <span className="text-[9px] font-bold text-slate-400">{formatDate(p.createdAt)}</span>
                          </div>
                        </td>

                        {/* Plan Details */}
                        <td className="px-4 py-6 text-center">
                           <div className="flex flex-col items-center">
                             <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg text-center max-w-full">
                               {p.planName || (p.planId === 'big' ? 'Big Plan' : p.planId === 'small' ? 'Small Plan' : 'Plan Upgrade')}
                             </span>
                             {p.duration && (
                               <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-2">
                                 Duration: {p.duration}
                               </span>
                             )}
                           </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-6 text-center">
                          <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[12px] font-black tracking-widest border border-emerald-100 shadow-sm">
                            ₹{p.amount || '0'}
                          </span>
                        </td>

                        {/* Status & Method */}
                        <td className="px-6 py-6 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              pStatus === 'success' || pStatus === 'active'
                                ? 'bg-green-100 text-green-800'
                                : pStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {pStatus === 'success' || pStatus === 'active' ? (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                              ) : pStatus === 'pending' ? (
                                <Clock className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {pStatus.toUpperCase()}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                              via {p.paymentMethod || 'Razorpay'}
                            </span>
                          </div>
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
