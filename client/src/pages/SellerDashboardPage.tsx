import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  CircleDollarSign,
  PencilLine,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/Skeleton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DataTable, Panel, PageHeader, PageShell, StatCard } from "@/components/ui/Surface";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { categoriesService, productsService, warehousesService } from "@/services/products";
import { sellerService } from "@/services/seller";
import type { CreateProductPayload, ProductDetailResponse } from "@/types";
import { formatCurrencyBDT } from "@/lib/utils";

type EditorVariant = {
  variant_id?: number;
  sku: string;
  price_adjustment: string;
  attributes: { color: string; size: string };
  inventory: { warehouse_id: number; stock_quantity: string; aisle_location: string };
};

type EditorState = {
  productId?: number;
  title: string;
  brand: string;
  description: string;
  category_id: number | null;
  base_price: string;
  media_1: string;
  media_2: string;
  spec_1_key: string;
  spec_1_value: string;
  spec_2_key: string;
  spec_2_value: string;
  variants: EditorVariant[];
};

type ProductView = "all" | "active" | "low-stock";

const productViewOptions = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "low-stock", label: "Low stock" },
] as const;

const emptyEditor = (): EditorState => ({
  title: "",
  brand: "",
  description: "",
  category_id: null,
  base_price: "",
  media_1: "",
  media_2: "",
  spec_1_key: "material",
  spec_1_value: "",
  spec_2_key: "warranty",
  spec_2_value: "",
  variants: [
    {
      sku: "",
      price_adjustment: "0",
      attributes: { color: "", size: "" },
      inventory: { warehouse_id: 0, stock_quantity: "0", aisle_location: "" },
    },
  ],
});

const detailToEditor = (detail: ProductDetailResponse): EditorState => ({
  productId: detail.product.product_id,
  title: detail.product.title,
  brand: detail.product.brand || "",
  description: detail.product.description || "",
  category_id: detail.product.category_id || null,
  base_price: String(detail.product.base_price),
  media_1: detail.media[0]?.media_url || "",
  media_2: detail.media[1]?.media_url || "",
  spec_1_key: detail.specifications[0]?.spec_key || "material",
  spec_1_value: detail.specifications[0]?.spec_value || "",
  spec_2_key: detail.specifications[1]?.spec_key || "warranty",
  spec_2_value: detail.specifications[1]?.spec_value || "",
  variants: detail.variants.map((variant) => ({
    variant_id: variant.variant_id,
    sku: variant.sku,
    price_adjustment: String(variant.price_adjustment),
    attributes: {
      color: variant.attributes.color || "",
      size: variant.attributes.size || variant.attributes.storage || "",
    },
    inventory: {
      warehouse_id: variant.inventory?.[0]?.warehouse_id || 0,
      stock_quantity: String(variant.inventory?.[0]?.stock_quantity || 0),
      aisle_location: variant.inventory?.[0]?.aisle_location || "",
    },
  })),
});

