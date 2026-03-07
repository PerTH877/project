import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { Shield, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function AdminLoginPage() {
    const navigate = useNavigate()
    const login = useAuthStore((s) => s.login)
    const [loading, setLoading] = useState(false)

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
            const token = await authService.adminLogin(data.email, data.password)
            login(token)
            toast.success('Admin authentication successful')
            navigate('/admin/dashboard')
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Invalid credentials')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950" />

            <div className="relative w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
                <Link
                    to="/"
                    className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                <div className="text-center mb-8 mt-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 mb-6 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Admin Control Panel</h1>
                    <p className="text-sm text-slate-400 mt-2">Restricted access area</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 uppercase tracking-wider text-xs">Admin Email</label>
                        <input
                            type="email"
                            {...register('email')}
                            className={cn(
                                'w-full px-4 py-3 rounded-xl border bg-slate-950/50 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all',
                                errors.email ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'
                            )}
                            placeholder="admin@nexus.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 uppercase tracking-wider text-xs">Auth Keyword</label>
                        <input
                            type="password"
                            {...register('password')}
                            className={cn(
                                'w-full px-4 py-3 rounded-xl border bg-slate-950/50 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all',
                                errors.password ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'
                            )}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-8 h-12 flex items-center justify-center bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-400 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
                    >
                        {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Authorize'}
                    </button>
                </form>
            </div>
        </div>
    )
}
