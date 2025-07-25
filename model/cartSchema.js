const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    productCount: {
        type: Number,
        required: true,
        min: 1
    },
    productPrice: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false, timestamps: true });

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    items: [itemSchema],
    payableAmount: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        default: 0
    },
    // Lock mechanism for preventing concurrent checkouts
    isLocked: {
        type: Boolean,
        default: false
    },
    lockedAt: {
        type: Date,
        default: null
    },
    // Store pending order data for Razorpay payments
    pendingOrderData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true
});

// FIXED: Better indexing for performance
cartSchema.index({ userId: 1 }, { unique: true }); // One cart per user
cartSchema.index({ userId: 1, isLocked: 1, lockedAt: 1 }); // Optimized lock queries
cartSchema.index({ isLocked: 1, lockedAt: 1 }); // For cleanup operations


module.exports = mongoose.model('cart', cartSchema);
