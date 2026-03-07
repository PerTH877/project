import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { authService } from '@/services/auth'
import { warehousesService } from '@/services/products'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const registerSchema = z.object({
    full_name: z.string().min(2, 'Name is too short'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone_number: z.string().optional(),
    nearby_warehouse_id: z.coerce.number().optional().nullable(),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const { data: warehouses = [] } = useQuery({
        queryKey: ['warehouses'],
        queryFn: warehousesService.list,
    })

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    })

    const onSubmit = async (data: RegisterForm) => {
        setLoading(true)
        try {
            const payload = {
                ...data,
                nearby_warehouse_id: data.nearby_warehouse_id || undefined,
            }
            await authService.userRegister(payload)
            toast.success('Account created successfully! Please log in.')
            navigate('/login')
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-secondary/30 py-12">
            <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-sm p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Create an Account</h1>
                    <p className="text-sm text-muted-foreground mt-1">Join Nexus Market and start shopping</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                            <input
                                type="text"
                                {...register('full_name')}
                                className={cn('w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2', errors.full_name ? 'border-destructive' : 'border-border')}
                                placeholder="John Doe"
                            />
                            {errors.full_name && <p className="text-xs text-destructive mt-1.5">{errors.full_name.message}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1.5">Email *</label>
                            <input
                                type="email"
                                {...register('email')}
                                className={cn('w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2', errors.email ? 'border-destructive' : 'border-border')}
                                placeholder="john@example.com"
                            />
                            {errors.email && <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
                            <input
                                type="password"
                                {...register('password')}
                                className={cn('w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2', errors.password ? 'border-destructive' : 'border-border')}
                                placeholder="••••••••"
                            />
                            {errors.password && <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
                            <input
                                type="tel"
                                {...register('phone_number')}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:border-primary"
                                placeholder="+1 234 567 890"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Preferred Warehouse</label>
                            <select
                                {...register('nearby_warehouse_id')}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:border-primary appearance-none"
                            >
                                <option value="">None selected</option>
                                {warehouses.map((w) => (
                                    <option key={w.warehouse_id} value={w.warehouse_id}>
                                        {w.name} {w.city ? `(${w.city})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-8 h-12 flex items-center justify-center bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-primary hover:underline">
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    )
}
