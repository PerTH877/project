import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import CustomerRegister from './pages/CustomerRegister';
import SellerRegister from './pages/SellerRegister';
import AdminDashboard from './pages/AdminDashboard';
import SellerDashboard from './pages/SellerDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Main Login (Customer + Seller dual portal) */}
        <Route path="/" element={<LoginPage />} />

        {/* Registration pages */}
        <Route path="/register/customer" element={<CustomerRegister />} />
        <Route path="/register/seller" element={<SellerRegister />} />

        {/* Admin login */}
        <Route path="/admin" element={<AdminLoginPage />} />

        {/* Dashboards */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />

        {/* Placeholder dashboard routes — replace with real components */}
        <Route path="/dashboard" element={<PlaceholderPage title="Customer Dashboard" />} />

        {/* Catch‑all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

// Temporary placeholder — replace with real dashboard components later
const PlaceholderPage = ({ title }) => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg,#0f0c29,#302b63)',
    color: '#fff',
    fontFamily: 'Inter, sans-serif',
    gap: '1rem',
  }}>
    <span style={{ fontSize: '3rem' }}>🚧</span>
    <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>{title}</h1>
    <p style={{ opacity: 0.5 }}>This page is under construction.</p>
    <a href="/" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>← Back to Login</a>
  </div>
);

export default App;
