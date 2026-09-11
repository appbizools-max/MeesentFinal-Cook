import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { collection, query, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  UserCheck, 
  UserX, 
  Search, 
  Mail, 
  Phone, 
  ShieldCheck, 
  User, 
  Calendar, 
  Trash2, 
  Users as UsersIcon,
  Store,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort in memory descending by creation date
      usersData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA;
      });

      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.warn("Users snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: currentStatus === 'suspended' ? 'active' : 'suspended'
      });
      toast.success(currentStatus === 'suspended' ? 'User Activated' : 'User Suspended');
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (window.confirm(`Are you sure you want to permanently delete user "${name || 'this account'}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        toast.success("User account deleted permanently");
      } catch (err) {
        toast.error("Failed to delete user account");
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const isVendor = user.userType === 'vendor' || user.isVendor || Boolean(user.businessName);
    const isGenuine = user.isGenuineVerified || user.tookVerification || user.hasVerificationBadge;

    if (activeTab === 'Vendors' && !isVendor) return false;
    if (activeTab === 'Genuine Verified' && !isGenuine) return false;
    if (activeTab === 'Suspended' && user.status !== 'suspended') return false;

    // Search filter
    const name = user.name || user.displayName || user.fullName || '';
    const phone = user.phoneNumber || user.phone || user.contactPhone || '';
    const email = user.email || '';
    const term = searchTerm.toLowerCase();

    return name.toLowerCase().includes(term) || phone.includes(term) || email.toLowerCase().includes(term);
  });

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

  // Quick stats
  const totalCount = users.length;
  const vendorCount = users.filter(u => u.userType === 'vendor' || u.isVendor).length;
  const genuineCount = users.filter(u => u.isGenuineVerified || u.tookVerification).length;
  const suspendedCount = users.filter(u => u.status === 'suspended').length;

  return (
    <Layout title="User Management & Control">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[32px] text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center backdrop-blur-md">
              <UsersIcon className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Registered App Users</h1>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">Manage member accounts, verification statuses, and permissions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Total Users</p>
              <p className="text-lg font-black text-white">{totalCount}</p>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-400/20 px-5 py-2.5 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Genuine Verified</p>
              <p className="text-lg font-black text-emerald-400">{genuineCount}</p>
            </div>
            <button
              onClick={() => navigate('/unverified-users')}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Manual Verification Grant</span>
            </button>
          </div>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <button 
            onClick={() => setActiveTab('All')}
            className={`p-6 rounded-[28px] border text-left transition-all ${activeTab === 'All' ? 'bg-indigo-50 border-indigo-200 shadow-md ring-2 ring-indigo-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All Members</span>
              <UsersIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{totalCount}</h3>
            <p className="text-[11px] font-bold text-indigo-600 mt-1">Full User Database</p>
          </button>

          <button 
            onClick={() => setActiveTab('Vendors')}
            className={`p-6 rounded-[28px] border text-left transition-all ${activeTab === 'Vendors' ? 'bg-purple-50 border-purple-200 shadow-md ring-2 ring-purple-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendors & Business</span>
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{vendorCount}</h3>
            <p className="text-[11px] font-bold text-purple-600 mt-1">Service & Business Owners</p>
          </button>

          <button 
            onClick={() => setActiveTab('Genuine Verified')}
            className={`p-6 rounded-[28px] border text-left transition-all ${activeTab === 'Genuine Verified' ? 'bg-emerald-50 border-emerald-200 shadow-md ring-2 ring-emerald-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Genuine Badges</span>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{genuineCount}</h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-1">Verified Candidate / Employer</p>
          </button>

          <button 
            onClick={() => setActiveTab('Suspended')}
            className={`p-6 rounded-[28px] border text-left transition-all ${activeTab === 'Suspended' ? 'bg-rose-50 border-rose-200 shadow-md ring-2 ring-rose-500/20' : 'bg-white border-slate-200/80 hover:bg-slate-50'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suspended Accounts</span>
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{suspendedCount}</h3>
            <p className="text-[11px] font-bold text-rose-600 mt-1">Restricted Access</p>
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Name, Phone, or Email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {['All', 'Vendors', 'Genuine Verified', 'Suspended'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 uppercase tracking-widest text-[9.5px] font-black border-b border-slate-100">
                  <th className="px-6 py-4">User Member</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4 text-center">Account Role</th>
                  <th className="px-6 py-4 text-center">Verification Badges</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading registered users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const name = user.name || user.displayName || user.fullName || 'Unnamed Member';
                    const initials = name.substring(0, 2).toUpperCase();
                    const phone = user.phoneNumber || user.phone || user.contactPhone || 'N/A';
                    const email = user.email || 'N/A';
                    const isVendor = user.userType === 'vendor' || user.isVendor || Boolean(user.businessName);
                    const isGenuine = user.isGenuineVerified || user.tookVerification || user.hasVerificationBadge;
                    const isSuspended = user.status === 'suspended';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Member Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-sm flex items-center justify-center border border-indigo-100 shrink-0 shadow-xs">
                              {user.profileImage || user.photoURL ? (
                                <img src={user.profileImage || user.photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div>
                              <h5 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                                {name}
                              </h5>
                              <span className="text-[10px] font-mono text-slate-400">ID: {user.id.substring(0, 10)}...</span>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center text-slate-700 font-bold gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{phone}</span>
                            </div>
                            {email !== 'N/A' && (
                              <div className="flex items-center text-slate-400 font-semibold gap-1.5 text-[11px]">
                                <Mail className="w-3.5 h-3.5 text-slate-300" />
                                <span className="truncate max-w-[180px]" title={email}>{email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider ${
                            isVendor ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {isVendor ? 'SERVICE VENDOR' : 'JOB SEEKER / CLIENT'}
                          </span>
                        </td>

                        {/* Verification Badges */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {isGenuine ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                GENUINE VERIFIED
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase">BASIC MEMBER</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider ${
                            isSuspended 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="px-6 py-4 text-slate-500 font-semibold text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(user.createdAt)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleUserStatus(user.id, user.status)}
                              className={`p-2 rounded-xl transition-colors ${
                                isSuspended 
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                              }`}
                              title={isSuspended ? 'Activate User Account' : 'Suspend User Account'}
                            >
                              {isSuspended ? <UserCheck className="w-4.5 h-4.5" /> : <UserX className="w-4.5 h-4.5" />}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user.id, name)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
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
