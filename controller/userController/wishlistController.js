
const productSchema=require('../../model/productSchema')
const wishlistSchema = require('../../model/wishlistSchema')




const wishList=async(req,res)=>{
    try {
        userId=req.session.user

        const wishlist=await wishlistSchema.findOne({userId}).populate('products.productId')


      
        if(wishlist){
             
            res.render('user/wishlist',{title:"wishlist",user:req.session.user,products:wishlist.products,alertMessage: req.flash('errorMessage')})
        }
        else{
            res.render('user/wishlist',{title:"wishlist",user:req.session.user,products:[],alertMessage: req.flash('errorMessage')})

        }


        
    } catch (err) {
        console.log(`Error on rendering the wishlist ${err}`)
        
    }
}




const addToWishlist=async(req,res)=>{
    try {
        const userId=req.session.user
        const {productId}=req.body

        
     
        // const product=await productSchema.findById(productId)
        // if(!product || product.productQuantity<=0){
        //     return res.status(400).json({ error: 'Product is out of stock ' });
        
        // }



        let wishlist=await wishlistSchema.findOne({userId})

        if(!wishlist){
            wishlist=new wishlistSchema({userId,products:[]})
        }

        const index=wishlist.products.findIndex((product)=>product.productId.toString()===productId)

        const inwishlist =index !==-1
        if(inwishlist){
            wishlist.products.splice(index,1)
        }
        else{
           
            wishlist.products.push({productId})

        }
        await wishlist.save()
        res.status(200).json({inwishlist:!inwishlist})
        
    } catch (err) {
        console.log(`error while adding to wishlist ${err}`)
        
    }
}


const removeWishlist=async (req,res)=>{
    try {
       const productId=req.params.id
       const userId=req.session.user
       const wishlist=await wishlistSchema.findOne({userId}).populate('products.productId')

       if(wishlist===null){
        return res.status(404).json({error:"Product not found in wishlist"})
       }

       const newWishList=wishlist.products.filter((ele)=>{
        if(ele.productId.id!=productId){
            return ele
        }

       
    })
    wishlist.products=newWishList
    await wishlist.save()

        
    return res.status(200).json({message:"Product removed from wishlist"})
        
    } catch (err) {
        console.log(`Error on removing the products from wishlist ${err}`)
        return res.status(404).json({error:"Error on removing the products from wishlist"})
    }
}



module.exports={
    wishList,
    addToWishlist,
    removeWishlist
}
