 const express =require('express')

 const userSchema = require('../model/userSchema')
 const checkUserSession=require('../middleware/userSession')
 const checkUserBlocked=require('../middleware/userSessionBlocked')
 const userController = require("../controller/userController/userController")
 const homeController=require("../controller/userController/homeController")
 const forgetController=require("../controller/userController/forgetController")

 const userSession=require('../middleware/userSession')
 const user = express.Router()

// login routes
 user.get('/',userController.user)
 user.get('/login',userController.login)
 user.post('/login',userController.loginPost)


 


// signup routers

user.get('/signup',userController.signup)
user.post('/signup',userController.signpost)

user.get('/home',checkUserBlocked,homeController.home)


//otp routes
user.get('/otp',userController.otp)
user.post('/otp',userController.otpPost)
user.get('/resend-otp/:email',userController.otpResend)


//forget pass routes

user.get('/forget-password',forgetController.forgetPassword)
user.post('/forget-password',forgetController.forgetPasswordPost)

//  forget passwordotp routes

 user.get('/forget-password-otp',forgetController.forgetPasswordOtp)
//  user.post('forget-passwordotp',forgetController.forgetPasswordOtpPost)



user.get('/logout',userController.logout)

module.exports = user;