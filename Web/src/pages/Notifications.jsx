import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Send, Users, User, Bell, AlertCircle, Info, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Notifications = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error('Please fill in both title and message');
      return;
    }

    setSending(true);
    // Logic to send notification via Cloud Functions or Admin SDK would go here
    setTimeout(() => {
      setSending(false);
      toast.success('Notification broadcasted successfully!');
      setTitle('');
      setMessage('');
    }, 1500);
  };

  const targets = [
    { id: 'all', label: 'All Users', icon: Users, description: 'Send to everyone in the system' },
    { id: 'vendors', label: 'Vendors Only', icon: Bell, description: 'Send to registered service providers' },
    { id: 'clients', label: 'Clients Only', icon: User, description: 'Send to individual service seekers' },
  ];

  const types = [
    { id: 'info', label: 'General Info', icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'warning', label: 'Urgent Alert', icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { id: 'success', label: 'Success Update', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <Layout title="Broadcast Notifications">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Create New Broadcast</h3>
            
            <form onSubmit={handleSend} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {targets.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTarget(item.id)}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                      target === item.id 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    <item.icon className="w-6 h-6 mb-2" />
                    <span className="text-sm font-bold">{item.label}</span>
                    <span className="text-[10px] text-center mt-1 opacity-60">{item.description}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notification Type</label>
                <div className="flex space-x-4">
                  {types.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`flex items-center px-4 py-2 rounded-lg border transition-all ${
                        type === t.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <t.icon className={`w-4 h-4 mr-2 ${t.color}`} />
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Push Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. System Maintenance Update"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message Body</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 h-32"
                  placeholder="Describe the update in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/20 ${
                  sending ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                {sending ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Broadcast Now</span>
                    <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden h-[500px]">
            <div className="absolute top-0 left-0 right-0 h-16 bg-gray-900 flex items-center justify-center border-b border-white/10">
              <div className="w-16 h-1.5 bg-white/20 rounded-full" />
            </div>
            
            <div className="mt-20">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-[10px]">M</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-xs font-bold">MESSENT</span>
                      <span className="text-white/40 text-[10px]">Now</span>
                    </div>
                    <div className="text-white text-[11px] font-semibold">{title || 'Your Notification Title'}</div>
                  </div>
                </div>
                <div className="text-white/60 text-[10px] leading-relaxed">
                  {message || 'Type a message to see how it will look on the user\'s lock screen...'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center">
              <Info className="w-4 h-4 mr-2 text-primary" />
              Broadcasting Tips
            </h4>
            <ul className="text-sm text-gray-600 space-y-3">
              <li>• Keep titles under 40 characters for best visibility.</li>
              <li>• Use clear, action-oriented language.</li>
              <li>• Targeted broadcasts have 3x higher engagement.</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};
