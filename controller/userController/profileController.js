const userSchema=require('../../model/userSchema')
const addressSchema=require('../../model/addressSchema')
const bcrypt=require('bcrypt')



// for profile Get

const profile= async (req,res) =>{
    try {

        const userDetail=await userSchema.findById(req.session.user)


        res.render('user/profile',{title:'profile-view',alertMessage:req.flash("errorMessage"),user:req.session.user,userDetail})
        
    } catch (err) {

       console.log(`error during profile page load ${err}`)
        req.flash('errorMessage', 'Failed to load profile page.');
        res.redirect('/user/home'); 
        
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
        console.log(`Error updating personal information: ${err}`);
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


const address= async(req,res)=>{
     try {
        const userId=req.session.user

        

        //  const userAddress= await addressSchema.find({userId:userId}) ;


        const userAddress = await addressSchema.find({ userId }).sort({ _id: -1 });

        // Adding an index like number to each address
        userAddress.forEach((address, index) => {
            address.index = index + 1;
        });

         res.render('user/address',{title:"user-address",alertMessage:req.flash('errorMessage'),user:req.session.user,userAddress})
        
        
     } catch (err) {
        console.log(`Error when loading the address page ${err}`)
        req.flash('errorMessage','Failed to load address page')
        res.redirect('/user/profile')
        
     }
}


const addAddress= async(req,res)=>{
    try {
        const userId=req.session.user
        const newAddress={
            userId: userId,
            addressType:req.body.addressType,
            contactName: req.body.contactName,
            doorNo: req.body.doorNo,
            Address: req.body.homeAddress,
            areaAddress: req.body.areaAddress,
            landmark: req.body.landmark,
            phone:req.body.phone,
            pincode: req.body.pincode
        }

        await addressSchema.insertMany(newAddress)

        req.flash('errorMessage', ' address added successfully');
      
        res.redirect('/user/address');
        
    } catch (err) {
        console.error(`Error during adding address to DB: ${err}`);
        req.flash('errorMessage', err.message || 'Failed to add address. Please try again later.');
        res.redirect('/user/address');
        
    }
}



const deleteAddress= async(req,res)=>{
    try {

        const userId=req.session.user;
        const addressId=req.params.id;

          // Check if the address belongs to the user

        const address=await addressSchema.findOne({_id:addressId,userId:userId})

        if (!address) {
            req.flash('errorMessage', 'Address not found or not authorized to delete');
            return res.redirect('/user/address');
        }
        await addressSchema.deleteOne({ _id: addressId });

        req.flash('errorMessage', 'Address deleted successfully');
        res.redirect('/user/address');

        
    } catch (err) {
        console.error(`Error during deleting address from DB: ${err}`);
        req.flash('errorMessage', err.message || 'Failed to delete address. Please try again later.');
        res.redirect('/user/address');
        
    }
}




    const editAddress =async (req,res)=>{
    try {


           const userId=req.session.user;
            const addressId = req.params.id;

            const address = await addressSchema.findOne({ _id: addressId, userId: userId })

            if (!address) {
                req.flash('errorMessage', 'Address not found or not authorized to edit');
                return res.redirect('/user/address');
            }

            res.render('user/editAddress',{title:"user-editAddress",alertMessage:req.flash('errorMessage'),user:req.session.user,address})
        
    } catch (err) {

        console.log(`Error when loading the address page ${err}`)
        req.flash('errorMessage','Failed to load editaddress page')
        res.redirect('/user/address')
        
        
    }
      }


      const editAddressPost = async (req, res) => {
        try {
            const userId = req.session.user;
            const addressId = req.params.id;
    
            // Extract updated address details from the request body
            const { addressType, contactName, doorNo, homeAddress, areaAddress, landmark, phone, pincode } = req.body;
    
            // Find the address by ID and update its details
            const updatedAddress = await addressSchema.findByIdAndUpdate(addressId, {
                addressType,
                contactName,
                doorNo,
                Address: homeAddress, // Assuming your schema has Address field instead of homeAddress
                areaAddress,
                landmark,
                phone,
                pincode
            }, { new: true });
    
            if (!updatedAddress) {
                // If address is not found or not authorized, redirect with error message
                req.flash('errorMessage', 'Address not found or not authorized to edit');
                return res.redirect('/user/editAddress');
            }
    
            // Redirect to the address page with success message
            req.flash('errorMessage', 'Address updated successfully');
            res.redirect('/user/address');
        } catch (err) {
            console.log(`Error when updating the address: ${err}`);
            req.flash('errorMessage', 'Failed to update address');
            res.redirect('/user/address');
        }
    }
    
            
       




module.exports={
    profile,
    personalInformation,
    changePassword,
    address,
    addAddress,
    deleteAddress,
    editAddress,
    editAddressPost
}