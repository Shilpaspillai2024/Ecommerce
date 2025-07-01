const mongoose=require('mongoose')
const schema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    balance: {
        type:Number,
        default:0,
    },
    transaction: [
        {
            typeOfPayment:String,
            amount:Number,
            date: {
                type: Date,
                default: Date.now,
            },
            orderId: {
                type:mongoose.Schema.Types.ObjectId,
                ref:'order',
               
            }

          
        }
    ]


},{timestamps:true})

module.exports=mongoose.model('wallet',schema)