const mongoose = require("mongoose")

const wordplaySchema = new mongoose.Schema({
    username : {
        type : String,
    },
    password :{
        type : String,
        required : true,
    },
    email :{
        type : String,
        required : true,
    },
    number: {
        type: Number,
        required: true,
    }
   
})

// declaring the collection name
// const wordplaybooks = new mongoose.model("users",wordplaySchema)

// exporting the module
module.exports = mongoose.model('user',wordplaySchema);