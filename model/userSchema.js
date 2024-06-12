const mongoose = require("mongoose")
const {defalutMaxListeners}=require('nodemailer/lib/xoauth2')

const wordplaySchema = new mongoose.Schema({
    googleId:{
        type:String,
        
    },
    name : {
        type : String,
        required:true,
    },
    password :{
        type : String,

        
       
    },
    email :{
        type : String,
        required : true,
    },
    number: {
        type: Number,

        
       
    },
    isBlocked:{
        type:Boolean,
        default:false
    }
   
})

// declaring the collection name
// const wordplaybooks = new mongoose.model("users",wordplaySchema)

// exporting the module
module.exports = mongoose.model('user',wordplaySchema);