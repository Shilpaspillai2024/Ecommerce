const mongoose=require('mongoose')
const productSchema=require('../../model/productSchema')


  const product= async (req,res)=>{
    try {

       
        const products= await productSchema.find()
        res.render('admin/product',{admin:req.session.admin,title:"Product List",products,alertMessage: req.flash('errorMessage'),})
        
    } catch (err) {

        console.log(`error in product page load ${err}`)
        
    }
  }


  module.exports={
    product
  }