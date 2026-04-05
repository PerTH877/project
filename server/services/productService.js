"use strict";



const {
    parseId,
    parsePagination,
    fetchProductList,
    fetchProductDetail,
} = require("../utils/marketplace");

const repo = require("../repositories/productRepository");


const normalizeText = (value) => {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
};

const normalizeMedia = (media) => {
    if (!Array.isArray(media)) return [];

    return media
        .filter((item) => item?.media_url)
        .map((item, index) => {
            const order = Number(item.display_order);
            return {
                media_url: normalizeText(item.media_url),
                media_type: normalizeText(item.media_type) || "image",
                is_primary: item.is_primary === true || index === 0,
                display_order: Number.isFinite(order) ? order : index,
            };
        });
};

const normalizeSpecifications = (specifications = []) => {
    if (!Array.isArray(specifications)) return [];

    return specifications
        .map(({ spec_key, spec_value } = {}) => ({
            spec_key: normalizeText(spec_key),
            spec_value: normalizeText(spec_value),
        }))
        .filter((spec) => spec.spec_key && spec.spec_value);
};

const cleanAttributes = (attrs) => {
    if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) return null;

    const entries = Object.entries(attrs)
        .map(([k, v]) => [String(k).trim(), String(v).trim()])
        .filter(([k, v]) => k && v);

    return entries.length > 0 ? Object.fromEntries(entries) : null;
};

const normalizeInventoryEntry = (entry, variantLabel, index) => {
    const warehouseId = Number(entry?.warehouse_id);
    const stockQuantity = Number(entry?.stock_quantity);
    const rowLabel = `${variantLabel} inventory row ${index + 1}`;

    if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
        throw new Error(`${rowLabel} needs a valid warehouse_id`);
    }
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
        throw new Error(`${rowLabel} needs stock_quantity >= 0`);
    }

    return {
        warehouse_id: warehouseId,
        stock_quantity: stockQuantity,
        aisle_location: normalizeText(entry?.aisle_location),
    };
};

const normalizeVariantPayload = (variants = []) => {
    if (!Array.isArray(variants) || variants.length === 0) {
        throw new Error("variants is required and must be a non-empty array");
    }

    return variants.map((variant, index) => {
        const variantLabel = `Variant ${index + 1}`;

        const sku = normalizeText(variant?.sku);
        if (!sku) throw new Error(`${variantLabel} requires a SKU`);

        const attributes = cleanAttributes(variant?.attributes);
        if (!attributes || Object.keys(attributes).length === 0) {
            throw new Error(`${variantLabel} requires at least one attribute`);
        }

        const inventory = (variant.inventory || []).map((entry, entryIndex) =>
            normalizeInventoryEntry(entry, variantLabel, entryIndex)
        );

        return {
            variant_id: parseId(variant?.variant_id),
            sku,
            attributes,
            price_adjustment: Number(variant?.price_adjustment ?? 0),
            is_active: Boolean(variant?.is_active ?? true),
            inventory,
        };
    });
};

