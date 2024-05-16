 const express =require('express')

 const userSchema = require('../model/userSchema')
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

user.get('/home',userSession,homeController.home)


//forget pass routes

user.get('/forget-password',forgetController.forgetPassword)
//  user.post('/forget-password',forgetController.forgetPasswordPost)

 //forget passotp routes

//  user.get('/forget-psswordotp',forgetController.forgetPasswordOtp)
//  user.post('forget-passwordotp',forgetController.forgetPasswordOtpPost)

module.exports = user;