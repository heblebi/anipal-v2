import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { register } from '../services/mockBackend';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await register(username, email, password);
      loginUser(response.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800 w-full max-w-md">
        <h2 className="text-3xl font-bold text-amber-500 mb-6 text-center">Anipal'a Katıl</h2>
        
        {error && (
          <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm text-center border border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input 
            label="Kullanıcı Adı" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          <Input 
            label="E-posta Adresi" 
            type="email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <Input 
            label="Şifre" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          
          <Button type="submit" className="w-full mt-2" isLoading={loading}>
            Hesap Oluştur
          </Button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Zaten hesabınız var mı?{' '}
          <Link to="/login" className="text-amber-500 hover:text-amber-400 font-medium">
            Giriş Yapın
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
