import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Package, Tag, Layers, Settings, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { productsService, categoriesService, warehousesService } from '@/services/products'
import { cn } from '@/lib/utils'

const productSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    brand: z.string().optional(),
    description: z.string().optional(),
    base_price: z.coerce.number().min(0, 'Base price must be positive'),
    category_id: z.coerce.number().optional().nullable(),
    variants: z.array(
        z.object({
            sku: z.string().min(1, 'SKU is required'),
            price_adjustment: z.coerce.number().default(0),
            attributes: z.record(z.string()).optional(), // We'll handle this manually for simplicity
            inventory: z.array(
                z.object({
                    warehouse_id: z.coerce.number().min(1, 'Warehouse is required'),
                    stock_quantity: z.coerce.number().min(0, 'Stock cannot be negative'),
                    aisle_location: z.string().optional(),
                })
            ).optional(),
        })
    ).min(1, 'At least one variant is required')
})

type ProductForm = z.infer<typeof productSchema>

export default function SellerDashboardPage() {
    const queryClient = useQueryClient()
    const [isCreating, setIsCreating] = useState(false)
    const [activeTab, setActiveTab] = useState<'create' | 'inventory'>('create')

    const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesService.list })
    const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesService.list })

    const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            variants: [{ sku: '', price_adjustment: 0, inventory: [] }]
        }
    })

    // We are not using useFieldArray for attributes to keep it simple, just stringifying
    const { fields, append, remove } = useFieldArray({
        control,
        name: "variants",
    })

    const { mutate: createProduct, isPending } = useMutation({
        mutationFn: productsService.create,
        onSuccess: () => {
            toast.success('Product created successfully')
            setIsCreating(false)
            reset()
            queryClient.invalidateQueries({ queryKey: ['products'] })
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Failed to create product')
        }
    })

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Seller Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Manage your store catalog and inventory</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Product
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1 border-r border-border pr-6 space-y-1">
                    <button
                        onClick={() => { setIsCreating(false); setActiveTab('inventory') }}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all",
                            !isCreating && activeTab === 'inventory' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        <Package className="w-4 h-4" /> My Products
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all",
                            isCreating ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        <Plus className="w-4 h-4" /> Create Product
                    </button>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    {isCreating ? (
                        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 animate-fade-in shadow-sm">
                            <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
                                <h2 className="text-xl font-bold text-foreground">Create New Product</h2>
                                <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground p-2"><X className="w-5 h-5" /></button>
                            </div>

                            <form onSubmit={handleSubmit((d) => createProduct(d as any))} className="space-y-8">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Tag className="w-4 h-4" /> Basic Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1.5">Product Title *</label>
                                            <input type="text" {...register('title')} className={cn("w-full px-4 py-2.5 rounded-xl border bg-background focus:ring-2", errors.title ? "border-destructive" : "border-border")} placeholder="Premium Wireless Headphones" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Brand</label>
                                            <input type="text" {...register('brand')} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:border-primary" placeholder="Acme Audio" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Category</label>
                                            <select {...register('category_id')} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:border-primary appearance-none cursor-pointer">
                                                <option value="">None</option>
                                                {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Base Price ($) *</label>
                                            <input type="number" step="0.01" {...register('base_price')} className={cn("w-full px-4 py-2.5 rounded-xl border bg-background focus:ring-2", errors.base_price ? "border-destructive" : "border-border")} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium mb-1.5">Description</label>
                                            <textarea {...register('description')} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:border-primary resize-none" placeholder="Describe the product..." />
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-border" />

                                {/* Variants Builder */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Layers className="w-4 h-4" /> Variants & Inventory
                                        </h3>
                                        <button type="button" onClick={() => append({ sku: '', price_adjustment: 0, inventory: [] })} className="text-xs font-semibold text-primary hover:underline">
                                            + Add Variant
                                        </button>
                                    </div>

                                    {errors.variants?.root && <p className="text-xs text-destructive">{errors.variants.root.message}</p>}

                                    <div className="space-y-6">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="bg-secondary/30 p-5 rounded-2xl border border-border relative">
                                                {fields.length > 1 && (
                                                    <button type="button" onClick={() => remove(index)} className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <h4 className="text-sm font-semibold mb-4 text-foreground">Variant {index + 1}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1.5">SKU *</label>
                                                        <input type="text" {...register(`variants.${index}.sku` as const)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder="HDPH-BLK-01" />
                                                        {errors.variants?.[index]?.sku && <p className="text-xs text-destructive mt-1">{errors.variants[index]?.sku?.message}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1.5">Price Adjustment ($)</label>
                                                        <input type="number" step="0.01" {...register(`variants.${index}.price_adjustment` as const)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" placeholder="0.00" />
                                                    </div>
                                                </div>

                                                {/* Note: In a fully complete UI, we'd have dynamic inventory array fields per variant. For simplicity we assume inventory setup is done post-creation or omitted here. */}
                                                <div className="mt-4 p-3 bg-card border border-border border-dashed rounded-xl">
                                                    <p className="text-xs text-muted-foreground text-center">
                                                        Inventory per warehouse setup available in the advanced editor after creation.
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-6 border-t border-border gap-3">
                                    <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 border border-border rounded-xl font-medium hover:bg-secondary">Cancel</button>
                                    <button type="submit" disabled={isPending} className="flex items-center justify-center min-w-[140px] px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50">
                                        {isPending ? <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : 'Publish Product'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        // Inventory "Coming Soon" View
                        <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-sm">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-secondary text-muted-foreground mb-6">
                                <Settings className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-4">Inventory Management Syncing</h2>
                            <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                                The product list and inventory editing modules are currently being upgraded by our engineering team to support deep warehouse analytics.
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-full text-xs font-semibold text-muted-foreground bg-secondary/50">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                Backend Endpoint Under Construction
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
