const userSchema=require('../../model/userSchema')
const STATUS_CODES=require('../../constants/statusCodes')

//render user page
 const user=async (req,res)=>{
    try {
        const userSearch=req.query.userSearch || ''

        const usersPerPage = 10; // Number of users per page
        const currentPage = parseInt(req.query.page) || 1;
        const skip = (currentPage - 1) * usersPerPage;

         // Fetch the total number of users that match the search criteria
         const totalUsers = await userSchema.countDocuments({ name: { $regex: userSearch, $options: 'i' } });


         const users = await userSchema.find({ name: { $regex: userSearch, $options: 'i' } })
         .skip(skip)
         .limit(usersPerPage);

         const pageNumber = Math.ceil(totalUsers / usersPerPage);
         res.render('admin/user', {admin:req.session.admin, title: "users list", users,
             alertMessage: req.flash('errorMessage') ,
             currentPage,
             pageNumber,
             userSearch
            })
        
    } catch (err) {
        console.log(`error in rendering user details ${err}`)
        
    }
 }


 // block user
 const blockUser= async (req,res)=>{
    try {
        const blockUserId=req.params.id
        await userSchema.findByIdAndUpdate(blockUserId,{isBlocked:true})
       // req.flash('errorMessage',"user is blocked")
       // res.redirect('/admin/user')   
         res.status(STATUS_CODES.OK).json({ success: true, message: "User has been blocked" });
    } catch (err) {
        console.log(`error is user block ${err}`)
        
    }
 }

 //unblockUser

 const unBlockUser =async (req,res)=>{
    try {

        const unblockUserId=req.params.id
        await userSchema.findByIdAndUpdate(unblockUserId,{isBlocked:false})
       // req.flash('errorMessage',"user is unblocked")
        // res.redirect('/admin/user')
        res.status(STATUS_CODES.OK).json({ success: true, message: "User has been unblocked" });

    } catch (err) {
        console.log(`error in user unblock ${err}`)
         res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error while unblocking user" });
    }
 }


 
  

 module.exports={user,blockUser,unBlockUser}