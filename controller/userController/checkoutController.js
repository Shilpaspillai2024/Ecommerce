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
  let balance = 0;

  // Check for empty cart items
  if (!cartDetails || !cartDetails.items || cartDetails.items.length === 0) {
    req.flash("errorMessage", "The cart is empty, please go to the shop");
    return res.redirect("/cart");
  }

  const cartItems = cartDetails.items;

  if (wallet) {
    balance = wallet.balance;
  }

  // Calculate original total from cart items
  let originalTotal = 0;

  // Stock validation and total calculation
  for (const product of cartItems) {
    if (!product.productId) {
      req.flash(
        "errorMessage",
        "Some products in your cart are no longer available"
      );
      return res.redirect("/cart");
    }

    const currentProduct = await productSchema.findById(
      product.productId._id || product.productId
    );

    if (!currentProduct) {
      req.flash("errorMessage", "Some products are no longer available");
      return res.redirect("/cart");
    }

    if (currentProduct.productQuantity < product.productCount) {
      req.flash(
        "errorMessage",
        `${currentProduct.productName} has insufficient stock (Available: ${currentProduct.productQuantity}, Requested: ${product.productCount})`
      );
      return res.redirect("/cart");
    }

    // Calculate price with product discount
    const discountedPrice = Math.round(
      product.productPrice * (1 - product.productId.productDiscount / 100)
    );
    originalTotal += discountedPrice * product.productCount;
  }

  console.log("Original total:", originalTotal);

  

  let subtotalAfterCoupon = originalTotal;
  // Only use payableAmount if it is a valid discount (less than originalTotal and > 0)
  if (
    cartDetails.payableAmount !== undefined &&
    cartDetails.payableAmount > 0 &&
    cartDetails.payableAmount < originalTotal
  ) {
    subtotalAfterCoupon = cartDetails.payableAmount;
  }
  let couponDiscount = originalTotal - subtotalAfterCoupon;

  // Calculate shipping based on subtotal AFTER coupon discount
  const shippingCharge = subtotalAfterCoupon < 500 ? 50 : 0;

  // Calculate final total
  const finalTotal = Math.round(subtotalAfterCoupon + shippingCharge);

 

  res.render("user/checkout", {
    title: "checkout-page",
    cartDetails,
    cartItems,
    user: req.session.user,
    alertMessage: req.flash("errorMessage"),
    address,
    balance,
    originalTotal, // Pass original total
    subtotalAfterCoupon, // Amount after coupon
    couponDiscount, // Discount amount
    shippingCharge, // Shipping charge
    total: finalTotal, // Final total with shipping
  });
});

