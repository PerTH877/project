import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { Store, User, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const login = useAuthStore((s) => s.login)
    const [loading, setLoading] = useState(false)

    const from = location.state?.from || '/'

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginForm) => {
        setLoading(true)
        try {
            const token = await authService.userLogin(data.email, data.password)
            login(token)
            toast.success('Welcome back!')
            navigate(from, { replace: true })
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Invalid credentials')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-secondary/30">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                        <User className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
                    <p className="text-sm text-muted-foreground mt-1">Sign in to your customer account</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            {...register('email')}
                            className={cn(
                                'w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all',
                                errors.email ? 'border-destructive focus:ring-destructive/30' : 'border-border focus:border-primary focus:ring-primary/30'
                            )}
                            placeholder="you@example.com"
                        />
                        {errors.email && <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            {...register('password')}
                            className={cn(
                                'w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all',
                                errors.password ? 'border-destructive focus:ring-destructive/30' : 'border-border focus:border-primary focus:ring-primary/30'
                            )}
                            placeholder="••••••••"
                        />
                        {errors.password && <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 h-12 flex items-center justify-center bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : 'Log in'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-primary hover:underline">
                        Sign up
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                    <p className="text-xs text-center text-muted-foreground mb-4 uppercase tracking-wider font-medium">Other Portals</p>
                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            to="/seller/login"
                            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
                        >
                            <Store className="w-4 h-4" />
                            Seller Area
                        </Link>
                        <Link
                            to="/admin/login"
                            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
                        >
                            <Shield className="w-4 h-4" />
                            Admin Area
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
