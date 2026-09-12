import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Briefcase, Plus,
  Building2, Landmark, Clock, Trash2, Edit3, Globe, X,
  Trophy, Image as ImageIcon,
  MessageSquare, Link2, Eye,
  TrendingUp, Calendar, EyeOff,
  ShieldCheck, Star, FileText
} from 'lucide-react';
import { db, storage, auth } from '../services/firebase';
import { collection, addDoc, query, orderBy, deleteDoc, doc, serverTimestamp, updateDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { Layout } from '../components/layout/Layout';
import { useLocation } from 'react-router-dom';
export const JobPortal = () => {
  const location = useLocation();
  const isPaidPostMode = location.pathname.includes('/paid');
  const isUserPostMode = location.pathname.includes('/user');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [viewJobModal, setViewJobModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Private');
  const [activeSubTab, setActiveSubTab] = useState('All');
  // Reschedule State
  const [rescheduleData, setRescheduleData] = useState({ id: null, date: '', title: '' });
  // Form State - Simplified for Gov Jobs
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    category: 'State Govt',
    location: '',
    applyLink: '',
    contactNumber: '',
    lastDate: '',
    status: 'Active',
    imageUrl: '',
    isVerified: true,
    whatsappClicks: 0,
    viewCount: 0,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const stats = [
    {
      id: 1,
      title: 'Private Jobs',
      count: jobs.filter(j => j.category === 'Private Jobs').length,
      trend: '+ 15.3%',
      color: 'from-orange-500/10 to-orange-500/5',
      text: 'text-orange-600',
      icon: <Globe className="w-5 h-5" />, // Private icon
      chartColor: '#ea580c'
    },
    {
      id: 2,
      title: 'Central Govt Jobs',
      count: jobs.filter(j => j.category === 'Central Govt').length,
      trend: '+ 8.2%',
      color: 'from-blue-500/10 to-blue-500/5',
      text: 'text-blue-600',
      icon: <Building2 className="w-5 h-5" />, // Central Gov icon
      chartColor: '#2563eb'
    },
    {
      id: 3,
      title: 'State Govt Jobs',
      count: jobs.filter(j => j.category === 'State Govt').length,
      trend: '+ 12.5%',
      color: 'from-purple-500/10 to-purple-500/5',
      text: 'text-purple-600',
      icon: <Landmark className="w-5 h-5" />, // State Gov icon
      chartColor: '#9333ea'
    },
  ];

  useEffect(() => {
    // Live listener for Users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const map = {};
      snapshot.docs.forEach(doc => {
        map[doc.id] = doc.data();
      });
      setUsersMap(map);
    }, (error) => {
      console.warn("Users snapshot permission notice:", error?.message);
    });

    // Live listener for Jobs
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsubscribeJobs = onSnapshot(q, (querySnapshot) => {
      const jobsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let currentStatus = data.status || 'Active';
        if (data.lastDate && currentStatus !== 'Hidden') {
          const deadline = new Date(data.lastDate);
          const now = new Date();
          if (deadline < now && currentStatus === 'Active') {
            currentStatus = 'Expired';
          }
        }
        return { id: doc.id, ...data, status: currentStatus };
      });
      setJobs(jobsData);
    }, (error) => {
      console.warn("Jobs snapshot permission notice:", error?.message);
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeUsers();
      unsubscribeJobs();
    };
  }, []);

  useEffect(() => {
    // Reset filters on route changes
    setActiveTab('Private');
    setActiveSubTab('All');
    setSelectedLocation('All');
    setDateFilter('all');
  }, [location.pathname]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      let finalImageUrl = formData.imageUrl;
      // Upload Primary Image
      if (imageFile) {
        const imageRef = ref(storage, `jobs/${Date.now()}_${imageFile.name}`);
        const uploadTask = await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(uploadTask.ref);
      }

      const jobPayload = {
        ...formData,
        title: formData.title || `${formData.category} - ${formData.subCategory}`,
        company: formData.company || formData.category,
        location: formData.location || 'India',
        lastDate: formData.lastDate || '',
        imageUrl: finalImageUrl,
        source: 'Admin',
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        await updateDoc(doc(db, 'jobs', editingId), jobPayload);
        toast.success('Update Successful!');
      } else {
        const docRef = await addDoc(collection(db, 'jobs'), {
          ...jobPayload,
          createdAt: serverTimestamp(),
        });
        toast.success('Job Published!');

        // Create Firestore notification record for mobile apps & broadcast push notification to all users
        try {
          const mainCategoryTitle = jobPayload.category.includes('Central')
            ? 'Central Govt Alert'
            : jobPayload.category.includes('State')
            ? 'State Govt Alert'
            : `${jobPayload.category} Alert`;

          const notificationBodyText = `${jobPayload.title} Announced. Tap to apply on Meesent!`;

          await addDoc(collection(db, 'notifications'), {
            title: mainCategoryTitle,
            body: notificationBodyText,
            category: jobPayload.category,
            subCategory: jobPayload.subCategory || 'Job',
            jobId: docRef.id,
            createdAt: serverTimestamp(),
            type: jobPayload.category.includes('Govt') ? 'govt_job' : 'job'
          });

        } catch (notifErr) {
          console.warn('Error creating Firestore notification:', notifErr?.message);
        }

        // Real-time notification delivered directly to mobile apps via Firestore notifications collection above
      }
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(`Operation failed: ${error.message || 'Check connection.'}`);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleEditClick = (job) => {
    setFormData({
      ...job,
      applyLink: job.applyLink || '',
      contactNumber: job.contactNumber || '',
      isVerified: job.isVerified ?? true,
      whatsappClicks: job.whatsappClicks || 0,
      viewCount: job.viewCount || 0,
    });
    setEditingId(job.id);
    setIsEditing(true);
    setImagePreview(job.imageUrl);
    setShowAddModal(true);
  };

  const toggleHideStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Hidden' ? 'Active' : 'Hidden';
    try {
      await updateDoc(doc(db, 'jobs', id), { status: newStatus });
      toast.success(`Job is now ${newStatus}`);
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const handleRescheduleClick = (job) => {
    setRescheduleData({ id: job.id, date: job.lastDate || '', title: job.title });
    setShowRescheduleModal(true);
  };

  const confirmReschedule = async () => {
    if (!rescheduleData.date) {
      toast.error("Please select a date");
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'jobs', rescheduleData.id), { lastDate: rescheduleData.date, status: 'Active' });
      toast.success('Deadline Rescheduled');
      setShowRescheduleModal(false);
    } catch (error) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', company: '', category: 'State Govt', subCategory: 'Job', location: '',
      applyLink: '', contactNumber: '', lastDate: '', status: 'Active', imageUrl: '',
      isVerified: true, whatsappClicks: 0, viewCount: 0,
    });
    setImageFile(null);
    setImagePreview(null);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleDeleteJob = async (id) => {
    if (!id) return;
    if (window.confirm('Delete this recruitment permanently?')) {
      try {
        await deleteDoc(doc(db, 'jobs', id));
        toast.success('Job Deleted');
      } catch (error) {
        console.error('Delete job error:', error);
        // Fallback: Soft delete by setting status to Hidden if hard delete permission fails
        try {
          await updateDoc(doc(db, 'jobs', id), { status: 'Hidden', hiddenAt: new Date().toISOString() });
          toast.success('Job Removed Successfully');
        } catch (updateErr) {
          console.error('Hide job fallback error:', updateErr);
          toast.error(`Delete failed: ${error.message || 'Permission denied'}`);
        }
      }
    }
  };

  const uniqueLocations = Array.from(new Set(jobs.map(j => j.location).filter(Boolean)));
  const userCategories = Array.from(new Set(jobs.filter(j => j.source === 'User').map(j => j.category).filter(Boolean)));

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' || job.category?.includes(activeTab);
    const matchesSubTab = activeSubTab === 'All' || job.subCategory === activeSubTab;
    
    // Location Filter
    const matchesLocation = selectedLocation === 'All' || job.location === selectedLocation;

    // Date Filter
    let matchesDate = true;
    if (dateFilter !== 'all' && job.createdAt) {
      const createdDate = new Date(job.createdAt.seconds * 1000);
      const now = new Date();
      const diffTime = Math.abs(now - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (dateFilter === 'today') {
        matchesDate = diffDays <= 1;
      } else if (dateFilter === 'week') {
        matchesDate = diffDays <= 7;
      } else if (dateFilter === 'month') {
        matchesDate = diffDays <= 30;
      }
    }

    // Filter by mode
    let matchesMode = false;
    if (isPaidPostMode) {
      matchesMode = job.isPaid === true;
    } else if (isUserPostMode) {
      matchesMode = job.source === 'User';
    } else {
      matchesMode = job.source !== 'User';
    }

    return matchesSearch && matchesTab && matchesSubTab && matchesLocation && matchesDate && matchesMode;
  });

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen">
        {/* Compact Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl px-12 py-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: "'Sora', sans-serif" }}>
              {isPaidPostMode ? 'Paid Post Jobs' : isUserPostMode ? 'User Submitted Jobs' : 'Recruitment Portal'}
            </h2>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
              {isPaidPostMode ? 'Premium User Submitted Listings' : isUserPostMode ? 'All User Submitted Listings' : 'Administrative Management Console'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="hidden lg:flex items-center w-60 bg-slate-100/50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full text-slate-600 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Location Selector */}
            <div className="hidden sm:flex items-center bg-slate-100/50 border border-slate-200/60 rounded-xl px-3 py-2 focus-within:bg-white transition-all">
              <MapPin className="w-4 h-4 text-slate-400 mr-1.5" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-600 outline-none cursor-pointer p-0 pr-6"
              >
                <option value="All">All Locations</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="hidden sm:flex items-center bg-slate-100/50 border border-slate-200/60 rounded-xl px-3 py-2 focus-within:bg-white transition-all">
              <Calendar className="w-4 h-4 text-slate-400 mr-1.5" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-600 outline-none cursor-pointer p-0 pr-6"
              >
                <option value="all">Any Date</option>
                <option value="today">Posted Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <button
              onClick={() => window.location.href = '/banners'}
              className="px-5 py-3 bg-amber-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-2 stroke-[3]" /> Ad Banner
            </button>
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-5 py-3 bg-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-2 stroke-[3]" /> Post New
            </button>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto">
          {/* Smaller Stat Boxes - Only show in Admin mode */}
          {!isPaidPostMode && !isUserPostMode && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {stats.map((cat) => (
                <div 
                  key={cat.id} 
                  className="p-6 rounded-[24px] bg-white border border-slate-100 relative overflow-hidden group shadow-sm hover:shadow-[0_8px_30px_rgba(15,26,61,0.06)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                >
                  {/* Background gradient decorative glow on hover */}
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 rounded-bl-full transition-opacity duration-300 pointer-events-none`} />
                  
                  <div className="relative z-10 flex items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 bg-gradient-to-br ${cat.color} shadow-sm border border-slate-50 transition-transform duration-300 group-hover:scale-105`}>
                      {React.cloneElement(cat.icon, { className: `w-5 h-5 ${cat.text} stroke-[2.2]` })}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{cat.title}</p>
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                          {cat.count}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold">
                          <TrendingUp className="w-3 h-3 text-emerald-500" /> {cat.trend}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isPaidPostMode ? (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/30 to-white flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest" style={{ fontFamily: "'Sora', sans-serif" }}>Paid Visibility History</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">Showing premium job purchases & user details</p>
                  </div>
                </div>
              </div>
              <div className="w-full overflow-x-auto">
                  <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="min-w-[160px] px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Details</th>
                      <th className="min-w-[200px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Information</th>
                      <th className="min-w-[90px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Amount Paid</th>
                      <th className="min-w-[90px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Date Added</th>
                      <th className="min-w-[90px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Expiry Date</th>
                      <th className="min-w-[120px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Applications</th>
                      <th className="min-w-[90px] px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJobs.map((job) => {
                      const userName = usersMap[job.postedBy]?.name || usersMap[job.postedBy]?.displayName || 'Unknown User';
                      const initials = userName.substring(0, 2).toUpperCase();
                      const rawImg = job.imageUrl || usersMap[job.postedBy]?.profileImage;
                      const imgUrl = (rawImg && !String(rawImg).startsWith('file://')) ? rawImg : null;
                      return (
                        <tr key={job.id} onClick={() => setViewJobModal(job)} className="hover:bg-blue-50/10 transition-all duration-200 group cursor-pointer">
                          <td className="px-5 py-3">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-slate-100 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 mr-3">
                                {imgUrl ? <img src={imgUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-extrabold text-xs">{initials}</div>}
                              </div>
                              <div>
                                <h5 className="text-[13px] font-extrabold text-slate-800 flex items-center">
                                  {userName}
                                  {job.isTopVisibility && (
                                    <Star className="w-3 h-3 text-amber-500 ml-1 fill-amber-500" />
                                  )}
                                </h5>
                                <div className="flex items-center mt-1 space-x-3">
                                  <div className="flex items-center">
                                    <span className="w-4 h-4 bg-slate-100 rounded-md flex items-center justify-center mr-1.5"><Link2 className="w-2 h-2 text-slate-400" /></span>
                                    <p className="text-[10px] font-medium text-slate-500">{usersMap[job.postedBy]?.phoneNumber || usersMap[job.postedBy]?.email || 'No Contact'}</p>
                                  </div>
                                  <div className="flex items-center">
                                    <span className="w-4 h-4 bg-blue-50 rounded-md flex items-center justify-center mr-1.5"><Briefcase className="w-2 h-2 text-blue-500" /></span>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{jobs.filter(j => j.postedBy === job.postedBy).length} Posts</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center">
                              {/* Job Banner Image Thumbnail */}
                              {job.imageUrl && !job.imageUrl.startsWith('file://') && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200/80 mr-2 flex-shrink-0 cursor-pointer hover:opacity-80" onClick={(e) => { e.stopPropagation(); window.open(job.imageUrl, '_blank'); }} title="Click to view banner">
                                  <img src={job.imageUrl} className="w-full h-full object-cover" alt="Banner" />
                                </div>
                              )}
                              <div className="truncate">
                                <h5 className="text-[12px] font-bold text-slate-800 truncate">{job.title}</h5>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{job.company}</span>
                                  {job.location && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-[9px] font-semibold text-slate-500 flex items-center gap-0.5">
                                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                        {job.location}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 shadow-sm">
                              ₹{job.isTopVisibility ? '99' : '0'}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <p className="text-[11px] font-semibold text-slate-600">
                              {job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </p>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <p className="text-[11px] font-extrabold text-rose-500">
                              {job.expiryDate ? new Date(job.expiryDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </p>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex gap-1">
                                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[8px] font-bold border border-slate-100">Tot: {job.applicationsCount || 0}</span>
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-bold border border-emerald-100">Acc: {job.acceptedCount || 0}</span>
                              </div>
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[8px] font-bold border border-rose-100">Rej: {job.rejectedCount || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              job.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : job.status === 'Hidden'
                                  ? 'bg-slate-50 text-slate-400 border-slate-200'
                                  : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                job.status === 'Active'
                                  ? 'bg-emerald-500'
                                  : job.status === 'Hidden'
                                    ? 'bg-slate-400'
                                    : 'bg-rose-500'
                              }`} />
                              {job.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/10">
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest" style={{ fontFamily: "'Sora', sans-serif" }}>
                    {isUserPostMode ? 'User Submitted Listings' : 'Recruitment Pipeline'}
                  </h3>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    {isUserPostMode ? 'Free standard private jobs submitted by app users' : 'Filter listings by categories and sub-types'}
                  </p>
                </div>
                
                <div className="flex flex-col items-start md:items-end gap-2">
                  {!isUserPostMode && (
                    /* Admin Pipeline Filters */
                    <>
                      {/* Main Category Tabs */}
                      <div className="flex bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/30">
                        {['Private', 'Central', 'State'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setActiveSubTab('All'); }}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                              activeTab === tab 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {tab === 'Private' ? 'Private Jobs' : tab === 'Central' ? 'Central Govt' : 'State Govt'}
                          </button>
                        ))}
                      </div>

                      {/* Sub-Category Tabs (Government Mode) */}
                      {activeTab !== 'Private' && (
                        <div className="flex bg-slate-50 p-1 rounded-lg w-fit border border-slate-200/30 animate-in fade-in slide-in-from-top-1 duration-200">
                          {['All', 'Job', 'Key', 'Hallticket', 'Result'].map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setActiveSubTab(tab)}
                              className={`px-3 py-1.5 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all duration-150 ${
                                activeSubTab === tab 
                                  ? 'bg-blue-600 text-white shadow-sm font-black' 
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>
                      )}


                    </>
                  )}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="min-w-[220px] px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {activeTab === 'Private' ? 'Job Info / Company' : 'Recruitment / Notification Title'}
                      </th>
                      <th className="min-w-[100px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                        {activeTab === 'Private' ? 'Category / Location' : 'Govt Type & Sub-Type'}
                      </th>
                      <th className="min-w-[100px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                      <th className="min-w-[120px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                        {activeTab === 'Private' ? 'Applications' : 'Deadline / Last Date'}
                      </th>
                      <th className="min-w-[180px] px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJobs.map((job) => {
                      const userName = usersMap[job.postedBy]?.name || usersMap[job.postedBy]?.displayName || 'Unknown';
                      const initials = userName.substring(0, 2).toUpperCase();
                      const rawImg = job.imageUrl || usersMap[job.postedBy]?.profileImage;
                      const imgUrl = (rawImg && !String(rawImg).startsWith('file://')) ? rawImg : null;
                      return (
                        <tr key={job.id} className="hover:bg-slate-50/30 transition-all duration-200 group">
                          <td className="px-5 py-3">
                            <div className="flex items-center overflow-hidden">
                              <div className="w-11 h-11 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200/60 shadow-sm relative flex items-center justify-center">
                                {imgUrl ? (
                                  <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-extrabold text-xs">
                                    {initials}
                                  </div>
                                )}
                                {job.isTopVisibility && (
                                  <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 shadow-sm border border-white">
                                    <Star className="w-2.5 h-2.5 text-white fill-white" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4 truncate">
                                <h5 className="text-[13px] font-extrabold text-slate-800 truncate flex items-center gap-1.5">
                                  {job.title}
                                  {job.isTopVisibility && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[7px] uppercase tracking-wider font-extrabold border border-amber-100">
                                      Top Vis
                                    </span>
                                  )}
                                </h5>
                                <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">
                                  {activeTab === 'Private' ? (job.company || 'Private Employer') : (job.company || job.category || 'Govt Department')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              job.category === 'Central Govt'
                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                : job.category === 'State Govt'
                                  ? 'bg-teal-50 text-teal-600 border-teal-100'
                                  : 'bg-orange-50 text-orange-600 border-orange-100'
                            }`}>
                              {job.category || 'Private Job'}
                            </span>
                            {activeTab === 'Private' ? (
                              job.location && (
                                <span className="block mt-1.5 text-[10px] font-bold text-slate-500 truncate">
                                  📍 {job.location}
                                </span>
                              )
                            ) : (
                              job.subCategory && (
                                <span className="block mt-1.5 px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[7.5px] font-bold uppercase tracking-wider border border-slate-100 w-fit mx-auto">
                                  {job.subCategory}
                                </span>
                              )
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              job.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : job.status === 'Hidden'
                                  ? 'bg-slate-50 text-slate-400 border-slate-200'
                                  : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                job.status === 'Active'
                                  ? 'bg-emerald-500'
                                  : job.status === 'Hidden'
                                    ? 'bg-slate-400'
                                    : 'bg-rose-500'
                              }`} />
                              {job.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {activeTab === 'Private' ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex gap-1 justify-center">
                                  <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[8px] font-bold border border-slate-100">Tot: {job.applicationsCount || 0}</span>
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-bold border border-emerald-100">Acc: {job.acceptedCount || 0}</span>
                                </div>
                                <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[8px] font-bold border border-rose-100">Rej: {job.rejectedCount || 0}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center">
                                {job.lastDate ? (
                                  <>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-extrabold border border-blue-100">
                                      {job.lastDate}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 mt-0.5">Last Date to Apply</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 italic">No Deadline</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => window.open(job.imageUrl, '_blank')} 
                                className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm hover:border-blue-200 transition-all" 
                                title="View Banner"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleEditClick(job)} 
                                className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm hover:border-blue-200 transition-all" 
                                title="Edit Info"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => toggleHideStatus(job.id, job.status)} 
                                className={`p-2 border rounded-lg transition-all ${
                                  job.status === 'Hidden' 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' 
                                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:text-blue-600 hover:border-blue-200'
                                }`} 
                                title={job.status === 'Hidden' ? 'Publish (Show)' : 'Hide Listing'}
                              >
                                {job.status === 'Hidden' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              </button>
                              <button 
                                onClick={() => handleRescheduleClick(job)} 
                                className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:bg-white hover:text-amber-600 hover:shadow-sm hover:border-amber-200 transition-all" 
                                title="Reschedule"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteJob(job.id)} 
                                className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:bg-white hover:text-rose-600 hover:shadow-sm hover:border-rose-200 transition-all" 
                                title="Delete permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Improved Modal - Matched to Mobile Detail Screen Screenshot */}
        {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAddModal(false)}></div>
            <div className="relative bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in zoom-in duration-300">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/30">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter">{isEditing ? 'Update Recruitment' : 'New Recruitment'}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Populate all fields for high-fidelity mobile view</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 flex items-center justify-center transition-all shadow-sm"><X className="w-4 h-4 text-slate-400" /></button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 bg-white space-y-8">
                {/* Header Information Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Official Banner / Logo</label>
                    <div
                      className="group relative h-64 w-full bg-slate-50 border-2 border-dashed border-slate-100 rounded-[24px] flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-primary/40 transition-all duration-500"
                      onClick={() => document.getElementById('imageInput').click()}
                    >
                      {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <div className="text-center p-6"><ImageIcon className="w-8 h-8 text-slate-200 mx-auto mb-3" /><p className="text-xs font-black text-slate-500">Upload Media</p></div>}
                      <input type="file" id="imageInput" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                  </div>

                  <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    {/* Always visible Recruitment Title */}
                    <div className="md:col-span-2">
                      <FormGroup label="Recruitment / Job Title *" icon={<Briefcase className="w-3.5 h-3.5" />}>
                        <input
                          required
                          className="compact-input font-bold"
                          placeholder="e.g. APPSC Group 1 Officer Recruitment 2026 / SSC CGL 2026"
                          value={formData.title}
                          onChange={v => setFormData({ ...formData, title: v.target.value })}
                        />
                      </FormGroup>
                    </div>

                    {/* Always visible operational fields */}
                    <FormGroup label="Category" icon={<Landmark className="w-3.5 h-3.5" />} >
                      <select
                        className="compact-input"
                        value={formData.category}
                        onChange={v => {
                          const newCat = v.target.value;
                          const newSub = newCat === 'Private Jobs' ? 'New Job' : 'Job';
                          setFormData({ ...formData, category: newCat, subCategory: newSub });
                        }}
                      >
                        {['Private Jobs', 'Central Govt', 'State Govt'].map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                    </FormGroup>
                    <FormGroup label="Sub-Category" icon={<Briefcase className="w-3.5 h-3.5" />}>
                      <select className="compact-input" value={formData.subCategory || (formData.category === 'Private Jobs' ? 'New Job' : 'Job')} onChange={v => setFormData({ ...formData, subCategory: v.target.value })}>
                        {formData.category === 'Private Jobs'
                          ? ['New Job', 'Job Match', 'Nearby Job', 'Urgent Hiring', 'Work From Home', 'Freshers', 'Application', 'Deadline', 'Recommended'].map(opt => <option key={opt}>{opt}</option>)
                          : ['Job', 'Admit Card', 'Result', 'Answer Key', 'Exam Date', 'Application'].map(opt => <option key={opt}>{opt}</option>)
                        }
                      </select>
                    </FormGroup>
                    <FormGroup label="Apply Link / Official Website URL" icon={<Globe className="w-3.5 h-3.5" />}>
                      <input className="compact-input font-medium" placeholder="https://... (Official Website / Apply Link)" value={formData.applyLink || ''} onChange={v => setFormData({ ...formData, applyLink: v.target.value })} />
                    </FormGroup>
                    <FormGroup label="WhatsApp Contact Number" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                      <input className="compact-input font-medium" placeholder="e.g. +91 9573838144" value={formData.contactNumber || ''} onChange={v => setFormData({ ...formData, contactNumber: v.target.value })} />
                    </FormGroup>
                    <FormGroup label="Last Date to Apply" icon={<Clock className="w-3.5 h-3.5" />}>
                      <input
                        className="compact-input font-medium"
                        type="date"
                        value={formData.lastDate || ''}
                        onChange={v => setFormData({ ...formData, lastDate: v.target.value })}
                      />
                    </FormGroup>

                    {/* Conditional fields only shown when Category is Private Jobs */}
                    {formData.category === 'Private Jobs' && (
                      <>
                        <FormGroup label="Company Name" icon={<Building2 className="w-3.5 h-3.5" />}>
                          <div className="flex space-x-3">
                            <input
                              required={formData.category === 'Private Jobs'}
                              className="compact-input flex-1"
                              placeholder="e.g. Tech Solutions Pvt. Ltd."
                              value={formData.company}
                              onChange={v => setFormData({ ...formData, company: v.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, isVerified: !formData.isVerified })}
                              className={`p-3 rounded-2xl transition-all ${formData.isVerified ? 'bg-purple-50 text-purple-600 border-2 border-purple-100' : 'bg-slate-50 text-slate-300 border-2 border-slate-100'}`}
                            >
                              <ShieldCheck className="w-5 h-5" />
                            </button>
                          </div>
                        </FormGroup>
                        <FormGroup label="Location" icon={<MapPin className="w-3.5 h-3.5" />}>
                          <input
                            required={formData.category === 'Private Jobs'}
                            className="compact-input"
                            placeholder="e.g. Bangalore, Karnataka"
                            value={formData.location}
                            onChange={v => setFormData({ ...formData, location: v.target.value })}
                          />
                        </FormGroup>
                      </>
                    )}
                  </div>
                </div>


                {/* Submit Actions */}
                <div className="flex space-x-4 pb-8">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-[18px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Discard</button>
                  <button type="submit" disabled={loading || uploading} className="flex-[2] py-4 bg-primary text-white rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center">
                    {uploading ? 'Processing Image...' : loading ? 'Broadcasting Recruitment...' : isEditing ? 'Update Recruitment Info' : 'Broadcast Official Recruitment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reschedule Modal remains same as before */}
        {showRescheduleModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowRescheduleModal(false)}></div>
            <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                    <Calendar className="w-5 h-5 text-amber-500" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 tracking-tighter">Reschedule</h4>
                </div>
                <button onClick={() => setShowRescheduleModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-8">
                <input type="date" className="compact-input w-full mb-8" value={rescheduleData.date} onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })} />
                <div className="flex space-x-4">
                  <button onClick={() => setShowRescheduleModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                  <button onClick={confirmReschedule} disabled={loading} className="flex-2 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 px-8">Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Job Details Modal */}
        {viewJobModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setViewJobModal(null)}></div>
            <div className="relative bg-white w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[95vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/20 to-white flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                      {viewJobModal.title || 'Untitled Job'}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewJobModal.company || 'Unknown Employer'}</span>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold uppercase tracking-wider">
                        {viewJobModal.category || 'General'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => { handleDeleteJob(viewJobModal.id); setViewJobModal(null); }} 
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all shadow-sm flex items-center text-[10px] font-bold uppercase tracking-widest"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Job
                  </button>
                  <button onClick={() => setViewJobModal(null)} className="p-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-all shadow-sm"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (Main details) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Job Description */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-500" /> Job Description
                      </h5>
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {viewJobModal.description || 'No description provided by the poster.'}
                      </p>
                    </div>

                    {/* Banner Image Preview */}
                    {viewJobModal.imageUrl && (
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Uploaded Banner / Image
                        </h5>
                        <div className="relative rounded-xl overflow-hidden border border-slate-200/80 max-h-80 bg-slate-100 group">
                          <img src={viewJobModal.imageUrl} alt="Banner" className="w-full h-full object-contain mx-auto" />
                          <button 
                            onClick={() => window.open(viewJobModal.imageUrl, '_blank')}
                            className="absolute bottom-3 right-3 bg-slate-900/70 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-1 backdrop-blur-sm transition-all"
                          >
                            <Globe className="w-3 h-3" /> View Full Image
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Detailed Location & Pincode */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" /> Location Details
                      </h5>
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-slate-700">
                          {viewJobModal.location || 'Remote/Any'}
                        </p>
                        {viewJobModal.address && (
                          <p className="text-xs font-medium text-slate-500 leading-relaxed">
                            {viewJobModal.address}
                          </p>
                        )}
                        {viewJobModal.pincode && (
                          <span className="inline-flex px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[9.5px] font-bold border border-slate-100">
                            Pincode: {viewJobModal.pincode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Specifications & Actions) */}
                  <div className="space-y-6">
                    {/* Employer Profile Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Posted By (Profile)</h5>
                      <div className="flex items-center">
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xs mr-3">
                          {(usersMap[viewJobModal.postedBy]?.name || usersMap[viewJobModal.postedBy]?.displayName || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-extrabold text-slate-900 truncate">
                            {usersMap[viewJobModal.postedBy]?.name || usersMap[viewJobModal.postedBy]?.displayName || 'Unknown User'}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">Employer Profile ID</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Phone:</span>
                          <span className="font-semibold text-slate-700">{usersMap[viewJobModal.postedBy]?.phoneNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Email:</span>
                          <span className="font-semibold text-slate-700 truncate max-w-[150px]">{usersMap[viewJobModal.postedBy]?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Total Posts:</span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9.5px] font-bold border border-blue-100">
                            {jobs.filter(j => j.postedBy === viewJobModal.postedBy).length} listings
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Specifications */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4.5">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Job Details</h5>
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Salary Range</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {viewJobModal.salary || 'Not Disclosed'}
                          {viewJobModal.salaryType && <span className="text-[9.5px] text-emerald-400 uppercase tracking-widest"> / {viewJobModal.salaryType}</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Experience Required</p>
                        <p className="text-xs font-bold text-slate-700">{viewJobModal.experience || 'Not Specified'}</p>
                      </div>
                      <div>
                        <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Verification Status</p>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${viewJobModal.isVerified ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400'}`}>
                          {viewJobModal.isVerified ? 'KYC Verified' : 'Standard'}
                        </span>
                      </div>
                    </div>

                    {/* Payment & Visibility Details */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment &amp; Visibility</h5>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Paid Amount:</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold border border-emerald-100">
                          ₹{viewJobModal.isTopVisibility ? '99' : '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Post Type:</span>
                        <span className="font-semibold text-slate-700">{viewJobModal.isTopVisibility ? 'Top Visibility Ad' : 'Standard Post'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Created Date:</span>
                        <span className="font-semibold text-slate-700">
                          {viewJobModal.createdAt ? new Date(viewJobModal.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Expiry Date:</span>
                        <span className="font-bold text-rose-500">
                          {viewJobModal.expiryDate ? new Date(viewJobModal.expiryDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
          .compact-input {
            width: 100%;
            background-color: #f8fafc;
            border: 2px solid #f1f5f9;
            border-radius: 14px;
            padding: 10px 16px;
            font-size: 11px;
            font-weight: 700;
            color: #1e293b;
            outline: none;
            transition: all 0.2s;
          }
          .compact-input:focus {
            background-color: #fff;
            border-color: #2563EB;
            box-shadow: 0 4px 12px -4px rgba(37, 99, 235, 0.15);
          }
        ` }} />
      </div>
    </Layout>
  );
};
const FormGroup = ({ label, icon, children }) => (
  <div className="space-y-2">
    <div className="flex items-center space-x-2">
      {icon && (
        <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
          {React.cloneElement(icon, { className: "w-3 h-3 text-slate-400" })}
        </div>
      )}
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    </div>
    {children}
  </div>
);
