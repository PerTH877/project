import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './AdminLoginPage.css';

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await axios.post('/api/admin/login', form);
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', 'admin');
            navigate('/admin/dashboard');
        } catch (err) {
            setError(
                err.response?.data?.error || err.response?.data?.message || 'Invalid credentials. Access denied.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            {/* Background decoration */}
            <div className="admin-bg-decor decor-1" />
            <div className="admin-bg-decor decor-2" />

            <div className="admin-card">
                {/* Shield Icon */}
                <div className="admin-icon-wrapper">
                    <span className="admin-shield-icon">🛡️</span>
                </div>

                <h1 className="admin-title">Admin Portal</h1>
                <p className="admin-subtitle">Restricted access — authorized personnel only</p>

                {error && (
                    <div className="admin-error-alert">
                        <span>⛔</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="admin-form">
                    <div className="admin-form-group">
                        <label htmlFor="admin-email">Admin Email</label>
                        <input
                            id="admin-email"
                            type="email"
                            name="email"
                            placeholder="admin@shopzone.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="admin-form-group">
                        <label htmlFor="admin-password">Password</label>
                        <input
                            id="admin-password"
                            type="password"
                            name="password"
                            placeholder="Enter admin password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button type="submit" className="admin-login-btn" disabled={loading}>
                        {loading ? (
                            <span className="btn-loading">
                                <span className="admin-spinner" /> Authenticating…
                            </span>
                        ) : (
                            '🔑 Login as Admin'
                        )}
                    </button>
                </form>

                <div className="admin-back-link">
                    <Link to="/">← Back to main portal</Link>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
