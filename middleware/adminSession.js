// this function checks the session of the admin and if admin not exist then redirect to login page

function checkAdminSection(req,res,next){
    if(req.session.admin){
        // if admin is present in session then redirect to next route
        next();
    }
    else{
        res.redirect('/admin/login')
    }
}

module.exports=checkAdminSection