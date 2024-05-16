const userSchema = require('../../model/userSchema')

const bcrypt=require('bcrypt')


const user=(req,res)=>{
    try{
        res.redirect('/user/login')
    }catch(err){
        console.log('Error During user route');
    }
}

const login= (req,res)=>{
    if(req.session.user){
        // res.render('user/userlogin')
        
       
    }else{
        // Assuming you have stored user information in the request object
        // const user = req.user;
        res.render('user/login',{ user: req.session.user })
    }
}
 const loginPost= async (req,res)=>{
    try {
        const checkUser=await userSchema.findOne({email:req.body.username})
        if(checkUser===null){
            req.flash('errormessage','invalid username')
            res.redirect('/user/login')
        }
        else{
            const passwordCheck=await bcrypt.compare(req.body.password,checkUser.password)

            if(passwordCheck){
                req.session.user=req.body.username;
                return res.redirect('/user/home')
             }
            else{
                console.log("else")
                req.flash('error message','invalid username or password')
                res.redirect('/user/login')
            }
        }
        
    } catch (err) {
        console.log(`error in login post ${err}`)
        
    }

 }



 const signup=(req,res)=>{
    try {
        if(req.session.user){
            res.redirect('/user/home')
         }else{
            res.render('user/signup',{user:false})
         }
        
    } catch (err) {
        console.log(`this signup page render error ${err}`)
        
    }
 }


 const signpost= async (req,res)=>{
    try {
        const userData={
            name:req.body.name,
            email:req.body.email,
            password: await bcrypt.hash(req.body.password,10),
            number: req.body.phone
        }

        const checkUserExist= await userSchema.find({email:req.body.email})

        if(checkUserExist.length === 0 ){

            userSchema.insertMany(userData).then((result)=>{
                req.flash('errorMessage',"User Registration is successful")
                return res.redirect('/user/login')

            }).catch((err) => {
                console.log(`Error while inserting new user ${err}`);
        })
        
    } 
    else {
        req.flash('errorMessage','User already exist')
        return res.redirect('/user/login')
     }
    }
    catch (error) {
        console.log(`Error during signup post ${err}`);
    }
}

module.exports= {
    user,login,loginPost,signup,signpost
}