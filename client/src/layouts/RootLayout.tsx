import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { Toaster } from 'sonner'

export default function RootLayout() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="page-enter">
                <Outlet />
            </main>
            <footer className="border-t border-border mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="font-bold text-foreground mb-3">Nexus Market</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                A premium multi-brand marketplace connecting buyers and sellers globally.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-3">Shop</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="/" className="hover:text-foreground transition-colors">Browse Products</a></li>
                                <li><a href="/login" className="hover:text-foreground transition-colors">Sign In</a></li>
                                <li><a href="/register" className="hover:text-foreground transition-colors">Create Account</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-3">Sell</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><a href="/seller/register" className="hover:text-foreground transition-colors">Become a Seller</a></li>
                                <li><a href="/seller/login" className="hover:text-foreground transition-colors">Seller Login</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-border mt-8 pt-8 text-center text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Nexus Market. All rights reserved.
                    </div>
                </div>
            </footer>
            <Toaster position="top-right" richColors closeButton />
        </div>
    )
}
