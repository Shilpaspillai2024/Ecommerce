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

         productDiscountPrice:{
            type:Number,
        },

         productImage:{
            type:[],
            required:true
         },

       
        isActive:{
            type:Boolean,
            default:true,
        }


},{timestamps:true})

module.exports=mongoose.model('product',schema)
