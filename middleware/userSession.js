const userSchema=require("../model/userSchema")

async function checkUserSection(req,res,next){
   try {
    if(req.session.user){
        const userDetails= await userSchema.findOne({email:req.session.user})
        if(userDetails && !userDetails.isBlocked)
            {
        
        next();
        }
    else{
        req.session.user=""
        res.redirect('/user/login')
    }
}
    else{
        re.redirect('/user/login')
    }
}
   catch (err) {
    console.log(`error in checkuser middleware ${err}`)
    
   }
}


module.exports=checkUserSection



