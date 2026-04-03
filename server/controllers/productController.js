"use strict";

const pool = require("../config/db");
const { parseId, parsePagination } = require("../utils/marketplace");
const service = require("../services/productService");



const handleError = (res, context, err) => {
    console.error(`${context}:`, err.message);

    if (err.code === "23505") {
        return res.status(409).json({ error: "SKU already exists. Please use unique SKUs." });
    }

    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || "Internal server error" });
};


const getHomeFeed = async (_req, res) => {
    try {
        const data = await service.getHomeFeedData(pool);
        return res.json(data);
    } catch (err) {
        return handleError(res, "getHomeFeed", err);
    }
};

const listProducts = async (req, res) => {
    try {
        const payload = await service.getProductList(pool, req.query);
        return res.json(payload);
    } catch (err) {
        return handleError(res, "listProducts", err);
    }
};

const getFeatured = async (req, res, next) => {
    try {
        const result = await service.getFeaturedProducts(pool);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        if (typeof next === "function") return next(err);
        return handleError(res, "getFeatured", err);
    }
};

const getFlashDeals = async (req, res, next) => {
    try {
        const result = await service.getActiveFlashDeals(pool);
        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        if (typeof next === "function") return next(err);
        return handleError(res, "getFlashDeals", err);
    }
};

const getProduct = async (req, res) => {
    const productId = parseId(req.params.product_id);
    if (!productId) {
        return res.status(400).json({ error: "product_id must be a positive integer" });
    }

    try {
        const payload = await service.getProductDetail(pool, productId);
        if (!payload) {
            return res.status(404).json({ error: "Product not found" });
        }
        return res.json(payload);
    } catch (err) {
        return handleError(res, "getProduct", err);
    }
};



const createProduct = async (req, res) => {
    const sellerId = req.user?.seller_id;
    if (!sellerId) {
        return res.status(401).json({ error: "Missing seller_id in token" });
    }

    try {
        const result = await service.createProductWithVariants(pool, sellerId, req.body);
        return res.status(201).json({
            message: "Product created successfully",
            product: result.product,
            variants: result.variants,
            detail: result.detail,
        });
    } catch (err) {
        return handleError(res, "createProduct", err);
    }
};

const listSellerProducts = async (req, res) => {
    const sellerId = req.user?.seller_id;
    if (!sellerId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const payload = await service.getSellerProductList(pool, sellerId, req.query);
        return res.json(payload);
    } catch (err) {
        return handleError(res, "listSellerProducts", err);
    }
};

const getSellerProduct = async (req, res) => {
    const sellerId = req.user?.seller_id;
    const productId = parseId(req.params.product_id);

    if (!sellerId) return res.status(401).json({ error: "Unauthorized" });
    if (!productId) return res.status(400).json({ error: "product_id must be a positive integer" });

    try {
        const detail = await service.getSellerProductDetail(pool, productId, sellerId);
        if (!detail) {
            return res.status(404).json({ error: "Product not found" });
        }
        return res.json(detail);
    } catch (err) {
        return handleError(res, "getSellerProduct", err);
    }
};

const updateProduct = async (req, res) => {
    const sellerId = req.user?.seller_id;
    const productId = parseId(req.params.product_id);

    if (!sellerId) return res.status(401).json({ error: "Unauthorized" });
    if (!productId) return res.status(400).json({ error: "product_id must be a positive integer" });

    try {
        const detail = await service.updateProductWithVariants(pool, productId, sellerId, req.body);
        return res.json({ message: "Product updated successfully", detail });
    } catch (err) {
        return handleError(res, "updateProduct", err);
    }
};

const deactivateProduct = async (req, res) => {
    const sellerId = req.user?.seller_id;
    const productId = parseId(req.params.product_id);

    if (!sellerId) return res.status(401).json({ error: "Unauthorized" });
    if (!productId) return res.status(400).json({ error: "product_id must be a positive integer" });

    try {
        const product = await service.deactivateProduct(pool, productId, sellerId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        return res.json({ message: "Product deactivated", product });
    } catch (err) {
        return handleError(res, "deactivateProduct", err);
    }
};



const updateVariant = async (req, res) => {
    const sellerId = req.user?.seller_id;
    const variantId = parseId(req.params.variant_id);

    if (!sellerId) return res.status(401).json({ error: "Unauthorized" });
    if (!variantId) return res.status(400).json({ error: "variant_id must be a positive integer" });

    try {
        const variant = await service.updateVariant(pool, variantId, sellerId, req.body);
        if (!variant) {
            return res.status(404).json({ error: "Variant not found" });
        }
        return res.json({ message: "Variant updated", variant });
    } catch (err) {
        return handleError(res, "updateVariant", err);
    }
};

const updateVariantInventory = async (req, res) => {
    const sellerId = req.user?.seller_id;
    const variantId = parseId(req.params.variant_id);

    if (!sellerId) return res.status(401).json({ error: "Unauthorized" });
    if (!variantId) return res.status(400).json({ error: "variant_id must be a positive integer" });
    if (!Array.isArray(req.body.inventory)) {
        return res.status(400).json({ error: "inventory must be an array" });
    }

    try {
        await service.updateVariantInventory(pool, variantId, sellerId, req.body.inventory);
        return res.json({ message: "Inventory updated" });
    } catch (err) {
        return handleError(res, "updateVariantInventory", err);
    }
};



const createReview = async (req, res) => {
    const userId = req.user?.user_id;
    const productId = parseId(req.params.product_id);

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!productId) return res.status(400).json({ error: "product_id must be a positive integer" });

    try {
        // Map uploaded files to public URL paths
        const uploadedImages = Array.isArray(req.files) && req.files.length > 0
            ? req.files.map((file) => `/uploads/${file.filename}`)
            : [];

        // Merge with any image URLs passed directly in the body (FormData text fields)
        const bodyImages = Array.isArray(req.body.images) ? req.body.images : [];
        const images = [...uploadedImages, ...bodyImages].filter(Boolean);

        const review = await service.createReview(pool, userId, productId, { ...req.body, images });
        return res.status(201).json({ message: "Review submitted", review });
    } catch (err) {
        return handleError(res, "createReview", err);
    }
};



const askProductQuestion = async (req, res) => {
    const userId = req.user?.user_id;
    const productId = parseId(req.params.product_id);
    const questionText = req.body.question_text?.toString().trim() || "";

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!productId) return res.status(400).json({ error: "product_id must be a positive integer" });

    try {
        const question = await service.askProductQuestion(pool, userId, productId, questionText);
        return res.status(201).json({ message: "Question submitted", question });
    } catch (err) {
        return handleError(res, "askProductQuestion", err);
    }
};

const answerProductQuestion = async (req, res) => {
    const sellerId = req.user?.seller_id;
    const questionId = parseId(req.params.question_id);
    const answerText = req.body.answer_text?.toString().trim() || "";

    if (!sellerId) return res.status(401).json({ error: "Unauthorized" });
    if (!questionId) return res.status(400).json({ error: "question_id must be a positive integer" });

    try {
        const answer = await service.answerProductQuestion(pool, sellerId, questionId, answerText);
        return res.status(201).json({ message: "Answer posted", answer });
    } catch (err) {
        return handleError(res, "answerProductQuestion", err);
    }
};



module.exports = {
    getHomeFeed,
    listProducts,
    getFeatured,
    getFlashDeals,
    getProduct,
    createProduct,
    listSellerProducts,
    getSellerProduct,
    updateProduct,
    deactivateProduct,
    updateVariant,
    updateVariantInventory,
    createReview,
    askProductQuestion,
    answerProductQuestion,
};
