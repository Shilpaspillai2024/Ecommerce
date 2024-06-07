const mongoose=require('mongoose')

const schema = new mongoose.Schema({
    contactName:{
        type:String
    },

    doorNo:{
        type:Number
    },

    homeAddress:{
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
    }

})

module.exports=mongoose.model('address',schema)