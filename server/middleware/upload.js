"use strict";

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `review-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype.replace("image/", ""));
    if (extOk && mimeOk) {
        cb(null, true);
    } else {
        cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed."));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB per file
        files: 5,
    },
});

module.exports = upload;
