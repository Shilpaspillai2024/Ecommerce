const mongoose=require('mongoose')
const schema=new mongoose.Schema({
    offerFor:{
        type:String,
        required:true,
        enum:['CATEGORY','PRODUCT',"REFERRAL"]
    },
    offerCategoryId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'category'
    },
    offerProductId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product'
    },
    offerValue:{
        type:Number,
        required:true
    },
    expiryDate:{
        type:Date,

    }
},{timestamps:true})

module.exports = mongoose.model('offer',schema)