import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
    const navigate = useNavigate();

    const [customerForm, setCustomerForm] = useState({ email: '', password: '' });
    const [sellerForm, setSellerForm] = useState({ email: '', password: '' });
    const [customerError, setCustomerError] = useState('');
    const [sellerError, setSellerError] = useState('');
    const [customerLoading, setCustomerLoading] = useState(false);
    const [sellerLoading, setSellerLoading] = useState(false);

    const handleCustomerChange = (e) => {
        setCustomerForm({ ...customerForm, [e.target.name]: e.target.value });
    };

    const handleSellerChange = (e) => {
        setSellerForm({ ...sellerForm, [e.target.name]: e.target.value });
    };

    const handleCustomerLogin = async (e) => {
        e.preventDefault();
        setCustomerError('');
        setCustomerLoading(true);
        try {
            const { data } = await axios.post('/api/users/login', customerForm);
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', 'customer');
            navigate('/dashboard');
        } catch (err) {
            setCustomerError(
                err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.'
            );
        } finally {
            setCustomerLoading(false);
        }
    };

    const handleSellerLogin = async (e) => {
        e.preventDefault();
        setSellerError('');
        setSellerLoading(true);
        try {
            const { data } = await axios.post('/api/sellers/login', sellerForm);
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', 'seller');
            navigate('/seller/dashboard');
        } catch (err) {
            setSellerError(
                err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.'
            );
        } finally {
            setSellerLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Header */}
            <header className="login-header">
                <div className="logo-area">
                    <span className="logo-icon">🛍️</span>
                    <span className="logo-text">ShopZone</span>
                </div>
                <p className="header-tagline">Your one-stop e-commerce marketplace</p>
            </header>

            {/* Main Portal */}
            <main className="portals-container">
                {/* Customer Portal */}
                <div className="portal customer-portal">
                    <div className="portal-badge customer-badge">Customer</div>
                    <h2 className="portal-title">Welcome Back!</h2>
                    <p className="portal-subtitle">Sign in to browse & shop thousands of products</p>

                    {customerError && (
                        <div className="error-alert">
                            <span className="error-icon">⚠️</span> {customerError}
                        </div>
                    )}

                    <form onSubmit={handleCustomerLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="customer-email">Email Address</label>
                            <div className="input-wrapper">
                                <span className="input-icon">✉️</span>
                                <input
                                    id="customer-email"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={customerForm.email}
                                    onChange={handleCustomerChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="customer-password">Password</label>
                            <div className="input-wrapper">
                                <span className="input-icon">🔒</span>
                                <input
                                    id="customer-password"
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    value={customerForm.password}
                                    onChange={handleCustomerChange}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="login-btn customer-btn"
                            disabled={customerLoading}
                        >
                            {customerLoading ? (
                                <span className="btn-loading">
                                    <span className="spinner" /> Logging in…
                                </span>
                            ) : (
                                'Login as Customer'
                            )}
                        </button>
                    </form>

                    <p className="portal-footer-link">
                        Don&apos;t have an account?{' '}
                        <Link to="/register/customer">Register here</Link>
                    </p>
                </div>

                {/* Divider */}
                <div className="portal-divider">
                    <div className="divider-line" />
                    <span className="divider-text">OR</span>
                    <div className="divider-line" />
                </div>

                {/* Seller Portal */}
                <div className="portal seller-portal">
                    <div className="portal-badge seller-badge">Seller</div>
                    <h2 className="portal-title">Seller Hub</h2>
                    <p className="portal-subtitle">Access your store, manage products & orders</p>

                    {sellerError && (
                        <div className="error-alert">
                            <span className="error-icon">⚠️</span> {sellerError}
                        </div>
                    )}

                    <form onSubmit={handleSellerLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="seller-email">Email Address</label>
                            <div className="input-wrapper">
                                <span className="input-icon">✉️</span>
                                <input
                                    id="seller-email"
                                    type="email"
                                    name="email"
                                    placeholder="seller@business.com"
                                    value={sellerForm.email}
                                    onChange={handleSellerChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="seller-password">Password</label>
                            <div className="input-wrapper">
                                <span className="input-icon">🔒</span>
                                <input
                                    id="seller-password"
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    value={sellerForm.password}
                                    onChange={handleSellerChange}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="login-btn seller-btn"
                            disabled={sellerLoading}
                        >
                            {sellerLoading ? (
                                <span className="btn-loading">
                                    <span className="spinner" /> Logging in…
                                </span>
                            ) : (
                                'Login as Seller'
                            )}
                        </button>
                    </form>

                    <p className="portal-footer-link">
                        New seller?{' '}
                        <Link to="/register/seller">Apply here</Link>
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="login-footer">
                <p>
                    Are you an administrator?{' '}
                    <Link to="/admin" className="admin-link">
                        🔐 Admin Portal
                    </Link>
                </p>
                <p className="footer-copyright">© 2025 ShopZone. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LoginPage;
