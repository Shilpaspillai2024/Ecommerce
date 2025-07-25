const cartSchema = require("../../model/cartSchema");
const productSchema = require("../../model/productSchema");
const userSchema = require("../../model/userSchema");
const addressSchema = require("../../model/addressSchema");
const orderSchema = require("../../model/orderSchema");
const couponSchema = require("../../model/couponSchema");
const walletSchema = require("../../model/walletSchema");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const catchAsync = require("../../utils/catchAsync");
const STATUS_CODES = require("../../constants/statusCodes");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const checkout = catchAsync(async (req, res) => {
  const address = await addressSchema
    .find({ userId: req.session.user })
    .populate("userId");

  const cartDetails = await cartSchema
    .findOne({ userId: req.session.user })
    .populate("items.productId")
    .populate("userId");
    
  const wallet = await walletSchema.findOne({ userId: req.session.user });
  console.log("wallet",wallet)
  let balance = 0;

  // FIXED: Check for empty cart items as well
  if (!cartDetails || !cartDetails.items || cartDetails.items.length === 0) {
    req.flash("errorMessage", "The cart is empty, please go to the shop");
    return res.redirect("/cart");
  }

  const cartItems = cartDetails.items;

  if (wallet) {
    balance = wallet.balance;
  }
  
  let total = 0;

  // FIXED: Added proper stock validation and error handling
  for (const product of cartItems) {
    // FIXED: Check if product exists and is populated
    if (!product.productId) {
      req.flash("errorMessage", "Some products in your cart are no longer available");
      return res.redirect("/cart");
    }

    const currentProduct = await productSchema.findById(product.productId._id || product.productId);

    // FIXED: Better stock validation
    if (!currentProduct) {
      req.flash("errorMessage", "Some products are no longer available");
      return res.redirect("/cart");
    }

    if (currentProduct.productQuantity < product.productCount) {
      req.flash("errorMessage", `${currentProduct.productName} has insufficient stock (Available: ${currentProduct.productQuantity}, Requested: ${product.productCount})`);
      return res.redirect("/cart");
    }

    total += Math.round(
      product.productPrice *
        (1 - product.productId.productDiscount / 100) *
        product.productCount
    );
  }

  // add shipping charge if total less than 500
  const shippingCharge = total < 500 ? 50 : 0;
  total = Math.round(total + shippingCharge);

  res.render("user/checkout", {
    title: "checkout-page",
    cartDetails,
    cartItems,
    user: req.session.user,
    alertMessage: req.flash("errorMessage"),
    address,
    balance,
    total,
    shippingCharge,
  });
});

const addcheckoutAddress = catchAsync(async (req, res) => {
  const userId = req.session.user;

  // FIXED: Added input validation
  if (!req.body.contactName || !req.body.doorNo || !req.body.homeAddress || !req.body.phone || !req.body.pincode) {
    req.flash("errorMessage", "All required fields must be filled");
    return res.redirect("/checkout");
  }

  const newAddress = {
    userId: userId,
    addressType: req.body.addressType,
    contactName: req.body.contactName,
    doorNo: req.body.doorNo,
    Address: req.body.homeAddress,
    areaAddress: req.body.areaAddress,
    landmark: req.body.landmark,
    phone: req.body.phone,
    pincode: req.body.pincode,
  };

  await addressSchema.insertMany(newAddress);
  req.flash("errorMessage", "Address added successfully");
  res.redirect("/checkout");
});

const deletecheckoutAddress = catchAsync(async (req, res) => {
  const userId = req.session.user;
  const addressId = req.params.id;

  // Check if the address belongs to the user
  const address = await addressSchema.findOne({
    _id: addressId,
    userId: userId,
  });

  if (!address) {
    req.flash("errorMessage", "Address not found or not authorized to delete");
    return res.redirect("/checkout");
  }
  
  await addressSchema.deleteOne({ _id: addressId });
  req.flash("errorMessage", "Address deleted successfully");
  res.redirect("/checkout");
});


