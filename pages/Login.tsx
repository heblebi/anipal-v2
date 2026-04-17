import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/mockBackend';
import { useNavigate, Link } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';

const Login = () => {
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
      const response = await login(email, password);
      loginUser(response.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-12">
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800 w-full max-w-md">
        <h2 className="text-3xl font-bold text-amber-500 mb-6 text-center">Tekrar Hoşgeldiniz</h2>
        
        {error && (
          <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm text-center border border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input 
            label="Kullanıcı Adı veya E-posta" 
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
            Giriş Yap
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Şifremi Unuttum
          </Link>
        </div>

        <p className="mt-4 text-center text-gray-400 text-sm">
          Hesabınız yok mu?{' '}
          <Link to="/register" className="text-amber-500 hover:text-amber-400 font-medium">
            Kayıt Olun
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Login;
