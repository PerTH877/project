import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, ChevronDown, ArrowRight } from 'lucide-react'
import { productsService, categoriesService } from '@/services/products'
import { ProductCardSkeleton } from '@/components/Skeleton'
import { ErrorState, EmptyState } from '@/components/EmptyState'
import { formatCurrency, cn } from '@/lib/utils'
import type { Product } from '@/types'

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'name-asc', label: 'Name: A–Z' },
]

function ProductCard({ product }: { product: Product }) {
    const initials = product.title.slice(0, 2).toUpperCase()
    const hue = (product.product_id * 47) % 360

    return (
        <Link
            to={`/products/${product.product_id}`}
            className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all duration-200"
        >
            {/* Product image placeholder */}
            <div
                className="h-52 flex items-center justify-center text-3xl font-bold text-white/80 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, hsl(${hue}, 60%, 50%), hsl(${(hue + 40) % 360}, 70%, 40%))` }}
            >
                <span>{initials}</span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="p-4">
                {product.brand && (
                    <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{product.brand}</p>
                )}
                <h3 className="text-sm font-semibold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {product.title}
                </h3>
                <div className="flex items-center justify-between mt-3">
                    <span className="text-base font-bold text-foreground">{formatCurrency(Number(product.base_price))}</span>
                    <span className="text-xs text-primary font-medium group-hover:gap-2 flex items-center gap-1 transition-all">
                        View
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                </div>
            </div>
        </Link>
    )
}

export default function HomePage() {
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
    const [sortBy, setSortBy] = useState('newest')
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 999999])
    const [showFilters, setShowFilters] = useState(false)

    const { data: products = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['products'],
        queryFn: productsService.list,
    })

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: categoriesService.list,
    })

    const filtered = useMemo(() => {
        let result = [...products]

        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(
                (p) => p.title.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
            )
        }

        if (selectedCategory !== null) {
            result = result.filter((p) => p.category_id === selectedCategory)
        }

        result = result.filter(
            (p) => Number(p.base_price) >= priceRange[0] && Number(p.base_price) <= priceRange[1]
        )

        switch (sortBy) {
            case 'price-asc':
                result.sort((a, b) => Number(a.base_price) - Number(b.base_price))
                break
            case 'price-desc':
                result.sort((a, b) => Number(b.base_price) - Number(a.base_price))
                break
            case 'name-asc':
                result.sort((a, b) => a.title.localeCompare(b.title))
                break
            default:
                result.sort((a, b) => b.product_id - a.product_id)
        }

        return result
    }, [products, search, selectedCategory, sortBy, priceRange])

    return (
        <div>
            {/* Hero */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/30 border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Nexus Market — Premium Marketplace
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-6">
                            Discover products<br />
                            <span className="text-primary">worth buying.</span>
                        </h1>
                        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                            Shop thousands of curated products across all categories from verified sellers worldwide.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href="#products"
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
                            >
                                Browse Products
                                <ArrowRight className="w-4 h-4" />
                            </a>
                            <Link
                                to="/seller/register"
                                className="inline-flex items-center justify-center px-6 py-3 border border-border text-foreground font-medium rounded-xl hover:bg-secondary transition-colors"
                            >
                                Become a Seller
                            </Link>
                        </div>
                    </div>
                </div>
                {/* Decorative circles */}
                <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute -right-12 bottom-0 w-64 h-64 rounded-full bg-primary/8 blur-2xl" />
            </section>

            {/* Products Section */}
            <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search products or brands…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer font-medium"
                        >
                            {SORT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>

                    {/* Filters toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all',
                            showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'
                        )}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                    </button>
                </div>

                {/* Filter panel */}
                {showFilters && (
                    <div className="mb-8 p-4 rounded-xl border border-border bg-card animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Category */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className={cn(
                                            'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                                            selectedCategory === null ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                        )}
                                    >
                                        All
                                    </button>
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.category_id}
                                            onClick={() => setSelectedCategory(cat.category_id)}
                                            className={cn(
                                                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                                                selectedCategory === cat.category_id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                            )}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                                    Max Price: {formatCurrency(priceRange[1] === 999999 ? Infinity : priceRange[1])}
                                </label>
                                <input
                                    type="range"
                                    min={0}
                                    max={10000}
                                    step={100}
                                    value={priceRange[1] === 999999 ? 10000 : priceRange[1]}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        setPriceRange([priceRange[0], val === 10000 ? 999999 : val])
                                    }}
                                    className="w-full accent-primary"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Header row */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">
                            {selectedCategory !== null || search ? 'Results' : 'Latest Products'}
                        </h2>
                        {!isLoading && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                ) : isError ? (
                    <ErrorState
                        title="Failed to load products"
                        description="We couldn't fetch the product list. Please check your connection and try again."
                        onRetry={() => refetch()}
                    />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title="No products found"
                        description="Try adjusting your search or filters to find what you're looking for."
                        action={
                            <button
                                onClick={() => { setSearch(''); setSelectedCategory(null); setPriceRange([0, 999999]) }}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                            >
                                Clear filters
                            </button>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filtered.map((product) => (
                            <ProductCard key={product.product_id} product={product} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
