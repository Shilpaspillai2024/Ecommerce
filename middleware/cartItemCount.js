const cartSchema=require('../model/cartSchema')
const userSchema=require('../model/userSchema')
const productSchema=require('../model/productSchema')


// middleware/setCartItemCount.js


const setCartItemCount = async (req, res, next) => {
    if (req.session && req.session.user) {
        const cart = await cartSchema.findOne({ userId: req.session.user });
        res.locals.cartItemCount = cart ? cart.items.reduce((count, item) => count + item.productCount, 0) : 0;
    } else {
        res.locals.cartItemCount = 0;
    }
    next();
};

module.exports = setCartItemCount;

