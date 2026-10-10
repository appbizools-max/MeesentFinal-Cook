import React, { useState, useEffect } from 'react';
// Genuine Verifications Portal
import { Layout } from '../components/layout/Layout';
import { Search, ShieldCheck, Link2, CreditCard, Plus, X, AlertCircle } from 'lucide-react';
import { collection, query, onSnapshot, where, doc, updateDoc, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';

export const GenuineVerifications = () => {
  const [paymentsList, setPaymentsList] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'expired'
  const [loading, setLoading] = useState(true);

  // Grant Modal state
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantSearch, setGrantSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [grantDuration, setGrantDuration] = useState('30'); // '30' | '90' | '365' | 'lifetime'
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    // 1. Fetch Users
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (querySnapshot) => {
      const uMap = {};
      const uArr = [];
      querySnapshot.forEach((docSnap) => {
        const u = { id: docSnap.id, ...docSnap.data() };
        uMap[docSnap.id] = u;
        uArr.push(u);
      });
      setUsersMap(uMap);
      setAllUsers(uArr);
    }, (error) => {
      console.error("Error fetching users:", error);
    });

    // 2. Fetch Payments specifically for Genuine Verification from Jobs app
    const qVerifications = query(
      collection(db, 'payments'),
      where('description', '==', 'Genuine Verification Upgrade'),
      where('sourceApp', '==', 'Jobs')
    );

    const unsubVerifications = onSnapshot(qVerifications, (querySnapshot) => {
      const vData = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      vData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setPaymentsList(vData);
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

  // Merge payments-based verifications with users who are directly marked as verified in users collection
  const combinedVerifications = (() => {
    const list = [...paymentsList];
    const userIdsWithPayment = new Set(paymentsList.map(p => p.userId));

    // Add any verified users who do not have a payment record (e.g. granted directly)
    allUsers.forEach(u => {
      if ((u.isGenuineVerified || u.hasVerificationBadge) && !userIdsWithPayment.has(u.id)) {
        list.push({
          id: `user_direct_${u.id}`,
          userId: u.id,
          amount: 0,
          paymentMethod: 'Admin Grant',
          startDate: u.genuineVerificationStartDate || u.createdAt,
          endDate: u.genuineVerificationEndDate || null,
          isDirectUser: true
        });
      }
    });

    return list;
  })();

  const isExpired = (endDateTimestamp) => {
    if (!endDateTimestamp) return false; // Lifetime / Admin lifetime
    try {
      const endDate = endDateTimestamp.toDate ? endDateTimestamp.toDate() : new Date(endDateTimestamp);
      return new Date() > endDate;
    } catch {
      return false;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Lifetime';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'Lifetime';
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  // Filter verifications
  const filteredVerifications = combinedVerifications.filter(v => {
    const user = usersMap[v.userId];
    const userName = user?.name || user?.displayName || '';
    const phone = user?.phoneNumber || user?.phone || '';
    const term = searchQuery.toLowerCase();

    const matchesSearch = userName.toLowerCase().includes(term) || phone.toLowerCase().includes(term);
    if (!matchesSearch) return false;

    // Resolve active/expired status using user record if available
    const effectiveEndDate = user?.genuineVerificationEndDate || v.endDate;
    const expired = isExpired(effectiveEndDate);

    if (statusFilter === 'active') {
      return !expired && (user ? user.isGenuineVerified !== false : true);
    }
    if (statusFilter === 'expired') {
      return expired || (user && user.isGenuineVerified === false);
    }
    return true;
  });

  // Action: Grant Genuine Verification
  const handleGrantVerification = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a user to verify');
      return;
    }

    try {
      setGranting(true);
      const startDate = new Date();
      let endDate = null;

      if (grantDuration !== 'lifetime') {
        const days = parseInt(grantDuration, 10);
        endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
      }

      // 1. Update user profile document
      const userRef = doc(db, 'users', selectedUserId);
      await updateDoc(userRef, {
        isGenuineVerified: true,
        hasVerificationBadge: true,
        genuineVerificationStartDate: startDate,
        genuineVerificationEndDate: endDate,
        verifiedByAdmin: true,
        updatedAt: serverTimestamp()
      });

      // 2. Log in payments for audit trail
      await addDoc(collection(db, 'payments'), {
        userId: selectedUserId,
        amount: 0,
        paymentId: `admin_grant_${Date.now()}`,
        status: 'success',
        description: 'Genuine Verification Upgrade',
        plan: grantDuration === 'lifetime' ? 'Lifetime' : `${grantDuration} Days`,
        paymentMethod: 'Admin Direct Grant',
        sourceApp: 'Jobs',
        createdAt: serverTimestamp(),
        startDate: startDate,
        endDate: endDate
      });

      // 3. Update all existing jobs posted by the user
      const qJobs1 = query(collection(db, 'jobs'), where('postedBy', '==', selectedUserId));
      const qJobs2 = query(collection(db, 'jobs'), where('userId', '==', selectedUserId));
      const [snap1, snap2] = await Promise.all([getDocs(qJobs1), getDocs(qJobs2)]);

      const jobDocIds = new Set();
      const jobPromises = [];

      [...snap1.docs, ...snap2.docs].forEach(jobDoc => {
        if (!jobDocIds.has(jobDoc.id)) {
          jobDocIds.add(jobDoc.id);
          jobPromises.push(
            updateDoc(jobDoc.ref, {
              isGenuineVerified: true,
              genuineVerificationEndDate: endDate,
              updatedAt: serverTimestamp()
            })
          );
        }
      });

      await Promise.all(jobPromises);

      const targetUser = usersMap[selectedUserId];
      toast.success(`Genuine Verification granted to ${targetUser?.name || 'user'}`);
      setShowGrantModal(false);
      setSelectedUserId('');
      setGrantSearch('');
    } catch (err) {
      console.error("Error granting verification:", err);
      toast.error('Failed to grant verification');
    } finally {
      setGranting(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-12 py-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              Genuine Verifications (Jobs)
            </h2>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest ml-8">
              In-App Purchases & Admin Granted Employer Verifications
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center w-72 bg-slate-100/50 border border-slate-200/60 rounded-xl px-4 py-2.5 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search user name or phone..."
                className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full text-slate-600 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowGrantModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-200 transition-all"
            >
              <Plus className="w-4 h-4" />
              Grant Verification
            </button>
          </div>
        </header>

        <div className="p-10 max-w-[1400px] mx-auto space-y-6">
          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({combinedVerifications.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active Valid ({combinedVerifications.filter(v => {
                const u = usersMap[v.userId];
                const end = u?.genuineVerificationEndDate || v.endDate;
                return !isExpired(end) && (u ? u.isGenuineVerified !== false : true);
              }).length})
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'expired' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Expired / Inactive ({combinedVerifications.filter(v => {
                const u = usersMap[v.userId];
                const end = u?.genuineVerificationEndDate || v.endDate;
                return isExpired(end) || (u && u.isGenuineVerified === false);
              }).length})
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left table-fixed">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="w-[32%] px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                    <th className="w-[20%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Type / Source</th>
                    <th className="w-[28%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Verification Validity</th>
                    <th className="w-[20%] px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
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
                  ) : (
                    filteredVerifications.map((v) => {
                      const user = usersMap[v.userId];
                      const userName = user?.name || user?.displayName || 'Unknown User';
                      const initials = userName.substring(0, 2).toUpperCase();
                      const userImg = user?.profileImage;

                      const effectiveEndDate = user?.genuineVerificationEndDate || v.endDate;
                      const expired = isExpired(effectiveEndDate) || (user && user.isGenuineVerified === false);

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/40 transition-all group">
                          {/* User Details */}
                          <td className="px-8 py-6">
                            <div className="flex items-center">
                              <div className="w-12 h-12 bg-slate-100 rounded-full overflow-hidden flex-shrink-0 border-2 border-emerald-100 mr-4">
                                {userImg ? (
                                  <img src={userImg} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-sm">
                                    {initials}
                                  </div>
                                )}
                              </div>
                              <div className="truncate">
                                <h5 className="text-[14px] font-black text-slate-900 truncate flex items-center gap-1.5">
                                  {userName}
                                  {!expired && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
                                </h5>
                                <div className="flex items-center mt-1">
                                  <span className="w-4 h-4 bg-slate-100 rounded-md flex items-center justify-center mr-1.5">
                                    <Link2 className="w-2 h-2 text-slate-400" />
                                  </span>
                                  <p className="text-[11px] font-bold text-slate-500 truncate">
                                    {user?.phoneNumber || user?.phone || user?.email || 'No Contact'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Source / Amount */}
                          <td className="px-4 py-6 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-black uppercase tracking-wider border border-emerald-100">
                                <CreditCard className="w-3 h-3 mr-1" />
                                {v.amount && v.amount > 0 ? `₹${v.amount}` : 'Admin Grant'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                {v.paymentMethod || (v.amount > 0 ? 'In-App Payment' : 'Admin Panel')}
                              </span>
                            </div>
                          </td>

                          {/* Validity Dates */}
                          <td className="px-4 py-6 text-center">
                            <div className="flex flex-col items-center justify-center space-y-1.5">
                              <div className="flex items-center text-[11px] font-bold text-slate-600">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest mr-2 w-10 text-right">Start</span>
                                <span className="bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 font-mono text-[11px]">
                                  {formatDate(v.startDate || user?.genuineVerificationStartDate || v.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center text-[11px] font-bold text-slate-600">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest mr-2 w-10 text-right">End</span>
                                <span className={`px-2.5 py-1 rounded-md border font-mono text-[11px] ${
                                  expired ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                  {formatDate(effectiveEndDate)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-6 text-center">
                            {expired ? (
                              <span className="inline-flex items-center px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-100">
                                EXPIRED
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                                ACTIVE
                              </span>
                            )}
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

        {/* Modal: Grant Genuine Verification */}
        {showGrantModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    Grant Genuine Verification (Jobs)
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Admin approval for employer profile & all their jobs</p>
                </div>
                <button
                  onClick={() => setShowGrantModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleGrantVerification} className="p-6 space-y-4">
                {/* Search / Select User */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Select User / Employer
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, phone, or email..."
                      value={grantSearch}
                      onChange={(e) => setGrantSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {allUsers
                      .filter(u => {
                        const term = grantSearch.toLowerCase();
                        const name = (u.name || u.displayName || '').toLowerCase();
                        const phone = (u.phoneNumber || u.phone || '').toLowerCase();
                        const email = (u.email || '').toLowerCase();
                        return name.includes(term) || phone.includes(term) || email.includes(term);
                      })
                      .slice(0, 20)
                      .map(u => {
                        const isSelected = selectedUserId === u.id;
                        return (
                          <div
                            key={u.id}
                            onClick={() => setSelectedUserId(u.id)}
                            className={`p-2.5 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                              isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div>
                              <p className="font-bold">{u.name || u.displayName || 'Unnamed User'}</p>
                              <p className="text-[10px] text-slate-400">{u.phoneNumber || u.phone || u.email || u.id}</p>
                            </div>
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                Selected
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Verification Duration
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '30 Days (1 Month)', value: '30' },
                      { label: '90 Days (3 Months)', value: '90' },
                      { label: '365 Days (1 Year)', value: '365' },
                      { label: 'Lifetime / No Expiry', value: 'lifetime' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGrantDuration(opt.value)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                          grantDuration === opt.value
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Granting verification will immediately display the <strong>Genuine Verified</strong> badge on this user&apos;s profile and on all existing & future jobs posted by them.
                  </span>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowGrantModal(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={granting || !selectedUserId}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5"
                  >
                    {granting ? 'Granting...' : 'Confirm & Grant Verification'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
