import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cartService } from '@/services/cart'
import { addressesService } from '@/services/addresses' // Assuming we make this wrapper
import { toast } from 'sonner'
import { CheckCircle2, MapPin, Truck, ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/Skeleton'
import { formatCurrency, cn } from '@/lib/utils'

export default function CheckoutPage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
    const [successOrderId, setSuccessOrderId] = useState<number | null>(null)

    const { data: addresses = [], isLoading: loadingAddresses } = useQuery({
        queryKey: ['addresses'],
        queryFn: addressesService.list,
    })

    // Set default address auto-select
    if (!loadingAddresses && addresses.length > 0 && selectedAddressId === null) {
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0]
        setSelectedAddressId(defaultAddr.address_id)
    }

    const { data: cartTotal = 0 } = useQuery({
        queryKey: ['cart-total'],
        queryFn: cartService.getTotal,
    })

    const { mutate: checkout, isPending: isCheckingOut } = useMutation({
        mutationFn: () => cartService.checkout(selectedAddressId!),
        onSuccess: (data) => {
            setSuccessOrderId(data.order_id)
            queryClient.invalidateQueries({ queryKey: ['cart'] })
            queryClient.invalidateQueries({ queryKey: ['cart-total'] })
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Checkout failed')
        },
    })

    const handlePlaceOrder = () => {
        if (!selectedAddressId) {
            toast.error('Please select a shipping address')
            return
        }
        checkout()
    }

    if (successOrderId) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-10 text-center shadow-xl">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-4">Order Placed!</h1>
                    <p className="text-muted-foreground mb-8 text-lg">
                        Thank you for your purchase. Your order #{successOrderId} is being processed.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all"
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Link
                to="/cart"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to cart
            </Link>

            <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Shipping Address */}
                    <section className="bg-card rounded-2xl border border-border p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                            <h2 className="text-xl font-bold text-foreground">Shipping Address</h2>
                        </div>

                        {loadingAddresses ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Skeleton className="h-32 rounded-xl w-full" />
                                <Skeleton className="h-32 rounded-xl w-full" />
                            </div>
                        ) : addresses.length === 0 ? (
                            <div className="text-center py-6 bg-secondary/30 rounded-xl border border-dashed border-border">
                                <p className="text-muted-foreground mb-4">You have no saved addresses.</p>
                                <Link to="/account/addresses" className="text-sm font-medium text-primary hover:underline">
                                    + Add new address
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {addresses.map((addr) => {
                                    const isSelected = selectedAddressId === addr.address_id
                                    return (
                                        <button
                                            key={addr.address_id}
                                            onClick={() => setSelectedAddressId(addr.address_id)}
                                            className={cn(
                                                "relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all",
                                                isSelected ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
                                            )}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-4 right-4 text-primary">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mb-2">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-semibold text-foreground">{addr.address_type}</span>
                                                {addr.is_default && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-secondary text-foreground px-2 py-0.5 rounded-sm">Default</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-foreground line-clamp-1">{addr.street_address}</p>
                                            <p className="text-sm text-muted-foreground">{addr.city}, {addr.zip_code}</p>
                                            <p className="text-sm text-muted-foreground">{addr.country}</p>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </section>

                    {/* Payment Method Stub */}
                    <section className="bg-card rounded-2xl border border-border p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center font-bold">2</div>
                            <h2 className="text-xl font-bold text-foreground text-muted-foreground">Payment Method</h2>
                        </div>
                        <div className="bg-secondary/30 rounded-xl p-4 border border-dashed border-border text-center">
                            <p className="text-sm text-muted-foreground">Payment processing will be handled securely at the final step.</p>
                        </div>
                    </section>
                </div>

                {/* Order Summary */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm sticky top-24">
                    <h2 className="text-lg font-bold text-foreground mb-6">Order Summary</h2>

                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium text-foreground">{formatCurrency(cartTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Shipping</span>
                            <span className="font-medium text-foreground">Free</span>
                        </div>

                        {/* Fake Discount Input - Isolated unsupported feature */}
                        <div className="pt-4 border-t border-border">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block uppercase tracking-wider">Gift Card or Discount Code</label>
                            <div className="flex gap-2">
                                <input type="text" disabled placeholder="Coming soon" className="flex-1 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-sm cursor-not-allowed" />
                                <button disabled className="px-4 py-2 bg-secondary text-muted-foreground rounded-lg text-sm font-medium cursor-not-allowed">Apply</button>
                            </div>
                        </div>
                    </div>

                    <hr className="border-border mb-6" />

                    <div className="flex justify-between items-end mb-8">
                        <span className="text-base font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-bold text-foreground">{formatCurrency(cartTotal)}</span>
                    </div>

                    <button
                        onClick={handlePlaceOrder}
                        disabled={isCheckingOut || !selectedAddressId || cartTotal === 0}
                        className="w-full flex items-center justify-center gap-2 h-14 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCheckingOut ? <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : 'Place Order'}
                    </button>
                </div>
            </div>
        </div>
    )
}
