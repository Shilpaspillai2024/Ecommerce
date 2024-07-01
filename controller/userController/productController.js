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
          
        
        // Check if the product exists
           if (!product) {
            req.flash("errorMessage", "Product is currently unavailable");
            return res.redirect('/user/home');
        }
     
       
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










// const productSeemore = async(req,res)=>{
//     try {
//         // const category=await categorySchema.find()

//         const product= await productSchema.find()


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



// const productSeemore = async(req,res)=>{
//     try {
//         const category=await categorySchema.find()


      
//         const product = await productSchema.find()


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

const productSeemore = async (req, res) => {
    try {
        const category = await categorySchema.find({isActive:true});

        let { collections, minPrice, maxPrice, ratings, availability, sort } = req.query;
        let filter = {};

        console.log('Query parameters:', req.query);

        // Filtering
        if (collections) {
            
            filter.productCategory = { $in: collections.split(',') };
        }
       
      
        if (minPrice || maxPrice) {
            filter.productPrice = {};
            if (minPrice) filter.productPrice.$gte = Number(minPrice);
            if (maxPrice) filter.productPrice.$lte = Number(maxPrice);
        }
        if (ratings) {
            filter.ratings = { $in: ratings.split(',').map(Number) };
        }
        if (availability) {
            filter.productQuantity = { $gt: 0 };
        }

        // Sorting
        let sortOption = {};
        if (sort) {
            switch (sort) {
                case 'price-high-low':
                    sortOption.productPrice = -1;
                    break;
                case 'price-low-high':
                    sortOption.productPrice = 1;
                    break;
                case 'latest':
                    sortOption.addedOn = -1;
                    break;
                case 'a-z':
                    sortOption.productName = 1;
                    break;
                case 'z-a':
                    sortOption.productName = -1;
                    break;
                default:
                    sortOption = {};
            }
        }

      
        const products = await productSchema.find(filter).sort(sortOption);

        let wishlist = { products: [] };
        if (req.session.user) {
            const userId = req.session.user;
            wishlist = await wishlistSchema.findOne({ userId });
        }

        res.render('user/productSeemore', {
            product: products,
            alertMessage: req.flash('errorMessage'),
            wishlist,
            user: req.session.user
        });
    } catch (err) {
        console.log(`Error during product detail page ${err}`);
        res.status(500).send('Internal Server Error');
    }
};





module.exports={
    productView,productSeemore
}