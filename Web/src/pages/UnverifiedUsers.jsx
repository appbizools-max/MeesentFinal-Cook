import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { collection, query, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  ShieldCheck, 
  Search, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  IndianRupee, 
  CheckCircle2, 
  Clock,
  X, 
  Store, 
  Sparkles,
  CreditCard,
  PhoneCall,
  Wrench,
  Briefcase,
  Layers,
  Building2,
  PlusCircle,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export const UnverifiedUsers = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [vendorsByUserId, setVendorsByUserId] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMainTab, setActiveMainTab] = useState('unverified'); // 'unverified' or 'verified_multibusiness'
  
  // Modal state for manual verification
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('ALL');
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [verificationType, setVerificationType] = useState('services'); // 'services', 'jobs', 'both'
  const [amountCollected, setAmountCollected] = useState(199);
  const [paymentMethod, setPaymentMethod] = useState('Manual UPI (GPay/PhonePe)');
  const [notes, setNotes] = useState('Payment collected manually by Admin');
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    // 1. Fetch Users
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      usersData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA;
      });

      setAllUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.warn("Unverified users snapshot error:", err);
      setLoading(false);
    });

    // 2. Fetch Vendors grouped by User ID
    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      const vMap = {};
      snapshot.docs.forEach(d => {
        const v = { id: d.id, ...d.data() };
        const uId = v.userId || v.ownerId;
        if (uId) {
          if (!vMap[uId]) vMap[uId] = [];
          vMap[uId].push(v);
        }
      });
      setVendorsByUserId(vMap);
    }, (err) => console.warn("Vendors snapshot error:", err));

    return () => {
      unsubUsers();
      unsubVendors();
    };
  }, []);

  const unverifiedUsersList = allUsers.filter(u => {
    const isVerified = Boolean(
      u.isGenuineVerified || 
      u.tookVerification || 
      u.hasVerificationBadge || 
      u.verificationBadgePurchasedAt
    );
    return !isVerified;
  });

  const verifiedUsersList = allUsers.filter(u => {
    const isVerified = Boolean(
      u.isGenuineVerified || 
      u.tookVerification || 
      u.hasVerificationBadge || 
      u.verificationBadgePurchasedAt
    );
    return isVerified;
  });

  const displayedUsersList = activeMainTab === 'unverified' ? unverifiedUsersList : verifiedUsersList;

  // Fetch businesses when opening modal
  const handleOpenModal = async (user) => {
    setSelectedUser(user);
    setShowModal(true);
    setLoadingBusinesses(true);
    setUserBusinesses([]);
    setSelectedBusinessId('ALL');

    try {
      const uPhone = user.phoneNumber || user.phone || user.contactPhone;
      
      const vQuery = query(collection(db, 'vendors'));
      const vSnap = await getDocs(vQuery);
      
      const matched = vSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => v.userId === user.id || v.ownerId === user.id || (uPhone && (v.phoneNumber === uPhone || v.phone === uPhone)));

      setUserBusinesses(matched);
      if (matched.length > 0) {
        setVerificationType('services');
        const unverifiedB = matched.find(b => !(b.isVerified || b.isGenuineVerified || b.tookVerification));
        if (unverifiedB) {
          setSelectedBusinessId(unverifiedB.id);
        } else {
          setSelectedBusinessId('UNVERIFIED_ONLY');
        }
      } else {
        setVerificationType('jobs');
      }
    } catch (err) {
      console.warn("Error fetching user businesses:", err);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return 'N/A';
    }
  };

  const filteredUsers = displayedUsersList.filter(u => {
    const name = u.name || u.displayName || u.fullName || '';
    const phone = u.phoneNumber || u.phone || u.contactPhone || '';
    const email = u.email || '';
    const term = searchQuery.toLowerCase();

    return name.toLowerCase().includes(term) || phone.includes(term) || email.toLowerCase().includes(term);
  });

  const handleGrantManualVerification = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setGranting(true);
    try {
      const userId = selectedUser.id;

      // 1. If Jobs or Both -> Update User profile
      if (verificationType === 'jobs' || verificationType === 'both') {
        await updateDoc(doc(db, 'users', userId), {
          isGenuineVerified: true,
          hasVerificationBadge: true,
          tookVerification: true,
          verificationPaid: true,
          verificationMethod: 'Manual Admin Payment',
          verificationAmount: Number(amountCollected),
          verificationNotes: notes,
          verifiedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Add payment record for Jobs
        await addDoc(collection(db, 'payments'), {
          userId: userId,
          userName: selectedUser.name || selectedUser.displayName || 'User',
          userPhone: selectedUser.phoneNumber || selectedUser.phone || 'N/A',
          amount: Number(amountCollected),
          paymentMethod: paymentMethod,
          description: 'Jobs Genuine Candidate Verification (Manual Admin Upgrade)',
          purpose: 'Genuine Employer & Candidate Verification',
          sourceApp: 'Jobs',
          status: 'SUCCESS',
          isManual: true,
          notes: notes,
          createdAt: new Date()
        });
      }

      // 2. If Services or Both -> Update Vendor business profiles
      if (verificationType === 'services' || verificationType === 'both') {
        const targetVendors = selectedBusinessId === 'ALL'
          ? userBusinesses
          : selectedBusinessId === 'UNVERIFIED_ONLY'
            ? userBusinesses.filter(b => !(b.isVerified || b.isGenuineVerified || b.tookVerification))
            : userBusinesses.filter(b => b.id === selectedBusinessId);

        if (targetVendors.length > 0) {
          for (const vDoc of targetVendors) {
            await updateDoc(doc(db, 'vendors', vDoc.id), {
              isGenuineVerified: true,
              tookVerification: true,
              verificationPaid: true,
              verificationStatus: 'verified',
              verifyMark: true,
              isVerified: true,
              status: 'approved',
              updatedAt: serverTimestamp()
            });

            // Add payment record for Services vendor
            await addDoc(collection(db, 'payments'), {
              userId: userId,
              vendorId: vDoc.id,
              userName: vDoc.businessName || selectedUser.name || 'Vendor',
              userPhone: vDoc.phone || vDoc.phoneNumber || selectedUser.phone || 'N/A',
              amount: Number(amountCollected),
              paymentMethod: paymentMethod,
              description: `Services Business Verification - ${vDoc.businessName || 'Business'} (Manual Admin Upgrade)`,
              purpose: 'Services Business Onboarding Verification',
              sourceApp: 'Services',
              status: 'SUCCESS',
              isManual: true,
              notes: notes,
              createdAt: new Date()
            });
          }
        } else {
          // If no specific vendor document found yet, update user's vendor flag
          await updateDoc(doc(db, 'users', userId), {
            isVendorVerified: true,
            isGenuineVerified: true,
            hasVerificationBadge: true
          });
        }
      }

      toast.success(`Verification granted successfully to ${selectedUser.name || 'User'}!`);
      setShowModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Error granting manual verification:", err);
      toast.error(`Failed to grant verification: ${err?.message || 'Error updating Firestore'}`);
    } finally {
      setGranting(false);
    }
  };

  return (
    <Layout title="Manual User & Multi-Business Verification">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 rounded-[32px] text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center backdrop-blur-md">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Manual Verification & Multi-Business Upgrades</h1>
              <p className="text-slate-300 text-xs font-semibold mt-0.5">Collect payment manually & verify unverified accounts or add verification to additional businesses</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">Unverified</p>
              <p className="text-lg font-black text-white">{unverifiedUsersList.length}</p>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-400/20 px-5 py-2.5 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Verified Accounts</p>
              <p className="text-lg font-black text-emerald-400">{verifiedUsersList.length}</p>
            </div>
          </div>
        </div>

        {/* Section Tabs Switcher */}
        <div className="flex items-center bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm gap-2">
          <button
            onClick={() => setActiveMainTab('unverified')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeMainTab === 'unverified'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Unverified Users ({unverifiedUsersList.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('verified_multibusiness')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeMainTab === 'verified_multibusiness'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4 text-white" />
            <span>Verified Users & Multi-Business Add/Upgrade ({verifiedUsersList.length})</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Name, Phone Number, or Email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Showing {filteredUsers.length} Accounts in {activeMainTab === 'unverified' ? 'Unverified List' : 'Verified / Multi-Business Section'}
          </div>
        </div>

        {/* Users Directory Table */}
        <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 uppercase tracking-widest text-[9.5px] font-black border-b border-slate-100">
                  <th className="px-6 py-4">User Member</th>
                  <th className="px-6 py-4">Phone & Contact</th>
                  <th className="px-6 py-4">Business Listings & Verification Status</th>
                  <th className="px-6 py-4 text-center">Account Role</th>
                  <th className="px-6 py-4 text-center">Verification Badge</th>
                  <th className="px-6 py-4 text-right">Manual Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading user accounts...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                      No matching user accounts found in this section.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const name = user.name || user.displayName || user.fullName || 'Unnamed User';
                    const initials = name.substring(0, 2).toUpperCase();
                    const phone = user.phoneNumber || user.phone || user.contactPhone || 'N/A';
                    const email = user.email || 'N/A';
                    const isVendor = user.userType === 'vendor' || user.isVendor || Boolean(user.businessName);
                    const isVerified = Boolean(user.isGenuineVerified || user.tookVerification || user.hasVerificationBadge);

                    const userBusinessesList = vendorsByUserId[user.id] || [];

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Member */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-sm flex items-center justify-center border border-emerald-100 shrink-0 shadow-xs">
                              {user.profileImage || user.photoURL ? (
                                <img src={user.profileImage || user.photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div>
                              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                {name}
                                {isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                              </h5>
                              <span className="text-[10px] font-mono text-slate-400">ID: {user.id.substring(0, 10)}...</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <a href={`tel:${phone}`} className="flex items-center text-slate-800 font-bold gap-1.5 hover:text-emerald-600 transition-colors">
                              <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{phone}</span>
                            </a>
                            {email !== 'N/A' && (
                              <div className="flex items-center text-slate-400 font-semibold gap-1.5 text-[11px]">
                                <Mail className="w-3.5 h-3.5 text-slate-300" />
                                <span className="truncate max-w-[180px]" title={email}>{email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Business Listings & Verification Status */}
                        <td className="px-6 py-4">
                          {userBusinessesList.length === 0 ? (
                            <span className="text-[10.5px] font-bold text-slate-400 italic">No business listings created</span>
                          ) : (
                            <div className="space-y-1.5 max-w-xs">
                              <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">
                                {userBusinessesList.length} Business Listing{userBusinessesList.length > 1 ? 's' : ''}:
                              </p>
                              {userBusinessesList.map((b) => {
                                const isBVerified = Boolean(b.isVerified || b.isGenuineVerified || b.tookVerification || b.verifyMark);
                                return (
                                  <div key={b.id} className="flex items-center justify-between text-[10.5px] font-bold p-1.5 rounded-lg border bg-slate-50 border-slate-100">
                                    <span className="truncate max-w-[140px] text-slate-800" title={b.businessName}>{b.businessName || 'Business'}</span>
                                    {isBVerified ? (
                                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1 shrink-0">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> VERIFIED
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 shrink-0">
                                        <Clock className="w-3 h-3 text-amber-600" /> UNVERIFIED
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider ${
                            isVendor ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {isVendor ? 'SERVICE VENDOR' : 'JOB SEEKER / CLIENT'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          {isVerified ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 gap-1">
                                <Check className="w-3 h-3 text-emerald-600" /> VERIFIED MEMBER
                              </span>
                              {user.isGenuineVerified && (
                                <span className="text-[9.5px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                  🛡️ Jobs Candidate Verified
                                </span>
                              )}
                              {(user.isVendorVerified || user.isVerified || user.tookVerification) && (
                                <span className="text-[9.5px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                  🟢 Services Business Verified
                                </span>
                              )}
                              {user.verificationAmount ? (
                                <span className="text-[9px] font-black text-slate-500">
                                  Paid: ₹{user.verificationAmount} ({user.verificationMethod || 'Manual'})
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                              UNVERIFIED
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenModal(user)}
                            className={`px-4 py-2 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 ml-auto active:scale-95 ${
                              isVerified 
                                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' 
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                            }`}
                          >
                            {isVerified ? <PlusCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                            <span>{isVerified ? 'Verify Additional Business' : 'Grant Manual Verification'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal for Manual Payment & Verification Grant */}
        {showModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up border border-slate-100">
              <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black">Manual Verification & Business Grant</h3>
                    <p className="text-white/80 text-xs font-semibold">Offline Cash / UPI Payment Entry</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <form onSubmit={handleGrantManualVerification} className="p-6 space-y-5">
                {/* User Info Header */}
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0">
                    {(selectedUser.name || 'U').substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{selectedUser.name || selectedUser.displayName || 'User Member'}</h4>
                    <p className="text-xs font-bold text-slate-500">{selectedUser.phoneNumber || selectedUser.phone || 'No phone'}</p>
                  </div>
                </div>

                {/* 1. Verification Type Selector */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Select Verification Scope
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setVerificationType('services')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        verificationType === 'services' 
                          ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Wrench className="w-4 h-4 mb-1 text-blue-600" />
                      <span className="text-[10.5px] font-black uppercase">Services Business</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVerificationType('jobs')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        verificationType === 'jobs' 
                          ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 mb-1 text-purple-600" />
                      <span className="text-[10.5px] font-black uppercase">Jobs Candidate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVerificationType('both')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        verificationType === 'both' 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Layers className="w-4 h-4 mb-1 text-emerald-600" />
                      <span className="text-[10.5px] font-black uppercase">Both (Services + Jobs)</span>
                    </button>
                  </div>
                </div>

                {/* 2. Business Selection for Services Verification */}
                {(verificationType === 'services' || verificationType === 'both') && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      Select Business Listing to Verify
                    </label>
                    {loadingBusinesses ? (
                      <p className="text-xs text-slate-400 font-bold animate-pulse">Checking business listings...</p>
                    ) : userBusinesses.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-800">
                        No registered business listings found for this user. A new vendor profile will be marked as verified automatically.
                      </div>
                    ) : (
                      <select
                        value={selectedBusinessId}
                        onChange={(e) => setSelectedBusinessId(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
                      >
                        <option value="UNVERIFIED_ONLY">⏳ UNVERIFIED BUSINESSES ONLY ({userBusinesses.filter(b => !(b.isVerified || b.isGenuineVerified || b.tookVerification)).length} Pending)</option>
                        <option value="ALL">🌟 ALL BUSINESS LISTINGS (Batch Verify {userBusinesses.length} Profiles)</option>
                        <optgroup label="--- Individual Business Listings ---">
                          {userBusinesses.map(b => {
                            const isBVerified = Boolean(b.isVerified || b.isGenuineVerified || b.tookVerification || b.verifyMark);
                            return (
                              <option key={b.id} value={b.id} disabled={isBVerified} className={isBVerified ? 'text-slate-400 bg-slate-100 font-normal' : 'font-bold text-slate-900'}>
                                {isBVerified ? '✅ ALREADY VERIFIED: ' : '⏳ UNVERIFIED (Select to Verify): '} {b.businessName || 'Business'} ({b.city || 'No City'}) - ID: {b.id.substring(0, 8)} {isBVerified ? '(Already Verified)' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      </select>
                    )}
                  </div>
                )}

                {/* 3. Amount Collected */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Amount Collected (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                    <input
                      type="number"
                      required
                      value={amountCollected}
                      onChange={(e) => setAmountCollected(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* 4. Manual Payment Method */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Manual Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  >
                    <option value="Manual UPI (GPay/PhonePe)">Manual UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Cash Payment">Direct Cash Payment</option>
                    <option value="Bank Wire / NEFT / IMPS">Bank Transfer (NEFT / IMPS / RTGS)</option>
                    <option value="Admin Special Grant">Admin Special Grant (Free / Complimentary)</option>
                  </select>
                </div>

                {/* 5. Notes */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Admin Transaction Notes / Ref No.
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    placeholder="e.g. PhonePe Ref #123456 collected manually for additional business"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={granting}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {granting ? (
                      <span>Activating Verification...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>Confirm & Activate Verification Badge</span>
                      </>
                    )}
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