const OrderPlaced = catchAsync(async (req, res) => {
  const userId = req.session.user;

  // Clean up expired locks at the beginning
  await cartSchema.updateMany(
    {
      isLocked: true,
      lockedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) }
    },
    {
      $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 }
    }
  );

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      let {
        name,
        email,
        phone,
        address,
        paymentMethod,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        couponCode,
      } = req.body;

      console.log("🔐 Trying to acquire lock for user:", userId);
      console.log("Payment method:", paymentMethod);
      console.log("Razorpay OrderId:", razorpayOrderId);
      console.log("Razorpay PaymentId:", razorpayPaymentId);

      // FIXED: Different lock acquisition logic for Razorpay completion vs new checkout
      let cart;
      
      if (paymentMethod === "razorpay" && razorpayOrderId && razorpayPaymentId) {
        // For Razorpay payment completion - find the cart with pending order data
        console.log("🔍 Looking for cart with pending Razorpay order...");
        cart = await cartSchema
          .findOne({
            userId,
            isLocked: true,
            'pendingOrderData.razorpayOrderId': razorpayOrderId
          })
          .populate("items.productId")
          .session(session);
          
        console.log("📋 Found cart with pending order:", cart?._id);
        
      } else {
        // For new checkout (first call) - acquire lock as before
        console.log("🆕 Acquiring new cart lock...");
        cart = await cartSchema
          .findOneAndUpdate(
            {
              userId,
              $or: [
                { isLocked: { $exists: false } },
                { isLocked: false },
                {
                  isLocked: true,
                  lockedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) },
                },
              ],
            },
            {
              $set: {
                isLocked: true,
                lockedAt: new Date(),
              },
            },
            {
              new: true,
              session,
            }
          )
          .populate("items.productId");
      }

      console.log("✅ Cart lock status:", cart?._id || "NOT_FOUND");

      // If cart is null, it means another checkout is in progress OR invalid payment session
      if (!cart) {
        const errorMessage = (paymentMethod === "razorpay" && razorpayOrderId && razorpayPaymentId) 
          ? "Invalid or expired payment session. Please try again."
          : "Another checkout is already in progress. Please wait and try again.";
          
        return res.status(STATUS_CODES.TOO_MANY_REQUESTS).json({
          success: false,
          message: errorMessage,
        });
      }

      // Check if cart is empty (only for new checkouts, not payment completion)
      if ((!razorpayOrderId || !razorpayPaymentId) && (!cart.items || cart.items.length === 0)) {
        // Release lock before returning
        await cartSchema.findByIdAndUpdate(
          cart._id,
          {
            $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 },
          },
          { session }
        );
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Cart is empty",
        });
      }

      let totalPrice = 0;
      let couponDiscount = 0;
      let orderProducts = [];

      // Calculate order products only for new checkouts
      if (!razorpayOrderId || !razorpayPaymentId) {
        orderProducts = cart.items.map((product) => {
          const productDiscount = product.productId.productDiscount || 0;
          const price = Math.round(
            product.productPrice * (1 - productDiscount / 100)
          );
          totalPrice += price * product.productCount;
          return {
            productId: product.productId._id,
            quantity: product.productCount,
            price: price,
          };
        });

        // Enhanced product availability validation
        for (let product of orderProducts) {
          const currentProduct = await productSchema
            .findById(product.productId)
            .session(session);
            
          if (!currentProduct) {
            await cartSchema.findByIdAndUpdate(
              cart._id,
              {
                $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 },
              },
              { session }
            );
            return res.status(STATUS_CODES.BAD_REQUEST).json({
              success: false,
              message: "Some products are no longer available.",
            });
          }
          
          if (currentProduct.productQuantity < product.quantity) {
            await cartSchema.findByIdAndUpdate(
              cart._id,
              {
                $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 },
              },
              { session }
            );
            return res.status(STATUS_CODES.BAD_REQUEST).json({
              success: false,
              message: `Product ${currentProduct.productName} is out of stock or insufficient quantity available. Available: ${currentProduct.productQuantity}, Requested: ${product.quantity}`,
            });
          }
        }

        // Improved coupon logic with better error handling
        if (couponCode) {
          const coupon = await couponSchema
            .findOne({ couponName: couponCode })
            .session(session);
            
          if (coupon && coupon.isActive && coupon.expiryDate >= new Date()) {
            if (!coupon.appliedUsers.includes(userId)) {
              if (totalPrice >= coupon.minAmount) {
                couponDiscount = coupon.discount;
                totalPrice -= couponDiscount;
                coupon.appliedUsers.push(userId);
                await coupon.save({ session });
              }
            }
          }
        }

        // Add shipping charge
        const shippingCharge = totalPrice < 500 ? 50 : 0;
        totalPrice += shippingCharge;
      }

      // Better address parsing with validation
      let addressObj = {};
      if (address) {
        let patterns = {
          contactName: /contactName: '([^']+)'/,
          doorNo: /doorNo: (\d+)/,
          Address: /Address: '([^']+)'/,
          areaAddress: /areaAddress: '([^']+)'/,
          pincode: /pincode: (\d+)/,
          landmark: /landmark: '([^']+)'/,
          phone: /phone: (\d+)/,
          addressType: /addressType: '([^']+)'/,
        };

        for (let key in patterns) {
          let match = address.match(patterns[key]);
          if (match) {
            addressObj[key] = isNaN(match[1]) ? match[1] : parseInt(match[1]);
          }
        }
      }

      const orderID = generateRandomOrderId();

      // Handle Razorpay Payment - First Call (Create Order)
      if (paymentMethod === "razorpay" && !razorpayOrderId) {
        console.log("🏦 Creating Razorpay order...");
        
        if (cart.pendingOrderData?.razorpayOrderId) {
          console.log("⚠️ Payment already initiated");
          return res.status(STATUS_CODES.CONFLICT).json({
            success: false,
            message: "Payment already initiated. Please complete it or wait.",
          });
        }

        try {
          const razorpayOrder = await razorpay.orders.create({
            amount: totalPrice * 100,
            currency: "INR",
            receipt: `receipt_${orderID}`,
          });

          // Store pending order data in cart for later completion
          await cartSchema.findByIdAndUpdate(
            cart._id,
            {
              $set: {
                pendingOrderData: {
                  orderID,
                  contactInfo: { name, email, phone },
                  address: addressObj,
                  products: orderProducts,
                  totalPrice,
                  couponDiscount,
                  paymentMethod,
                  razorpayOrderId: razorpayOrder.id,
                  createdAt: new Date(),
                },
              },
            },
            { session }
          );

          console.log("📝 Stored pendingOrderData:", {
            orderID,
            razorpayOrderId: razorpayOrder.id,
            totalPrice,
          });

          return res.status(STATUS_CODES.OK).json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: totalPrice * 100,
            message: "Razorpay order created successfully"
          });
        } catch (error) {
          console.error("❌ Razorpay order creation failed:", error);
          // Release lock on Razorpay error
          await cartSchema.findByIdAndUpdate(
            cart._id,
            { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
            { session }
          );
          throw error;
        }
      }

      // Handle Razorpay Payment - Second Call (Complete Payment)
      if (paymentMethod === "razorpay" && razorpayOrderId && razorpayPaymentId) {
        console.log("💳 Processing Razorpay payment completion...");
        
        if (!cart.pendingOrderData || cart.pendingOrderData.razorpayOrderId !== razorpayOrderId) {
          console.log("❌ Invalid or expired payment session");
          await cartSchema.findByIdAndUpdate(
            cart._id,
            { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
            { session }
          );
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: "Invalid or expired payment session.",
          });
        }

        // FIXED: Add Razorpay signature verification (recommended)
        if (razorpaySignature) {
          const crypto = require('crypto');
          const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_secret')
            .update(razorpayOrderId + '|' + razorpayPaymentId)
            .digest('hex');

          if (expectedSignature !== razorpaySignature) {
            console.log("❌ Razorpay signature verification failed");
            await cartSchema.findByIdAndUpdate(
              cart._id,
              { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
              { session }
            );
            return res.status(STATUS_CODES.BAD_REQUEST).json({
              success: false,
              message: "Payment verification failed. Invalid signature.",
            });
          }
        }

        // Use the stored order data
        const pendingData = cart.pendingOrderData;
        console.log("📊 Using pending order data:", pendingData.orderID);

        // Re-validate product availability before final order creation
        for (let product of pendingData.products) {
          const currentProduct = await productSchema
            .findById(product.productId)
            .session(session);
            
          if (!currentProduct || currentProduct.productQuantity < product.quantity) {
            await cartSchema.findByIdAndUpdate(
              cart._id,
              { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
              { session }
            );
            return res.status(STATUS_CODES.BAD_REQUEST).json({
              success: false,
              message: "Product availability changed during payment. Please try again.",
            });
          }
        }

        // Create the order with payment details
        const order = new orderSchema({
          userId,
          orderID: pendingData.orderID,
          contactInfo: pendingData.contactInfo,
          address: pendingData.address,
          products: pendingData.products,
          totalPrice: pendingData.totalPrice,
          couponDiscount: pendingData.couponDiscount,
          paymentMethod: pendingData.paymentMethod,
          razorpayOrderId: razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId,
          status: "processing",
        });

        await order.save({ session });
        console.log("✅ Order created:", order.orderID);

        // Update product quantities atomically
        for (let product of pendingData.products) {
          await productSchema.findByIdAndUpdate(
            product.productId,
            { $inc: { productQuantity: -product.quantity } },
            { session }
          );
          console.log(`📦 Updated stock for product ${product.productId}: -${product.quantity}`);
        }

        // FIXED: Clear cart and release lock properly
        await cartSchema.findByIdAndUpdate(
          cart._id,
          {
            $set: { items: [] },
            $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 },
          },
          { session }
        );
        console.log("🧹 Cart cleared and lock released");

        return res.status(STATUS_CODES.OK).json({
          success: true,
          order: { orderID: order.orderID },
          message: "Order placed successfully!"
        });
      }

      // Handle Wallet Payment
      if (paymentMethod === "Wallet") {
        console.log("💰 Processing wallet payment...");
        
        const wallet = await walletSchema.findOne({ userId }).session(session);
        if (!wallet || wallet.balance < totalPrice) {
          await cartSchema.findByIdAndUpdate(
            cart._id,
            { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
            { session }
          );
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: `Insufficient wallet balance. Available: ₹${wallet?.balance || 0}, Required: ₹${totalPrice}`,
          });
        }

 // Create the order
        const order = new orderSchema({
          userId,
          orderID,
          contactInfo: { name, email, phone },
          address: addressObj,
          products: orderProducts,
          totalPrice,
          couponDiscount,
          paymentMethod: paymentMethod,
          status: "processing",
        });
        console.log("order:",order)

        await order.save({ session });


        // Deduct from wallet
        await walletSchema.findByIdAndUpdate(
          wallet._id,
          {
            $inc: { balance: -totalPrice },
            $push: {
              transaction: {
                typeOfPayment: "debit",
                date: new Date(),
                amount: totalPrice,
                orderId: order._id,
              },
            },
          },
          { session }
        );

        
        // Update product quantities
        for (let product of orderProducts) {
          await productSchema.findByIdAndUpdate(
            product.productId,
            { $inc: { productQuantity: -product.quantity } },
            { session }
          );
        }

        // Clear cart and release lock
        await cartSchema.findByIdAndUpdate(
          cart._id,
          {
            $set: { items: [] },
            $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 },
          },
          { session }
        );

        return res.status(STATUS_CODES.OK).json({
          success: true,
          order: { orderID: order.orderID },
          message: "Order placed successfully with wallet payment!"
        });
      }

      // Handle COD Payment
      if (paymentMethod === "COD") {
        console.log("📦 Processing COD payment...");
        
        // Added COD amount limit check
        if (totalPrice > 5000) {
          await cartSchema.findByIdAndUpdate(
            cart._id,
            { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
            { session }
          );
          return res.status(400).json({
            success: false,
            message: "COD is not available for orders above ₹5000. Please use other payment methods.",
          });
        }

        // Create the order
        const order = new orderSchema({
          userId,
          orderID,
          contactInfo: { name, email, phone },
          address: addressObj,
          products: orderProducts,
          totalPrice,
          couponDiscount,
          paymentMethod: paymentMethod,
          status: "processing",
        });

        await order.save({ session });

        // Update product quantities
        for (let product of orderProducts) {
          await productSchema.findByIdAndUpdate(
            product.productId,
            { $inc: { productQuantity: -product.quantity } },
            { session }
          );
        }

        // Clear cart and release lock
        await cartSchema.findByIdAndUpdate(
          cart._id,
          {
            $set: { items: [] },
            $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 },
          },
          { session }
        );

        return res.status(STATUS_CODES.OK).json({
          success: true,
          order: { orderID: order.orderID },
          message: "COD order placed successfully!"
        });
      }

      // Handle unknown payment method
      await cartSchema.findByIdAndUpdate(
        cart._id,
        { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
        { session }
      );
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Invalid payment method selected.",
      });

    }); // End transaction
  } catch (error) {
    console.error("❌ Order placement error:", error);

    // Improved error cleanup - always try to release the lock
    try {
      await cartSchema.findOneAndUpdate(
        { userId },
        { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } }
      );
      console.log("🔓 Emergency lock release completed");
    } catch (unlockError) {
      console.error("❌ Error releasing lock:", unlockError);
    }

    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while processing your order. Please try again.",
    });
  } finally {
    await session.endSession();
    console.log("🔚 Database session ended");
  }
});

