const mongoose =require('mongoose')

const itemSchema = new mongoose.Schema({
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product'
    },

    productCount:{
        type :Number
    },

    productPrice:{
        type:Number
    }
}, { _id: false ,timestamps:true});


const cartSchema= new mongoose.Schema({
    userId:{
        type:String,
        required:true
    },
    items:[itemSchema],
    payableAmount:{
        type:Number,
        default:0
    },
    totalPrice:{
        type:Number,
        default:0
    }
});

module.exports = mongoose.model('cart',cartSchema)