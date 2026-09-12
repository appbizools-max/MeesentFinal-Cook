import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Calendar, 
  TrendingUp, 
  Wrench, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  XCircle,
  IndianRupee,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const AllTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [vendorsMap, setVendorsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState('all'); // 'month', 'three_months', 'yearly', 'all'
  const [moduleFilter, setModuleFilter] = useState('all'); // 'all', 'services', 'jobs'

  useEffect(() => {
    // 1. Fetch Users Map
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uMap = {};
      snap.docs.forEach(doc => {
        uMap[doc.id] = { id: doc.id, ...doc.data() };
      });
      setUsersMap(uMap);
    }, (err) => console.warn('Users fetch notice:', err));

    // 2. Fetch Vendors Map
    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snap) => {
      const vMap = {};
      snap.docs.forEach(doc => {
        vMap[doc.id] = { id: doc.id, ...doc.data() };
      });
      setVendorsMap(vMap);
    }, (err) => console.warn('Vendors fetch notice:', err));

    // 3. Fetch Real-time Transactions from payments collection
    const qPayments = query(collection(db, 'payments'));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort descending by creation date
      data.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setTransactions(data);
      setLoading(false);
    }, (err) => {
      console.warn('Payments snapshot notice:', err);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubVendors();
      unsubPayments();
    };
  }, []);

  const formatDate = (val) => {
    if (!val) return 'N/A';
    try {
      const d = val.toDate ? val.toDate() : new Date(val);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return 'N/A';
    }
  };

  // Filter Transactions by Timeframe, Module, and Search
  const filteredTransactions = transactions.filter(t => {
    const tDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || 0);
    const now = new Date();
    
    // Timeframe Filter
    if (timeframe === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      if (tDate < thirtyDaysAgo) return false;
    } else if (timeframe === 'three_months') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);
      if (tDate < ninetyDaysAgo) return false;
    } else if (timeframe === 'yearly') {
      const yearAgo = new Date();
      yearAgo.setFullYear(now.getFullYear() - 1);
      if (tDate < yearAgo) return false;
    }

    // Module Filter
    const sourceApp = (t.sourceApp || t.module || '').toLowerCase();
    const desc = (t.description || t.planName || t.purpose || '').toLowerCase();
    
    let isJobs = sourceApp === 'jobs' || desc.includes('job') || desc.includes('genuine candidate');
    let isServices = sourceApp === 'services' || desc.includes('service') || desc.includes('vendor') || desc.includes('plan');

    if (moduleFilter === 'services' && !isServices) return false;
    if (moduleFilter === 'jobs' && !isJobs) return false;

    // Search Filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const orderId = (t.orderId || t.transactionId || t.id || '').toLowerCase();
      const userName = (t.userName || usersMap[t.userId]?.name || vendorsMap[t.vendorId]?.businessName || '').toLowerCase();
      const phone = (t.userPhone || t.phone || usersMap[t.userId]?.phoneNumber || vendorsMap[t.vendorId]?.phoneNumber || '').toLowerCase();

      return orderId.includes(queryLower) || userName.includes(queryLower) || phone.includes(queryLower) || desc.includes(queryLower);
    }

    return true;
  });

  // Calculate Revenue Analytics
  const totalRevenue = filteredTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const servicesRevenue = filteredTransactions
    .filter(t => (t.sourceApp || '').toLowerCase() === 'services' || (t.description || '').toLowerCase().includes('service'))
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const jobsRevenue = filteredTransactions
    .filter(t => (t.sourceApp || '').toLowerCase() === 'jobs' || (t.description || '').toLowerCase().includes('job'))
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <Layout title="Financial Transactions & Analysis">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[32px] text-white shadow-xl">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <CreditCard className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">All Financial Transactions</h1>
                <p className="text-slate-400 text-xs font-semibold mt-0.5">Real-time ledger of subscriptions, pincode ads, and verifications</p>
              </div>
            </div>
          </div>

          {/* Timeframe Analysis Switcher */}
          <div className="flex items-center bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10">
            <button
              onClick={() => setTimeframe('month')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${timeframe === 'month' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              This Month (30d)
            </button>
            <button
              onClick={() => setTimeframe('three_months')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${timeframe === 'three_months' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              3 Months (90d)
            </button>
            <button
              onClick={() => setTimeframe('yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${timeframe === 'yearly' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              Yearly (365d)
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${timeframe === 'all' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">₹{totalRevenue.toLocaleString()}</h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {filteredTransactions.length} Transactions
            </p>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Services Revenue</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">₹{servicesRevenue.toLocaleString()}</h3>
            <p className="text-[11px] font-bold text-blue-600 mt-1">Vendor Subscriptions & Local Ads</p>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jobs Revenue</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">₹{jobsRevenue.toLocaleString()}</h3>
            <p className="text-[11px] font-bold text-purple-600 mt-1">Employer Verification & Job Ads</p>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analysis Period</span>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-2 uppercase">
              {timeframe === 'month' ? 'Last 30 Days' : timeframe === 'three_months' ? 'Last 90 Days' : timeframe === 'yearly' ? 'Last 365 Days' : 'Lifetime History'}
            </h3>
            <p className="text-[11px] font-bold text-slate-400 mt-1">Real-time Live Sync</p>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order ID, Name, Phone, or Purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Module Filter:
            </span>
            <button
              onClick={() => setModuleFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${moduleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setModuleFilter('services')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${moduleFilter === 'services' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Services
            </button>
            <button
              onClick={() => setModuleFilter('jobs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${moduleFilter === 'jobs' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Jobs
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 uppercase tracking-widest text-[9.5px] font-black border-b border-slate-100">
                  <th className="px-6 py-4">Transaction / Order ID</th>
                  <th className="px-6 py-4">Payer Details</th>
                  <th className="px-6 py-4">Purpose & Duration</th>
                  <th className="px-6 py-4 text-center">Module</th>
                  <th className="px-6 py-4 text-right">Amount (₹)</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                      Loading financial transactions...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                      No matching financial transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => {
                    const txnId = t.paymentId || t.transactionId || t.orderId || t.razorpay_payment_id || t.razorpay_order_id || t.id;

                    const vendor = vendorsMap[t.vendorId] || vendorsMap[t.userId] || {};
                    const user = usersMap[t.userId] || usersMap[t.vendorId] || usersMap[vendor.userId] || {};

                    const payerName = t.userName || t.name || vendor.businessName || vendor.ownerName || user.name || user.displayName || 'Customer';
                    const payerPhone = t.userPhone || t.phone || t.phoneNumber || vendor.phone || vendor.phoneNumber || user.phone || user.phoneNumber || 'N/A';

                    const desc = t.description || t.planName || t.purpose || t.serviceType || t.title || 'Payment Transaction';
                    const duration = t.duration || t.planDuration || t.selectedPlan || (t.plan ? String(t.plan).toUpperCase() : null);

                    const sourceApp = (t.sourceApp || t.module || t.app || '').toLowerCase();
                    const serviceType = (t.serviceType || '').toLowerCase();
                    const descLower = desc.toLowerCase();
                    const isJobs = sourceApp === 'jobs' || serviceType.includes('job') || descLower.includes('job') || descLower.includes('candidate') || descLower.includes('seeker');

                    const status = (t.status || 'success').toLowerCase();
                    const txnDate = t.createdAt || t.paymentDate || t.timestamp || t.date;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-800 text-[11px] break-all">
                          {txnId}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900">{payerName}</span>
                            <span className="text-[10px] font-bold text-slate-400">{payerPhone}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{desc}</span>
                            {duration && <span className="text-[9.5px] font-semibold text-slate-400 uppercase">Duration: {duration}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider ${
                            isJobs ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {isJobs ? 'JOBS' : 'SERVICES'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                          ₹{Number(t.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-semibold text-[11px]">
                          {formatDate(txnDate)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                            status === 'success' || status === 'paid' || status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};
