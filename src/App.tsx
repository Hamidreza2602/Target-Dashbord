import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import Layout from './components/Layout';
import LoginPage from './pages/login/LoginPage';
import SimulatorPage from './pages/simulator/SimulatorPage';
import TargetsPage from './pages/targets/TargetsPage';
import ReportsPage from './pages/reports/ReportsPage';
import AdminPage from './pages/admin/AdminPage';

export default function App() {
  const currentUser = useAppStore(s => s.currentUser);

  return (
    <BrowserRouter>
      <Routes>
        {!currentUser ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/targets" replace />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="targets" element={<TargetsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            {currentUser.role === 'admin' && (
              <Route path="admin" element={<AdminPage />} />
            )}
            <Route path="login" element={<Navigate to="/targets" replace />} />
            <Route path="*" element={<Navigate to="/targets" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}
