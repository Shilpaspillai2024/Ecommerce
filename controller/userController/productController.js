const productSchema=require('../../model/productSchema')
const wishlistSchema=require('../../model/wishlistSchema')

const userSchema = require('../../model/userSchema')
const categorySchema = require("../../model/categorySchema");
const cartSchema=require('../../model/cartSchema')




const productView=async (req,res)=>{
    try {
        const productId=req.params.id
        const referrer = req.query.from || 'home'; // Default to 'home' if no referrer

        const product= await productSchema.findById(productId)
     
       
        const similarProducts=await productSchema.find({productCategory:product.productCategory,_id:{$ne:productId}})
      
   
         // if current product is in the cart then set the itemInCart to true else it will be false
        let itemInCart = false

         // if user logged in then check the cart items
       if (req.session.user) {
        // check the product is already in the cart
        const cartCheck = await cartSchema.findOne({ userId: req.session.user }).populate('items.productId')

        if (cartCheck) {
            cartCheck.items.forEach((items) => {
                if (items.productId.id === productId) {
                    itemInCart = true
                }
               
            
            })
        }


    }

      
        if(product.length===0){
            req.flash("errorMessage","product is currently unavailable")
            res.redirect('/user/home')
        }
        



            res.render('user/productDetail',{title:product.productName,product,similarProducts,itemInCart,alertMessage:req.flash('errorMessage'),user:req.session.user, referrer: referrer})
        

        
       
    } catch (err) {
        console.log(`Error during product detail page ${err}`)
    }   
}










const productSeemore = async(req,res)=>{
    try {
        // const category=await categorySchema.find()

        const product= await productSchema.find()


        if(req.session.user){
            const userId=req.session.user

            const wishlist=await wishlistSchema.findOne({userId:userId}) 

      
      
            res.render('user/productSeemore',{product,alertMessage:req.flash('errorMessage'),wishlist,user:req.session.user})

        }
        else{
            res.render('user/productSeemore',{product,alertMessage:req.flash('errorMessage'),user:req.session.user})
        }
    } catch (err) {
        console.log(`Error during product detail page ${err}`);
    }   
}


// const productSeemore = async(req,res)=>{
//     try {
//         // const category=await categorySchema.find()
       

//         let query = {};
     
       

       
//         if (req.query.filter === 'in-stock') {
//             query.productQuantity = { $gt: 0 }; 
//         } else if (req.query.filter === 'out-of-stock') {
//             query.productQuantity = 0; 
//         }

//         // Apply sorting based on the query parameters
//         let sort = {};
//         if (req.query.sort === 'price-low-high') {
//             sort = { productPrice: 1 }; 
//         } else if (req.query.sort === 'price-high-low') {
//             sort = { productPrice: -1 }; 
//         } else if (req.query.sort === 'average-ratings') {
           
//         } else if (req.query.sort === 'featured') {
          
//         } else if (req.query.sort === 'new-arrivals') {
            
//         } else if (req.query.sort === 'a-z') {
//             sort = { productName: 1 }; 
//         } else if (req.query.sort === 'z-a') {
//             sort = { productName: -1 };
//         } else {
//             // Default sorting
//             sort = { _id: -1 }; // Sort by _id in descending order
//         }

        




//         const product= await productSchema.find(query).sort(sort)

       


//         if(req.session.user){
//             const userId=req.session.user

//             const wishlist=await wishlistSchema.findOne({userId:userId}) 

      
      
//             res.render('user/productSeemore',{product,alertMessage:req.flash('errorMessage'),wishlist,user:req.session.user})

//         }
//         else{
//             res.render('user/productSeemore',{product,alertMessage:req.flash('errorMessage'),user:req.session.user})
//         }
//     } catch (err) {
//         console.log(`Error during product detail page ${err}`);
//     }   
// }




module.exports={
    productView,productSeemore
}