const mapHomeProductRow = (row) => ({
    product_id: row.product_id,
    seller_id: row.seller_id,
    seller_name: row.seller_name,
    seller_verified: row.seller_verified,
    category_id: row.category_id,
    category_name: row.category_name,
    title: row.title,
    brand: row.brand,
    description: row.description,
    base_price: Number(row.base_price),
    lowest_price: Number(row.lowest_price ?? row.base_price),
    highest_price: Number(row.highest_price ?? row.base_price),
    created_at: row.created_at,
    is_active: row.is_active,
    primary_image: row.primary_image,
    avg_rating: Number(row.avg_rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    total_stock: Number(row.total_stock ?? 0),
});


const ensureCategoryExists = async (client, categoryId) => {
    if (!categoryId) return;
    const row = await repo.findCategoryById(client, categoryId);
    if (!row) throw new Error("Selected category does not exist");
};


const ensureWarehouseIdsExist = async (client, variants) => {
    const warehouseIds = Array.from(
        new Set(
            variants
                .flatMap((v) => v.inventory || [])
                .map((e) => Number(e.warehouse_id))
                .filter((v) => Number.isInteger(v) && v > 0)
        )
    );

    if (!warehouseIds.length) return;

    const found = await repo.findWarehousesByIds(client, warehouseIds);
    const foundSet = new Set(found);
    const missing = warehouseIds.filter((id) => !foundSet.has(id));

    if (missing.length) {
        throw new Error(`Unknown warehouse_id values: ${missing.join(", ")}`);
    }
};


const replaceProductMedia = async (client, productId, media) => {
    if (!Array.isArray(media)) return;
    await repo.deleteProductMedia(client, productId);
    for (const item of media) {
        await repo.insertProductMedia(client, {
            productId,
            mediaUrl: item.media_url,
            mediaType: item.media_type,
            isPrimary: item.is_primary,
            displayOrder: item.display_order,
        });
    }
};


const replaceProductSpecifications = async (client, productId, specifications) => {
    if (!Array.isArray(specifications)) return;
    await repo.deleteProductSpecs(client, productId);
    for (const spec of specifications) {
        await repo.insertProductSpec(client, {
            productId,
            specKey: spec.spec_key,
            specValue: spec.spec_value,
        });
    }
};


const upsertVariants = async (client, productId, variants, sellerId, isNested = false) => {
    const savedVariants = [];

    try {
        if (!isNested) {
            await client.query("BEGIN");
        }

        for (const variant of variants) {
            let variantId = variant.variant_id;

            if (variantId) {
                const owned = await repo.findVariantBySeller(client, variantId, productId, sellerId);
                if (!owned) {
                    throw new Error(`Variant ${variantId} does not belong to this product`);
                }
                const updated = await repo.updateVariantFields(client, variantId, {
                    sku: variant.sku,
                    attributes: variant.attributes,
                    priceAdjustment: variant.price_adjustment,
                    isActive: variant.is_active,
                });
                savedVariants.push(updated);
            } else {
                const inserted = await repo.insertVariant(client, {
                    productId,
                    sku: variant.sku,
                    attributes: variant.attributes,
                    priceAdjustment: variant.price_adjustment,
                    isActive: variant.is_active,
                });
                variantId = inserted.variant_id;
                savedVariants.push(inserted);
            }

            if (Array.isArray(variant.inventory)) {
                await repo.deleteInventoryByVariant(client, variantId);
                for (const inv of variant.inventory) {
                    await repo.insertInventoryRow(client, {
                        variantId,
                        warehouseId: inv.warehouse_id,
                        stockQuantity: inv.stock_quantity,
                        aisleLocation: inv.aisle_location,
                    });
                }
            }
        }

        if (!isNested) {
            await client.query("COMMIT");
        }
        return savedVariants;
    } catch (err) {
        if (!isNested) {
            await client.query("ROLLBACK");
        }
        throw err;
    }
};


const getHomeFeedData = async (pool) => {
    const [
        featuredProducts,
        trendingProducts,
        newArrivals,
        dealProducts,
        topRatedProducts,
        recentViewsRows,
        categoriesRows,
        metrics,
    ] = await Promise.all([
        fetchProductList(pool, { sort: "popular", page: 1, page_size: 8 }),
        fetchProductList(pool, { sort: "rating", page: 1, page_size: 8 }),
        fetchProductList(pool, { sort: "newest", page: 1, page_size: 8 }),
        fetchProductList(pool, { sort: "price-asc", max_price: 5000, page: 1, page_size: 8 }),
        fetchProductList(pool, { sort: "rating", page: 1, page_size: 8 }),
        repo.getRecentlyViewedProducts(pool),
        repo.getCategoriesWithSampleMedia(pool),
        repo.getMarketplaceMetrics(pool),
    ]);

    return {
        hero: {
            title: "Shop verified products from sellers across Bangladesh",
            subtitle:
                "Browse electronics, fashion, home goods, beauty, and daily essentials with clear pricing, ratings, and delivery coverage.",
            metrics: [
                { label: "Verified sellers", value: Number(metrics.verified_seller_count ?? 0) },
                { label: "Products live", value: Number(metrics.active_product_count ?? 0) },
                { label: "Orders placed", value: Number(metrics.order_count ?? 0) },
                { label: "Warehouse cities", value: Number(metrics.warehouse_city_count ?? 0) },
            ],
        },
        featured_products: featuredProducts.products,
        trending_products: trendingProducts.products,
        new_arrivals: newArrivals.products,
        deal_products: dealProducts.products,
        top_rated_products: topRatedProducts.products,
        recently_viewed_products: recentViewsRows.map(mapHomeProductRow),
        categories: categoriesRows,
    };
};



const getProductList = async (pool, query) => {
    const pagination = parsePagination(query);
    return fetchProductList(pool, query, pagination);
};

const getFeaturedProducts = async (pool) => {
    return repo.getFeaturedProducts(pool);
};

const getActiveFlashDeals = async (pool) => {
    return repo.getActiveFlashDeals(pool);
};



const getProductDetail = async (pool, productId, opts = {}) => {
    return fetchProductDetail(pool, productId, opts);
};


const createProductWithVariants = async (pool, sellerId, body) => {
    const title = normalizeText(body.title);
    if (!title) throw new Error("title is required");

    const basePrice = Number(body.base_price);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
        throw new Error("base_price must be a number >= 0");
    }

    const categoryId =
        body.category_id === null || body.category_id === undefined || body.category_id === ""
            ? null
            : Number(body.category_id);

    const variants = normalizeVariantPayload(body.variants);
    const media = normalizeMedia(body.media);
    const specifications = normalizeSpecifications(body.specifications);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await ensureCategoryExists(client, categoryId);
        await ensureWarehouseIdsExist(client, variants);

        const product = await repo.insertProduct(client, {
            sellerId,
            categoryId,
            title,
            brand: normalizeText(body.brand),
            description: normalizeText(body.description),
            basePrice,
        });

        const savedVariants = await upsertVariants(client, product.product_id, variants, sellerId, true);
        await replaceProductMedia(client, product.product_id, media);
        await replaceProductSpecifications(client, product.product_id, specifications);

        await client.query("COMMIT");

        const detail = await fetchProductDetail(pool, product.product_id, { includeInactive: true });
        return { product: detail?.product || product, variants: savedVariants, detail };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};


