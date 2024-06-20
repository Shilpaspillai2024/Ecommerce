const mongoose=require('mongoose')

const schema =new mongoose.Schema({

    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'

    },
   products:[ {
    productId:{ 
        type:mongoose.Schema.Types.ObjectId,
        ref:'product'

    }
}]
},{timestamps:true})

module.exports=mongoose.model('wishlist',schema)