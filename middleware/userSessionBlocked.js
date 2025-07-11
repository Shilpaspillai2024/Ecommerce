const userSchema=require("../model/userSchema")

async function checkUserBlocked(req,res,next){
   try {
    if(req.session.user){
        const userDetails= await userSchema.findById(req.session.user)
        if(userDetails && !userDetails.isBlocked)
            {
        
        next();
        }
    else{
        req.session.user=""
        res.redirect('/login')
    }
}
    else{
       next();
    }
}
   catch (err) {
    console.log(`error in checkuserblocked middleware ${err}`)
    
   }
}


module.exports=checkUserBlocked

