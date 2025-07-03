const cartSchema=require('../model/cartSchema')
const wishlistSchema=require('../model/wishlistSchema') 

const setUserData=async(req,res,next)=>{
    try {
        const userId=req.session?.user;

        res.locals.user=userId || null;

        if (userId) {
            const cart = await cartSchema.findOne({ userId });
            res.locals.cartItemCount = cart
                ? cart.items.reduce((count, item) => count + item.productCount, 0)
                : 0;

            const wishlist = await wishlistSchema.findOne({ userId });
            res.locals.wishlistItemCount = wishlist?.products?.length || 0;

        } else {
            res.locals.cartItemCount = 0;
            res.locals.wishlistItemCount = 0;
        }

        next();
        
    } catch (error) {
        console.error('Error in setUserData middleware:', err);
        res.locals.cartItemCount = 0;
        res.locals.wishlistItemCount = 0;
        res.locals.user = null;
        next();
    }
}

module.exports =setUserData;

