import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

// Pages
import HomePage from '@/pages/HomePage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import AddressesPage from '@/pages/AddressesPage'
import WishlistsPage from '@/pages/WishlistsPage'

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import SellerLoginPage from '@/pages/auth/SellerLoginPage'
import SellerRegisterPage from '@/pages/auth/SellerRegisterPage'
import AdminLoginPage from '@/pages/auth/AdminLoginPage'

// Seller Pages
import SellerDashboardPage from '@/pages/SellerDashboardPage'
import SellerAnalyticsPage from '@/pages/SellerAnalyticsPage'

// Admin Pages
import AdminDashboardPage from '@/pages/AdminDashboardPage'
import AdminModerationPage from '@/pages/AdminModerationPage'

const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            { index: true, element: <HomePage /> },
            { path: 'products/:productId', element: <ProductDetailPage /> },

            // Auth routes (public)
            { path: 'login', element: <LoginPage /> },
            { path: 'register', element: <RegisterPage /> },
            { path: 'seller/login', element: <SellerLoginPage /> },
            { path: 'seller/register', element: <SellerRegisterPage /> },
            { path: 'admin/login', element: <AdminLoginPage /> },

            // User Protected Routes
            {
                path: '',
                element: <ProtectedRoute allowedRoles={['user']} />,
                children: [
                    { path: 'cart', element: <CartPage /> },
                    { path: 'checkout', element: <CheckoutPage /> },
                    { path: 'account/addresses', element: <AddressesPage /> },
                    { path: 'wishlists', element: <WishlistsPage /> },
                ]
            },

            // Seller Protected Routes
            {
                path: 'seller',
                element: <ProtectedRoute allowedRoles={['seller']} />,
                children: [
                    { path: '', element: <Navigate to="/seller/dashboard" replace /> },
                    { path: 'dashboard', element: <SellerDashboardPage /> },
                    { path: 'analytics', element: <SellerAnalyticsPage /> },
                ]
            },

            // Admin Protected Routes
            {
                path: 'admin',
                element: <ProtectedRoute allowedRoles={['admin']} />,
                children: [
                    { path: '', element: <Navigate to="/admin/dashboard" replace /> },
                    { path: 'dashboard', element: <AdminDashboardPage /> },
                    { path: 'sellers/moderation', element: <AdminModerationPage /> },
                ]
            }
        ]
    }
])

export function AppRouter() {
    return <RouterProvider router={router} />
}