export default function SellerDashboardPage() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [productSearch, setProductSearch] = useState("");
  const [productView, setProductView] = useState<ProductView>("all");

  const dashboardQuery = useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: sellerService.getDashboard,
  });

  const profileQuery = useQuery({
    queryKey: ["seller-profile"],
    queryFn: sellerService.getProfile,
  });

  const productsQuery = useQuery({
    queryKey: ["seller-products"],
    queryFn: () => productsService.listMine({ page_size: 50, sort: "newest" }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesService.list,
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: warehousesService.list,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateProductPayload = {
        title: editor.title,
        brand: editor.brand || undefined,
        description: editor.description || undefined,
        category_id: editor.category_id,
        base_price: Number(editor.base_price),
        media: [editor.media_1, editor.media_2]
          .filter((url) => url.trim())
          .map((media_url, index) => ({
            media_url: media_url.trim(),
            is_primary: index === 0,
            display_order: index,
          })),
        specifications: [
          { spec_key: editor.spec_1_key.trim(), spec_value: editor.spec_1_value.trim() },
          { spec_key: editor.spec_2_key.trim(), spec_value: editor.spec_2_value.trim() },
        ].filter((spec) => spec.spec_key && spec.spec_value),
        variants: editor.variants.map((variant) => ({
          variant_id: variant.variant_id,
          sku: variant.sku.trim(),
          price_adjustment: Number(variant.price_adjustment || 0),
          attributes: Object.fromEntries(
            Object.entries({
              color: variant.attributes.color,
              size: variant.attributes.size,
            }).filter(([, value]) => value.trim())
          ),
          inventory: [
            {
              warehouse_id: variant.inventory.warehouse_id,
              stock_quantity: Number(variant.inventory.stock_quantity || 0),
              aisle_location: variant.inventory.aisle_location || undefined,
            },
          ],
        })),
      };

      if (editor.productId) {
        return productsService.update(editor.productId, payload);
      }
      return productsService.create(payload);
    },
    onSuccess: () => {
      toast.success(editor.productId ? "Product updated" : "Product created");
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditor(emptyEditor());
      setEditorOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Could not save product");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (productId: number) => productsService.deactivate(productId),
    onSuccess: () => {
      toast.success("Product deactivated");
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Could not deactivate product"),
  });

  const openEditor = async (productId?: number) => {
    try {
      if (productId) {
        const detail = await productsService.getMine(productId);
        setEditor(detailToEditor(detail));
      } else {
        setEditor(emptyEditor());
      }
      setEditorOpen(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Could not load product editor");
    }
  };

  if (
    dashboardQuery.isLoading ||
    profileQuery.isLoading ||
    productsQuery.isLoading ||
    categoriesQuery.isLoading ||
    warehousesQuery.isLoading
  ) {
    return (
      <PageShell>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="mt-6 h-[620px] rounded-[32px]" />
      </PageShell>
    );
  }

  const dashboard = dashboardQuery.data!;
  const seller = profileQuery.data!.seller;
  const products = productsQuery.data?.products || [];
  const categories = categoriesQuery.data || [];
  const warehouses = warehousesQuery.data || [];

  const filteredProducts = products.filter((product) => {
    const needle = productSearch.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      product.title.toLowerCase().includes(needle) ||
      (product.brand || "").toLowerCase().includes(needle) ||
      (product.category_name || "").toLowerCase().includes(needle);
    const matchesView =
      productView === "all"
        ? true
        : productView === "active"
          ? product.is_active
          : product.total_stock <= 12;
    return matchesSearch && matchesView;
  });

  const lowStockLookup = new Set(dashboard.low_stock.map((row) => row.product_id));

  return (
    <PageShell className="space-y-8">
      <PageHeader
        eyebrow="Seller workspace"
        title="Manage products, stock, and recent orders from one merchant view."
        description="This page keeps the current seller APIs intact while making product updates, stock checks, and sales context easier to work through."
        actions={
          <button onClick={() => openEditor()} className="action-primary">
            <Plus className="h-4 w-4" />
            New product
          </button>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={seller.is_verified ? "Verified seller" : "Verification pending"} tone={seller.is_verified ? "emerald" : "amber"} />
            <StatusBadge label={seller.company_name} tone="slate" />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Products" numericValue={dashboard.summary.product_count} hint="Active catalog entries" accent="cyan" />
        <StatCard label="Variants" numericValue={dashboard.summary.variant_count} hint="Configurations currently tracked" accent="violet" />
        <StatCard label="Gross sales" value={formatCurrencyBDT(dashboard.summary.gross_sales)} hint="Revenue across seller-linked order items" accent="magenta" />
        <StatCard label="Seller earnings" value={formatCurrencyBDT(dashboard.summary.seller_earnings)} hint="Net after platform fee allocation" accent="emerald" />
        <StatCard label="Balance" value={formatCurrencyBDT(Number(seller.balance || 0))} hint="Profile balance from seller record" accent="amber" icon={CircleDollarSign} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Catalog overview" subtitle="Search and review products without leaving the dashboard." icon={Boxes}>
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70" />
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search title, brand, or category"
                  className="field-input pl-11"
                />
              </label>
              <SegmentedControl
                value={productView}
                onChange={(value) => setProductView(value)}
                options={productViewOptions.map((entry) => ({ value: entry.value, label: entry.label }))}
              />
            </div>

            <DataTable columns={["Product", "Category", "Pricing", "Stock", "Actions"]}>
              {filteredProducts.map((product) => (
                <tr key={product.product_id}>
                  <td>
                    <div>
                      <p className="font-semibold text-white">{product.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusBadge label={product.is_active ? "Active" : "Inactive"} tone={product.is_active ? "emerald" : "rose"} />
                        {lowStockLookup.has(product.product_id) ? <StatusBadge label="Low stock" tone="amber" /> : null}
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground">{product.category_name || "Uncategorized"}</td>
                  <td>
                    <p className="text-white">{formatCurrencyBDT(product.lowest_price)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      to {formatCurrencyBDT(product.highest_price)}
                    </p>
                  </td>
                  <td>
                    <p className="text-white">{product.total_stock} units</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.review_count} reviews | {product.avg_rating.toFixed(1)} rating
                    </p>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openEditor(product.product_id)} className="action-secondary px-4 py-2.5">
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => deactivateMutation.mutate(product.product_id)}
                        className="action-secondary border-rose-400/20 px-4 py-2.5 text-rose-200 hover:border-rose-400/40"
                      >
                        <Trash2 className="h-4 w-4" />
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Low stock alerts" subtitle="Variants that need replenishment soon." icon={ShieldCheck}>
            <div className="space-y-3">
              {dashboard.low_stock.map((row) => (
                <div key={row.variant_id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{row.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.sku}</p>
                    </div>
                    <StatusBadge label={`${row.available_stock} left`} tone={row.available_stock <= 4 ? "rose" : "amber"} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recent orders" subtitle="Latest orders touching your catalog." icon={CircleDollarSign}>
            <div className="space-y-3">
              {dashboard.recent_orders.map((row) => (
                <div key={row.order_id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">#{row.order_id} | {row.customer_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.item_count} lines | {formatCurrencyBDT(row.gross_sales)}
                      </p>
                    </div>
                    <StatusBadge label={row.shipment_status || row.status} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Warehouse spread" subtitle="How your inventory distributes across the network." icon={Warehouse}>
            <div className="space-y-3">
              {dashboard.inventory_by_warehouse.map((warehouse) => (
                <div key={warehouse.warehouse_id} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{warehouse.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{warehouse.city}</p>
                    </div>
                    <StatusBadge label={`${warehouse.stock_units} units`} tone="emerald" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {warehouse.active_variants} active variants mapped here
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title={editor.productId ? "Edit product" : "Create product"}
        subtitle="Use the same create and update APIs with a cleaner product editor."
        icon={PencilLine}
      >
        {!editorOpen ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-muted-foreground">
            Open the editor to manage media, specs, variant attributes, and warehouse stock from one surface.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">Product title</label>
                <input
                  value={editor.title}
                  onChange={(event) => setEditor((current) => ({ ...current, title: event.target.value }))}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Brand</label>
                <input
                  value={editor.brand}
                  onChange={(event) => setEditor((current) => ({ ...current, brand: event.target.value }))}
                  className="field-input"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">Category</label>
                <select
                  value={editor.category_id ?? ""}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      category_id: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                  className="field-select"
                >
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Base price</label>
                <input
                  type="number"
                  min={0}
                  value={editor.base_price}
                  onChange={(event) => setEditor((current) => ({ ...current, base_price: event.target.value }))}
                  placeholder="Base price (BDT)"
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Description</label>
              <textarea
                value={editor.description}
                onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))}
                rows={4}
                className="field-textarea"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">Primary media URL</label>
                <input
                  value={editor.media_1}
                  onChange={(event) => setEditor((current) => ({ ...current, media_1: event.target.value }))}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Secondary media URL</label>
                <input
                  value={editor.media_2}
                  onChange={(event) => setEditor((current) => ({ ...current, media_2: event.target.value }))}
                  className="field-input"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Spec key</label>
                  <input
                    value={editor.spec_1_key}
                    onChange={(event) => setEditor((current) => ({ ...current, spec_1_key: event.target.value }))}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Spec value</label>
                  <input
                    value={editor.spec_1_value}
                    onChange={(event) => setEditor((current) => ({ ...current, spec_1_value: event.target.value }))}
                    className="field-input"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Spec key</label>
                  <input
                    value={editor.spec_2_key}
                    onChange={(event) => setEditor((current) => ({ ...current, spec_2_key: event.target.value }))}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Spec value</label>
                  <input
                    value={editor.spec_2_value}
                    onChange={(event) => setEditor((current) => ({ ...current, spec_2_value: event.target.value }))}
                    className="field-input"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {editor.variants.map((variant, index) => (
                <VariantEditorCard
                  key={`${variant.variant_id || "new"}-${index}`}
                  variant={variant}
                  warehouses={warehouses}
                  onChange={(updater) =>
                    setEditor((current) => ({
                      ...current,
                      variants: current.variants.map((currentVariant, currentIndex) =>
                        currentIndex === index ? updater(currentVariant) : currentVariant
                      ),
                    }))
                  }
                />
              ))}
            </div>

            <div className="flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setEditor((current) => ({
                    ...current,
                    variants: [
                      ...current.variants,
                      {
                        sku: "",
                        price_adjustment: "0",
                        attributes: { color: "", size: "" },
                        inventory: { warehouse_id: 0, stock_quantity: "0", aisle_location: "" },
                      },
                    ],
                  }))
                }
                className="action-secondary"
              >
                Add variant
              </button>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditor(emptyEditor());
                    setEditorOpen(false);
                  }}
                  className="action-secondary"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="action-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  Save product
                </button>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </PageShell>
  );
}

function VariantEditorCard({
  variant,
  warehouses,
  onChange,
}: {
  variant: EditorVariant;
  warehouses: Array<{ warehouse_id: number; name: string; city: string }>;
  onChange: (updater: (variant: EditorVariant) => EditorVariant) => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="field-label">SKU</label>
          <input
            value={variant.sku}
            onChange={(event) => onChange((current) => ({ ...current, sku: event.target.value }))}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Price adjustment</label>
          <input
            type="number"
            value={variant.price_adjustment}
            onChange={(event) =>
              onChange((current) => ({ ...current, price_adjustment: event.target.value }))
            }
            className="field-input"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="field-label">Color</label>
          <input
            value={variant.attributes.color}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                attributes: { ...current.attributes, color: event.target.value },
              }))
            }
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Size or storage</label>
          <input
            value={variant.attributes.size}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                attributes: { ...current.attributes, size: event.target.value },
              }))
            }
            className="field-input"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div>
          <label className="field-label">Warehouse</label>
          <select
            value={variant.inventory.warehouse_id}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                inventory: { ...current.inventory, warehouse_id: Number(event.target.value) },
              }))
            }
            className="field-select"
          >
            <option value={0}>Select warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                {warehouse.name} ({warehouse.city})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Stock quantity</label>
          <input
            type="number"
            min={0}
            value={variant.inventory.stock_quantity}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                inventory: { ...current.inventory, stock_quantity: event.target.value },
              }))
            }
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Aisle</label>
          <input
            value={variant.inventory.aisle_location}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                inventory: { ...current.inventory, aisle_location: event.target.value },
              }))
            }
            className="field-input"
          />
        </div>
      </div>
    </div>
  );
}
