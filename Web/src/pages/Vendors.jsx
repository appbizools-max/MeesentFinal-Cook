import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { collection, query, onSnapshot, updateDoc, doc, addDoc, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { CheckCircle2, XCircle, Search, ExternalLink, ShieldCheck, Clock, Plus, X, Star, Eye, Image as ImageIcon, Link2, Trash2, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        map[d.id] = d.data();
      });
      setUsersMap(map);
    }, () => {});

    return () => unsubUsers();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending_approval', 'approved', 'rejected', 'paid'
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [adminPlanType, setAdminPlanType] = useState('big');
  const [adminDurationMonths, setAdminDurationMonths] = useState(1);
  const [adminPaymentDate, setAdminPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newVendor, setNewVendor] = useState({
    businessName: '',
    ownerName: '',
    phoneNumber: '',
    category: '',
    address: ''
  });

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

    // 1. Fetch Vendors in real-time
    const q = query(collection(db, 'vendors'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vendorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendors(vendorsData);
      setLoading(false);
    });

    // 2. Fetch Payments in real-time
    const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (querySnapshot) => {
      const pData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPayments(pData);
    });

    return () => {
      checkRole();
      unsubscribe();
      unsubPayments();
    };
  }, []);

  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'vendors'), {
        ...newVendor,
        category: [newVendor.category],
        verificationStatus: 'verified',
        isVerified: true,
        verifyMark: true,
        status: 'approved',
        publiclyVisible: true,
        createdAt: new Date(),
        revenue: 0,
        leads: 0,
        views: 0,
        plan: 'none'
      });
      toast.success('Vendor added successfully');
      setShowAddModal(false);
      setNewVendor({ businessName: '', ownerName: '', phoneNumber: '', category: '', address: '' });
    } catch (error) {
      toast.error('Failed to add vendor');
    }
  };

  const updatePlan = async (vendorId, plan, durationMonths = 1, paymentDateStr = null) => {
    try {
      const paymentDate = paymentDateStr ? new Date(paymentDateStr) : new Date();
      const expiryDate = new Date(paymentDate);
      expiryDate.setMonth(expiryDate.getMonth() + parseInt(durationMonths, 10));

      await updateDoc(doc(db, 'vendors', vendorId), {
        plan: plan,
        planId: plan,
        planDurationMonths: parseInt(durationMonths, 10),
        paymentDate: paymentDate.toISOString(),
        planStartDate: paymentDate.toISOString(),
        planExpiry: expiryDate.toISOString(),
        status: 'approved',
        subscriptionStatus: 'active',
        publiclyVisible: true,
        updatedAt: serverTimestamp()
      });
      toast.success(`Plan updated to ${plan.toUpperCase()} (Expires: ${expiryDate.toLocaleDateString('en-IN')})`);
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error('Failed to update plan');
    }
  };

  const updateVerification = async (vendorId, status) => {
    try {
      const vendorDoc = vendors.find(v => v.id === vendorId);
      const ownerId = vendorDoc?.userId || vendorDoc?.ownerId;

      await updateDoc(doc(db, 'vendors', vendorId), {
        verificationStatus: status,
        isVerified: status === 'verified',
        tookVerification: status === 'verified',
        verifyMark: status === 'verified',
        status: status === 'verified' ? 'approved' : 'rejected',
        publiclyVisible: status === 'verified' // Make visible only when approved
      });

      if (ownerId) {
        await updateDoc(doc(db, 'users', ownerId), {
          vendorStatus: status === 'verified' ? 'approved' : 'rejected'
        });
      }

      toast.success(`Vendor ${status}`);
    } catch (error) {
      console.error("Error updating verification status:", error);
      toast.error('Failed to update verification status');
    }
  };

  const handleDeleteVendor = async (vendorId, businessName) => {
    if (window.confirm(`Are you sure you want to permanently delete "${businessName || 'this vendor'}"?`)) {
      try {
        await deleteDoc(doc(db, 'vendors', vendorId));
        toast.success('Vendor deleted successfully');
      } catch (error) {
        console.error("Error deleting vendor:", error);
        toast.error(`Failed to delete vendor: ${error?.message || 'Permission denied'}`);
      }
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(vendor.category) ? vendor.category.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())) : vendor.category?.toLowerCase().includes(searchTerm.toLowerCase()));
      
    if (!matchesSearch) return false;

    if (statusFilter === 'pending_approval') {
      return vendor.status === 'pending' || vendor.status === 'pending_approval' || vendor.status === 'pending_verification';
    }
    if (statusFilter === 'approved') {
      return vendor.status === 'approved' || vendor.status === 'active';
    }
    if (statusFilter === 'paid') {
      return (vendor.status === 'approved' || vendor.status === 'active') && vendor.plan && vendor.plan !== 'none';
    }
    if (statusFilter === 'rejected') {
      return vendor.status === 'rejected';
    }
    return true;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Layout title="Vendor Management">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500">
              Filtered Vendors: {filteredVendors.length}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.location.href = '/banners'}
              className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-bold text-sm shadow-sm"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Ad Banner
            </button>
            <button
              onClick={() => window.location.href = '/vendors/analytics'}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold text-sm shadow-sm"
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Vendor Analytics & Calls
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-bold text-sm shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </button>
          </div>
        </div>

        {/* Sub-tabs for Approval & Reject filters */}
        <div className="flex border-b border-gray-200 px-4 bg-white space-x-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            All Businesses ({vendors.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending_approval')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center whitespace-nowrap ${
              statusFilter === 'pending_approval'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Pending Approval
            {vendors.filter(v => v.status === 'pending' || v.status === 'pending_approval' || v.status === 'pending_verification').length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-bold">
                {vendors.filter(v => v.status === 'pending' || v.status === 'pending_approval' || v.status === 'pending_verification').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              statusFilter === 'approved'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Approved & Active ({vendors.filter(v => v.status === 'approved' || v.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              statusFilter === 'paid'
                ? 'border-[#bc36ad] text-[#bc36ad]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Paid & Active ({vendors.filter(v => (v.status === 'approved' || v.status === 'active') && v.plan && v.plan !== 'none').length})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              statusFilter === 'rejected'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Rejected ({vendors.filter(v => v.status === 'rejected').length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Business & Owner</th>
                <th className="px-6 py-4">Contact & Category</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4">Active Plan</th>
                <th className="px-6 py-4">Views & Leads</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading vendors...
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No vendors found.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                          {vendor.businessImage ? (
                            <img src={vendor.businessImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ShieldCheck className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{vendor.businessName}</div>
                          <div className="text-xs text-gray-500">{vendor.ownerName || 'No Owner Name'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-bold text-gray-900">
                          {vendor.phone || vendor.phoneNumber || vendor.ownerPhone || vendor.contactPhone || vendor.mobile || usersMap[vendor.userId]?.phone || usersMap[vendor.userId]?.phoneNumber || usersMap[vendor.ownerId]?.phone || usersMap[vendor.ownerId]?.phoneNumber || 'N/A'}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(vendor.category) ? vendor.category.map(cat => (
                            <span key={cat} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase">{cat}</span>
                          )) : (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase">{vendor.category}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {(() => {
                          const isServicesVerified = vendor.isVerified || 
                                                     vendor.verified || 
                                                     vendor.verifyMark || 
                                                     vendor.verificationStatus === 'verified' || 
                                                     vendor.verificationStatus === 'approved' || 
                                                     vendor.status === 'verified' || 
                                                     vendor.status === 'approved' || 
                                                     Boolean(vendor.verificationBadgePurchasedAt);

                          const isJobsVerified = vendor.tookVerification || 
                                                 vendor.verificationPaid || 
                                                 vendor.isGenuineVerified || 
                                                 vendor.genuineVerified || 
                                                 vendor.genuineVerificationEndDate || 
                                                 (usersMap[vendor.userId] && (usersMap[vendor.userId].isGenuineVerified || usersMap[vendor.userId].hasVerificationBadge));

                          if (!isServicesVerified && !isJobsVerified) {
                            return (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 w-fit">
                                NOT VERIFIED
                              </span>
                            );
                          }

                          return (
                            <>
                              {isServicesVerified && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-green-100 text-green-800 border border-green-300 shadow-2xs w-fit">
                                  SERVICES VERIFIED
                                </span>
                              )}
                              {isJobsVerified && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs w-fit">
                                  JOBS VERIFIED
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const p = String(vendor.planId || vendor.plan || '').toLowerCase();
                          const isBig = p.includes('big') || p.includes('popular') || p.includes('growth');
                          const isSmall = p.includes('small') || p.includes('starter') || p.includes('active');
                          
                          let planLabel = 'NO PLAN';
                          let badgeBg = 'bg-slate-100 text-slate-500 border-slate-200';
                          if (isBig) {
                            planLabel = vendor.planName || 'BIG PLAN';
                            badgeBg = 'bg-purple-50 text-purple-700 border-purple-200';
                          } else if (isSmall) {
                            planLabel = vendor.planName || 'SMALL PLAN';
                            badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
                          } else if (vendor.plan && vendor.plan !== 'none') {
                            planLabel = String(vendor.plan).toUpperCase();
                            badgeBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                          }

                          // Calculate Expiry Date string if present
                          let expiryStr = '';
                          if (vendor.planExpiry) {
                            const expDate = vendor.planExpiry.toDate ? vendor.planExpiry.toDate() : new Date(vendor.planExpiry);
                            if (!isNaN(expDate.getTime())) {
                              expiryStr = `Expires: ${expDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                            }
                          }

                          return (
                            <>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border w-fit shadow-xs ${badgeBg}`}>
                                {planLabel}
                              </span>
                              {expiryStr ? (
                                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                  {expiryStr}
                                </span>
                              ) : vendor.planBundle ? (
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                                  {vendor.planBundle}
                                </span>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>{vendor.views || 0} views</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          <span>{vendor.leads || 0} leads</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vendor.status === 'active' || vendor.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : vendor.status === 'pending' || vendor.status === 'pending_approval'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {vendor.status === 'active' || vendor.status === 'approved' ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : vendor.status === 'pending' || vendor.status === 'pending_approval' ? (
                          <Clock className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {vendor.status?.replace('_', ' ')?.toUpperCase() || 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {/* Approve Action: Show if not already approved/active */}
                        {vendor.status !== 'approved' && vendor.status !== 'active' && (
                          <button
                            onClick={() => updateVerification(vendor.id, 'verified')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve Business"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        )}
                        {/* Reject Action: Show if not already rejected */}
                        {vendor.status !== 'rejected' && (
                          <button
                            onClick={() => updateVerification(vendor.id, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject/Block Business"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Full Details"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(vendor.id, vendor.businessName)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Vendor Profile"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Add New Vendor</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddVendor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newVendor.businessName}
                  onChange={(e) => setNewVendor({ ...newVendor, businessName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Owner Name</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={newVendor.ownerName}
                    onChange={(e) => setNewVendor({ ...newVendor, ownerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    required
                    type="tel"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={newVendor.phoneNumber}
                    onChange={(e) => setNewVendor({ ...newVendor, phoneNumber: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Plumbing"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={newVendor.category}
                  onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Address</label>
                <textarea
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 h-24"
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
              >
                Create Vendor Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary text-white">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedVendor.businessName}</h3>
                  <p className="text-white/80 text-xs font-mono">{selectedVendor.id}</p>
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {selectedVendor.businessImage && (
                <div className="rounded-2xl overflow-hidden h-48 w-full border-4 border-gray-50 shadow-inner">
                  <img src={selectedVendor.businessImage} alt="Business" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Section title="Basic Information">
                    <InfoField label="Business Name" value={selectedVendor.businessName || 'N/A'} />
                    <InfoField label="Owner Name" value={selectedVendor.ownerName || selectedVendor.name || selectedVendor.owner || usersMap[selectedVendor.userId]?.name || usersMap[selectedVendor.userId]?.displayName || usersMap[selectedVendor.ownerId]?.name || 'N/A'} />
                    <InfoField label="Phone Number" value={selectedVendor.phone || selectedVendor.phoneNumber || selectedVendor.ownerPhone || selectedVendor.contactPhone || selectedVendor.mobile || usersMap[selectedVendor.userId]?.phone || usersMap[selectedVendor.userId]?.phoneNumber || usersMap[selectedVendor.ownerId]?.phone || usersMap[selectedVendor.ownerId]?.phoneNumber || 'N/A'} />
                    <InfoField label="Category" value={Array.isArray(selectedVendor.category) ? selectedVendor.category.join(', ') : (selectedVendor.category || 'N/A')} />
                    <InfoField label="Sub Category" value={selectedVendor.subCategory || selectedVendor.subcategory || 'N/A'} />
                    <InfoField label="GST / PAN" value={`${selectedVendor.gstNumber || selectedVendor.gst ? `GST: ${selectedVendor.gstNumber || selectedVendor.gst}` : ''} ${selectedVendor.panNumber || selectedVendor.panCard ? `PAN: ${selectedVendor.panNumber || selectedVendor.panCard}` : ''}`.trim() || 'N/A'} />
                    <InfoField label="Status" value={selectedVendor.status?.toUpperCase() || 'INACTIVE'} />
                  </Section>

                  <Section title="Verification Documents">
                    <DocumentField label="Aadhar Card" value={selectedVendor.aadharCard || selectedVendor.aadhar} />
                    <DocumentField label="PAN Card" value={selectedVendor.panCard || selectedVendor.panNumber} />
                    <DocumentField label="Business License" value={selectedVendor.businessLicense} />
                  </Section>
                </div>

                <div className="space-y-6">
                  <Section title="Location & Address">
                    <div className="bg-gray-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-sm font-semibold text-gray-800 whitespace-pre-wrap">{selectedVendor.address || selectedVendor.location || selectedVendor.fullAddress || 'No address provided'}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500 border-t border-slate-200/60 pt-2">
                        <div>City: <span className="text-slate-800">{selectedVendor.city || 'N/A'}</span></div>
                        <div>Pincode: <span className="text-slate-800">{selectedVendor.pincode || selectedVendor.zipCode || 'N/A'}</span></div>
                      </div>
                    </div>
                  </Section>
                  <Section title="Subscription Plan & Expiry Details">
                    {(() => {
                      const linkedUser = usersMap[selectedVendor.userId] || usersMap[selectedVendor.ownerId] || {};
                      const vendorPayments = payments.filter(p => p.vendorId === selectedVendor.id || p.userId === selectedVendor.userId || p.userId === selectedVendor.ownerId || p.id === selectedVendor.id);
                      const latestPayment = vendorPayments.length > 0 ? vendorPayments[0] : null;

                      const activePlanRaw = selectedVendor.planName || 
                                            selectedVendor.planId || 
                                            (selectedVendor.plan && selectedVendor.plan !== 'none' ? selectedVendor.plan : null) || 
                                            linkedUser.planName || 
                                            linkedUser.planId || 
                                            (linkedUser.plan && linkedUser.plan !== 'none' ? linkedUser.plan : null) || 
                                            latestPayment?.planName || 
                                            latestPayment?.plan || 
                                            'FREE / NO PLAN';

                      const paymentDateRaw = selectedVendor.paymentDate || 
                                             selectedVendor.planStartDate || 
                                             linkedUser.paymentDate || 
                                             linkedUser.planStartDate || 
                                             latestPayment?.createdAt || 
                                             selectedVendor.createdAt;

                      let expiryDateRaw = selectedVendor.planExpiry || 
                                          selectedVendor.expiryDate || 
                                          selectedVendor.subscriptionExpiry || 
                                          linkedUser.planExpiry || 
                                          linkedUser.expiryDate || 
                                          linkedUser.subscriptionExpiry || 
                                          latestPayment?.planExpiry;

                      // Auto-calculate expiry date if missing but payment date exists
                      if (!expiryDateRaw && paymentDateRaw && activePlanRaw && activePlanRaw !== 'FREE / NO PLAN') {
                        const pDate = paymentDateRaw.toDate ? paymentDateRaw.toDate() : new Date(paymentDateRaw);
                        if (!isNaN(pDate.getTime())) {
                          const exp = new Date(pDate);
                          const durationMonths = selectedVendor.planDurationMonths || (selectedVendor.planBundle === 'yearly' ? 12 : selectedVendor.planBundle === 'sixMonths' ? 6 : 1);
                          exp.setMonth(exp.getMonth() + durationMonths);
                          expiryDateRaw = exp;
                        }
                      }

                      return (
                        <div className="grid grid-cols-3 gap-4 mb-2">
                          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex flex-col justify-center items-center">
                            <p className="text-[10px] text-purple-600 font-bold uppercase text-center">Active Plan</p>
                            <p className="text-base font-black text-purple-900 mt-1 uppercase text-center">{String(activePlanRaw).toUpperCase()}</p>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-center items-center">
                            <p className="text-[10px] text-blue-600 font-bold uppercase text-center">Payment Date</p>
                            <p className="text-xs font-black text-blue-900 mt-1 text-center">{formatDate(paymentDateRaw)}</p>
                          </div>
                          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center">
                            <p className="text-[10px] text-emerald-600 font-bold uppercase text-center">Expiry Date</p>
                            <p className="text-xs font-black text-emerald-900 mt-1 text-center">{formatDate(expiryDateRaw)}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </Section>
                </div>
              </div>

              {/* Transactions Ledger inside the Modal */}
              <div className="border-t border-slate-100 pt-6">
                <Section title="Subscription Transaction History">
                  {(() => {
                    const vendorTxns = payments.filter(p => p.vendorId === selectedVendor.id || p.userId === selectedVendor.userId || p.userId === selectedVendor.ownerId || p.id === selectedVendor.id);
                    if (vendorTxns.length === 0) {
                      return (
                        <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                          No transaction history recorded for this business.
                        </div>
                      );
                    }

                    return (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[9px] font-black">
                            <tr>
                              <th className="p-3">Order / Txn ID</th>
                              <th className="p-3">Plan Info</th>
                              <th className="p-3 text-center">Amount</th>
                              <th className="p-3 text-center">Method</th>
                              <th className="p-3">Date</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {vendorTxns.map((p) => {
                              const pStatus = (p.status || 'success').toLowerCase();
                              return (
                                <tr key={p.id} className="hover:bg-slate-50/50">
                                  <td className="p-3 font-mono text-[10px] text-slate-800 break-all">{p.orderId || p.transactionId || 'N/A'}</td>
                                  <td className="p-3">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-700">{p.planName || p.description || 'Plan Upgrade'}</span>
                                      {p.duration && <span className="text-[9.5px] text-slate-400 font-medium">({p.duration})</span>}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center font-black text-slate-800">₹{p.amount || 0}</td>
                                  <td className="p-3 text-center font-bold text-slate-400 uppercase tracking-wider text-[9px]">{p.paymentMethod || 'Razorpay'}</td>
                                  <td className="p-3 text-slate-500">{formatDate(p.createdAt)}</td>
                                  <td className="p-3 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                      pStatus === 'success' || pStatus === 'active'
                                        ? 'bg-green-50 text-green-700'
                                        : pStatus === 'pending'
                                          ? 'bg-yellow-50 text-yellow-700'
                                          : 'bg-red-50 text-red-700'
                                    }`}>
                                      {pStatus.toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </Section>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              {selectedVendor.status === 'pending_approval' && (
                <button
                  onClick={() => {
                    updateVerification(selectedVendor.id, 'verified');
                    setShowViewModal(false);
                  }}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                >
                  Approve Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const formatDate = (val) => {
  if (!val) return 'N/A';
  try {
    const d = val.toDate ? val.toDate() : new Date(val);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {
    return 'N/A';
  }
};

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">{title}</h4>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const InfoField = ({ label, value }) => (
  <div>
    <p className="text-[10px] text-gray-500 font-bold uppercase">{label}</p>
    <p className="text-sm font-semibold text-gray-900">{value || 'N/A'}</p>
  </div>
);

const DocumentField = ({ label, value }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
    <div>
      <p className="text-[10px] text-gray-500 font-bold uppercase">{label}</p>
      <p className="text-xs font-semibold text-gray-900">{value ? 'Document Uploaded' : 'Not Provided'}</p>
    </div>
    {value && (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-white text-primary rounded-lg shadow-sm hover:bg-primary hover:text-white transition-all"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    )}
  </div>
);
