const express = require('express')

const admin = express.Router()
const adminController = require('../controller/adminController/adminController')
const dashboardController = require('../controller/adminController/dashboardController')
const productController = require('../controller/adminController/productController')
const userController = require('../controller/adminController/userController')
const orderController = require('../controller/adminController/orderController')
const couponController=require('../controller/adminController/couponController')
const multer = require('../middleware/multer')


//  const adminSession=require('../middleware/adminSession')
const checkAdminSession = require('../middleware/adminSession')

admin.get('/', adminController.admin);
admin.get('/login', adminController.login);


//admin post

admin.post('/login', adminController.loginPost)


//admin dashbord
admin.get('/dashboard', checkAdminSession, dashboardController.dashboard)




// category

admin.get('/category', checkAdminSession, dashboardController.category)
admin.post('/category', dashboardController.addCategoryPost)

//edit category

admin.post('/editcategory', dashboardController.editCategoryPost)

// delete category
admin.get('/delete-category/:id', checkAdminSession, dashboardController.deleteCategory)

// deactivate category
admin.get('/hide-category/:id', checkAdminSession, dashboardController.deactivateCategory)

//activate category
admin.get('/unhide-category/:id', checkAdminSession, dashboardController.activateCategory)




// product routers


admin.get('/product', checkAdminSession, productController.product)

admin.get('/add-product', checkAdminSession, productController.addProduct)
admin.post('/add-product', productController.multermiddle, productController.addProductPost)
admin.get('/edit-product/:id', checkAdminSession, productController.editProduct)
admin.post('/edit-product/:id', productController.multermiddle, productController.editProductPost)


admin.get('/product-inactive/:id', checkAdminSession, productController.productInactive)
admin.get('/product-active/:id', checkAdminSession, productController.productActive)
admin.get('/delete-product/:id', checkAdminSession, productController.productDelete)



//customer routers in user management

admin.get('/user', checkAdminSession, userController.user)
admin.get('/block-user/:id', checkAdminSession, userController.blockUser)
admin.get('/unblock-user/:id', checkAdminSession, userController.unBlockUser)



// order routers

admin.get('/order', checkAdminSession, orderController.order)
admin.get('/order-view/:orderId', checkAdminSession, orderController.orderView)
admin.post('/edit-order-status/:orderId', checkAdminSession, orderController.editOrderStatus)




// coupon routes

admin.get('/coupons',checkAdminSession,couponController.coupon)
admin.post('/add-coupon',checkAdminSession,couponController.addCoupon)
admin.post('/edit-coupon/:id',checkAdminSession,couponController.editCoupon)
admin.delete('/delete-coupon/:id',checkAdminSession,couponController.deleteCoupon)
admin.put('/block-coupon/:id',checkAdminSession,couponController.blockCoupon)
admin.put('/unblock-coupon/:id',checkAdminSession,couponController.unblockCoupon)




// logout of admin
admin.get('/logout', adminController.logout)




module.exports = admin
