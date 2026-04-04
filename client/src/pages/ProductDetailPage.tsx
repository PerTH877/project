import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowRight, Heart, Image, ShieldCheck, Star, Terminal, Truck, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { ProductCard } from "@/components/ProductCard";
import { SmartImage } from "@/components/media/SmartImage";
import { RecentlyViewed } from "@/components/commerce/RecentlyViewed";
import { productsService } from "@/services/products";
import { cartService } from "@/services/cart";
import { wishlistsService } from "@/services/wishlists";
import { useAuthStore } from "@/store/authStore";
import { useHistoryStore } from "@/store/historyStore";
import { formatCurrencyBDT } from "@/lib/utils";

export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { token } = useAuthStore();
    const { pushProduct } = useHistoryStore();
    const [selectedImage, setSelectedImage] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

    // Review & Question State
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewFiles, setReviewFiles] = useState<File[]>([]);
    const [reviewPreviews, setReviewPreviews] = useState<string[]>([]);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [questionText, setQuestionText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const productQuery = useQuery({
        queryKey: ["product", id],
        queryFn: () => productsService.get(Number(id)),
        enabled: !!id,
    });

    // Push to browsing history when the product loads
    useEffect(() => {
        if (productQuery.data?.product?.product_id) {
            pushProduct(productQuery.data.product.product_id);
        }
    }, [productQuery.data?.product?.product_id, pushProduct]);

    // Fetch wishlists to determine if the current variant is already saved
    const wishlistsQuery = useQuery({
        queryKey: ["wishlists"],
        queryFn: wishlistsService.list,
        enabled: !!token,
    });

    const addToCartMutation = useMutation({
        mutationFn: (variantId: number) => cartService.addItem(variantId, quantity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cart"] });
            queryClient.invalidateQueries({ queryKey: ["cart-total"] });
            toast.success("Item added to cart.");
        },
        onError: () => toast.error("System rejected cart addition."),
    });

    // Wishlist heart-toggle: auto-use first wishlist, or create one if none exist
    const wishlistToggleMutation = useMutation({
        mutationFn: async (variantId: number) => {
            const wishlists = wishlistsQuery.data ?? [];
            let targetList = wishlists[0];

            if (!targetList) {
                // Auto-create a default wishlist
                targetList = await wishlistsService.create("My Wishlist");
            }

            const alreadySaved = targetList.items?.some(
                (item) => item.variant_id === variantId
            );

            if (alreadySaved) {
                return wishlistsService.removeItem(targetList.wishlist_id, variantId);
            } else {
                return wishlistsService.addItem(targetList.wishlist_id, variantId);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wishlists"] });
            toast.success("Wishlist updated.");
        },
        onError: () => toast.error("Could not update wishlist."),
    });

    const submitReviewMutation = useMutation({
        mutationFn: (payload: { rating: number; comment?: string; images?: File[] }) =>
            productsService.submitReview(Number(id), payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["product", id] });
            toast.success("Review submitted.");
            setReviewComment("");
            setReviewFiles([]);
            setReviewPreviews([]);
            setReviewRating(5);
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: () => toast.error("Failed to submit review."),
    });

    const askQuestionMutation = useMutation({
        mutationFn: (text: string) => productsService.askQuestion(Number(id), text),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["product", id] });
            toast.success("Question submitted.");
            setQuestionText("");
        },
        onError: () => toast.error("Failed to submit question."),
    });

    if (productQuery.isLoading) {
        return <main className="min-h-screen py-8 shell-width"><div className="skeleton h-[600px] w-full mt-10 rounded-2xl" /></main>;
    }

    if (productQuery.isError || !productQuery.data) {
        return <main className="flex items-center justify-center min-h-[50vh]"><p className="neon-text-magenta text-xl font-mono">Entity not found in current subnet.</p></main>;
    }

    const { product, media = [], specifications = [], variants = [], related_products = [], reviews = [], questions = [] } = productQuery.data;
    const primaryMedia = media.find((m) => m.is_primary)?.media_url || media[0]?.media_url;
    const allImages = Array.from(
        new Set([product.primary_image, primaryMedia, ...media.map((m) => m.media_url)].filter(Boolean))
    ) as string[];
    const mainImage = selectedImage || product.primary_image || primaryMedia || "/placeholder-product.jpg";

    const attributeGroups = variants.reduce<Record<string, string[]>>((acc, variant) => {
        Object.entries(variant.attributes || {}).forEach(([key, value]) => {
            if (!acc[key]) {
                acc[key] = [];
            }
            if (!acc[key].includes(value)) {
                acc[key].push(value);
            }
        });
        return acc;
    }, {});

    const selectedVariant =
        variants.find((variant) =>
            Object.entries(selectedVariants ?? {}).every(([key, value]) => (variant.attributes || {})[key] === value)
        ) ?? variants[0];

    const attributesRequired = Object.keys(attributeGroups).length;
    const selectedVariantReady = attributesRequired === 0 || Object.keys(selectedVariants ?? {}).length === attributesRequired;
    const displayPrice = product.base_price + Number(selectedVariant?.price_adjustment ?? 0);

    // Derive wishlist state for the current variant
    const allWishlistItems = (wishlistsQuery.data ?? []).flatMap((wl) => wl.items ?? []);
    const isInWishlist = selectedVariant
        ? allWishlistItems.some((item) => item.variant_id === selectedVariant.variant_id)
        : false;

    return (
        <>
        <main className="shell-width py-8 min-h-screen">
            <nav className="mb-6 flex items-center font-mono text-xs text-cyan-500/80 tracking-widest uppercase">
                <Link to="/" className="hover:text-cyan-400 hover:underline">Nexus</Link>
                <span className="mx-2 opacity-50">&gt;</span>
                <Link to={`/search?category=${product.category_id}`} className="hover:text-cyan-400 hover:underline">{product.category_name}</Link>
                <span className="mx-2 opacity-50">&gt;</span>
                <span className="text-white font-bold truncate max-w-[300px]">{product.title}</span>
            </nav>

            <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                <div className="w-full lg:w-5/12 self-start flex gap-4">
                    {allImages.length > 1 ? (
                        <div className="flex flex-col gap-3 w-16 shrink-0 no-scrollbar overflow-y-auto max-h-[540px]">
                            {allImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    className={`w-16 h-16 rounded-lg border-2 overflow-hidden flex items-center justify-center bg-black/50 transition-colors ${mainImage === img ? "border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]" : "border-white/10 hover:border-white/30"}`}
                                    onClick={() => setSelectedImage(img)}
                                    onMouseEnter={() => setSelectedImage(img)}
                                >
                                    <img src={img} alt={`Gallery ${idx + 1}`} className="max-w-full max-h-full object-contain filter drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]" />
                                </button>
                            ))}
                        </div>
                    ) : null}
                    <div className="flex-1 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(105,246,255,0.08),transparent_48%),linear-gradient(180deg,rgba(8,15,26,0.92),rgba(5,8,16,0.96))] p-5 sm:p-7 relative overflow-hidden group min-h-[24rem]">
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_25%,transparent_75%,rgba(255,255,255,0.02))]" />
                        <div className="absolute inset-5 rounded-[24px] border border-white/6 bg-black/10" />
                        <div className="relative z-10 flex h-full min-h-[20rem] items-center justify-center">
                            <SmartImage
                                src={mainImage}
                                alt={product.title}
                                className="w-full max-w-[34rem] [&>img]:object-contain"
                                aspectRatio="aspect-square"
                                priority
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-4/12 flex flex-col pt-2">
                    <h1 className="text-2xl md:text-3xl font-black display-font text-white leading-tight mb-2 tracking-wide">
                        {product.title}
                    </h1>
                    <Link to={`/search?q=${encodeURIComponent(product.seller_name)}`} className="text-sm font-mono text-cyan-400 hover:text-cyan-300 mb-4 inline-block">
                        Sold by {product.seller_name}
                    </Link>

                    <div className="flex items-center gap-2 mb-4 cyber-section-divider pb-4">
                        <div className="flex text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(product.avg_rating) || 0) ? "fill-current" : "fill-white/10 text-white/10"}`} />
                            ))}
                        </div>
                        <span className="text-sm font-bold text-cyan-400">{(Number(product.avg_rating) || 0).toFixed(1)}</span>
                        <span className="text-sm text-slate-400 ml-1">({product.review_count || 0} reviews)</span>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-mono text-red-400">-15%</span>
                            <span className="text-sm font-bold text-slate-400 line-through">{formatCurrencyBDT(product.base_price || Number(product.lowest_price) * 1.15)}</span>
                        </div>
                        <p className="text-4xl font-black text-white display-font tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                            {formatCurrencyBDT(displayPrice)}
                        </p>
                    </div>

                    {Object.keys(attributeGroups).length > 0 ? (
                        <div className="space-y-6 mb-8 border-b border-white/10 pb-6">
                            {Object.entries(attributeGroups).map(([name, values]) => (
                                <div key={name}>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2 font-mono flex items-center gap-2">
                                        <Activity className="w-3 h-3 text-cyan-500" />
                                        Configure {name}: <span className="text-white">{selectedVariants[name] || "Select"}</span>
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {values.map((value) => (
                                            <button
                                                key={value}
                                                onClick={() => setSelectedVariants((current) => ({ ...current, [name]: value }))}
                                                className={`px-4 py-2 text-sm font-bold rounded border transition-all ${selectedVariants[name] === value ? "bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.2)]" : "bg-black/50 border-white/20 text-slate-300 hover:border-slate-400"}`}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] font-mono text-neon-cyan">Overview</h3>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed max-w-prose">
                            {product.description}
                        </p>
                    </div>
                </div>

                <div className="w-full lg:w-3/12">
                    <div className="hud-panel p-6 border-cyan-500/40 shadow-[0_0_40px_rgba(0,255,255,0.08)] sticky top-24">
                        <div className="absolute top-0 right-0 p-2 opacity-20"><Terminal className="w-8 h-8 text-cyan-400" /></div>

                        <p className="text-3xl font-black text-white display-font mb-4">{formatCurrencyBDT(displayPrice)}</p>

                        <div className="flex flex-col gap-2 mb-6">
                            <p className="text-sm text-slate-300 leading-snug"><span className="text-cyan-400 font-bold">Fast delivery</span> remains subject to stock and checkout validation.</p>
                            <div className="flex items-center gap-2 text-emerald-400 mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-xs font-bold tracking-wide uppercase">
                                <Truck className="w-4 h-4" /> Ready for dispatch
                            </div>
                        </div>

                        <p className="text-lg font-bold text-emerald-400 display-font mb-4 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                            {product.total_stock > 0 ? "IN STOCK" : <span className="text-red-400">DEPOT EMPTY</span>}
                        </p>

                        <div className="flex items-center gap-2 mb-6">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">QTY:</label>
                            <select
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="bg-[#0a0f18] text-white border border-cyan-500/40 rounded px-3 py-1.5 outline-none focus:border-cyan-400 flex-1 hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                {Array.from({ length: Math.max(1, Math.min(10, product.total_stock || 1)) }).map((_, index) => (
                                    <option key={index + 1} value={index + 1}>{index + 1}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-3 mb-6">
                            <button
                                onClick={() => selectedVariant && addToCartMutation.mutate(selectedVariant.variant_id)}
                                disabled={product.total_stock === 0 || !token || !selectedVariant || !selectedVariantReady}
                                className="cyber-button-primary w-full shadow-[0_0_20px_rgba(0,255,255,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <span className="truncate">Add to cart</span> <ArrowRight className="w-4 h-4" />
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => navigate("/cart")} className="cyber-button-secondary flex-1">
                                    Review cart
                                </button>
                                {token && selectedVariant && (
                                    <button
                                        onClick={() => wishlistToggleMutation.mutate(selectedVariant.variant_id)}
                                        disabled={wishlistToggleMutation.isPending}
                                        title={isInWishlist ? "Remove from wishlist" : "Save to wishlist"}
                                        className={`flex items-center justify-center w-11 h-11 rounded-lg border transition-all shrink-0 ${isInWishlist
                                                ? "bg-rose-500/20 border-rose-400/50 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.25)]"
                                                : "bg-white/[0.04] border-white/15 text-slate-400 hover:border-rose-400/40 hover:text-rose-400"
                                            }`}
                                    >
                                        <Heart className={`w-5 h-5 transition-all ${isInWishlist ? "fill-current" : ""}`} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {!token ? <p className="text-xs text-magenta-400 font-mono mt-2 mb-4 text-center">Authentication required for purchase.</p> : null}
                        {token && !selectedVariantReady && Object.keys(attributeGroups).length > 0 ? (
                            <p className="text-xs text-amber-300 font-mono mt-2 mb-4 text-center">Select all variant attributes before adding this item.</p>
                        ) : null}

                        <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-slate-400 font-mono">
                            <div className="grid grid-cols-[80px_1fr] gap-2">
                                <span>Ships from</span>
                                <span className="text-slate-200 truncate">PARUVO Central Network</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-2">
                                <span>Sold by</span>
                                <Link to={`/search?q=${encodeURIComponent(product.seller_name)}`} className="text-cyan-400 hover:underline truncate">{product.seller_name}</Link>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-2">
                                <span>Returns</span>
                                <span className="text-slate-200 truncate flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" />Eligible for Return, Refund or Replacement within 30 days of receipt</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr] gap-2">
                                <span>Support</span>
                                <span className="text-slate-200 truncate">Marketplace support included</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,420px)] gap-12 mt-20 mb-20">
                <div className="space-y-16">
                    {specifications.length > 0 ? (
                        <div className="space-y-8">
                            <div className="flex flex-col gap-1">
                                <span className="section-kicker">TECHNICAL_SPECS</span>
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-5 h-5 text-emerald-400" />
                                    <h3 className="text-xl font-bold uppercase tracking-[0.2em] font-mono text-neon-emerald">Full Specifications</h3>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                {specifications.map((spec) => (
                                    <div key={spec.spec_id} className="group flex items-center h-12 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                                        <div className="flex items-center px-4 h-full bg-emerald-500/[0.06] border-r border-white/5 min-w-[140px] max-w-[160px] group-hover:bg-emerald-500/[0.1] transition-colors">
                                            <span className="text-emerald-400/90 font-mono text-xs uppercase tracking-wider font-bold truncate">
                                                {spec.spec_key}
                                            </span>
                                        </div>
                                        <div className="px-5 flex-1 truncate">
                                            <span className="text-slate-200 text-sm font-medium">{spec.spec_value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {/* Q&A Section */}
                    <div className="space-y-8 pt-8">
                        <div className="flex flex-col gap-1">
                            <span className="section-kicker">SECTOR_QUERIES</span>
                            <div className="flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-magenta-400" />
                                <h2 className="text-xl font-bold uppercase tracking-[0.2em] font-mono text-neon-magenta">Field Queries (Q&A)</h2>
                            </div>
                        </div>

                        {token && (
                            <div className="p-6 rounded-2xl border border-magenta-500/30 bg-magenta-500/5 space-y-4">
                                <h3 className="text-sm font-bold font-mono text-magenta-400 uppercase tracking-wider">Deploy New Query</h3>
                                <textarea
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                    placeholder="Inquire about technical specifications or unit availability..."
                                    className="w-full h-24 bg-black/40 border border-magenta-500/20 rounded-xl p-4 text-white text-sm focus:border-magenta-500/50 outline-none transition-colors"
                                />
                                <button
                                    onClick={() => questionText.trim() && askQuestionMutation.mutate(questionText)}
                                    disabled={askQuestionMutation.isPending || !questionText.trim()}
                                    className="cyber-button-secondary border-magenta-500/40 hover:border-magenta-500 text-magenta-400 px-6 py-2 text-xs font-bold font-mono uppercase tracking-widest disabled:opacity-50"
                                >
                                    {askQuestionMutation.isPending ? "TRANSMITTING..." : "ASK QUESTION"}
                                </button>
                            </div>
                        )}

                        <div className="space-y-6">
                            {questions.map((q: any, idx: number) => (
                                <div key={q.question_id || idx} className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-magenta-500/5 blur-[40px] -mr-8 -mt-8 rounded-full" />
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-magenta-500 to-pink-600 flex items-center justify-center text-white font-black text-xs shadow-[0_0_12px_rgba(244,63,94,0.4)]">
                                            Q
                                        </div>
                                        <p className="text-white font-mono text-[15px] leading-relaxed pt-1">
                                            {q.question_text}
                                        </p>
                                    </div>
                                    <div className="ml-12 space-y-4 border-l border-white/5 pl-6">
                                        {q.answers && q.answers.length > 0 ? (
                                            q.answers.map((ans: any, aIdx: number) => (
                                                <div key={ans.answer_id || aIdx} className="relative">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-md bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-[10px]">
                                                            A
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-slate-300 text-sm leading-relaxed">
                                                                {ans.answer_text}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-2">
                                                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                                                <span>VERIFIED_SELLER_RESPONSE</span>
                                                                <span className="opacity-30">•</span>
                                                                <span>{ans.created_at ? new Date(ans.created_at).toLocaleDateString() : "RECENT_ENTRY"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center gap-3 py-2 text-slate-500">
                                                <Activity className="w-4 h-4 animate-pulse" />
                                                <p className="text-sm font-mono italic">Awaiting response from seller...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {questions.length === 0 && (
                                <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] text-center border-dashed">
                                    <p className="text-sm text-slate-500 font-mono italic uppercase tracking-widest">No active queries in this sector.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <aside className="space-y-8">
                    <div className="flex flex-col gap-1 px-2">
                        <span className="section-kicker">FIELD_REPORTS</span>
                        <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-400" />
                            <h2 className="text-xl font-bold uppercase tracking-[0.2em] font-mono text-neon-amber">Customer Reviews</h2>
                        </div>
                    </div>

                    {token && (
                        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-5 mx-2">
                            <h3 className="text-sm font-bold font-mono text-amber-400 uppercase tracking-wider">Submit Field Report</h3>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-400 uppercase mr-2">Integrity level:</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setReviewRating(star)}
                                            className="transition-transform hover:scale-110 active:scale-95"
                                        >
                                            <Star
                                                className={`w-5 h-5 ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-white/10"
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="Document your experience with this unit..."
                                className="w-full h-24 bg-black/40 border border-amber-500/20 rounded-xl p-4 text-white text-sm focus:border-amber-500/50 outline-none transition-colors"
                            />

                            <div className="space-y-2">
                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Image className="w-3 h-3" /> Visual Evidence (up to 5 images)</span>
                                <label
                                    htmlFor="review-image-upload"
                                    className="flex items-center gap-3 w-full bg-black/40 border border-amber-500/20 rounded-lg px-4 py-2.5 text-xs text-slate-400 font-mono cursor-pointer hover:border-amber-500/50 transition-colors group"
                                >
                                    <Image className="w-4 h-4 text-amber-400/70 group-hover:text-amber-400 transition-colors shrink-0" />
                                    <span className="truncate">
                                        {reviewFiles.length > 0
                                            ? `${reviewFiles.length} file${reviewFiles.length > 1 ? "s" : ""} selected`
                                            : "Click to attach images…"}
                                    </span>
                                </label>
                                <input
                                    ref={fileInputRef}
                                    id="review-image-upload"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files ?? []).slice(0, 5);
                                        setReviewFiles(files);
                                        setReviewPreviews(files.map((f) => URL.createObjectURL(f)));
                                    }}
                                />
                                {reviewPreviews.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {reviewPreviews.map((src, i) => (
                                            <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-amber-500/30 group/thumb">
                                                <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = reviewFiles.filter((_, idx) => idx !== i);
                                                        const nextPrev = reviewPreviews.filter((_, idx) => idx !== i);
                                                        setReviewFiles(next);
                                                        setReviewPreviews(nextPrev);
                                                    }}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-4 h-4 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() =>
                                    submitReviewMutation.mutate({
                                        rating: reviewRating,
                                        comment: reviewComment,
                                        images: reviewFiles,
                                    })
                                }
                                disabled={submitReviewMutation.isPending || (reviewRating === 0 && !reviewComment.trim())}
                                className="cyber-button-secondary border-amber-500/40 hover:border-amber-500 text-amber-400 px-6 py-2 text-xs font-bold font-mono uppercase tracking-widest disabled:opacity-50"
                            >
                                {submitReviewMutation.isPending ? "TRANSMITTING..." : "SUBMIT REPORT"}
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {reviews.map((review: any, idx: number) => (
                            <div key={review.review_id || idx} className="p-6 rounded-2xl border border-white/10 bg-black/40 space-y-4 backdrop-blur-sm relative border-l-4 border-l-amber-500/30">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xs">
                                                {review.user?.full_name?.charAt(0) || "U"}
                                            </div>
                                            <p className="text-cyan-400 font-bold font-mono text-sm tracking-wide">{review.user?.full_name}</p>
                                        </div>
                                        <div className="flex text-amber-500 mt-3 gap-0.5">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-current" : "text-white/5 fill-white/5"}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-2 py-1 rounded select-none">
                                        {review.created_at ? new Date(review.created_at).toLocaleDateString() : "RECENT"}
                                    </span>
                                </div>
                                <p className="text-slate-300 text-[13px] leading-relaxed font-medium">"{review.comment}"</p>
                                {review.images && review.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {review.images.map((imgSrc: string, imgIdx: number) => (
                                            <button
                                                key={imgIdx}
                                                type="button"
                                                onClick={() => setLightboxSrc(imgSrc)}
                                                className="relative w-16 h-16 rounded-lg overflow-hidden border border-amber-500/20 hover:border-amber-400/60 transition-colors group/rv shrink-0"
                                                title="View full size"
                                            >
                                                <img
                                                    src={imgSrc}
                                                    alt={`Review image ${imgIdx + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/rv:opacity-100 transition-opacity">
                                                    <ZoomIn className="w-4 h-4 text-white" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {reviews.length === 0 && (
                            <p className="text-sm text-slate-500 font-mono italic p-6 rounded-2xl border border-white/5 bg-white/[0.01] text-center border-dashed uppercase tracking-widest leading-relaxed"> No field reports submitted for this unit. </p>
                        )}
                    </div>
                </aside>
            </div>

            <RecentlyViewed excludeId={product.product_id} />

            {related_products.length > 0 ? (
                <section className="mt-12">
                    <div className="mb-6">
                        <p className="hud-kicker">Related products</p>
                        <h2 className="display-font mt-2 text-2xl text-white">More from similar categories and sellers</h2>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {related_products.map((relatedProduct) => (
                            <ProductCard key={relatedProduct.product_id} product={relatedProduct} density="compact" />
                        ))}
                    </div>
                </section>
            ) : null}
        </main>

        {/* Lightbox overlay */}
        {lightboxSrc && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
                onClick={() => setLightboxSrc(null)}
            >
                <button
                    type="button"
                    onClick={() => setLightboxSrc(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
                    aria-label="Close image"
                >
                    <X className="w-5 h-5" />
                </button>
                <img
                    src={lightboxSrc!}
                    alt="Full size review image"
                    className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        )}
    </>
    );
}