const addcheckoutAddress = catchAsync(async (req, res) => {
  const userId = req.session.user;

  //  Added input validation
  if (
    !req.body.contactName ||
    !req.body.doorNo ||
    !req.body.homeAddress ||
    !req.body.phone ||
    !req.body.pincode
  ) {
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
      lockedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) },
    },
    {
      $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 },
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

      

      let cart;

      if (
        paymentMethod === "razorpay" &&
        razorpayOrderId &&
        razorpayPaymentId
      ) {
        // For Razorpay payment completion - find the cart with pending order data
        console.log("🔍 Looking for cart with pending Razorpay order...");
        cart = await cartSchema
          .findOne({
            userId,
            isLocked: true,
            "pendingOrderData.razorpayOrderId": razorpayOrderId,
          })
          .populate("items.productId")
          .session(session);

        if (!cart) {
          console.log(
            "🔍 No pending order found, checking for any locked cart..."
          );
          cart = await cartSchema
            .findOne({
              userId,
              isLocked: true,
            })
            .populate("items.productId")
            .session(session);

          if (
            cart &&
            cart.pendingOrderData?.razorpayOrderId !== razorpayOrderId
          ) {
            console.log(
              "⚠️ Different Razorpay order ID found, clearing stale data"
            );
            await cartSchema.findByIdAndUpdate(
              cart._id,
              {
                $unset: { pendingOrderData: 1 },
              },
              { session }
            );
            cart.pendingOrderData = undefined;
          }
        }

        console.log("📋 Found cart for completion:", cart?._id);
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

      if (!cart) {
        let errorMessage;
        if (
          paymentMethod === "razorpay" &&
          razorpayOrderId &&
          razorpayPaymentId
        ) {
          const anyCart = await cartSchema.findOne({ userId }).session(session);
          if (!anyCart) {
            errorMessage =
              "Cart not found. Please refresh the page and try again.";
          } else {
            errorMessage =
              "Payment session not found. Please initiate payment again.";
          }
        } else {
          errorMessage =
            "Another checkout is already in progress. Please wait and try again.";
        }

        return res.status(STATUS_CODES.TOO_MANY_REQUESTS).json({
          success: false,
          message: errorMessage,
        });
      }

      // Check if cart is empty (only for new checkouts, not payment completion)
      if (
        (!razorpayOrderId || !razorpayPaymentId) &&
        (!cart.items || cart.items.length === 0)
      ) {
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
      let shippingCharge=0

      // Calculate order products only for new checkouts
      if (!razorpayOrderId || !razorpayPaymentId) {
        let originalSubtotal = 0;
        orderProducts = cart.items.map((product) => {
          const productDiscount = product.productId.productDiscount || 0;
          const price = Math.round(
            product.productPrice * (1 - productDiscount / 100)
          );
          originalSubtotal += price * product.productCount;
          return {
            productId: product.productId._id,
            quantity: product.productCount,
            price: price,
          };
        });

        
        let subtotalAfterCoupon = originalSubtotal;
     

         // Only apply coupon if payableAmount is valid and represents a discount
        if (
          typeof cart.payableAmount === "number" && 
          cart.payableAmount > 0 && 
          cart.payableAmount < originalSubtotal
        ) {
          subtotalAfterCoupon = cart.payableAmount;
          couponDiscount = originalSubtotal - subtotalAfterCoupon;
        } else {
          // If no valid coupon, reset payableAmount to avoid issues
          subtotalAfterCoupon = originalSubtotal;
          couponDiscount = 0;
        }

        
        shippingCharge = subtotalAfterCoupon < 500 ? 50 : 0
        totalPrice = subtotalAfterCoupon + shippingCharge;

     

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
      }

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

      console.log("orderId",orderID)

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
                  shippingCharge,
                  couponDiscount,
                  paymentMethod,
                  razorpayOrderId: razorpayOrder.id,
                  createdAt: new Date(),
                },
              },
            },
            { session }
          );

        

          return res.status(STATUS_CODES.OK).json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: totalPrice * 100,
            message: "Razorpay order created successfully",
          });
        } catch (error) {
          console.error("❌ Razorpay order creation failed:", error);
          await cartSchema.findByIdAndUpdate(
            cart._id,
            { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
            { session }
          );
          throw error;
        }
      }

      // Handle Razorpay Payment - Second Call (Complete Payment)
      if (
        paymentMethod === "razorpay" &&
        razorpayOrderId &&
        razorpayPaymentId
      ) {
        console.log("💳 Processing Razorpay payment completion...");

        let pendingData;

        if (
          cart.pendingOrderData &&
          cart.pendingOrderData.razorpayOrderId === razorpayOrderId
        ) {
          pendingData = cart.pendingOrderData;
          console.log(
            "📊 Using stored pending order data:",
            pendingData.orderID
          );
        } else {
          console.log(
            "⚠️ No valid pending data, reconstructing order from current cart"
          );

          if (!cart.items || cart.items.length === 0) {
            await cartSchema.findByIdAndUpdate(
              cart._id,
              { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
              { session }
            );
            return res.status(STATUS_CODES.BAD_REQUEST).json({
              success: false,
              message: "Cart is empty. Please add items and try again.",
            });
          }

          // Reconstruct from current cart state
          let recalcOriginalTotal = 0;
          const recalcOrderProducts = cart.items.map((product) => {
            const productDiscount = product.productId.productDiscount || 0;
            const price = Math.round(
              product.productPrice * (1 - productDiscount / 100)
            );
            recalcOriginalTotal += price * product.productCount;
            return {
              productId: product.productId._id,
              quantity: product.productCount,
              price: price,
            };
          });

          let recalcSubtotalAfterCoupon = recalcOriginalTotal;
          let recalcCouponDiscount = 0;

          // Use cart's payableAmount if available
          if (
            cart.payableAmount &&
            cart.payableAmount > 0 &&
            cart.payableAmount < recalcOriginalTotal
          ) {
            recalcSubtotalAfterCoupon = cart.payableAmount;
            recalcCouponDiscount = recalcOriginalTotal - cart.payableAmount;
          }

          const recalcShippingCharge = recalcSubtotalAfterCoupon < 500 ? 50 : 0;
          const recalcTotalPrice =
            recalcSubtotalAfterCoupon + recalcShippingCharge;

          pendingData = {
            orderID: generateRandomOrderId(),
            contactInfo: { name, email, phone },
            address: addressObj,
            products: recalcOrderProducts,
            totalPrice: recalcTotalPrice,
            couponDiscount: recalcCouponDiscount,
            paymentMethod,
          };

          console.log("🔄 Reconstructed order data:", pendingData.orderID);
        }

        // Razorpay signature verification
        if (razorpaySignature) {
          const crypto = require("crypto");
          const expectedSignature = crypto
            .createHmac(
              "sha256",
              process.env.RAZORPAY_KEY_SECRET || "your_razorpay_secret"
            )
            .update(razorpayOrderId + "|" + razorpayPaymentId)
            .digest("hex");

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

        // Re-validate product availability
        for (let product of pendingData.products) {
          const currentProduct = await productSchema
            .findById(product.productId)
            .session(session);

          if (
            !currentProduct ||
            currentProduct.productQuantity < product.quantity
          ) {
            await cartSchema.findByIdAndUpdate(
              cart._id,
              { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
              { session }
            );
            return res.status(STATUS_CODES.BAD_REQUEST).json({
              success: false,
              message:
                "Product availability changed during payment. Please try again.",
            });
          }
        }

        // Create the order
        const order = new orderSchema({
          userId,
          orderID: pendingData.orderID||generateRandomOrderId(),
          contactInfo: pendingData.contactInfo,
          address: pendingData.address,
          products: pendingData.products,
          totalPrice: pendingData.totalPrice,
          shippingCharge:pendingData.shippingCharge,
          couponDiscount: pendingData.couponDiscount,
          paymentMethod: pendingData.paymentMethod,
          razorpayOrderId: razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId,
          status: "processing",
        });

        await order.save({ session });
        console.log("✅ Order created:", order.orderID);

        // Update product quantities
        for (let product of pendingData.products) {
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
            $unset: {
              isLocked: 1,
              lockedAt: 1,
              pendingOrderData: 1,
              payableAmount: 1,
              totalPrice: 1,
            },
          },
          { session }
        );

        return res.status(STATUS_CODES.OK).json({
          success: true,
          order: { orderID: order.orderID },
          message: "Order placed successfully!",
        });
      }

      // Handle Cash On Delivery (COD)
      if (paymentMethod && paymentMethod.toLowerCase() === "cod") {
        console.log("💰 Processing COD order...");

        // Create the order
        const order = new orderSchema({
          userId,
          orderID,
          contactInfo: { name, email, phone },
          address: addressObj,
          products: orderProducts,
          totalPrice,
          shippingCharge,
          couponDiscount,
          paymentMethod: "cod",
          status: "processing",
        });

        await order.save({ session });
        console.log("✅ COD Order created:", order.orderID);
        console.log("order",order)

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
            $unset: {
              isLocked: 1,
              lockedAt: 1,
              pendingOrderData: 1,
              payableAmount: 1,
              totalPrice: 1,
            },
          },
          { session }
        );

        return res.status(STATUS_CODES.OK).json({
          success: true,
          order: { orderID: order.orderID },
          message: "Order placed successfully!",
        });
      }

      // Handle Wallet Payment
      if (paymentMethod && paymentMethod.toLowerCase() === "wallet") {
        console.log("💳 Processing wallet payment...");

        // Check wallet balance using wallet schema
        const wallet = await walletSchema.findOne({ userId }).session(session);
        if (!wallet || wallet.balance < totalPrice) {
          await cartSchema.findByIdAndUpdate(
            cart._id,
            { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
            { session }
          );
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: `Insufficient wallet balance. Available: ₹${
              wallet?.balance || 0
            }, Required: ₹${totalPrice}`,
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
          shippingCharge,
          couponDiscount,
          paymentMethod: "wallet",
          status: "processing",
        });

        await order.save({ session });
      

        // Deduct from wallet and add transaction record
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
            $unset: {
              isLocked: 1,
              lockedAt: 1,
              pendingOrderData: 1,
              payableAmount: 1,
              totalPrice: 1,
            },
          },
          { session }
        );

        return res.status(STATUS_CODES.OK).json({
          success: true,
          order: { orderID: order.orderID },
          message: "Order placed successfully with wallet payment!",
        });
      }

      // If no valid payment method found
      await cartSchema.findByIdAndUpdate(
        cart._id,
        { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } },
        { session }
      );

      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Invalid payment method",
      });
    }); // End transaction
  } catch (error) {
    console.error("❌ Order placement error:", error);

    // Emergency lock release
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
      message:
        "An error occurred while processing your order. Please try again.",
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

    let orderData;

    if (cart.pendingOrderData) {
      console.log("📊 Using stored pending order data for failure handling");
      orderData = cart.pendingOrderData;
    } else {
      console.log(
        "⚠️ No pending order data found, calculating from request body"
      );

      let {
        name,
        email,
        phone,
        address,
        paymentMethod,
        razorpayOrderId,
        couponCode,
        errorReason,
      } = req.body;

      if (!cart.items || cart.items.length === 0) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Cart is empty",
        });
      }

      let originalSubtotal = 0;
      const orderProducts = cart.items.map((product) => {
        const productDiscount = product.productId.productDiscount || 0;
        const price = Math.round(
          product.productPrice * (1 - productDiscount / 100)
        );
        originalSubtotal += price * product.productCount;
        return {
          productId: product.productId._id,
          quantity: product.productCount,
          price: price,
        };
      });

      // Calculate totals
      let subtotalAfterCoupon =
        typeof cart.payableAmount === "number" && cart.payableAmount > 0
          ? cart.payableAmount
          : originalSubtotal;
      let couponDiscount = Math.max(0, originalSubtotal - subtotalAfterCoupon);
      const shippingCharge = subtotalAfterCoupon < 500 ? 50 : 0;
      let totalPrice = subtotalAfterCoupon + shippingCharge;

      // Parse address
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
        shippingCharge,
        couponDiscount,
        paymentMethod,
        razorpayOrderId,
        errorReason: errorReason || "Payment failed",
      };
    }

    console.log(" Creating failed payment order:", orderData.orderID);

    // Create failed order with proper status
    const order = new orderSchema({
      userId,
      orderID: orderData.orderID,
      contactInfo: orderData.contactInfo,
      address: orderData.address,
      products: orderData.products,
      totalPrice: orderData.totalPrice,
      shippingCharge:orderData.shippingCharge,
      couponDiscount: orderData.couponDiscount,
      paymentMethod: orderData.paymentMethod,
      razorpayOrderId: orderData.razorpayOrderId,
      status: "pending", // or "failed" depending on your order status system
      paymentStatus: "failed",
      failureReason: orderData.errorReason,
    });

    await order.save();

    // Clear pending order data but keep cart items and lock
    await cartSchema.findByIdAndUpdate(cart._id, {
      $unset: { 
        pendingOrderData: 1,
        isLocked: 1,
        lockedAt: 1
      },
    });

    console.log("✅ Failed order created:", order.orderID);

    return res.status(STATUS_CODES.OK).json({
      success: true,
      order: { orderID: order.orderID },
      message: "Payment failed. Order saved for retry.",
    });
  } catch (error) {
    console.error("❌ Payment failure handling error:", error);
    
    // Clear locks on error
    try {
      await cartSchema.findOneAndUpdate(
        { userId },
        { $unset: { isLocked: 1, lockedAt: 1, pendingOrderData: 1 } }
      );
    } catch (unlockError) {
      console.error(" Error releasing lock:", unlockError);
    }

    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while handling payment failure.",
    });
  }
});



