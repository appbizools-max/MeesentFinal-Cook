import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import {
  Search, Image as ImageIcon, MapPin, Calendar, Link2, CreditCard,
  Plus, X, Loader2, Upload, AlertCircle, ChevronDown, Check
} from 'lucide-react';
import {
  collection, query, onSnapshot, doc, deleteDoc, orderBy, addDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { toast } from 'react-hot-toast';

export const OpenAds = () => {
  const location = useLocation();
  const isServicesSection = location.pathname.includes('/services');

  const [ads, setAds] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Tab/Filter State (default based on section, but can toggle)
  const [activeTab, setActiveTab] = useState(isServicesSection ? 'Services' : 'Jobs');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Select User Dropdown State
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    sourceApp: isServicesSection ? 'Services' : 'Jobs',
    targetType: 'pincode', // pincode, district, state
    targetState: '',
    targetDistrict: '',
    pincodeInput: '',
    amountPaid: '',
    endDate: '',
    userId: 'system', // Default is System/Admin
    status: 'active'
  });

  useEffect(() => {
    // Sync activeTab and form sourceApp if the URL changes
    const defaultApp = isServicesSection ? 'Services' : 'Jobs';
    setActiveTab(defaultApp);
    setForm(prev => ({ ...prev, sourceApp: defaultApp }));
  }, [location.pathname]);

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

    // Fetch Ads from 'pincode_ads' collection
    const qAds = query(collection(db, 'pincode_ads'), orderBy('createdAt', 'desc'));
    const unsubAds = onSnapshot(qAds, (querySnapshot) => {
      const adsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAds(adsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching ads:", error);
      toast.error("Failed to load ads");
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubAds();
    };
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddAd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter an ad title');
      return;
    }
    if (!imageFile) {
      toast.error('Please select an ad banner image');
      return;
    }
    if (!form.endDate) {
      toast.error('Please select an end date');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload to Storage
      let finalImageUrl = '';
      const storageRef = ref(storage, `pincode_ads/${Date.now()}_${imageFile.name}`);
      const snap = await uploadBytes(storageRef, imageFile);
      finalImageUrl = await getDownloadURL(snap.ref);

      // 2. Format Location Target Parameters
      let pincodes = [];
      let pincode = '';
      if (form.targetType === 'pincode') {
        pincodes = form.pincodeInput.split(',').map(p => p.trim()).filter(Boolean);
        pincode = pincodes[0] || '';
      }

      const adData = {
        title: form.title,
        description: form.description,
        sourceApp: form.sourceApp,
        targetType: form.targetType,
        targetState: form.targetType === 'state' ? form.targetState : '',
        targetDistrict: form.targetType === 'district' ? form.targetDistrict : '',
        pincodes: pincodes,
        pincode: pincode,
        pincodeCount: form.targetType === 'pincode' ? pincodes.length : 1,
        amountPaid: Number(form.amountPaid) || 0,
        userId: form.userId,
        status: form.status,
        imageUrl: finalImageUrl,
        img: finalImageUrl, // For dual compatibility in app
        createdAt: serverTimestamp(),
        startDate: serverTimestamp(),
        endDate: Timestamp.fromDate(new Date(form.endDate))
      };

      await addDoc(collection(db, 'pincode_ads'), adData);
      toast.success('Open Ad created successfully!');
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error("Error creating ad:", error);
      toast.error('Failed to create Open Ad');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAd = async (id) => {
    if (window.confirm('Delete this ad permanently?')) {
      try {
        await deleteDoc(doc(db, 'pincode_ads', id));
        toast.success('Ad Deleted Successfully');
      } catch (error) {
        toast.error('Failed to delete ad');
      }
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      sourceApp: isServicesSection ? 'Services' : 'Jobs',
      targetType: 'pincode',
      targetState: '',
      targetDistrict: '',
      pincodeInput: '',
      amountPaid: '',
      endDate: '',
      userId: 'system',
      status: 'active'
    });
    setImageFile(null);
    setImagePreview(null);
    setUserSearchText('');
    setShowUserDropdown(false);
  };

  // Filter ads based on activeTab (Jobs / Services) and searchQuery
  const filteredAds = ads.filter(ad => {
    // Filter by Tab (Jobs or Services)
    const matchesTab = activeTab === 'All' || ad.sourceApp === activeTab;
    if (!matchesTab) return false;

    const userName = ad.userId === 'system' ? 'System Admin' : (usersMap[ad.userId]?.name || usersMap[ad.userId]?.displayName || '');
    const phone = usersMap[ad.userId]?.phoneNumber || '';
    const term = searchQuery.toLowerCase();
    
    return userName.toLowerCase().includes(term) || 
           phone.toLowerCase().includes(term) || 
           (ad.title && ad.title.toLowerCase().includes(term)) ||
           (ad.pincode && ad.pincode.toString().includes(term)) || 
           (ad.targetDistrict && ad.targetDistrict.toLowerCase().includes(term));
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Get active users for dropdown
  const filteredUsers = Object.values(usersMap).filter(u => {
    const name = u.name || u.displayName || '';
    const phone = u.phoneNumber || '';
    const email = u.email || '';
    const term = userSearchText.toLowerCase();
    return name.toLowerCase().includes(term) || phone.toLowerCase().includes(term) || email.toLowerCase().includes(term);
  });

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen">
        {/* Compact Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-12 py-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
              {activeTab === 'Services' ? 'Services' : activeTab === 'Jobs' ? 'Jobs' : 'Open'} Ads Management
            </h2>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
              Managing Promoted Advertisements in the Meesent App
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search Input */}
            <div className="hidden lg:flex items-center w-80 bg-slate-100/50 border border-slate-200/60 rounded-xl px-4 py-2.5 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search by Title, User, Phone..." 
                className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full text-slate-600 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Add Open Ad Button */}
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-wider"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>Add New Open Ad</span>
            </button>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto">
          {/* Section Tabs */}
          {!isServicesSection && (
            <div className="flex bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/30 mb-6">
              {['All', 'Services', 'Jobs'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                    activeTab === tab 
                      ? 'bg-white text-blue-600 shadow-sm font-extrabold' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab} Ads
                </button>
              ))}
            </div>
          )}

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="min-w-[110px] px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ad Image</th>
                    <th className="min-w-[180px] px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ad Details</th>
                    <th className="min-w-[180px] px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner / Advertiser</th>
                    <th className="min-w-[80px] px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">App</th>
                    <th className="min-w-[90px] px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Amount Paid</th>
                    <th className="min-w-[140px] px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Target Scope</th>
                    <th className="min-w-[100px] px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                    <th className="min-w-[150px] px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Duration</th>
                    <th className="min-w-[80px] px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12">
                        <div className="animate-pulse flex flex-col items-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Ads...</p>
                         </div>
                      </td>
                    </tr>
                  ) : filteredAds.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-16">
                        <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-sm font-black text-slate-500">No open ads found.</p>
                      </td>
                    </tr>
                  ) : filteredAds.map((ad) => {
                    const isSystem = ad.userId === 'system';
                    const userName = isSystem ? 'System Admin' : (usersMap[ad.userId]?.name || usersMap[ad.userId]?.displayName || 'Unknown User');
                    const initials = userName.substring(0, 2).toUpperCase();
                    const rawUserImg = isSystem ? null : usersMap[ad.userId]?.profileImage;
                    const userImg = (rawUserImg && !String(rawUserImg).startsWith('file://')) ? rawUserImg : null;

                    let targetLabel = '';
                    if (ad.targetType === 'state') targetLabel = `${ad.targetState || 'State'} (State)`;
                    else if (ad.targetType === 'district') targetLabel = `${ad.targetDistrict || 'District'} (District)`;
                    else targetLabel = ad.pincodeCount > 1 ? `${ad.pincodeCount} Pincodes` : `Pincode: ${ad.pincode || ad.pincodeInput}`;

                    const rawAdImg = ad.img || ad.imageUrl;
                    const isAdImgValid = rawAdImg && !String(rawAdImg).startsWith('file://');

                    const endDateObj = ad.endDate ? (ad.endDate.seconds ? new Date(ad.endDate.seconds * 1000) : new Date(ad.endDate)) : null;
                    const isExpired = endDateObj ? endDateObj < new Date().setHours(0, 0, 0, 0) : false;
                    const adStatusLabel = isExpired ? 'Expired' : (ad.status === 'active' ? 'Active' : 'Inactive');

                    return (
                      <tr key={ad.id} className="hover:bg-slate-50/40 transition-all group">
                        {/* Image Column */}
                        <td className="px-6 py-4">
                           <div className="w-24 h-16 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group-hover:scale-105 transition-transform">
                              {isAdImgValid ? (
                                <img src={rawAdImg} alt="Ad Banner" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                   <ImageIcon className="w-5 h-5 text-slate-300" />
                                </div>
                              )}
                           </div>
                        </td>

                        {/* Ad Details */}
                        <td className="px-3 py-4">
                          <div className="max-w-[160px]">
                            <h4 className="text-sm font-black text-slate-900 truncate" title={ad.title}>{ad.title || 'Untitled Ad'}</h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2" title={ad.description}>{ad.description || 'No description'}</p>
                          </div>
                        </td>

                        {/* User Details */}
                        <td className="px-3 py-4">
                           <div className="flex items-center">
                             <div className="w-8 h-8 bg-slate-100 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 mr-2.5">
                               {isSystem ? (
                                 <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-[10px]">SYS</div>
                               ) : userImg ? (
                                 <img src={userImg} className="w-full h-full object-cover" alt="" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-black text-[10px]">{initials}</div>
                               )}
                             </div>
                             <div className="truncate">
                               <h5 className="text-[12px] font-black text-slate-900 truncate">{userName}</h5>
                               <div className="flex items-center mt-0.5">
                                  <p className="text-[10px] font-semibold text-slate-400 truncate">
                                    {isSystem ? 'Meesent Platform' : (usersMap[ad.userId]?.phoneNumber || 'No Contact')}
                                  </p>
                               </div>
                             </div>
                           </div>
                        </td>

                        {/* App */}
                        <td className="px-3 py-4 text-center">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                             ad.sourceApp === 'Services' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                           }`}>
                             {ad.sourceApp || 'Services'}
                           </span>
                        </td>

                        {/* Amount */}
                        <td className="px-3 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50/50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                            ₹{ad.amountPaid || ad.paymentAmount || '0'}
                          </span>
                        </td>

                        {/* Pincode / Target */}
                        <td className="px-3 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-100 truncate max-w-full">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{targetLabel}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-4 text-center">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                             adStatusLabel === 'Active'
                               ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                               : adStatusLabel === 'Inactive'
                                 ? 'bg-slate-50 text-slate-400 border-slate-200'
                                 : 'bg-rose-50 text-rose-600 border-rose-100'
                           }`}>
                             <span className={`w-1.5 h-1.5 rounded-full ${
                               adStatusLabel === 'Active'
                                 ? 'bg-emerald-500'
                                 : adStatusLabel === 'Inactive'
                                   ? 'bg-slate-400'
                                   : 'bg-rose-500'
                             }`} />
                             {adStatusLabel}
                           </span>
                         </td>

                        {/* Dates */}
                        <td className="px-3 py-4 text-center">
                          <div className="flex flex-col items-center justify-center space-y-1">
                             <div className="flex items-center text-[10px] font-bold text-slate-500">
                                <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{formatDate(ad.createdAt || ad.startDate)}</span>
                             </div>
                             <div className="flex items-center text-[10px] font-black text-rose-500">
                                <span className="bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{formatDate(ad.endDate)}</span>
                             </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteAd(ad.id)} 
                            className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:bg-white hover:text-rose-600 hover:shadow-sm hover:border-rose-200 transition-all ml-auto"
                            title="Delete Ad"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 my-8">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Add New Open Ad</h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Connect advertisements to the mobile app</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddAd} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Upload Ad Banner (1200x500)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      accept="image/*"
                    />
                    <div className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${imagePreview ? 'border-transparent' : 'border-slate-200 group-hover:border-blue-500 bg-slate-50'}`}>
                      {imagePreview ? (
                        <img src={imagePreview} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                      ) : (
                        <>
                          <Upload className="text-slate-300 group-hover:text-blue-500 mb-1.5" size={24} />
                          <span className="text-xs font-bold text-slate-400">Click to upload ad banner image</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Ad Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 text-sm"
                      placeholder="e.g. Special Discount on AC Cleaning"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-semibold text-slate-700 text-sm resize-none"
                      placeholder="e.g. Avail 30% discount on all AC maintenance services this summer..."
                      rows={2}
                    />
                  </div>

                  {/* App Target */}
                  {!isServicesSection && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Target Application</label>
                      <select
                        value={form.sourceApp}
                        onChange={(e) => setForm(prev => ({ ...prev, sourceApp: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 text-sm"
                      >
                        <option value="Services">Services App</option>
                        <option value="Jobs">Jobs App</option>
                      </select>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Initial Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Target Type */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Location Scope</label>
                    <select
                      value={form.targetType}
                      onChange={(e) => setForm(prev => ({ ...prev, targetType: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 text-sm"
                    >
                      <option value="pincode">Target Pincodes</option>
                      <option value="district">Target District/City</option>
                      <option value="state">Target State</option>
                    </select>
                  </div>

                  {/* Dynamic Target Inputs */}
                  {form.targetType === 'state' && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Target State *</label>
                      <input
                        type="text"
                        value={form.targetState}
                        onChange={(e) => setForm(prev => ({ ...prev, targetState: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 text-sm"
                        placeholder="e.g. Maharashtra"
                        required
                      />
                    </div>
                  )}

                  {form.targetType === 'district' && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Target District/City *</label>
                      <input
                        type="text"
                        value={form.targetDistrict}
                        onChange={(e) => setForm(prev => ({ ...prev, targetDistrict: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 text-sm"
                        placeholder="e.g. Pune"
                        required
                      />
                    </div>
                  )}

                  {form.targetType === 'pincode' && (
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Target Pincode(s) *</label>
                      <input
                        type="text"
                        value={form.pincodeInput}
                        onChange={(e) => setForm(prev => ({ ...prev, pincodeInput: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 text-sm"
                        placeholder="e.g. 411001, 411002"
                        required
                      />
                    </div>
                  )}

                  {/* Owner/Advertiser Dropdown */}
                  <div className="col-span-2 relative">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Advertiser (Owner) *</label>
                    <button
                      type="button"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 flex items-center justify-between font-bold text-slate-900 text-sm text-left"
                    >
                      <span>
                        {form.userId === 'system' 
                          ? 'System / Platform Admin' 
                          : `${usersMap[form.userId]?.name || usersMap[form.userId]?.displayName || 'Unknown User'} (${usersMap[form.userId]?.phoneNumber || 'No Contact'})`
                        }
                      </span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>

                    {showUserDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3 max-h-60 overflow-y-auto">
                        <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                          <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={userSearchText}
                            onChange={(e) => setUserSearchText(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full text-slate-600 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => { setForm(prev => ({ ...prev, userId: 'system' })); setShowUserDropdown(false); }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between ${form.userId === 'system' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <span>System / Platform Admin</span>
                            {form.userId === 'system' && <Check size={14} />}
                          </button>
                          {filteredUsers.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => { setForm(prev => ({ ...prev, userId: user.id })); setShowUserDropdown(false); }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between ${form.userId === user.id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                              <div className="truncate">
                                <p className="truncate">{user.name || user.displayName || 'Unnamed User'}</p>
                                <p className="text-[10px] text-slate-400 truncate">{user.phoneNumber || user.email || 'No contact details'}</p>
                              </div>
                              {form.userId === user.id && <Check size={14} className="shrink-0 ml-2" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Amount Paid */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount Paid (₹)</label>
                    <input
                      type="number"
                      value={form.amountPaid}
                      onChange={(e) => setForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 text-sm"
                      placeholder="e.g. 500"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">End Date *</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all font-bold text-slate-900 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-3 mt-2">
                  <AlertCircle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    <b>Live connection:</b> Creating this ad will store it directly in Firestore's <code>pincode_ads</code> collection. If it matches the targeting details and the end date is in the future, it will instantly display inside the mobile app!
                  </p>
                </div>

                <div className="flex space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center space-x-2 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Ad...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Create Open Ad</span>
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
