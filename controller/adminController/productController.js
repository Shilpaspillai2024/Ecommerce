const mongoose=require('mongoose')
const productSchema=require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const multer=require('../../middleware/multer')
const fs=require('fs')


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
// multer as a middleware for multiple image upload
// the /maximum size is set as 4 
  const multermiddle=multer.array("productImage",4);

// addproduct post

const addProductPost= async (req,res)=>{
  try {

    const imageArray=[]
    req.files.forEach((img)=>{
      imageArray.push(img.path)
    })


    //product details from the form

    const productDetails= {
      productName:req.body.productName,
      productPrice:req.body.productPrice,
      productDescription:req.body.productDescription,
      productQuantity:req.body.productQuantity,
      productCategory:req.body.productCategory,
      productImage:imageArray,
      productDiscount:req.body.productDiscount
    };

    const checkProduct=await productSchema.findOne({productName:req.body.productName,productCategory:req.body.productCategory})
    
    if(!checkProduct)
      {
    await productSchema.insertMany(productDetails)
    req.flash('error message','product added successfully')
      }
      else{
        req.flash('error message','product already exsist')
      }
      res.redirect('/admin/product')
  } catch (err) {

    console.error(`Error during adding new product to DB: ${err}`);
        req.flash('errorMessage', err.message || 'Failed to add product. Please try again later.');
        res.redirect('/admin/add-product');
    
  }
}

  module.exports={
    product,addProduct,multermiddle,addProductPost
  }