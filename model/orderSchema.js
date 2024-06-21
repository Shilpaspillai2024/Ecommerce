const mongoose =require('mongoose')
const schema=new mongoose.Schema({
    userId: 
    { type: mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true
    },


    contactInfo:{

        name:String,
        email:String,
        phone:Number,
    },
    products:[{
        productId:{
            type:mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true,
        },
       
        quantity:{type:Number},
        price:{type:Number},
        productStatus:{type:String},
       
        


    }],

    
    totalPrice:{type:Number},
    address:{
        type: Object,
        require: true
     },
     paymentMethod:{type:String,
        required:true
     },
     isCancelled: {
        type: Boolean,
        default: false
    },

    razorpayOrderId:{
        type:String,

    },

     status:{ type:String,
        enum:['processing','confirmed','pending','shipped','cancelled','delivered','returned']

     }

     

},{timestamps:true})

module.exports=mongoose.model('order',schema)