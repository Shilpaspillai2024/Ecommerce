const userSchema = require('../../model/userSchema')

const bcrypt=require('bcrypt')

const generateOtp=require('../../services/generateOTP')
const sendOtpMail=require('../../services/emailSender')
const productSchema=require('../../model/productSchema')
const categorySchema=require('../../model/categorySchema')
const passport=require('passport')
const passportSetup = require('../../config/passport-setup')
// const passportAuth=require('passport-google-oauth20');
// const auth=require('./config/passport-setup');




const user=(req,res)=>{
    try{
        res.redirect('/user/home')
    }catch(err){
        console.log('Error During user route');
    }
}



  
const login= (req,res)=>{
    if(req.session.user){
       
        res.redirect('/user/home')
        
       
    }else{
        // Assuming you have stored user information in the request object
        // const user = req.user;
        res.render('user/login',{ user: req.session.user,title:"Login",alertMessage:req.flash('errorMessage')})
    }
}
 const loginPost= async (req,res)=>{
    try {
        const checkUser =await userSchema.findOne({email: req.body.username})
        if(checkUser != null){
            if(checkUser.isBlocked){
                req.flash('errorMessage','Access to this account has been restricted.')
                res.redirect('/user/login')
            }else{
                const passwordCheck=await bcrypt.compare(req.body.password,checkUser.password)
                console.log(passwordCheck)
                if(passwordCheck){
                    req.session.user=req.body.username;

                  
                    return res.redirect('/user/home')
                 }
                else{
                   
                    req.flash('errorMessage','invalid username or password')
                    res.redirect('/user/login')
                }
            }
        }   
    } catch (err) {
        console.log(`error in login post ${err}`)
        
    }

 }


 //google login auth
 //google auth

 const loginAuth = passport.authenticate("google", {
    scope: ["profile", "email"],
  });
  
    const loginAuthRedirect = (req, res, next) => {
    passport.authenticate("google", (err, user, info) => {
      if (err) {
        console.log(user, "hello auth1.1");
        return next(err);
      }
      if (!user) {
        console.log(user, "hello auth1");
        return res.redirect("/user/login");
      } // Redirect to login if authentication fails
      req.logIn(user, (err) => {
        if (err) {
          console.log(user, "hello auth2");
          return next(err);
        }
        console.log(user, "hello auth");
        req.session.user = user.email;
        return res.redirect("/user/home"); // Redirect to profile page if authentication is successful
      });
    })(req, res, next);
  };



 



 const signup=(req,res)=>{
    try {
        if(req.session.user){
            res.redirect('/user/home')
         }else{
            res.render('user/signup',{user:req.session.user,title:"Signup",alertMessage:req.flash('errorMessage')})
         }
        
    } catch (err) {
        console.log(`this signup page render error ${err}`)
        
    }
 }


 const signpost= async (req,res)=>{
    try {
        // getting data from input box of the register form
        const userData={
            name:req.body.name,
            email:req.body.email,
            password: await bcrypt.hash(req.body.password,10),
            number: req.body.phone
        }

        // check the user with same email exist in mongodb
       const userExist= await userSchema.findOne({email:userData.email})

         // if user with same email id exist then render the register page with error message
       if(userExist){
        req.flash('errorMessage','An account with this email address already exsist,pls try with another email ! ')
        res.redirect('/user/signup')
       }
       else{

         // generate otp from services/generateOTP.js file
        const otp =generateOtp();

           // send the mail to the registered user with the OTP
        sendOtpMail(req.body.email,otp);
        req.flash('errorMesage',`Otp was sended to the ${req.body.email}`);

          // storing otp in the session
        req.session.otp = otp;
        req.session.otpExpireTime= Date.now();

    // storing user data in session
        req.session.email=userData.email;
        req.session.password=userData.password;
        req.session.name=userData.name;
        req.session.phone=userData.number;
// redirect to the otp page for validation
        res.redirect('/user/otp')
       }
    }

    catch (err) {
        console.log(`Error during signup post ${err}`);
    }
}


const otp= (req,res)=>{
    try {
        res.render('user/OTP',{title:"OTP verification",emailAddress:req.session.email,alertMessage:req.flash('errorMessage'),otpExpireTime:req.session.otpExpireTime,user:req.session.user})
        
    } catch (err) {
        console.log(`error in otp page render ${err}`)
        
    }
}



const otpPost = async (req,res)=>{
    try {
        if(req.session.otp !==undefined){
            const userdata={
               name:req.session.name,
               email:req.session.email,
               number:req.session.phone,
               password:req.session.password
            }
            if(req.session.otp===req.body.otp){
                await userSchema.insertMany(userdata).then(()=>{
                    console.log(` new user registration successful`)
                    req.flash('errorMessage','user registeration successful !')
                    res.redirect('/user/login')
                }).catch((err)=>{
                    console.log(`error during registration ${err}`)
                })
            }else{
                req.flash('errorMessage','Otp invalid pls try again...')
                res.redirect('/user/OTP')
            }
        }
        else{
        req.flash('errorMessage','An error OCCured during otp genetation try again !')
        res.redirect('/user/signup')
        }

    } catch (err) {
        console.log(`error occured in otp verification ${err}`)
        
    }
}

const otpResend = (req,res)=>{
    try {
        const emailAddress= req.params.email
        const otp=generateOtp()
        sendOtpMail(emailAddress,otp)
        req.session.otp=otp
        req.session.otpExpireTime=Date.now()
        res.status(200)
        req.flash('errorMessage','Otp resend successfully')
        res.redirect('/user/otp')
        
    } catch (err) {
        console.log(`error during otp sended ${err}`)
        
    }
}
    
const home= async (req,res)=>{
    try {
        const selectCategory=req.query.category || ''
        let product;
        if(selectCategory ===''){
            product= await productSchema.find({isActive:true})
        }else{
            product= await productSchema.find({productCategory:selectCategory,isActive:true})
        }
        const category=await categorySchema.find({isactive:true})

        res.render('user/home',{title:"user Home",product,category,alertMessage:req.flash('errorMessage'),user:req.session.user})
    } catch (err) {

        console.log(`error in home page rendering ${err}`)
        
    }
}





const logout = (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.log(err)
        }else{
            res.redirect('/user/login')
        }
    })
}





module.exports= {
    user,home,login,loginPost,signup,signpost,otp,otpPost,otpResend,logout,loginAuth,loginAuthRedirect
}