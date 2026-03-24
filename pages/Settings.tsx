import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword, deleteAccount } from '../services/mockBackend';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { Shield, Trash2, LogOut, AlertOctagon } from 'lucide-react';

const Settings = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  // Password State
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [loading, setLoading] = useState(false);

  // Danger Zone State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!user) {
      navigate('/login');
      return null;
  }

  const handlePassUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMsg(null);
      try {
          await changePassword(user.id, oldPass, newPass);
          setMsg({ type: 'success', text: 'Şifreniz başarıyla güncellendi.' });
          setOldPass('');
          setNewPass('');
      } catch (err: any) {
          setMsg({ type: 'error', text: err.message || 'Şifre değiştirilemedi.' });
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteAccount = async () => {
      if (!window.confirm("Bu işlem geri alınamaz! Emin misiniz?")) return;
      
      try {
          await deleteAccount(user.id);
          logoutUser();
          navigate('/');
      } catch (err) {
          console.error(err);
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
        <h1 className="text-3xl font-bold text-white mb-6">Hesap Ayarları</h1>

        {/* Password Section */}
        <div className="bg-[#18181b] border border-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                <Shield className="text-amber-500" />
                <h2 className="text-xl font-bold text-gray-200">Güvenlik</h2>
            </div>

            {msg && (
                <div className={`p-4 rounded mb-4 text-sm font-medium ${msg.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-red-900/30 text-red-300 border border-red-800'}`}>
                    {msg.text}
                </div>
            )}

            <form onSubmit={handlePassUpdate} className="space-y-4">
                <Input 
                    label="Mevcut Şifre" 
                    type="password" 
                    value={oldPass} 
                    onChange={e => setOldPass(e.target.value)} 
                    required 
                />
                <Input 
                    label="Yeni Şifre" 
                    type="password" 
                    value={newPass} 
                    onChange={e => setNewPass(e.target.value)} 
                    required 
                    minLength={6}
                />
                <div className="flex justify-end">
                    <Button type="submit" isLoading={loading}>Şifreyi Güncelle</Button>
                </div>
            </form>
        </div>

        {/* Session Section */}
        <div className="bg-[#18181b] border border-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                <LogOut className="text-gray-400" />
                <h2 className="text-xl font-bold text-gray-200">Oturum Yönetimi</h2>
            </div>
            <p className="text-gray-400 text-sm mb-4">
                Bu cihazdaki oturumunuzu güvenli bir şekilde sonlandırın.
            </p>
            <Button variant="secondary" onClick={() => logoutUser()} className="flex items-center gap-2">
                <LogOut size={16} /> Çıkış Yap
            </Button>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/10 border border-red-900/50 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6 border-b border-red-900/30 pb-4">
                <AlertOctagon className="text-red-500" />
                <h2 className="text-xl font-bold text-red-500">Tehlikeli Bölge</h2>
            </div>
            
            <p className="text-red-300/70 text-sm mb-6">
                Hesabınızı sildiğinizde tüm verileriniz (yorumlar, izleme geçmişi, beğeniler) kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </p>

            {showDeleteConfirm ? (
                 <div className="bg-red-900/20 p-4 rounded border border-red-900/50 flex flex-col items-start gap-3">
                     <p className="text-white font-bold text-sm">Gerçekten silmek istiyor musunuz?</p>
                     <div className="flex gap-3">
                         <Button variant="danger" onClick={handleDeleteAccount}>Evet, Hesabımı Sil</Button>
                         <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>İptal</Button>
                     </div>
                 </div>
            ) : (
                <Button variant="danger" className="flex items-center gap-2 bg-red-900/50 hover:bg-red-900 border border-red-800" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 size={16} /> Hesabı Sil
                </Button>
            )}
        </div>
    </div>
  );
};

export default Settings;