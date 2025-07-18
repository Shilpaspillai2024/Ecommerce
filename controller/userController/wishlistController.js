const STATUS_CODES = require('../../constants/statusCodes')
const productSchema=require('../../model/productSchema')
const wishlistSchema = require('../../model/wishlistSchema')
const catchAsync=require('../../utils/catchAsync')




const wishList= catchAsync ( async(req,res)=>{
 
        userId=req.session.user

        const wishlist=await wishlistSchema.findOne({userId}).populate('products.productId')


      
        if(wishlist){
             
            res.render('user/wishlist',{title:"wishlist",user:req.session.user,products:wishlist.products,alertMessage: req.flash('errorMessage')})
        }
        else{
            res.render('user/wishlist',{title:"wishlist",user:req.session.user,products:[],alertMessage: req.flash('errorMessage')})

        }

})




const addToWishlist=catchAsync(async(req,res)=>{
   
        const userId=req.session.user
        const {productId}=req.body

        
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
        res.status(STATUS_CODES.OK).json({inwishlist:!inwishlist})
        
   
})


const removeWishlist=catchAsync(async (req,res)=>{
    
       const productId=req.params.id
       const userId=req.session.user
       const wishlist=await wishlistSchema.findOne({userId}).populate('products.productId')
       

       if(wishlist===null){
        return res.status(STATUS_CODES.NOT_FOUND).json({error:"Product not found in wishlist"})
       }

       const newWishList=wishlist.products.filter((ele)=>{
        if(ele.productId.id!=productId){
            return ele
        }

       
    })
    wishlist.products=newWishList
    await wishlist.save()

        
    return res.status(STATUS_CODES.OK).json({message:"Product removed from wishlist"})
        
   
});






module.exports={
    wishList,
    addToWishlist,
    removeWishlist
}