const paymentFailRazorpay = catchAsync(async (req, res) => {
  const userId = req.session.user;

  try {
    const cart = await cartSchema
      .findOne({ userId })
      .populate("items.productId");

    if (!cart) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Cart not found",
      });
    }

    // FIXED: Use pending order data if available from the main OrderPlaced function
    let orderData;
    
    if (cart.pendingOrderData) {
      console.log("📊 Using stored pending order data for failure handling");
      orderData = cart.pendingOrderData;
    } else {
      console.log("⚠️ No pending order data found, calculating from request body");
      
      // Fallback to calculating from request body and cart
      let {
        name,
        email,
        phone,
        address,
        paymentMethod,
        razorpayOrderId,
        couponCode,
        errorReason
      } = req.body;

      if (!cart.items || cart.items.length === 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Cart is empty",
        });
      }

      let totalPrice = 0;
      let couponDiscount = 0;
      const orderProducts = cart.items.map((product) => {
        const price = Math.round(
          product.productPrice * (1 - (product.productId.productDiscount || 0) / 100)
        );
        totalPrice += price * product.productCount;
        return {
          productId: product.productId._id,
          quantity: product.productCount,
          price: price,
        };
      });

      // FIXED: Better coupon handling with validation
      if (couponCode) {
        const coupon = await couponSchema.findOne({ 
          couponName: couponCode,
          isActive: true,
          expiryDate: { $gte: new Date() }
        });
        
        if (coupon && !coupon.appliedUsers.includes(userId) && totalPrice >= coupon.minAmount) {
          couponDiscount = coupon.discount;
          totalPrice -= couponDiscount;
          
          // FIXED: Only mark coupon as used if we're creating a failed order
          // This is debatable - you might not want to consume coupon for failed payments
          coupon.appliedUsers.push(userId);
          await coupon.save();
        }
      }

      const shippingCharge = totalPrice < 500 ? 50 : 0;
      totalPrice += shippingCharge;

      // FIXED: Better address parsing with validation
      let addressObj = {};
      if (address) {
        let patterns = {
          contactName: /contactName: '([^']+)'/,
          doorNo: /doorNo: (\d+)/,
          Address: /Address: '([^']+)'/,
          areaAddress: /areaAddress: '([^']+)'/,
          pincode: /pincode: (\d+)/,
          landmark: /landmark: '([^']+)'/,
          phone: /phone: (\d+)/,
          addressType: /addressType: '([^']+)'/,
        };

        for (let key in patterns) {
          let match = address.match(patterns[key]);
          if (match) {
            addressObj[key] = isNaN(match[1]) ? match[1] : parseInt(match[1]);
          }
        }
      }

      orderData = {
        orderID: generateRandomOrderId(),
        contactInfo: { name, email, phone },
        address: addressObj,
        products: orderProducts,
        totalPrice,
        couponDiscount,
        paymentMethod,
        razorpayOrderId,
        errorReason: errorReason || 'Payment failed'
      };
    }

    console.log("💔 Creating failed payment order:", orderData.orderID);

    // FIXED: Create failed order with proper status and error information
    const order = new orderSchema({
      userId,
      orderID: orderData.orderID,
      contactInfo: orderData.contactInfo,
      address: orderData.address,
      products: orderData.products,
      totalPrice: orderData.totalPrice,
      couponDiscount: orderData.couponDiscount,
      paymentMethod: orderData.paymentMethod,
      razorpayOrderId: orderData.razorpayOrderId,
      status: "pending", // or "failed" - depending on your order status system
      paymentStatus: "failed",
      failureReason: orderData.errorReason || 'Razorpay payment failed',
      createdAt: new Date()
    });

    await order.save();
    console.log("📝 Failed order saved:", order.orderID);

    // FIXED: Decide whether to clear cart or keep items for retry
    // Option 1: Clear cart (current behavior)
    await cartSchema.findByIdAndUpdate(cart._id, {
      $set: { items: [] },
      $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 },
    });

    // Option 2: Keep cart items for retry (uncomment if preferred)
    // await cartSchema.findByIdAndUpdate(cart._id, {
    //   $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 },
    // });

    console.log("🧹 Cart cleared and lock released after payment failure");

    // FIXED: Return proper JSON response
    res.status(STATUS_CODES.OK).json({
      success: true,
      order: { 
        orderID: order.orderID,
        status: order.status,
        paymentStatus: order.paymentStatus
      },
      message: "Payment failed but order has been saved. You can retry payment later."
    });

  } catch (error) {
    console.error("❌ Payment failure handling error:", error);
    
    // FIXED: Ensure lock is released even if error occurs
    try {
      await cartSchema.findOneAndUpdate(
        { userId },
        { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } }
      );
    } catch (unlockError) {
      console.error("❌ Error releasing lock during payment failure:", unlockError);
    }
    
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error handling payment failure",
    });
  }
});





