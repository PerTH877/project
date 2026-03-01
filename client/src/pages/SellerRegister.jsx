import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './RegisterPage.css';

const SellerRegister = () => {
    const [form, setForm] = useState({
        companyName: '',
        email: '',
        password: '',
        gstNumber: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setLoading(true);
        try {
            const payload = {
                company_name: form.companyName,
                contact_email: form.email,
                password: form.password,
                gst_number: form.gstNumber,
            };
            await axios.post('/api/sellers/register', payload);
            setSuccess(true);
            setForm({ companyName: '', email: '', password: '', gstNumber: '' });
        } catch (err) {
            setError(
                err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page seller-register-page">
            <div className="register-card">
                {/* Left accent panel */}
                <div className="register-accent seller-accent">
                    <div className="accent-content">
                        <span className="accent-icon">🏪</span>
                        <h2>Become a Seller</h2>
                        <p>List your products and reach millions of customers across the globe.</p>
                        <ul className="accent-perks">
                            <li>✅ Zero listing fees</li>
                            <li>✅ Powerful analytics</li>
                            <li>✅ Dedicated support</li>
                            <li>✅ Fast payouts</li>
                        </ul>
                    </div>
                </div>

                {/* Form panel */}
                <div className="register-form-panel">
                    <div className="register-header">
                        <div className="register-badge seller-badge">Seller Registration</div>
                        <h1 className="register-title">Open Your Store</h1>
                        <p className="register-subtitle">Submit your details — our team will review</p>
                    </div>

                    {error && (
                        <div className="reg-error-alert">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {success ? (
                        <div className="reg-success-panel">
                            <div className="success-icon-wrap">
                                <span className="success-checkmark">✅</span>
                            </div>
                            <h3>Application Submitted!</h3>
                            <p className="success-message">
                                <strong>Registration successful, pending admin approval.</strong>
                                <br />
                                Our team will verify your details and get back to you within 2–3 business days.
                            </p>
                            <Link to="/" className="reg-submit-btn seller-submit-btn success-back-btn">
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="register-form">
                            <div className="reg-form-group">
                                <label htmlFor="seller-companyName">Company Name</label>
                                <div className="reg-input-wrapper">
                                    <span className="reg-input-icon">🏢</span>
                                    <input
                                        id="seller-companyName"
                                        type="text"
                                        name="companyName"
                                        placeholder="Your Company Pvt. Ltd."
                                        value={form.companyName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="reg-form-group">
                                <label htmlFor="seller-email">Business Email</label>
                                <div className="reg-input-wrapper">
                                    <span className="reg-input-icon">✉️</span>
                                    <input
                                        id="seller-email"
                                        type="email"
                                        name="email"
                                        placeholder="contact@yourcompany.com"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="reg-form-group">
                                <label htmlFor="seller-password">Password</label>
                                <div className="reg-input-wrapper">
                                    <span className="reg-input-icon">🔒</span>
                                    <input
                                        id="seller-password"
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
                                <label htmlFor="seller-gstNumber">GST Number</label>
                                <div className="reg-input-wrapper">
                                    <span className="reg-input-icon">🪪</span>
                                    <input
                                        id="seller-gstNumber"
                                        type="text"
                                        name="gstNumber"
                                        placeholder="22AAAAA0000A1Z5"
                                        value={form.gstNumber}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="reg-submit-btn seller-submit-btn"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="btn-loading">
                                        <span className="reg-spinner" /> Submitting…
                                    </span>
                                ) : (
                                    '🏪 Register as Seller'
                                )}
                            </button>
                        </form>
                    )}

                    {!success && (
                        <p className="reg-login-link">
                            Already approved? <Link to="/">Sign in here</Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerRegister;
