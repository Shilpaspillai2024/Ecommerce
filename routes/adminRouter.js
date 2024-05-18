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

 //edit category

 admin.post('/editcategory',dashboardController.editCategoryPost)

 // delete category
 admin.get('/delete-category/:id',adminSession,dashboardController.deleteCategory)

 // deactivate category
  admin.get('/hide-category/:id',adminSession,dashboardController.deactivateCategory)

  //activate category
  admin.get('/unhide-category/:id',adminSession,dashboardController.activateCategory)

 admin.get('/logout',adminController.logout)




 module.exports = admin
 