const getSellerProductList = async (pool, sellerId, query) => {
    const pagination = parsePagination({ ...query, seller_id: sellerId });
    return fetchProductList(
        pool,
        { ...query, seller_id: sellerId },
        { ...pagination, includeInactive: true }
    );
};


const getSellerProductDetail = async (pool, productId, sellerId) => {
    const detail = await fetchProductDetail(pool, productId, { includeInactive: true });
    if (!detail || detail.product.seller_id !== sellerId) return null;
    return detail;
};


const updateProductWithVariants = async (pool, productId, sellerId, body) => {
    const setClauses = [];
    const values = [];
    let index = 1;

    const title = body.title !== undefined ? normalizeText(body.title) : undefined;
    const brand = body.brand !== undefined ? normalizeText(body.brand) : undefined;
    const description = body.description !== undefined ? normalizeText(body.description) : undefined;

    if (title !== undefined) {
        if (!title) throw new Error("title cannot be empty");
        setClauses.push(`title = $${index++}`);
        values.push(title);
    }
    if (brand !== undefined) {
        setClauses.push(`brand = $${index++}`);
        values.push(brand);
    }
    if (description !== undefined) {
        setClauses.push(`description = $${index++}`);
        values.push(description);
    }
    if (body.base_price !== undefined) {
        const basePrice = Number(body.base_price);
        if (!Number.isFinite(basePrice) || basePrice < 0) {
            throw new Error("base_price must be a number >= 0");
        }
        setClauses.push(`base_price = $${index++}`);
        values.push(basePrice);
    }

    let categoryId;
    if (body.category_id !== undefined) {
        categoryId =
            body.category_id === null || body.category_id === "" ? null : Number(body.category_id);
        if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
            throw new Error("category_id must be a positive integer or null");
        }
        setClauses.push(`category_id = $${index++}`);
        values.push(categoryId);
    }

    let variants;
    if (body.variants !== undefined) {
        variants = normalizeVariantPayload(body.variants);
    }

    const media = body.media !== undefined ? normalizeMedia(body.media) : undefined;
    const specifications =
        body.specifications !== undefined ? normalizeSpecifications(body.specifications) : undefined;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const owned = await repo.findProductBySeller(client, productId, sellerId);
        if (!owned) {
            const err = new Error("Product not found");
            err.statusCode = 404;
            throw err;
        }

        if (categoryId !== undefined) await ensureCategoryExists(client, categoryId);
        if (variants) await ensureWarehouseIdsExist(client, variants);

        if (setClauses.length) {
            await repo.updateProductFields(client, productId, sellerId, setClauses, values);
        }
        if (variants) {
            await upsertVariants(client, productId, variants, sellerId, true);
        }
        if (media !== undefined) {
            await replaceProductMedia(client, productId, media);
        }
        if (specifications !== undefined) {
            await replaceProductSpecifications(client, productId, specifications);
        }

        await client.query("COMMIT");

        return fetchProductDetail(pool, productId, { includeInactive: true });
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};


const deactivateProduct = async (pool, productId, sellerId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const row = await repo.deactivateProductRow(client, productId, sellerId);
        await client.query("COMMIT");
        return row;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};


