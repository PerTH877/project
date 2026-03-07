import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Edit2, Trash2, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import { addressesService } from '@/services/cart' // I need to move addresses from cart to a separate service file, oops. Let me fix that.
// Wait, I put addresses inside src/services/cart.ts. Let me just use that for now.
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'

const addressSchema = z.object({
    address_type: z.string().min(1, 'Label is required'),
    street_address: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    zip_code: z.string().min(1, 'Zip code is required'),
    country: z.string().min(1, 'Country is required'),
    is_default: z.boolean(),
})

type AddressForm = z.infer<typeof addressSchema>

export default function AddressesPage() {
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    const { data: addresses = [], isLoading } = useQuery({
        queryKey: ['addresses'],
        queryFn: addressesService.list,
    })

    const { register, handleSubmit, reset, setValue } = useForm<AddressForm>({
        resolver: zodResolver(addressSchema),
        defaultValues: { country: 'Bangladesh', is_default: false },
    })

    const openNew = () => {
        reset({ address_type: 'Home', country: 'Bangladesh', is_default: false, street_address: '', city: '', zip_code: '' })
        setEditingId(null)
        setIsModalOpen(true)
    }

    const openEdit = (addr: any) => {
        reset({
            address_type: addr.address_type,
            street_address: addr.street_address,
            city: addr.city,
            zip_code: addr.zip_code,
            country: addr.country,
            is_default: addr.is_default,
        })
        setEditingId(addr.address_id)
        setIsModalOpen(true)
    }

    const { mutate: saveAddress, isPending: isSaving } = useMutation({
        mutationFn: (data: AddressForm) => {
            if (editingId) return addressesService.update(editingId, data)
            return addressesService.create(data as any)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] })
            setIsModalOpen(false)
            toast.success(editingId ? 'Address updated' : 'Address added')
        },
        onError: () => toast.error('Failed to save address'),
    })

    const { mutate: deleteAddress } = useMutation({
        mutationFn: addressesService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addresses'] })
            toast.success('Address deleted')
        },
        onError: () => toast.error('Failed to delete address'),
    })

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-foreground">Saved Addresses</h1>
                <button
                    onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add New
                </button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-44 rounded-2xl w-full" />
                    <Skeleton className="h-44 rounded-2xl w-full" />
                </div>
            ) : addresses.length === 0 ? (
                <EmptyState
                    icon={<MapPin className="w-8 h-8" />}
                    title="No addresses saved"
                    description="Add an address to checkout faster next time."
                    action={
                        <button onClick={openNew} className="text-sm font-medium text-primary hover:underline">
                            Add your first address
                        </button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                        <div key={addr.address_id} className="relative bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            {addr.is_default && (
                                <span className="absolute top-6 right-6 text-[10px] font-bold uppercase tracking-wider bg-secondary text-foreground px-2 py-0.5 rounded-sm">
                                    Default
                                </span>
                            )}
                            <div className="flex items-center gap-2 mb-3">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <h3 className="font-semibold text-foreground">{addr.address_type}</h3>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1 mb-6">
                                <p>{addr.street_address}</p>
                                <p>{addr.city}, {addr.zip_code}</p>
                                <p>{addr.country}</p>
                            </div>
                            <div className="flex items-center gap-2 pt-4 border-t border-border">
                                <button
                                    onClick={() => openEdit(addr)}
                                    className="flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure you want to delete this address?')) {
                                            deleteAddress(addr.address_id)
                                        }
                                    }}
                                    className="flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-destructive border border-destructive/20 hover:bg-destructive/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-xl font-bold text-foreground">{editingId ? 'Edit Address' : 'Add Address'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit((d) => saveAddress(d))} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1.5">Address Label (Home, Work)</label>
                                    <input type="text" {...register('address_type')} className="w-full px-3 py-2 rounded-lg border bg-background" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1.5">Street Address</label>
                                    <input type="text" {...register('street_address')} className="w-full px-3 py-2 rounded-lg border bg-background" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium mb-1.5">City</label>
                                    <input type="text" {...register('city')} className="w-full px-3 py-2 rounded-lg border bg-background" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium mb-1.5">ZIP Code</label>
                                    <input type="text" {...register('zip_code')} className="w-full px-3 py-2 rounded-lg border bg-background" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1.5">Country</label>
                                    <input type="text" {...register('country')} className="w-full px-3 py-2 rounded-lg border bg-background" />
                                </div>
                                <div className="col-span-2 py-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('is_default')} className="w-4 h-4 rounded border-border accent-primary" />
                                        <span className="text-sm font-medium">Set as default address</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-xl border hover:bg-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90">
                                    {isSaving ? 'Saving...' : 'Save Address'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
