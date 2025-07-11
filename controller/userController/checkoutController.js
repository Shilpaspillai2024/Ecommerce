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
const STATUS_CODES=require("../../constants/statusCodes")

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

  if (!cartDetails) {
    req.flash("errorMessage", "The cart is empty, please go to the shop");

    return res.redirect("/cart");
  }

  const cartItems = cartDetails.items;

  if (wallet) {
    balance = wallet.balance;
  }
  let total = 0;

  for (product of cartItems) {
    let currentProduct = await productSchema.findById(product.productId);

    // total += product.productCount * product.productId.productDiscountPrice

    total += Math.round(
      product.productPrice *
        (1 - product.productId.productDiscount / 100) *
        product.productCount
    );

    if (currentProduct.productQuantity <= 0) {
      return res.redirect("/cart");
    }
  }

  // add shipping charge if total lessthan 500
  const shippingCharge = total < 500 ? 50 : 0;

  // const shippingCharge=total>500 ? 0 :50;
  // const payableAmount=Math.round(total+shippingCharge);

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

  req.flash("errorMessage", " address added successfully");

  res.redirect("/checkout");

  // }
  // catch (err) {
  //     console.error(`Error during adding address to DB: ${err}`);
  //     req.flash('errorMessage', err.message || 'Failed to add address. Please try again later.');
  //     res.redirect('/checkout');

  // }
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
    return res.redirect("/checkoutaddress");
  }
  await addressSchema.deleteOne({ _id: addressId });

  req.flash("errorMessage", "Address deleted successfully");
  res.redirect("/checkout");

  // } catch (err) {
  //     console.error(`Error during deleting address from DB: ${err}`);
  //     req.flash('errorMessage', err.message || 'Failed to delete address. Please try again later.');
  //     res.redirect('/checkout');

  // }
});

const OrderPlaced = catchAsync(async (req, res) => {
  const userId = req.session.user;

  let {
    name,
    email,
    phone,
    address,
    paymentMethod,
    razorpayOrderId,
    couponCode,
  } = req.body;

  const cart = await cartSchema.findOne({ userId }).populate("items.productId");

  if (!cart || cart.items.length === 0) {
    return res.status(404).send("Cart is empty or not found ");
  }
  let totalPrice = 0;
  let couponDiscount = 0;
  const orderProducts = cart.items.map((product) => {
    const price = Math.round(
      product.productPrice * (1 - product.productId.productDiscount / 100)
    );

    //okay
    // const price = product.productPrice

    totalPrice += price * product.productCount;
    return {
      productId: product.productId._id,
      quantity: product.productCount,
      price: price,
    };
  });

  if (couponCode) {
    const coupon = await couponSchema.findOne({ couponName: couponCode });

    couponDiscount = coupon.discount;
    totalPrice -= couponDiscount;

    // Mark the coupon as used by the user
    coupon.appliedUsers.push(userId);
    await coupon.save();
  }

  // Add shipping charge if total price is less than 500
  const shippingCharge = totalPrice < 500 ? 50 : 0;
  totalPrice += shippingCharge;

  // in addressSchema i refer userschema,and in orderschema the address stored as a string(it contain objectid ) ,it take as a object need this for address

  let addressObj = {};

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
  const orderID = generateRandomOrderId();

  //  payment method is wallet

  if (paymentMethod === "Wallet") {
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
    await order.save();
    const wallet = await walletSchema.findOne({ userId });
    if (wallet) {
      wallet.balance -= totalPrice.toFixed(2);
      wallet.transaction.push({
        typeOfPayment: "debit",
        date: Date.now(),
        amount: totalPrice.toFixed(2),
        orderId: order.id,
      });

      await wallet.save();
    }

    for (let product of orderProducts) {
      await productSchema.findByIdAndUpdate(product.productId, {
        $inc: { productQuantity: -product.quantity },
      });
    }
    cart.items = [];
    await cart.save();

    res.json({ success: true });
  } else if (paymentMethod === "COD") {
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

    await order.save();

    for (let product of orderProducts) {
      await productSchema.findByIdAndUpdate(product.productId, {
        $inc: { productQuantity: -product.quantity },
      });
    }

    cart.items = [];
    await cart.save();

    res.json({ success: true });
  } else if (paymentMethod === "razorpay" && razorpayOrderId) {
    try {
      const order = new orderSchema({
        userId,
        orderID,
        contactInfo: { name, email, phone },
        address: addressObj,
        products: orderProducts,
        totalPrice,
        couponDiscount,
        paymentMethod: paymentMethod,
        razorpayOrderId, // Save the Razorpay order ID
        status: "processing",
      });

      await order.save();

      for (let product of orderProducts) {
        await productSchema.findByIdAndUpdate(product.productId, {
          $inc: { productQuantity: -product.quantity },
        });
      }

      cart.items = [];
      await cart.save();
      res.status(STATUS_CODES.OK).json(order);
    } catch (err) {
      console.error(`Error creating Razorpay order: ${JSON.stringify(err)}`);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("Error creating Razorpay order");
    }
  } else if (paymentMethod === "razorpay") {
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: totalPrice * 100,
        currency: "INR",
        receipt: "receipt#1",
      });

      return res.status(STATUS_CODES.OK).json({ razorpayOrderId: razorpayOrder.id });
    } catch (err) {
      console.error(`Error creating Razorpay order: ${JSON.stringify(err)}`);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("Error creating Razorpay order");
    }
  }
});

