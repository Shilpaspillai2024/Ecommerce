const cartSchema = require("../../model/cartSchema");
const productSchema = require("../../model/productSchema");
const catchAsync = require("../../utils/catchAsync");
const STATUS_CODES=require("../../constants/statusCodes")

const cart = catchAsync(async (req, res, next) => {
  const cart = await cartSchema
    .findOne({ userId: req.session.user })
    .populate("items.productId");

  let totalPrice = 0;
  let totalPriceWithoutDiscount = 0;
  let cartItemCount = 0;

  if (cart) {
    // Iterate over each cart item to calculate total prices and item count
    cart.items.forEach((ele) => {
      const productPrice = ele.productId.productPrice;
      const productCount = ele.productCount;
      const productDiscount = ele.productId.productDiscount;

      const discountPrice =
        productDiscount > 0
          ? productPrice * productCount * (1 - productDiscount / 100)
          : productPrice * productCount;

      totalPrice += discountPrice;
      totalPriceWithoutDiscount += productPrice * ele.productCount;
      cartItemCount += ele.productCount;
    });

    // Check if the calculated total prices differ from the stored values, update if necessary
    if (
      cart.payableAmount !== Math.round(totalPrice) ||
      cart.totalPrice !== Math.round(totalPriceWithoutDiscount)
    ) {
      cart.payableAmount = Math.round(totalPrice);
      cart.totalPrice = Math.round(totalPriceWithoutDiscount);
      await cart.save();
    }
  }

  res.render("user/cart", {
    title: "cart",
    cart,
    totalPrice,
    cartItemCount,
    totalPriceWithoutDiscount,
    alertMessage: req.flash("errorMessage"),
    user: req.session.user,
  });
});

// add product to cart

const addToCartPost = catchAsync(async (req, res,next) => {
  const productId = req.params.id;
  const userId = req.session.user;
  const productPrice = parseInt(req.query.price);
  const productQuantity = 1;

  // Find the product from the collection
  const actualProductDetails = await productSchema.findById(productId);

  if (actualProductDetails.productQuantity <= 0) {
    return res.status(404).json({ error: "Product is out of stock" });
  }

  // Check if the user already has a cart
  const checkUserCart = await cartSchema
    .findOne({ userId: req.session.user })
    .populate("items.productId");

  if (checkUserCart) {
    let productExist = false;

    // Check if the product already exists in the cart
    checkUserCart.items.forEach((ele) => {
      if (ele.productId && ele.productId.id === productId) {
        productExist = true;
      }
    });

    if (!productExist) {
      checkUserCart.items.push({
        productId: actualProductDetails._id,
        productCount: 1,
        productPrice: productPrice,
      });
    }

    await checkUserCart.save();
  } else {
    const newCart = new cartSchema({
      userId: userId,
      items: [
        {
          productId: actualProductDetails._id,
          productCount: 1,
          productPrice: productPrice,
        },
      ],
    });

    await newCart.save();
  }

  return res.status(STATUS_CODES.OK).json({ message: "Product added to cart" });
});

// remove product from cart

const removeCartItem = catchAsync(async (req, res,next) => {
  productId = req.params.id;

  const cartItems = await cartSchema
    .findOne({ userId: req.session.user })
    .populate("items.productId");

  if (cartItems === null) {
    return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, error: "Cart not found" });
  }

  // filter out the cart products without the removed products
  const newCart = cartItems.items.filter((ele) => {
    if (ele.productId.id != productId) {
      return ele;
    }
  });
  cartItems.items = newCart;

  await cartItems.save();

  return res
    .status(STATUS_CODES.OK)
    .json({ success: true, message: "Product removed from cart" });
});

//increment product

const incrementProduct = catchAsync(async (req, res,next) => {
  
    const productId = req.params.productId;
    const productQuantity = req.body.quantity;

    const product = await productSchema.findById(productId);

    if (!productQuantity) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ error: "Product quantity not found" });
    }

    if (productQuantity >= product.productQuantity) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ error: "Product is not in that much count, please decrement" });
    }

    const cart = await cartSchema
      .findOne({ userId: req.session.user })
      .populate("items.productId");

    const productCart = cart.items.find(
      (ele) => ele.productId.id === productId
    );

    if (productCart) {
      productCart.productCount += 1;

      let totalPrice = 0;
      let productTotal = 0;
      let totalPriceWithoutDiscount = 0;

      cart.items.forEach((ele) => {
        const productPrice = ele.productId.productPrice;
        const productCount = ele.productCount;
        const productDiscount = ele.productId.productDiscount;

        const discountPrice =
          productDiscount > 0
            ? productPrice * productCount * (1 - productDiscount / 100)
            : productPrice * productCount;

        totalPrice += discountPrice;
        totalPriceWithoutDiscount += productPrice * productCount;

        if (ele.productId.id === productId) {
          productTotal = discountPrice;
        }
      });

      cart.payableAmount = Math.round(totalPrice);
      cart.totalPrice = Math.round(totalPriceWithoutDiscount);

      await cart.save();

      let savings = totalPriceWithoutDiscount - totalPrice;

      return res.status(STATUS_CODES.OK).json({
        productCount: productCart.productCount,
        productTotal: productTotal,

        total: totalPrice,
        subTotal: totalPriceWithoutDiscount,
        savings: savings,
      });
    } else {
      return res.status(STATUS_CODES.NOT_FOUND).json({ error: "Product not found in cart" });
    }
 
});

// decremet product
const decrementProduct =catchAsync(async (req, res,next) => {
  
    const productId = req.params.productId;
    const productQuantity = req.body.quantity;

    if (!productQuantity) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ error: "Product quantity not found" });
    }

    const cart = await cartSchema
      .findOne({ userId: req.session.user })
      .populate("items.productId");

    const productCart = cart.items.find(
      (ele) => ele.productId.id === productId
    );

    if (productCart) {
      if (productCart.productCount > 1) {
        productCart.productCount -= 1;

        let totalPrice = 0;
        let productTotal = 0;
        let totalPriceWithoutDiscount = 0;

        cart.items.forEach((ele) => {
          const productPrice = ele.productId.productPrice;
          const productCount = ele.productCount;
          const productDiscount = ele.productId.productDiscount;

          const discountPrice =
            productDiscount > 0
              ? productPrice * productCount * (1 - productDiscount / 100)
              : productPrice * productCount;

          totalPrice += discountPrice;
          totalPriceWithoutDiscount += productPrice * productCount;

          if (ele.productId.id === productId) {
            productTotal = discountPrice;
          }
        });

        cart.payableAmount = Math.round(totalPrice);
        cart.totalPrice = Math.round(totalPriceWithoutDiscount);

        await cart.save();

        let savings = totalPriceWithoutDiscount - totalPrice;

        return res.status(STATUS_CODES.OK).json({
          productCount: productCart.productCount,
          productTotal: productTotal,

          total: totalPrice,
          subTotal: totalPriceWithoutDiscount,
          savings: savings,
        });
      } else {
        return res
          .status(STATUS_CODES.NOT_FOUND)
          .json({ error: "Cannot decrement, only one product left" });
      }
    } else {
      return res.status(STATUS_CODES.NOT_FOUND).json({ error: "Product not found in cart" });
    }
 
});

module.exports = {
  cart,
  addToCartPost,
  incrementProduct,
  decrementProduct,

  removeCartItem,
};
