const productSchema=require('../../model/productSchema')



const productView=async (req,res)=>{
    try {
        const productId=req.params.id

      
        const product= await productSchema.findById(productId)
        const similarProducts=await productSchema.find({productCategory:product.productCategory,_id:{$ne:productId}})
        if(product.length===0){
            req.flash("errorMessage","product is currently unavailable")
            res.redirect('/user/home')
        }
        else{
            res.render('user/productDetail',{title:product.productName,product,similarProducts,alertMessage:req.flash('errorMessage'),user:req.session.user})
        

        }
       
    } catch (err) {
        console.log(`Error during product detail page ${err}`);
    }   
}


module.exports={
    productView
}