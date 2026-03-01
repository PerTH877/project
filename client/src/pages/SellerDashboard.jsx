import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './SellerDashboard.css';

const SellerDashboard = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: '',
        brand: '',
        description: '',
        base_price: '',
        category_id: '',
        sku: '', // simple version: 1 default variant
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/');
                return;
            }

            // Format payload matching the complex validator
            const payload = {
                title: form.title,
                brand: form.brand || "Generic",
                description: form.description,
                base_price: Number(form.base_price),
                category_id: form.category_id ? Number(form.category_id) : 1, // default to 1 for test
                variants: [
                    {
                        sku: form.sku || `SKU-${Date.now()}`,
                        attributes: { size: "default", color: "default" },
                        price_adjustment: 0,
                        inventory: []
                    }
                ]
            };

            await axios.post('/api/products', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccess('Product added successfully!');
            setForm({
                title: '',
                brand: '',
                description: '',
                base_price: '',
                category_id: '',
                sku: '',
            });
        } catch (err) {
            if (err.response?.status === 403) {
                setError('Your seller account has not been verified yet by an admin.');
            } else if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/');
            } else {
                setError(err.response?.data?.error || 'Failed to add product');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="seller-dashboard">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <span className="brand-icon">🏪</span>
                    <h2>Seller Hub</h2>
                </div>
                <nav className="sidebar-nav">
                    <a href="#" className="active">📦 Add Product</a>
                    <button onClick={handleLogout} className="sidebar-logout">Logout</button>
                </nav>
            </aside>

            <main className="main-content">
                <header className="content-header">
                    <h1>Add New Product</h1>
                    <p>List a new item in your store to start selling.</p>
                </header>

                <div className="form-container">
                    {error && (
                        <div className="alert error-alert">
                            <span>⚠️</span> {error}
                        </div>
                    )}
                    {success && (
                        <div className="alert success-alert">
                            <span>✅</span> {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="product-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Product Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Wireless Noise-Cancelling Headphones"
                                />
                            </div>
                            <div className="form-group">
                                <label>Base Price ($) *</label>
                                <input
                                    type="number"
                                    name="base_price"
                                    value={form.base_price}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Brand</label>
                                <input
                                    type="text"
                                    name="brand"
                                    value={form.brand}
                                    onChange={handleChange}
                                    placeholder="e.g. Sony"
                                />
                            </div>
                            <div className="form-group">
                                <label>Default SKU</label>
                                <input
                                    type="text"
                                    name="sku"
                                    value={form.sku}
                                    onChange={handleChange}
                                    placeholder="Leave empty to auto-generate"
                                />
                            </div>
                        </div>

                        <div className="form-group full-width">
                            <label>Category ID</label>
                            <input
                                type="number"
                                name="category_id"
                                value={form.category_id}
                                onChange={handleChange}
                                placeholder="Database category ID (e.g. 1)"
                            />
                        </div>

                        <div className="form-group full-width">
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Describe your product features, dimensions, etc."
                            />
                        </div>

                        <button type="submit" className="submit-product-btn" disabled={loading}>
                            {loading ? 'Adding Product...' : '📦 Publish Product'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default SellerDashboard;
