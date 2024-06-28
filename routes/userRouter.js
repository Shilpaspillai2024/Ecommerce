const express = require('express')

const userSchema = require('../model/userSchema')

const checkUserSession = require('../middleware/userSession')
const checkUserBlocked = require('../middleware/userSessionBlocked')
const userController = require("../controller/userController/userController")
const forgetController = require("../controller/userController/forgetController")
const productController = require('../controller/userController/productController')
const profileController = require("../controller/userController/profileController")
const cartController = require("../controller/userController/cartController")
const checkoutController = require("../controller/userController/checkoutController")
const orderController = require("../controller/userController/orderController")
const wishlistController=require("../controller/userController/wishlistController")
const walletController=require("../controller/userController/walletController")


const user = express.Router()

// login routes
user.get('/', userController.user)
user.get('/login', userController.login)
user.post('/login', userController.loginPost)

//google login

user.get('/auth/google', userController.loginAuth);
user.get('/auth/google/redirect', userController.loginAuthRedirect)



// signup routers

user.get('/signup', userController.signup)
user.post('/signup', userController.signpost)

user.get('/home', checkUserBlocked, userController.home)


//otp routes
user.get('/otp', userController.otp)
user.post('/otp', userController.otpPost)
user.get('/resend-otp/:email', userController.otpResend)


//forget pass routes

user.get('/forget-password', forgetController.forgetPassword)
user.post('/forget-password', forgetController.forgetPasswordPost)

//  forget passwordotp routes

user.get('/forget-password-otp', forgetController.forgetPasswordOtp)
user.post('/forget-password-otp', forgetController.forgetPasswordOtpPost)
user.post('/new-password', forgetController.upadtePassword)

// product routers
// if the user is blocked then the user is redirect to login page
user.get('/product-view/:id', checkUserBlocked, productController.productView)


user.get('/productSeemore', checkUserBlocked, productController.productSeemore)



//profile route
user.get('/profile', checkUserSession, profileController.profile)


//change post personal information
user.post('/profile', checkUserSession, profileController.personalInformation)

//  the password change route 
user.post('/change-password', checkUserSession, profileController.changePassword)

user.get('/address', checkUserSession, profileController.address)

user.post('/add-address', checkUserSession, profileController.addAddress)

//delete address

user.get('/delete-address/:id', checkUserSession, profileController.deleteAddress)


//edit address
user.get('/edit-address/:id', checkUserSession, profileController.editAddress)
user.post('/edit-address/:id', checkUserSession, profileController.editAddressPost)



// user cart routes

user.get('/cart', checkUserSession, cartController.cart)
user.get('/add-to-cart/:id', checkUserSession, cartController.addToCartPost)

user.delete('/remove-cart-product/:id', checkUserSession, cartController.removeCartItem)

user.put('/increment-product/:productId', checkUserSession, cartController.incrementProduct)
user.put('/decrement-product/:productId', checkUserSession, cartController.decrementProduct)



// checkout

user.get('/checkout', checkUserSession, checkoutController.checkout)


user.post('/add-checkout-address', checkUserSession, checkoutController.addcheckoutAddress)
user.get('/delete-checkout-address/:id', checkUserSession, checkoutController.deletecheckoutAddress)

user.post('/checkout-submit', checkUserSession, checkoutController.OrderPlaced)

user.get('/order-confirm', checkUserSession, checkoutController.orderConfirm)


// user.post('/paymentfailrazorpay',checkUserSession,checkoutController.paymentFailRazorpay)

user.post('/applycoupon',checkUserSession,checkoutController.applycoupon)





//order

user.get('/order', checkUserSession, orderController.order)
user.get('/cancelled-orders', checkUserSession, orderController.cancelOrder)

user.post('/cancel-order/:orderId', checkUserSession, orderController.cancellOrderPost)

user.post('/return-order',checkUserSession,orderController.returnOrder)

user.get('/orderdetail/:orderId',checkUserSession,orderController.orderDetail)


user.get('/orderFailure',checkUserSession,orderController.orderFailure)


//wallet

user.get('/wallet',checkUserSession,walletController.wallet)


// wishlist

user.get('/wishlist',checkUserSession,wishlistController.wishList)
user.post('/addtowishlist',checkUserSession,wishlistController.addToWishlist)

user.get('/remove-wishlist/:id',checkUserSession,wishlistController.removeWishlist)

user.get('/logout', userController.logout)

module.exports = user;