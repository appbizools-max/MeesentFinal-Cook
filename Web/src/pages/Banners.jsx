import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Loader2,
  X,
  Upload,
  AlertCircle
} from 'lucide-react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { toast } from 'react-hot-toast';
import { Layout } from '../components/layout/Layout';
export const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Job'); // Job, Vendor, Service
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bannerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBanners(bannerList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error('Please select an image');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload to Storage
      const storageRef = ref(storage, `banners/${Date.now()}_${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Save to Firestore
      await addDoc(collection(db, 'banners'), {
        title,
        type,
        imageUrl: downloadURL,
        createdAt: serverTimestamp(),
        isActive: true
      });

      toast.success('Banner added successfully');
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error('Failed to upload banner');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        await deleteDoc(doc(db, 'banners', id));
        toast.success('Banner deleted');
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setType('Job');
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Banners Management</h1>
            <p className="text-slate-500 font-medium mt-1">Manage promotional carousels for the mobile app</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#bc36ad] text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-lg shadow-[#bc36ad]/20 hover:scale-105 transition-transform"
          >
            <Plus size={20} />
            <span>Add New Banner</span>
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard label="Total Banners" value={banners.length} color="blue" />
          <StatCard label="Job Banners" value={banners.filter(b => b.type === 'Job').length} color="purple" />
          <StatCard label="Active Promos" value={banners.filter(b => b.isActive).length} color="green" />
        </div>

        {/* Grid of Banners */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#bc36ad]" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {banners.map((banner) => (
              <div key={banner.id} className="group bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500">
                <div className="relative h-48 bg-slate-100">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-xl shadow-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-[#bc36ad] rounded-lg shadow-sm">
                      {banner.type}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-slate-900 truncate">{banner.title || 'Untitled Banner'}</h3>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[11px] text-slate-400 font-bold">{new Date(banner.createdAt?.toDate()).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1 text-[#bc36ad] font-bold text-xs">
                      <ImageIcon size={14} />
                      <span>Active</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Add New Banner</h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Recommended Size: 1200 x 500 px</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddBanner} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Banner Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#bc36ad] focus:ring-0 transition-all font-bold text-slate-900"
                    placeholder="e.g. Summer Job Fair 2025"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Banner Type / Target</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#bc36ad] focus:ring-0 transition-all font-bold text-slate-900"
                  >
                    <option value="Job">Top Carousel (Jobs)</option>
                    <option value="Service">Top Carousel (Services)</option>
                    <option value="JobPromo">Mid Banner (Jobs - Post Job)</option>
                    <option value="ServicePromo">Mid Banner (Services - Bulk Sourcing)</option>
                    <option value="Vendor">Top Rated Vendors Section</option>
                    <option value="ProductMart">Product Mart Banner (Global Product Sourcing)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Upload Image (1200x500)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      accept="image/*"
                    />
                    <div className={`w-full h-40 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${imagePreview ? 'border-transparent' : 'border-slate-200 group-hover:border-[#bc36ad] bg-slate-50'}`}>
                      {imagePreview ? (
                        <img src={imagePreview} className="w-full h-full object-cover rounded-3xl" alt="Preview" />
                      ) : (
                        <>
                          <Upload className="text-slate-300 group-hover:text-[#bc36ad] mb-2" size={32} />
                          <span className="text-xs font-bold text-slate-400">Click or drag image here</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    <b>Important:</b> For best appearance on mobile, please use high-quality images with <b>1200x500 pixels</b> dimensions. Avoid small text.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-5 bg-[#bc36ad] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#bc36ad]/20 flex items-center justify-center space-x-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={20} />
                      <span>Post Banner Now</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

const StatCard = ({ label, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600'
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-black ${colors[color].split(' ')[1]}`}>{value}</p>
    </div>
  );
};
