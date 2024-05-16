const userSchema = require("../../model/userSchema");

const home=async (req,res)=>{
    try {
        const userDetails=await userSchema.findOne({email:req.session.user})
        if(userDetails===null){
            req.session.user=""
            return res.redirect('/user/login')
        }
        res.render('user/home',{title:"Home",alertMessage:req.flash('errorMessage'),user:true})
    } catch (err) {
        console.log(`Error during home page render ${err}`);
    }   
}


module.exports={
    home
}