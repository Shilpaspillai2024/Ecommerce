const mongoose=require('mongoose')
const productSchema=require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')


  const product= async (req,res)=>{
    try {

       
        const products= await productSchema.find()
        res.render('admin/product',{admin:req.session.admin,title:"Product List",products,alertMessage: req.flash('errorMessage')})
        
    } catch (err) {

        console.log(`error in product page load ${err}`)
        
    }
  }

 //render the add-product page
  const addProduct = async (req,res)=>{
    try {

       // get all category details from the category collection
          const productCategory=await categorySchema.find()
          
          // before render the page check whether the category is empty if its empty then send a flash message
          if(productCategory.length===0){
            req.flash('errorMessage', 'Product Category is empty, please add at least one category')
          }

          res.render('admin/addproducts',{admin:req.session.admin,title:"Add-product",alertMessage:req.flash('errorMessage'),productCategory})
    } catch (err) {

      console.log(`error in add-product render`)
      
    }
  }


  module.exports={
    product,addProduct
  }