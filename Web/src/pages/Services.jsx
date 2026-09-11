import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import {
  Plus, Trash2, X, Wrench, Search, Image as ImageIcon, Loader2, AlertCircle, Tag
} from 'lucide-react';
import {
  collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { toast } from 'react-hot-toast';

const CATEGORY_OPTIONS = [
  'Doctors', 'Repair & Services', 'Real Estate', 'PG / Hostel',
  'Rent or Hire', 'Daily Needs', 'Beauty', 'Education', 'Food', 'Transport',
  'Home Services', 'Legal & Finance', 'Events & Entertainment', 'Other'
];

export const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const [form, setForm] = useState({
    name: '',
    category: 'Repair & Services',
    description: '',
    priceFrom: '',
    priceTo: '',
    tags: '',
    isActive: true,
    imageUrl: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Service name is required'); return; }
    setUploading(true);
    try {
      let finalImageUrl = form.imageUrl;
      if (imageFile) {
        const storageRef = ref(storage, `services/${Date.now()}_${imageFile.name}`);
        const snap = await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(snap.ref);
      }
      await addDoc(collection(db, 'services'), {
        ...form,
        imageUrl: finalImageUrl,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        createdAt: serverTimestamp(),
      });
      toast.success('Service added successfully!');
      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add service');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" service?`)) return;
    try {
      await deleteDoc(doc(db, 'services', id));
      toast.success('Service deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const resetForm = () => {
    setForm({ name: '', category: 'Repair & Services', description: '', priceFrom: '', priceTo: '', tags: '', isActive: true, imageUrl: '' });
    setImageFile(null);
    setImagePreview(null);
  };

  const filtered = services.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategory === 'All' || s.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen">
        {/* Header */}
        <header className="bg-white px-10 py-6 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Services Management</h2>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
              Add, manage and remove services listed in the app
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-2 stroke-[3]" />
            Add New Service
          </button>
        </header>

        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Services', value: services.length, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Active', value: services.filter(s => s.isActive).length, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Inactive', value: services.filter(s => !s.isActive).length, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Categories', value: [...new Set(services.map(s => s.category))].length, color: 'text-blue-600', bg: 'bg-blue-50' },
            ].map(stat => (
              <div key={stat.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary/40"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none focus:border-primary/40"
            >
              <option value="All">All Categories</option>
              {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Services Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={40} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100">
              <Wrench className="w-12 h-12 text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold">No services found</p>
              <p className="text-gray-300 text-sm mt-1">Add your first service using the button above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map(service => (
                <div key={service.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-lg transition-all">
                  {/* Image */}
                  <div className="relative h-40 bg-gray-50">
                    {service.imageUrl ? (
                      <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Wrench className="w-10 h-10 text-gray-200" />
                      </div>
                    )}
                    {/* Status badge */}
                    <span className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${service.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {/* Delete btn */}
                    <button
                      onClick={() => handleDelete(service.id, service.name)}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">{service.category}</p>
                    <h3 className="font-black text-gray-900 text-sm mb-1 truncate">{service.name}</h3>
                    {service.description && (
                      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{service.description}</p>
                    )}
                    {(service.priceFrom || service.priceTo) && (
                      <p className="text-xs font-black text-gray-700">
                        ₹{service.priceFrom || '0'} {service.priceTo ? `– ₹${service.priceTo}` : '+'}
                      </p>
                    )}
                    {service.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {service.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[9px] font-bold">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="flex items-center justify-between p-7 border-b border-gray-100 bg-gray-50/30">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Add New Service</h3>
                <p className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-widest">This service will be listed in the app</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-7 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Image Upload */}
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Service Image</label>
                <div
                  className="relative h-40 w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/40 transition-all group"
                  onClick={() => document.getElementById('svcImg').click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-400">Click to upload image</p>
                    </div>
                  )}
                  <input type="file" id="svcImg" className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Service Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. AC Repair"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                  >
                    {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the service..."
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-semibold text-gray-700 focus:border-primary focus:bg-white focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Price From (₹)</label>
                  <input
                    type="number"
                    value={form.priceFrom}
                    onChange={e => setForm({ ...form, priceFrom: e.target.value })}
                    placeholder="e.g. 200"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Price To (₹)</label>
                  <input
                    type="number"
                    value={form.priceTo}
                    onChange={e => setForm({ ...form, priceTo: e.target.value })}
                    placeholder="e.g. 1000"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tags (comma separated)</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="e.g. ac, cooling, repair, installation"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-semibold text-gray-700 focus:border-primary focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-sm font-black text-gray-900">Active Status</p>
                  <p className="text-[10px] text-gray-400 font-semibold">Show this service in the app</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`w-12 h-6 rounded-full transition-all duration-300 relative ${form.isActive ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${form.isActive ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-[2] py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                >
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Plus className="w-4 h-4" />Add Service</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
