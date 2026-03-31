import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { TrendingUp, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAppStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(username, password);
    if (success) {
      navigate('/targets', { replace: true });
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Notify Me" className="w-14 h-14 rounded-2xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Notify Me</h1>
          <p className="text-slate-400 text-sm mt-1">Target Page</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-5">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin or member"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> Sign In
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center">Demo Accounts</p>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                className="flex-1 text-center text-[10px] px-2 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <span className="font-bold">Admin</span><br />admin / admin123
              </button>
              <button
                type="button"
                onClick={() => { setUsername('member'); setPassword('member123'); }}
                className="flex-1 text-center text-[10px] px-2 py-1.5 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="font-bold">Member</span><br />member / member123
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