// function generateRandomOrderId() {
//     const timestamp = Date.now().toString(36);
//     const randomString = Math.random().toString(36).substring(2, 8);
//     return timestamp + randomString;
// }

function generateRandomOrderId() {
  const min = 100000; // Minimum 6-digit number
  const max = 999999; // Maximum 6-digit number
  const orderID = Math.floor(Math.random() * (max - min + 1)) + min;
  return orderID.toString();
}

// if razorpay payment fail

const paymentFailRazorpay = catchAsync(async (req, res) => {
  const userId = req.session.user;

  let {
    name,
    email,
    phone,
    address,
    paymentMethod,
    razorpayOrderId,
    couponCode,
  } = req.body;

  const cart = await cartSchema.findOne({ userId }).populate("items.productId");

  if (!cart || cart.items.length === 0) {
    return res.status(404).send("Cart is empty or not found ");
  }
  let totalPrice = 0;
  let couponDiscount = 0;
  const orderProducts = cart.items.map((product) => {
    // const price = product.productId.productDiscountPrice;

    const price = Math.round(
      product.productPrice * (1 - product.productId.productDiscount / 100)
    );

    totalPrice += price * product.productCount;
    return {
      productId: product.productId._id,
      quantity: product.productCount,
      price: price,
    };
  });

  if (couponCode) {
    const coupon = await couponSchema.findOne({ couponName: couponCode });

    couponDiscount = coupon.discount;
    totalPrice -= couponDiscount;

    // Mark the coupon as used by the user
    coupon.appliedUsers.push(userId);
    await coupon.save();
  }

  // Add shipping charge if total price is less than 500
  const shippingCharge = totalPrice < 500 ? 50 : 0;
  totalPrice += shippingCharge;

  let addressObj = {};

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
  const orderID = generateRandomOrderId();
  const order = new orderSchema({
    userId,
    orderID,
    contactInfo: { name, email, phone },
    address: addressObj,
    products: orderProducts,
    totalPrice,
    couponDiscount,
    paymentMethod: paymentMethod,
    status: "pending",
  });

  await order.save();

  cart.items = [];
  await cart.save();

  res.status(STATUS_CODES.OK).json(order);
});

const applycoupon = catchAsync(async (req, res) => {
  const couponName = req.body.couponCode;
  const userId = req.session.user;

  const coupon = await couponSchema.findOne({ couponName });

  // check the cupon is avilable
  if (!coupon) {
    return res.status(STATUS_CODES.NOT_FOUND).json({ error: "Coupon not found" });
  }
  // check the coupon is expired

  if (!coupon.isActive || coupon.expiryDate < new Date()) {
    return res.status(STATUS_CODES.NOT_FOUND).json({ error: "coupon expired" });
  }

  // check the coupon is already used by user

  if (coupon.appliedUsers.includes(userId)) {
    return res.status(STATUS_CODES.BAD_REQUEST).json({ error: "Coupon already used" });
  }

  const cart = await cartSchema.findOne({ userId });

  let totalPrice = cart.payableAmount;

  if (totalPrice < coupon.minAmount) {
    return res
      .status(STATUS_CODES.BAD_REQUEST)
      .json({
        error:
          "Minimum purchase limit not reached. Please add more items to your cart.",
      });
  }

  // apply the discount

  const couponDiscount = coupon.discount;
  const discountedTotal = totalPrice - couponDiscount;

  res.status(STATUS_CODES.OK).json({ totalPrice: discountedTotal, couponDiscount });
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
