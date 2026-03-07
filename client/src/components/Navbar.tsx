import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { ShoppingCart, Heart, User, Menu, X, Store, Shield, LogOut, Package } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

export function Navbar() {
    const { token, role, logout } = useAuthStore()
    const navigate = useNavigate()
    const location = useLocation()
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/')
        setMobileOpen(false)
    }

    const navLinks = [
        { to: '/', label: 'Products' },
    ]

    const userLinks = token && role === 'user' ? [
        { to: '/cart', label: 'Cart', icon: ShoppingCart },
        { to: '/wishlists', label: 'Wishlists', icon: Heart },
        { to: '/account/addresses', label: 'Addresses', icon: User },
    ] : []

    const sellerLinks = token && role === 'seller' ? [
        { to: '/seller/dashboard', label: 'Dashboard', icon: Store },
        { to: '/seller/analytics', label: 'Analytics', icon: Package },
    ] : []

    const adminLinks = token && role === 'admin' ? [
        { to: '/admin/dashboard', label: 'Analytics', icon: Shield },
        { to: '/admin/sellers/moderation', label: 'Sellers', icon: Store },
    ] : []

    const allLinks = [...navLinks]

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <Package className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span>Nexus</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {allLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={cn(
                                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                    location.pathname === link.to
                                        ? 'bg-secondary text-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {[...userLinks, ...sellerLinks, ...adminLinks].map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                    location.pathname.startsWith(link.to)
                                        ? 'bg-secondary text-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                                )}
                            >
                                <link.icon className="w-3.5 h-3.5" />
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop Right */}
                    <div className="hidden md:flex items-center gap-2">
                        {!token ? (
                            <>
                                <Link
                                    to="/login"
                                    className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Log in
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Sign up
                                </Link>
                            </>
                        ) : (
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary/60"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Log out
                            </button>
                        )}
                    </div>

                    {/* Mobile toggle */}
                    <button
                        className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-border bg-background animate-fade-in">
                    <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
                        {allLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setMobileOpen(false)}
                                className="px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                        {[...userLinks, ...sellerLinks, ...adminLinks].map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                            >
                                <link.icon className="w-4 h-4" />
                                {link.label}
                            </Link>
                        ))}
                        <div className="border-t border-border mt-2 pt-2">
                            {!token ? (
                                <>
                                    <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
                                    <Link to="/register" onClick={() => setMobileOpen(false)} className="block mt-1 px-3 py-2.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">Sign up</Link>
                                </>
                            ) : (
                                <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                    <LogOut className="w-4 h-4" />
                                    Log out
                                </button>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}
