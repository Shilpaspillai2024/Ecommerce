const express=require('express')

 const admin=express.Router()
 const adminController=require('../controller/adminController/adminController')
 const dashboardController=require('../controller/adminController/dashboardController')

 const adminSession=require('../middleware/adminSession')

 admin.get('/',adminController.admin);
 admin.get('/login',adminController.login);


 //admin post

 admin.post('/login',adminController.loginPost)

 
 //admin dashbord
 admin.get('/dashboard',adminSession,dashboardController.dashboard)




 // category

 admin.get('/category',adminSession,dashboardController.category)
 admin.post('/category',dashboardController.addCategoryPost)

 admin.get('/logout',adminController.logout)




 module.exports = admin
 