const updateVariant = async (pool, variantId, sellerId, body) => {
    const sku = body.sku !== undefined ? normalizeText(body.sku) : undefined;
    const priceAdjustment =
        body.price_adjustment !== undefined ? Number(body.price_adjustment) : undefined;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : undefined;
    const attributes =
        body.attributes !== undefined &&
            body.attributes &&
            typeof body.attributes === "object" &&
            !Array.isArray(body.attributes)
            ? Object.fromEntries(
                Object.entries(body.attributes)
                    .map(([k, v]) => [String(k).trim(), String(v).trim()])
                    .filter(([k, v]) => k && v)
            )
            : undefined;

    if (sku !== undefined && !sku) throw new Error("sku cannot be empty");
    if (priceAdjustment !== undefined && !Number.isFinite(priceAdjustment)) {
        throw new Error("price_adjustment must be numeric");
    }
    if (attributes !== undefined && !Object.keys(attributes).length) {
        throw new Error("attributes must include at least one key/value pair");
    }

    const setClauses = [];
    const values = [];
    let i = 1;

    if (sku !== undefined) { setClauses.push(`sku = $${i++}`); values.push(sku); }
    if (attributes !== undefined) { setClauses.push(`attributes = $${i++}`); values.push(attributes); }
    if (priceAdjustment !== undefined) { setClauses.push(`price_adjustment = $${i++}`); values.push(priceAdjustment); }
    if (isActive !== undefined) { setClauses.push(`is_active = $${i++}`); values.push(isActive); }

    if (!setClauses.length) throw new Error("No fields provided for update");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const row = await repo.updateVariantRow(client, variantId, sellerId, setClauses, values);
        await client.query("COMMIT");
        return row;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};


const updateVariantInventory = async (pool, variantId, sellerId, inventoryPayload) => {
    const normalized = normalizeVariantPayload([
        {
            sku: "inventory-only",
            attributes: { scope: "inventory" },
            inventory: inventoryPayload,
        },
    ]);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const owned = await repo.findVariantOwnerBySeller(client, variantId, sellerId);
        if (!owned) {
            const err = new Error("Variant not found");
            err.statusCode = 404;
            throw err;
        }

        await ensureWarehouseIdsExist(client, normalized);
        await repo.deleteInventoryByVariant(client, variantId);

        for (const inv of normalized[0].inventory) {
            await repo.insertInventoryRow(client, {
                variantId,
                warehouseId: inv.warehouse_id,
                stockQuantity: inv.stock_quantity,
                aisleLocation: inv.aisle_location,
            });
        }

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};



const createReview = async (pool, userId, productId, body) => {
    const rating = Number(body.rating);
    const comment = normalizeText(body.comment);
    const images = Array.isArray(body.images) ? body.images : [];

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("rating must be an integer from 1 to 5");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const purchased = await repo.checkUserPurchased(client, userId, productId);
        if (!purchased) {
            const err = new Error("Only customers who purchased this product can review it");
            err.statusCode = 403;
            throw err;
        }

        const existing = await repo.findExistingReview(client, userId, productId);
        if (existing) {
            const err = new Error("You have already reviewed this product");
            err.statusCode = 409;
            throw err;
        }

        const review = await repo.insertReview(client, { userId, productId, rating, comment, images });
        await client.query("COMMIT");
        return review;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};


const askProductQuestion = async (pool, userId, productId, questionText) => {
    if (!questionText) throw new Error("question_text is required");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const product = await repo.findActiveProduct(client, productId);
        if (!product) {
            const err = new Error("Product not found");
            err.statusCode = 404;
            throw err;
        }

        const question = await repo.insertQuestion(client, { productId, userId, questionText });
        await client.query("COMMIT");
        return question;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};


const answerProductQuestion = async (pool, sellerId, questionId, answerText) => {
    if (!answerText) throw new Error("answer_text is required");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const question = await repo.findQuestionBySeller(client, questionId, sellerId);
        if (!question) {
            const err = new Error("Question not found");
            err.statusCode = 404;
            throw err;
        }

        const existing = await repo.findExistingAnswer(client, questionId);
        if (existing) {
            const err = new Error("This question already has an answer");
            err.statusCode = 409;
            throw err;
        }

        const answer = await repo.insertAnswer(client, { questionId, sellerId, answerText });
        await client.query("COMMIT");
        return answer;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};


module.exports = {
    getHomeFeedData,
    getProductList,
    getFeaturedProducts,
    getActiveFlashDeals,
    getProductDetail,
    createProductWithVariants,
    getSellerProductList,
    getSellerProductDetail,
    updateProductWithVariants,
    deactivateProduct,
    updateVariant,
    updateVariantInventory,
    createReview,
    askProductQuestion,
    answerProductQuestion,
};
