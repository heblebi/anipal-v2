import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword, changeUsername, changeEmail, deleteAccount, updatePrivacySettings } from '../services/mockBackend';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { Shield, Trash2, AlertOctagon, Eye, User, Mail, Lock } from 'lucide-react';

type Msg = { type: 'success' | 'error'; text: string };

const Settings = () => {
  const { user, logoutUser, updateUser } = useAuth();
  const navigate = useNavigate();

  // Username
  const [newUsername, setNewUsername] = useState('');
  const [usernameMsg, setUsernameMsg] = useState<Msg | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Email
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<Msg | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Password
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState<Msg | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  // Privacy
  const [showAnimeList, setShowAnimeList] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  // Danger Zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setNewUsername(user.username);
      setNewEmail(user.email);
      setShowAnimeList(user.showAnimeList !== false);
      setAllowMessages(user.allowMessages !== false);
      setIsPrivate(user.isPrivate || false);
    }
  }, [user]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleUsernameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.trim() === user.username) return;
    setUsernameLoading(true);
    setUsernameMsg(null);
    try {
      const updated = await changeUsername(user.id, newUsername.trim());
      updateUser({ username: updated.username });
      setUsernameMsg({ type: 'success', text: 'Kullanıcı adınız güncellendi.' });
    } catch (err: any) {
      setUsernameMsg({ type: 'error', text: err.message || 'Güncellenemedi.' });
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail.trim() === user.email) return;
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      const updated = await changeEmail(user.id, newEmail.trim());
      updateUser({ email: updated.email });
      setEmailMsg({ type: 'success', text: 'E-posta adresiniz güncellendi.' });
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Güncellenemedi.' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePassUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMsg(null);
    try {
      await changePassword(user.id, oldPass, newPass);
      setPassMsg({ type: 'success', text: 'Şifreniz başarıyla güncellendi.' });
      setOldPass('');
      setNewPass('');
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Şifre değiştirilemedi.' });
    } finally {
      setPassLoading(false);
    }
  };

  const handleToggleAnimeList = async () => {
    const newVal = !showAnimeList;
    setShowAnimeList(newVal);
    updateUser({ showAnimeList: newVal });
    await updatePrivacySettings(user.id, { showAnimeList: newVal });
  };

  const handleToggleMessages = async () => {
    const newVal = !allowMessages;
    setAllowMessages(newVal);
    updateUser({ allowMessages: newVal });
    await updatePrivacySettings(user.id, { allowMessages: newVal });
  };

  const handleTogglePrivate = async () => {
    const newVal = !isPrivate;
    setIsPrivate(newVal);
    updateUser({ isPrivate: newVal });
    await updatePrivacySettings(user.id, { isPrivate: newVal });
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

  const MsgBox = ({ msg }: { msg: Msg | null }) =>
    msg ? (
      <div className={`p-3 rounded text-sm font-medium mb-4 ${msg.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-red-900/30 text-red-300 border border-red-800'}`}>
        {msg.text}
      </div>
    ) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 px-1 sm:px-0">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">Hesap Ayarları</h1>

      {/* Account Settings */}
      <div className="bg-[#18181b] border border-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
          <User className="text-amber-500" size={20} />
          <h2 className="text-xl font-bold text-gray-200">Hesap Bilgileri</h2>
        </div>

        {/* Username */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase font-bold mb-3 tracking-wider">Kullanıcı Adı</p>
          <MsgBox msg={usernameMsg} />
          <form onSubmit={handleUsernameUpdate} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                label=""
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
              />
            </div>
            <Button type="submit" isLoading={usernameLoading} className="sm:self-end h-10 sm:h-10">Kaydet</Button>
          </form>
        </div>

        {/* Email */}
        <div className="mb-2">
          <p className="text-xs text-gray-500 uppercase font-bold mb-3 tracking-wider">E-posta Adresi</p>
          <MsgBox msg={emailMsg} />
          <form onSubmit={handleEmailUpdate} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                label=""
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" isLoading={emailLoading} className="sm:self-end h-10">Kaydet</Button>
          </form>
        </div>
      </div>

      {/* Password */}
      <div className="bg-[#18181b] border border-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
          <Lock className="text-amber-500" size={20} />
          <h2 className="text-xl font-bold text-gray-200">Şifre Değiştir</h2>
        </div>
        <MsgBox msg={passMsg} />
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
            <Button type="submit" isLoading={passLoading}>Şifreyi Güncelle</Button>
          </div>
        </form>
      </div>

      {/* Privacy */}
      <div className="bg-[#18181b] border border-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
          <Eye className="text-blue-400" size={20} />
          <h2 className="text-xl font-bold text-gray-200">Gizlilik</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800">
            <div>
              <p className="text-white font-medium">Anime Listem</p>
              <p className="text-gray-500 text-sm">Puanlamaların ve anime listenin profilinde görünsün</p>
            </div>
            <button onClick={handleToggleAnimeList} className={`relative w-12 h-6 rounded-full transition-colors ${showAnimeList ? 'bg-amber-500' : 'bg-gray-700'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${showAnimeList ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800">
            <div>
              <p className="text-white font-medium">Mesaj Al</p>
              <p className="text-gray-500 text-sm">Diğer kullanıcılar sana mesaj gönderebilsin</p>
            </div>
            <button onClick={handleToggleMessages} className={`relative w-12 h-6 rounded-full transition-colors ${allowMessages ? 'bg-amber-500' : 'bg-gray-700'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowMessages ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800">
            <div>
              <p className="text-white font-medium">Gizli Profil</p>
              <p className="text-gray-500 text-sm">Profilin sadece arkadaşlarına görünsün</p>
            </div>
            <button onClick={handleTogglePrivate} className={`relative w-12 h-6 rounded-full transition-colors ${isPrivate ? 'bg-amber-500' : 'bg-gray-700'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-900/10 border border-red-900/50 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-6 border-b border-red-900/30 pb-4">
          <AlertOctagon className="text-red-500" size={20} />
          <h2 className="text-xl font-bold text-red-500">Tehlikeli Bölge</h2>
        </div>
        <p className="text-red-300/70 text-sm mb-6">
          Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinecektir. Bu işlem geri alınamaz.
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
          <Button
            variant="danger"
            className="flex items-center gap-2 bg-red-900/50 hover:bg-red-900 border border-red-800"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 size={16} /> Hesabı Sil
          </Button>
        )}
      </div>
    </div>
  );
};

export default Settings;
