 const express =require('express')

 const userSchema = require('../model/userSchema')
 const checkUserSession=require('../middleware/userSession')
 const checkUserBlocked=require('../middleware/userSessionBlocked')
 const userController = require("../controller/userController/userController")
 const forgetController=require("../controller/userController/forgetController")
 const productController=require('../controller/userController/productController')
 const profileController=require("../controller/userController/profileController")
 

 const user = express.Router()

// login routes
 user.get('/',userController.user)
 user.get('/login',userController.login)
 user.post('/login',userController.loginPost)

  //google login

user.get('/auth/google', userController.loginAuth);
user.get('/auth/google/redirect', userController.loginAuthRedirect)



// signup routers

user.get('/signup',userController.signup)
user.post('/signup',userController.signpost)

user.get('/home',checkUserBlocked,userController.home)


//otp routes
user.get('/otp',userController.otp)
user.post('/otp',userController.otpPost)
user.get('/resend-otp/:email',userController.otpResend)


//forget pass routes

user.get('/forget-password',forgetController.forgetPassword)
user.post('/forget-password',forgetController.forgetPasswordPost)

//  forget passwordotp routes

 user.get('/forget-password-otp',forgetController.forgetPasswordOtp)
 user.post('/forget-password-otp',forgetController.forgetPasswordOtpPost)
 user.post('/new-password',forgetController.upadtePassword)

// product routers
// if the user is blocked then the user is redirect to login page
user.get('/product-view/:id',checkUserBlocked,productController.productView)


user.get('/productSeemore',checkUserBlocked,productController.productSeemore)



//profile route
user.get('/profile',profileController.profile)

user.post('/profile',profileController.personalInformation)


user.get('/logout',userController.logout)

module.exports = user;