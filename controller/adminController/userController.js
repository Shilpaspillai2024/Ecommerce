const userSchema=require('../../model/userSchema')

//render user page
 const user=async (req,res)=>{
    try {
        const userSearch=req.query.userSearch || ''
        const users = await userSchema.find({name: { $regex: userSearch ,$options:'i'}})
        res.render('admin/user', {admin:req.session.admin, title: "users list", users, alertMessage: req.flash('errorMessage') })
        
    } catch (err) {
        console.log(`error in rendering user details ${err}`)
        
    }
 }


 // block user
 const blockUser= async (req,res)=>{
    try {
        const blockUserId=req.params.id
        const blockUser=await userSchema.findByIdAndUpdate(blockUserId,{isBlocked:true})
        req.flash('errorMessage',"user is blocked")
        res.redirect('/admin/user')   
    } catch (err) {
        console.log(`error is user block ${err}`)
        
    }
 }

 //unblockUser

 const unBlockUser =async (req,res)=>{
    try {

        const unblockUserId=req.params.id
        const unBlockUser= await userSchema.findByIdAndUpdate(unblockUserId,{isBlocked:false})
        req.flash('errorMessage',"user is unblocked")
        res.redirect('/admin/user')

    } catch (err) {
        console.log(`error in user unblock ${err}`)
    }
 }


 
  

 module.exports={user,blockUser,unBlockUser}