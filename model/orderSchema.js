const mongoose =require('mongoose')
const schema=new mongoose.Schema({
    userId: { type: String },
    products:[{
        produtId:{type:mongoose.Schema.Types.ObjectId},
        productName:{type:String},
        Author:{type:String},
        quantity:{type:Number},
        price:{type:Number},
        productStatus:{type:String},
        discountPrice:{type:Number},
        productImage:{type:String}


    }],

    totalQuantity:{type:Number},
    totalPrice:{type:Number},
     address:{
        contactName:String,
        homeAddress:String,
        location:String,
        landmark:String,
        pincode:Number

     },
     paymentMethod:{type:String},

     orderDate:{type:Date}

})

module.exports=mongoose.model('order',schema)