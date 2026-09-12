import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Users, Plus, Trash2, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'Employee' });

  useEffect(() => {
    const q = query(collection(db, 'employees'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'employees'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      toast.success('Employee Added');
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'Employee' });
    } catch (error) {
      toast.error('Failed to add employee');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this employee?')) {
      await deleteDoc(doc(db, 'employees', id));
      toast.success('Deleted');
    }
  };

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black flex items-center gap-2"><Users className="w-6 h-6 text-indigo-600" /> Manage Employees</h2>
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all"><Plus className="w-4 h-4"/> Add Employee</button>
        </div>
        
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan="4" className="text-center py-10 text-sm font-bold text-slate-400">Loading...</td></tr>
              ) : employees.length === 0 ? (
                 <tr><td colSpan="4" className="text-center py-10 text-sm font-bold text-slate-400">No employees found.</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 font-black text-sm text-slate-800">{emp.name}</td>
                  <td className="p-4 text-xs text-slate-500 font-bold">
                    <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400"/>{emp.email}</div>
                    <div className="flex items-center gap-1.5 mt-1.5"><Phone className="w-3.5 h-3.5 text-slate-400"/>{emp.phone || 'N/A'}</div>
                  </td>
                  <td className="p-4 text-xs font-black text-indigo-600"><span className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 uppercase tracking-widest text-[9px]">{emp.role}</span></td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(emp.id)} className="p-2.5 text-rose-500 bg-white border border-slate-100 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-all shadow-sm"><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-xl font-black mb-6 tracking-tight text-slate-900">Add New Employee</h3>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input required className="w-full border-2 border-slate-100 p-3.5 rounded-2xl mt-1 text-sm font-bold bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input required type="email" className="w-full border-2 border-slate-100 p-3.5 rounded-2xl mt-1 text-sm font-bold bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                  <input required type="text" className="w-full border-2 border-slate-100 p-3.5 rounded-2xl mt-1 text-sm font-bold bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Secret Password" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                  <input className="w-full border-2 border-slate-100 p-3.5 rounded-2xl mt-1 text-sm font-bold bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 9876543210" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Role</label>
                  <select className="w-full border-2 border-slate-100 p-3.5 rounded-2xl mt-1 text-sm font-bold bg-slate-50 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option>Employee</option>
                    <option>Manager</option>
                    <option>Support Staff</option>
                    <option>Accountant</option>
                  </select>
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all">Create Profile</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
