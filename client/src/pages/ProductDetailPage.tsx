import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ShoppingCart, Heart, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { productsService } from '@/services/products'
import { cartService } from '@/services/cart'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/Skeleton'
import { ErrorState } from '@/components/EmptyState'
import { formatCurrency, computeVariantPrice, cn } from '@/lib/utils'

export default function ProductDetailPage() {
    const { productId } = useParams<{ productId: string }>()
    const navigate = useNavigate()
    const { token, role } = useAuthStore()

    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
    const [quantity, setQuantity] = useState(1)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['product', productId],
        queryFn: () => productsService.get(Number(productId)),
        enabled: !!productId,
    })

    // Set initial variant when data loads
    useMemo(() => {
        if (data?.variants?.length && !selectedVariantId) {
            setSelectedVariantId(data.variants[0].variant_id)
        }
    }, [data, selectedVariantId])

    const selectedVariant = data?.variants.find((v) => v.variant_id === selectedVariantId)
    const displayPrice = selectedVariant
        ? computeVariantPrice(Number(data!.product.base_price), Number(selectedVariant.price_adjustment))
        : Number(data?.product?.base_price || 0)

    const { mutate: addToCart, isPending: isAdding } = useMutation({
        mutationFn: () => cartService.addItem(selectedVariantId!, quantity),
        onSuccess: () => {
            toast.success('Added to cart')
        },
        onError: () => {
            toast.error('Failed to add to cart')
        },
    })

    const handleAddToCart = () => {
        if (!token) {
            navigate('/login', { state: { from: `/products/${productId}` } })
            return
        }
        if (role !== 'user') {
            toast.error('Only customers can purchase items')
            return
        }
        addToCart()
    }

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <Skeleton className="h-[500px] w-full rounded-2xl" />
                    <div className="space-y-6">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-8 w-32" />
                        <div className="space-y-2 pt-6">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-4/6" />
                        </div>
                        <Skeleton className="h-24 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        )
    }

    if (isError || !data?.product) {
        return (
            <div className="py-20">
                <ErrorState
                    title="Product not found"
                    description="This product may have been removed or doesn't exist."
                    onRetry={() => refetch()}
                />
                <div className="flex justify-center mt-6">
                    <Link to="/" className="text-sm font-medium text-primary hover:underline">
                        ← Back to products
                    </Link>
                </div>
            </div>
        )
    }

    const { product, variants } = data
    const initials = product.title.slice(0, 2).toUpperCase()
    const hue = (product.product_id * 47) % 360

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to products
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                {/* Image / Gallery side */}
                <div className="sticky top-24">
                    <div
                        className="aspect-square rounded-3xl flex items-center justify-center text-6xl font-bold text-white/80 overflow-hidden relative shadow-sm border border-border"
                        style={{ background: `linear-gradient(135deg, hsl(${hue}, 60%, 50%), hsl(${(hue + 40) % 360}, 70%, 40%))` }}
                    >
                        <span>{initials}</span>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                </div>

                {/* Info side */}
                <div className="flex flex-col">
                    {product.brand && (
                        <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                            {product.brand}
                        </span>
                    )}
                    <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-2">
                        {product.title}
                    </h1>

                    <div className="text-3xl font-bold text-foreground mt-4 mb-6">
                        {formatCurrency(displayPrice)}
                        {selectedVariant && Number(selectedVariant.price_adjustment) > 0 && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                (includes {formatCurrency(Number(selectedVariant.price_adjustment))} variant adjustment)
                            </span>
                        )}
                    </div>

                    <p className="text-base text-muted-foreground leading-relaxed mb-8">
                        {product.description || 'No description available for this product.'}
                    </p>

                    <hr className="border-border mb-8" />

                    {/* Variants */}
                    {variants.length > 0 && (
                        <div className="mb-8">
                            <h3 className="text-sm font-semibold text-foreground mb-4">Select Variant</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {variants.map((v) => {
                                    const isSelected = selectedVariantId === v.variant_id
                                    return (
                                        <button
                                            key={v.variant_id}
                                            onClick={() => setSelectedVariantId(v.variant_id)}
                                            className={cn(
                                                'flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all',
                                                isSelected
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border bg-card hover:border-primary/40'
                                            )}
                                        >
                                            <span className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
                                                {v.sku}
                                            </span>
                                            {Object.entries(v.attributes || {}).map(([key, val]) => (
                                                <span key={key} className="text-xs text-muted-foreground mt-0.5 capitalize">
                                                    {key}: {val}
                                                </span>
                                            ))}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Quantity</h3>
                        <div className="flex items-center w-32 rounded-lg border border-border bg-card">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-l-lg transition-colors"
                                disabled={quantity <= 1}
                            >
                                -
                            </button>
                            <div className="flex-1 text-center text-sm font-medium">{quantity}</div>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-r-lg transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleAddToCart}
                            disabled={isAdding || !selectedVariantId}
                            className="flex-1 flex items-center justify-center gap-2 h-14 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        >
                            {isAdding ? (
                                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                                <>
                                    <ShoppingCart className="w-5 h-5" />
                                    Add to Cart
                                </>
                            )}
                        </button>
                        <button
                            className="flex items-center justify-center h-14 w-full sm:w-14 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors border border-border"
                            title="Add to wishlist"
                        >
                            <Heart className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-sm text-green-600 dark:text-green-500 font-medium bg-green-50 dark:bg-green-500/10 px-4 py-3 rounded-lg border border-green-200 dark:border-green-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        In stock and ready to ship
                    </div>
                </div>
            </div>
        </div>
    )
}
