import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { Store, User, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function SellerLoginPage() {
    const navigate = useNavigate()
    const login = useAuthStore((s) => s.login)
    const [loading, setLoading] = useState(false)
    const [unverifiedError, setUnverifiedError] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginForm) => {
        setLoading(true)
        setUnverifiedError(false)
        try {
            const token = await authService.sellerLogin(data.email, data.password)
            login(token)
            toast.success('Seller authentication successful')
            navigate('/seller/dashboard')
        } catch (err: any) {
            if (err.response?.status === 403) {
                setUnverifiedError(true)
            } else {
                toast.error(err.response?.data?.error || 'Invalid credentials')
            }
        } finally {
            setLoading(false)
        }
    }

    if (unverifiedError) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-secondary/30">
                <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mb-6">
                        <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">Verification Pending</h2>
                    <p className="text-muted-foreground leading-relaxed mb-8">
                        Your seller account has been registered but is currently waiting for administrator approval. We will notify you once your store is activated.
                    </p>
                    <button
                        onClick={() => setUnverifiedError(false)}
                        className="w-full flex items-center justify-center py-3 px-4 border border-border rounded-xl font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                        ← Back to login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-secondary/30">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                        <Store className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Seller Portal</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your store and products</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                        <input
                            type="email"
                            {...register('email')}
                            className={cn(
                                'w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 transition-all',
                                errors.email ? 'border-destructive focus:ring-destructive/30' : 'border-border focus:border-primary focus:ring-primary/30'
                            )}
                            placeholder="store@example.com"
                        />
                        {errors.email && <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                        <input
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
                        {loading ? <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : 'Log in as Seller'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Want to open a store?{' '}
                    <Link to="/seller/register" className="font-medium text-primary hover:underline">
                        Apply now
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                    <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
                    >
                        <User className="w-4 h-4" />
                        Switch to Customer Portal
                    </Link>
                </div>
            </div>
        </div>
    )
}
