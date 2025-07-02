const userSchema=require("../model/userSchema")

async function checkUserSession(req,res,next){
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
        res.redirect('/login')
    }
}
   catch (err) {
    console.log(`error in checkuser middleware ${err}`)
    
   }
}


module.exports=checkUserSession



