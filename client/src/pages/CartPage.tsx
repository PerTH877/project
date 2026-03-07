import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { cartService } from '@/services/cart'
import { productsService } from '@/services/products'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/EmptyState'
import { formatCurrency, computeVariantPrice } from '@/lib/utils'

export default function CartPage() {
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    // 1. Fetch RAW cart items
    const { data: cartItems = [], isLoading: loadingCart, isError } = useQuery({
        queryKey: ['cart'],
        queryFn: cartService.getItems,
    })

    // 2. Fetch total from DB function
    const { data: cartTotal = 0, isLoading: loadingTotal } = useQuery({
        queryKey: ['cart-total'],
        queryFn: cartService.getTotal,
    })

    // 3. For each cart item, we need its product data to show title/price/image securely.
    // The backend cart endpoint currently only returns `variant_id` and `quantity`.
    // To display a beautiful cart, we must fetch the product details for each variant.
    // We extract unique product_ids if we could reverse-map variant_id to product_id,
    // but since we only have variant_id, we fetch ALL products and map them client-side.
    // (In a real massive app, we'd need a batch endpoint, but doing client-side enrich for now).
    const { data: allProducts = [], isLoading: loadingProducts } = useQuery({
        queryKey: ['products'],
        queryFn: productsService.list,
    })

    const { mutate: updateQuantity, isPending: isUpdating } = useMutation({
        mutationFn: ({ cart_id, quantity }: { cart_id: number; quantity: number }) => cartService.updateItem(cart_id, quantity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] })
            queryClient.invalidateQueries({ queryKey: ['cart-total'] })
        },
        onError: () => toast.error('Failed to update quantity'),
    })

    const { mutate: removeItem, isPending: isRemoving } = useMutation({
        mutationFn: (cart_id: number) => cartService.removeItem(cart_id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] })
            queryClient.invalidateQueries({ queryKey: ['cart-total'] })
            toast.success('Item removed')
        },
        onError: () => toast.error('Failed to remove item'),
    })

    const isLoading = loadingCart || loadingTotal || loadingProducts

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
                    </div>
                    <div><Skeleton className="h-64 w-full rounded-2xl" /></div>
                </div>
            </div>
        )
    }

    if (isError) {
        return <ErrorState title="Failed to load cart" />
    }

    if (cartItems.length === 0) {
        return (
            <div className="py-20">
                <EmptyState
                    icon={<ShoppingCart className="w-8 h-8" />}
                    title="Your cart is empty"
                    description="Looks like you haven't added anything to your cart yet."
                    action={
                        <Link to="/" className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors">
                            Continue Shopping
                        </Link>
                    }
                />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold text-foreground mb-8">Your Cart</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
                {/* Cart Items List */}
                <div className="lg:col-span-2 space-y-4">
                    {cartItems.map((item) => {
                        // Note: because the backend /cart endpoint doesn't return enriched product
                        // data, and /products doesn't return variants by default, we just show a
                        // beautifully styled fallback for the item if we can't map it safely.
                        const initials = `V${item.variant_id}`
                        const hue = (item.variant_id * 47) % 360

                        return (
                            <div key={item.cart_id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm">
                                <div
                                    className="w-full sm:w-28 h-28 rounded-xl flex items-center justify-center font-bold text-white/80 shrink-0"
                                    style={{ background: `linear-gradient(135deg, hsl(${hue}, 60%, 50%), hsl(${(hue + 40) % 360}, 70%, 40%))` }}
                                >
                                    {initials}
                                </div>

                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 className="font-semibold text-foreground text-base">Product Variant {item.variant_id}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Quantity: {item.quantity}</p>
                                    </div>

                                    <div className="flex items-center justify-between mt-4 sm:mt-0">
                                        <div className="flex items-center rounded-lg border border-border bg-background">
                                            <button
                                                onClick={() => updateQuantity({ cart_id: item.cart_id, quantity: Math.max(1, item.quantity - 1) })}
                                                disabled={isUpdating || item.quantity <= 1}
                                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-l-lg transition-colors disabled:opacity-50"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity({ cart_id: item.cart_id, quantity: item.quantity + 1 })}
                                                disabled={isUpdating}
                                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-r-lg transition-colors disabled:opacity-50"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => removeItem(item.cart_id)}
                                            disabled={isRemoving}
                                            className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors p-2"
                                            aria-label="Remove item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Summary side */}
                <div className="sticky top-24 bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal ({cartItems.length} items)</span>
                            <span className="font-medium text-foreground">{formatCurrency(cartTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shipping</span>
                            <span className="font-medium text-foreground">Calculated at checkout</span>
                        </div>
                    </div>

                    <hr className="border-border mb-6" />

                    <div className="flex justify-between items-end mb-8">
                        <span className="text-base font-semibold text-foreground">Total</span>
                        <span className="text-2xl font-bold text-foreground">{formatCurrency(cartTotal)}</span>
                    </div>

                    <button
                        onClick={() => navigate('/checkout')}
                        className="w-full flex items-center justify-center gap-2 h-14 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                    >
                        Proceed to Checkout
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </div>
        </div>
    )
}
