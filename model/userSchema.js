const mongoose = require("mongoose")
const {defalutMaxListeners}=require('nodemailer/lib/xoauth2')

const wordplaySchema = new mongoose.Schema({
    // googleId:{
    //     type:String,
    //     required:true,
    // },
    name : {
        type : String,
        required:true,
    },
    password :{
        type : String,
        // required : true,
        require:false,
    },
    email :{
        type : String,
        required : true,
    },
    number: {
        type: Number,
        // required: true,
        required:false,
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