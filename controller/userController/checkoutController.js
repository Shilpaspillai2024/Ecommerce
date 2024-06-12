const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const userSchema=require('../../model/userSchema')



const checkout=async(req,res)=>{
    try {
        res.render('user/checkout',{title:"checkout-page",user:req.session.user,alertMessage:req.flash('errorMessage')})
        
    } catch (err) {
        
    }
}

module.exports={
    checkout
}