function generateRandomOrderId() {
  const min = 100000; // Minimum 6-digit number
  const max = 999999; // Maximum 6-digit number
  const orderID = Math.floor(Math.random() * (max - min + 1)) + min;
  return orderID.toString();
}

// FIXED: Enhanced coupon validation
const applycoupon = catchAsync(async (req, res) => {
  const couponName = req.body.couponCode;
  const userId = req.session.user;

  // FIXED: Added input validation
  if (!couponName) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({ 
      error: "Coupon code is required" 
    });
  }

  const coupon = await couponSchema.findOne({ couponName });

  // check if coupon is available
  if (!coupon) {
    return res
      .status(STATUS_CODES.NOT_FOUND)
      .json({ error: "Coupon not found" });
  }

  // check if coupon is expired or inactive
  if (!coupon.isActive || coupon.expiryDate < new Date()) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({ 
      error: "Coupon has expired or is inactive" 
    });
  }

  // check if coupon is already used by user
  if (coupon.appliedUsers.includes(userId)) {
    return res
      .status(STATUS_CODES.BAD_REQUEST)
      .json({ error: "Coupon already used" });
  }

  const cart = await cartSchema.findOne({ userId });

  if (!cart || !cart.items || cart.items.length === 0) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      error: "Your cart is empty"
    });
  }

  let totalPrice = cart.payableAmount || 0;

  if (totalPrice < coupon.minAmount) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      error: `Minimum purchase amount of ₹${coupon.minAmount} not reached. Please add more items to your cart.`,
    });
  }

  // apply the discount
  const couponDiscount = Math.min(coupon.discount, totalPrice);
  const discountedTotal = totalPrice - couponDiscount;

  res.status(STATUS_CODES.OK).json({ 
    totalPrice: discountedTotal, 
    couponDiscount,
    message: "Coupon applied successfully"
  });
});

const orderConfirm = catchAsync(async (req, res) => {
  res.render("user/orderConfirm", { title: "order-confirm-page" });
});

module.exports = {
  checkout,
  addcheckoutAddress,
  deletecheckoutAddress,
  OrderPlaced,
  applycoupon,
  orderConfirm,
  paymentFailRazorpay,
};