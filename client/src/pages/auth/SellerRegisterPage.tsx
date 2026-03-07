import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { authService } from '@/services/auth'
import { toast } from 'sonner'
import { Store } from 'lucide-react'
import { cn } from '@/lib/utils'

const registerSchema = z.object({
    company_name: z.string().min(2, 'Company name is too short'),
    contact_email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    gst_number: z.string().optional(),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function SellerRegisterPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

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
            await authService.sellerRegister({
                ...data,
                gst_number: data.gst_number || undefined,
            })
            toast.success('Registration successful. You must wait for admin verification before logging in.', {
                duration: 8000
            })
            navigate('/seller/login')
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-secondary/30 py-12">
            <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-sm p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                        <Store className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Become a Seller</h1>
                    <p className="text-sm text-muted-foreground mt-1">Join the marketplace and reach millions</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1.5">Company or Store Name *</label>
                            <input
                                type="text"
                                {...register('company_name')}
                                className={cn('w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2', errors.company_name ? 'border-destructive' : 'border-border')}
                                placeholder="Acme Corp"
                            />
                            {errors.company_name && <p className="text-xs text-destructive mt-1.5">{errors.company_name.message}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-1.5">Business Email *</label>
                            <input
                                type="email"
                                {...register('contact_email')}
                                className={cn('w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2', errors.contact_email ? 'border-destructive' : 'border-border')}
                                placeholder="store@example.com"
                            />
                            {errors.contact_email && <p className="text-xs text-destructive mt-1.5">{errors.contact_email.message}</p>}
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
                            <input
                                type="password"
                                {...register('password')}
                                className={cn('w-full px-4 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2', errors.password ? 'border-destructive' : 'border-border')}
                                placeholder="••••••••"
                            />
                            {errors.password && <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>}
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-foreground mb-1.5">GST Number (Optional)</label>
                            <input
                                type="text"
                                {...register('gst_number')}
                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:border-primary"
                                placeholder="ABCDE1234F"
                            />
                        </div>
                    </div>

                    <div className="bg-secondary/50 p-4 rounded-xl text-sm text-muted-foreground mt-4 border border-border">
                        <strong>Note:</strong> Following registration, your account will be manually reviewed by our moderation team. You cannot log in or start selling until verification is complete.
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-8 h-12 flex items-center justify-center bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : 'Submit Application'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Already registered?{' '}
                    <Link to="/seller/login" className="font-medium text-primary hover:underline">
                        Check status
                    </Link>
                </div>
            </div>
        </div>
    )
}
