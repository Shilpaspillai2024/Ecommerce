const mongoose=require('mongoose');
const dotenv=require('dotenv').config();

const connectDB=async()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("mongodb connected");
        
    } catch (err) {
        console.log(`error in mongodb connection ${err}`);
        
    }
}

module.exports=connectDB;