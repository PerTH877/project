import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [pendingSellers, setPendingSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null); // track which seller ID is being verified

    useEffect(() => {
        fetchPendingSellers();
    }, []);

    const fetchPendingSellers = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/admin');
                return;
            }

            const { data } = await axios.get('/api/admin/sellers/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingSellers(data.sellers || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch pending sellers. Please login again.');
            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                navigate('/admin');
            }
        } finally {
            setLoading(false);
        }
    };

    const verifySeller = async (sellerId) => {
        try {
            setActionLoading(sellerId);
            const token = localStorage.getItem('token');
            await axios.patch(`/api/admin/sellers/${sellerId}/verify`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Remove verified seller from list
            setPendingSellers(pendingSellers.filter(s => s.seller_id !== sellerId));
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to verify seller');
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/admin');
    };

    return (
        <div className="admin-dashboard">
            <nav className="dashboard-nav">
                <div className="nav-brand">
                    <span className="nav-icon">🛡️</span>
                    <h2>ShopZone Admin</h2>
                </div>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </nav>

            <main className="dashboard-main">
                <header className="main-header">
                    <h1>Pending Seller Approvals</h1>
                    <p>Review and verify new seller accounts before they can list products.</p>
                </header>

                {error && (
                    <div className="dashboard-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Loading pending sellers...</p>
                    </div>
                ) : pendingSellers.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🎉</span>
                        <h3>All caught up!</h3>
                        <p>There are no pending seller applications right now.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="sellers-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Company Name</th>
                                    <th>Contact Email</th>
                                    <th>GST Number</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingSellers.map(seller => (
                                    <tr key={seller.seller_id}>
                                        <td>#{seller.seller_id}</td>
                                        <td className="company-col">
                                            <span className="company-icon">🏢</span>
                                            {seller.company_name}
                                        </td>
                                        <td>{seller.contact_email}</td>
                                        <td><span className="badge">{seller.gst_number}</span></td>
                                        <td>
                                            <button
                                                className="verify-btn"
                                                onClick={() => verifySeller(seller.seller_id)}
                                                disabled={actionLoading === seller.seller_id}
                                            >
                                                {actionLoading === seller.seller_id ? 'Verifying...' : '✅ Verify'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
