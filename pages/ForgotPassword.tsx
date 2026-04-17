import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Button from '../components/Button';
import { Mail, KeyRound, ShieldCheck, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'sent' | 'newpass' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // PASSWORD_RECOVERY eventi: kullanıcı e-postadaki linke tıklayıp geri döndüğünde
  useEffect(() => {
    // sessionStorage flag (RecoveryHandler tarafından set edildi)
    if (sessionStorage.getItem('pw_recovery') === '1') {
      sessionStorage.removeItem('pw_recovery');
      setStep('newpass');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('newpass');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Adım 1 — şifre sıfırlama e-postası gönder
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('E-posta adresi gereklidir.'); return; }
    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: window.location.origin }
      );
      if (resetErr) throw new Error(resetErr.message);
      setStep('sent');
    } catch (err: any) {
      setError(err.message || 'E-posta gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  // Adım 2 — yeni şifreyi kaydet
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Şifre en az 6 karakter olmalıdır.'); return; }
    if (newPassword !== confirmPassword) { setError('Şifreler eşleşmiyor.'); return; }
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw new Error(updateErr.message);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen py-12 px-4 bg-[#0f0f10]">
      <div className="bg-[#18181b] p-8 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-md">

        {/* Geri */}
        {step !== 'newpass' && (
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-6 transition-colors">
            <ArrowLeft size={14} /> Giriş sayfasına dön
          </Link>
        )}

        {/* Adım 1 — E-posta */}
        {step === 'email' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Şifremi Unuttum</h2>
                <p className="text-xs text-gray-500">E-postanıza şifre sıfırlama bağlantısı göndereceğiz.</p>
              </div>
            </div>

            {error && <div className="bg-red-900/30 text-red-300 border border-red-800/50 rounded-xl p-3 text-sm mb-4">{error}</div>}

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">E-posta Adresi</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>
              <Button type="submit" className="w-full" isLoading={loading}>
                Sıfırlama Bağlantısı Gönder
              </Button>
            </form>
          </>
        )}

        {/* Adım 2 — E-posta Gönderildi */}
        {step === 'sent' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
              <Mail size={28} className="text-amber-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">E-posta Gönderildi</h2>
            <p className="text-sm text-gray-400 mb-2">
              <span className="text-amber-400 font-semibold">{email}</span> adresine şifre sıfırlama bağlantısı gönderildi.
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Bağlantıya tıkladıktan sonra bu sayfada yeni şifrenizi oluşturabilirsiniz. Spam klasörünüzü de kontrol edin.
            </p>
            <button
              onClick={() => setStep('email')}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Farklı bir e-posta deneyin
            </button>
          </div>
        )}

        {/* Adım 3 — Yeni Şifre */}
        {step === 'newpass' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <KeyRound size={18} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Yeni Şifre Oluştur</h2>
                <p className="text-xs text-gray-500">Hesabınız için yeni bir şifre belirleyin.</p>
              </div>
            </div>

            {error && <div className="bg-red-900/30 text-red-300 border border-red-800/50 rounded-xl p-3 text-sm mb-4">{error}</div>}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Yeni Şifre</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Yeni Şifre (Tekrar)</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Şifreyi tekrar girin"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>
              <Button type="submit" className="w-full" isLoading={loading}>
                Şifremi Sıfırla
              </Button>
            </form>
          </>
        )}

        {/* Adım 4 — Başarılı */}
        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-green-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Şifre Güncellendi!</h2>
            <p className="text-sm text-gray-400 mb-6">Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz.</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Ana Sayfaya Git
            </Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;
