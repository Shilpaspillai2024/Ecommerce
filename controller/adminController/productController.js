const mongoose=require('mongoose')
const productSchema=require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const multer=require('../../middleware/multer')
const fs=require('fs')


  const product= async (req,res)=>{
    try {
      const productSearch = req.query.productSearch || '';
        const products = await productSchema.find({ productName: { $regex: productSearch, $options: 'i' } })

       
        // const products= await productSchema.find()
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
      productAuthor:req.body.productAuthor,
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
    req.flash('errorMessage','product added successfully')
      }
      else{
        req.flash('errorMessage','product already exsist')
      }
      res.redirect('/admin/product')
  } catch (err) {

    console.error(`Error during adding new product to DB: ${err}`);
        req.flash('errorMessage', err.message || 'Failed to add product. Please try again later.');
        res.redirect('/admin/add-product');
    
  }
}

const editProduct= async (req,res)=>{
  try {
    const productId = req.params.id;
    const product = await productSchema.findById(productId)
    const productCategory= await categorySchema.find()
    if(product){
      res.render('admin/editproduct',{ admin:req.session.admin, title:"Add-product",alertMessage:req.flash('errorMessage'),product,productCategory})
   
    }
    else{
      req.flash('errorMessage', 'Unable to edit the product. Please try again')
      res.redirect('/admin/product')
    }


    
  } catch (err) {
    console.log(`eeror in edit page load ${err}`)
    
  }
}
 

const editProductPost = async (req,res)=>{
  try {
  const  productId=req.params.id
    productSchema.findByIdAndUpdate(productId,{productPrice:req.body.productPrice,productDescription: req.body.productDescription, productQuantity: req.body.productQuantity, productDiscount: req.body.productDiscount })
    .then((elem) => {
      req.flash('errorMessage',"product updated successfully")
      res.redirect('/admin/product')
    }).catch((err) =>{
      console.log(`Error while updating the product ${err}`);
      req.flash('errorMessage','product is not updated')
      res.redirect('/admin/product')
    })

    
  } catch (err) {
    console.log(`Error during updating the product on database ${err}`);
        req.flash('errorMessage', 'Oops the action is not completed')
        res.redirect('/admin/product')
    
  }
}

// product deactivating
const productInactive = async (req,res)=>{
   try {
      const  productId=req.params.id;
      const productInactive=await productSchema.findByIdAndUpdate(productId,{isActive:false})
      if(productInactive){
        req.flash('errorMesage','the product is blocked and currently not available for users')

      }else{
        req.flash('errorMessage','product not found')
      }
      res.redirect('/admin/product')
    
   } catch (err) {
    console.log(`error in deactivating product ${err}`)
    
   }
}

//product activating

const productActive =async (req,res)=>{
  try {
    const productId=req.params.id;
    const productActive= await productSchema.findByIdAndUpdate(productId,{isActive:true})
    if(productActive){
      req.flash('errorMessage','the product is unblocked')
    }
    else{
      req.flash('errorMessage,"product is not found')
    }
    res.redirect('/admin/product')
    
  } catch (err){
    console.log(`error in activating product ${err}`)
    
  }
}


// Delete the product 
  const productDelete=async (req,res)=>{
    try {
      const productId=req.params.id;
      const deleteProduct=await productSchema.findByIdAndDelete(productId)

      if(deleteProduct){
        req.flash('errorMessage','Product Deleted successfully')
        res.redirect('/admin/product')
    }
    else{
        req.flash('errorMessage','unable to delete the the product')
        res.redirect('/admin/product')
    }
      
    } catch (err) {
      console.log(`error in deletion of products ${err}`)
      
    }
  } 

  module.exports={
    product,
    addProduct,
    multermiddle,
    addProductPost,
    editProduct,
    editProductPost,
    productInactive,
    productActive,
    productDelete
  }