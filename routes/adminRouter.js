const express=require('express')

 const admin=express.Router()
 const adminController=require('../controller/adminController/adminController')
 const dashboardController=require('../controller/adminController/dashboardController')
 const productController=require('../controller/adminController/productController')

//  const adminSession=require('../middleware/adminSession')
const checkAdminSession = require('../middleware/adminSession')

 admin.get('/',adminController.admin);
 admin.get('/login',adminController.login);


 //admin post

 admin.post('/login',adminController.loginPost)

 
 //admin dashbord
 admin.get('/dashboard',checkAdminSession,dashboardController.dashboard)




 // category

 admin.get('/category',checkAdminSession,dashboardController.category)
 admin.post('/category',dashboardController.addCategoryPost)

 //edit category

 admin.post('/editcategory',dashboardController.editCategoryPost)

 // delete category
 admin.get('/delete-category/:id',checkAdminSession,dashboardController.deleteCategory)

 // deactivate category
  admin.get('/hide-category/:id',checkAdminSession,dashboardController.deactivateCategory)

  //activate category
  admin.get('/unhide-category/:id',checkAdminSession,dashboardController.activateCategory)




   // product routers


admin.get('/product',checkAdminSession,productController.product)

admin.get('/add-product',checkAdminSession,productController.addProduct)



 admin.get('/logout',adminController.logout)




 module.exports = admin
 