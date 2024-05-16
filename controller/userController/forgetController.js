const userSchema = require('../../model/userSchema')
const bcrypt=require('bcrypt')

const forgetPassword=(req,res)=>{
    try {
          req.session.user=""
            res.render('user/forgetPassword',{user:req.session.user})
        }

        
    catch (err) {
        console.log(`error during forget page render ${err}`)
        
    }
}
 
// const forgetPasswordPost=async (req,res)=>{

//     const {email}=req.body.email;
//     if(!email)
//         req.flash('error message',"email is required")
//     try {

//         const checkEmail=await userSchema.findOne({email:req.body.email})
//         if(!checkEmail){
//             req.flash('error message','user not found');
//             return res.redirect('/user/login')
//         }
//         const 

//     } catch (error) {
        
//     }
// }


module.exports={
    forgetPassword
}
