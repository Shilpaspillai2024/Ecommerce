const mongoose=require('mongoose')
const schema=new mongoose.Schema({
        
        productName:{
            type:String,
            required:true

        },
         productPrice:{
            type:Number,
            required:true
         },

         productAuthor:{
            type:String,
            required:true
         },

         productDescription:{
            type:String,
            required:true
         },
         productQuantity:{
            type:Number,
            required:true
         },

         productCategory:{
            type:String,
            required:true
         },

         productDiscount:{
            type:Number,
           
         },

         productImage:{
            type:[],
            required:true
         },

         addedOn: {
            type: Date,
            default: Date.now,
        },
        updatedOn: {
            type: Date,
            default: Date.now,
        },
        isActive:{
            type:Boolean,
            default:true,
        }


})

module.exports=mongoose.model('product',schema)
