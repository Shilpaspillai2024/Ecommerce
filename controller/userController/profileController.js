const userSchema=require('../../model/userSchema')
const bcrypt=require('bcrypt')



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

// for change password post

const changePassword = async(req,res)=>{
    try {

        const userId =req.session.user

        const {currentPassword,newPassword,confirmPassword}=req.body;

        if(newPassword !== confirmPassword){
            req.flash('errorMessage', 'New password and confirm new password do not match.');
            return res.redirect('/user/profile');
        }
        
        const user = await userSchema.findById(userId);

        // Check if current password matches the user's current password
        const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordMatch) {
            req.flash('errorMessage', 'Incorrect current password.');
            return res.redirect('/user/profile'); // Redirect to profile page with error message
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        await userSchema.findByIdAndUpdate(userId, { password: hashedNewPassword });

        req.flash('errorMessage', 'Password changed successfully.');
        res.redirect('/user/profile'); // Redirect to profile page with success message
    } catch (err) {
        console.error(`Error changing password: ${err}`);
        req.flash('errorMessage', 'Failed to change password. Please try again later.');
        res.redirect('/user/profile'); // Redirect to profile page with error message
    }

}






module.exports={profile,personalInformation,changePassword}