import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './RegisterPage.css';

const CustomerRegister = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
    });
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
            const payload = {
                full_name: form.fullName,
                email: form.email,
                password: form.password,
                phone_number: form.phone,
            };
            await axios.post('/api/users/register', payload);
            navigate('/');
        } catch (err) {
            setError(
                err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page customer-register-page">
            <div className="register-card">
                {/* Left accent panel */}
                <div className="register-accent customer-accent">
                    <div className="accent-content">
                        <span className="accent-icon">🛒</span>
                        <h2>Join ShopZone</h2>
                        <p>Create your account and start discovering thousands of products from top brands.</p>
                        <ul className="accent-perks">
                            <li>✅ Exclusive member deals</li>
                            <li>✅ Order tracking</li>
                            <li>✅ Wishlist & reviews</li>
                        </ul>
                    </div>
                </div>

                {/* Form panel */}
                <div className="register-form-panel">
                    <div className="register-header">
                        <div className="register-badge customer-badge">Customer Registration</div>
                        <h1 className="register-title">Create Account</h1>
                        <p className="register-subtitle">Fill in your details to get started</p>
                    </div>

                    {error && (
                        <div className="reg-error-alert">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="register-form">
                        <div className="reg-form-group">
                            <label htmlFor="cust-fullName">Full Name</label>
                            <div className="reg-input-wrapper">
                                <span className="reg-input-icon">👤</span>
                                <input
                                    id="cust-fullName"
                                    type="text"
                                    name="fullName"
                                    placeholder="John Doe"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="reg-form-group">
                            <label htmlFor="cust-email">Email Address</label>
                            <div className="reg-input-wrapper">
                                <span className="reg-input-icon">✉️</span>
                                <input
                                    id="cust-email"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="reg-form-group">
                            <label htmlFor="cust-password">Password</label>
                            <div className="reg-input-wrapper">
                                <span className="reg-input-icon">🔒</span>
                                <input
                                    id="cust-password"
                                    type="password"
                                    name="password"
                                    placeholder="Min. 8 characters"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>

                        <div className="reg-form-group">
                            <label htmlFor="cust-phone">Phone Number</label>
                            <div className="reg-input-wrapper">
                                <span className="reg-input-icon">📱</span>
                                <input
                                    id="cust-phone"
                                    type="tel"
                                    name="phone"
                                    placeholder="+1 (555) 000-0000"
                                    value={form.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="reg-submit-btn customer-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="btn-loading">
                                    <span className="reg-spinner" /> Creating Account…
                                </span>
                            ) : (
                                '🚀 Create My Account'
                            )}
                        </button>
                    </form>

                    <p className="reg-login-link">
                        Already have an account? <Link to="/">Sign in here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CustomerRegister;
