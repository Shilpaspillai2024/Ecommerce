const userSchema=require('../../model/userSchema')


// for profile Get

const profile= async (req,res) =>{
    try {

        const userDetail=await userSchema.findById(req.session.user)


        res.render('user/profile',{title:'profile-view',alertMessage:req.flash("errorMessage"),user:req.session.user,userDetail})
        
    } catch (err) {
        
    }

}



module.exports={profile}