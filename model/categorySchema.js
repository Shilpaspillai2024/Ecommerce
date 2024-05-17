const mongoose=require('mongoose')

const schema=new  mongoose.Schema({
    categoryName:{
        type:String,
        required:true,
        unique:true,
    },
    categoryAddedOn:{
        type:Date,
        required:true,
    },
      isActive:{
        type:Boolean,
        required:true,

    }

})

module.exports=mongoose.model('category',schema)