function generateRandomOrderId() {
   const prefix = "ord";

  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); 
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  
  const randomNum = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");

  return `${prefix}${dateStr}-${randomNum}`;
}



const applycoupon = catchAsync(async (req, res) => {
  const couponName = req.body.couponCode;
  const userId = req.session.user;

  // FIXED: Added input validation
  if (!couponName) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      error: "Coupon code is required",
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
      error: "Coupon has expired or is inactive",
    });
  }

  // check if coupon is already used by user
  if (coupon.appliedUsers.includes(userId)) {
    return res
      .status(STATUS_CODES.BAD_REQUEST)
      .json({ error: "Coupon already used" });
  }

  const cart = await cartSchema.findOne({ userId }).populate("items.productId");

  if (!cart || !cart.items || cart.items.length === 0) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      error: "Your cart is empty",
    });
  }

  // Calculate original total from cart items (not from payableAmount)
  let originalTotal = 0;
  for (const item of cart.items) {
    const discountedPrice = Math.round(
      item.productPrice * (1 - item.productId.productDiscount / 100)
    );
    originalTotal += discountedPrice * item.productCount;
  }

  if (originalTotal < coupon.minAmount) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      error: `Minimum purchase amount of ₹${coupon.minAmount} not reached. Please add more items to your cart.`,
    });
  }

  // Apply the discount correctly (flat discount, not percent)
  const couponDiscount = Math.min(coupon.discount, originalTotal);
  const discountedTotal = originalTotal - couponDiscount;

  // Only update fields that exist in cartSchema
  await cartSchema.updateOne(
    { userId },
    {
      payableAmount: discountedTotal, // Store amount after coupon
    }
  );

  // Add user to coupon's appliedUsers
  await couponSchema.updateOne(
    { couponName },
    { $addToSet: { appliedUsers: userId } }
  );

  // Calculate shipping charge based on discounted total
  const shippingCharge = discountedTotal < 500 ? 50 : 0;
  const finalTotal = Math.round(discountedTotal + shippingCharge);

  res.status(STATUS_CODES.OK).json({
    originalTotal,
    subtotalAfterCoupon: discountedTotal,
    couponDiscount,
    shippingCharge,
    totalPrice: finalTotal,
    message: "Coupon applied successfully",
  });
});

// Also add a remove coupon function
const removecoupon = catchAsync(async (req, res) => {
  const userId = req.session.user;

  // Get the cart to recalculate original total
  const cart = await cartSchema.findOne({ userId }).populate("items.productId");

  if (!cart) {
    return res.status(STATUS_CODES.NOT_FOUND).json({
      error: "Cart not found",
    });
  }

  // Recalculate original total
  let originalTotal = 0;
  for (const item of cart.items) {
    const discountedPrice = Math.round(
      item.productPrice * (1 - item.productId.productDiscount / 100)
    );
    originalTotal += discountedPrice * item.productCount;
  }

  // Remove coupon data from cart and reset to original total
  await cartSchema.updateOne(
    { userId },
    {
      $unset: {
        payableAmount: 1,
      },
    }
  );

  // Optionally remove user from coupon's appliedUsers (if you want to allow re-use)
  await couponSchema.updateMany(
    { appliedUsers: userId },
    { $pull: { appliedUsers: userId } }
  );

  res.status(STATUS_CODES.OK).json({
    success: true,
    message: "Coupon removed successfully",
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
  removecoupon,
  orderConfirm,
  paymentFailRazorpay,
};
