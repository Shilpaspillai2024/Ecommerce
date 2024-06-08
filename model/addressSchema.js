const mongoose=require('mongoose')

const schema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    contactName:{
        type:String
    },

    doorNo:{
        type:Number
    },

    Address:{
        type:String
    },
    areaAddress:{

        type:String
    },
    
    pincode:{
        type:Number


        },

    landmark:{
        type:String
    },

    phone:{
        type:Number
    },

    addressType: {
        type: String,
        enum: ['home', 'office','other'], // Enumerated values: 'home' or 'office'
        default: 'home'
         // Default value is 'home'
    }

})

module.exports=mongoose.model('address',schema)