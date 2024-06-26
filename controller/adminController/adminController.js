const mongoose=require('mongoose')
const userSchema=require('../../model/userSchema')




const admin = (req, res) => {
    try {
        if (req.session.admin) {
            res.redirect('/admin/dashboard')
        } else {
            res.redirect('/admin/login')
        }
    } catch (err) {
        console.log(`Error redirect to admin login`);
    }
}


const login = (req, res) => {
    try {
        if (req.session.admin) {
            res.redirect('/admin/dashboard')
        } else {

            res.render('admin/login',{admin:req.session.admin, title: "Admin Login",alertMessage:req.flash('errorMessage')})
        }
    } catch (err) {
        console.log(`Error during admin login ${err}`);
    }
}

const loginPost = (req,res)=> {
    try {

        if(req.body.email==process.env.ADMIN_USERNAME && req.body.password==process.env.ADMIN_PASSWORD)
            {
            req.session.admin=req.body.email;
            res.redirect('/admin/dashboard')
        }
        else{
           
            req.flash('errorMessage','invalid username or password')
            res.redirect('/admin/login')
           
        }
        
    } catch (err) {
        console.log(`Error during admin login ${err}`)
        res.redirect('/admin/login');
        
    }
}


const logout=(req,res)=>{
    
    req.session.destroy((err)=>{
        if(err){
            console.log(err);
        }else{
            res.redirect('/admin/login')
        }
    })

}


module.exports={
    admin,login,loginPost,logout
}