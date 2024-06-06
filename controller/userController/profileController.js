const userSchema=require('../../model/userSchema')


// for profile Get

const profile= async (req,res) =>{
    try {

        const userDetail=await userSchema.findById(req.session.user)


        res.render('user/profile',{title:'profile-view',alertMessage:req.flash("errorMessage"),user:req.session.user,userDetail})
        
    } catch (err) {
        
    }

}

const personalInformation = async(req,res)=>{
    try {
        const userId = req.session.user; // User ID from session
        // const {name, number} = req.body;

        // console.log(name,number)

        const userDetail = await userSchema.findByIdAndUpdate(userId, {
            name:req.body.name,
            number:req.body.number
        }, {new: true});

        console.log(userDetail);
        req.flash('errorMessage', 'Personal information updated successfully.');
        res.redirect('/user/profile');
    } catch (err) {
        console.error(`Error updating personal information: ${err}`);
        req.flash('errorMessage', 'Failed to update personal information. Please try again later.');
        res.redirect('/user/profile');
    }
}








module.exports={profile,personalInformation}