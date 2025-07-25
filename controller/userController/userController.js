const userSchema = require('../../model/userSchema')
const wishlistSchema=require('../../model/wishlistSchema')

const bcrypt=require('bcrypt')

const generateOtp=require('../../services/generateOTP')
const sendOtpMail=require('../../services/emailSender')
const productSchema=require('../../model/productSchema')
const categorySchema=require('../../model/categorySchema')
const passport=require('passport')
const passportSetup = require('../../config/passport-setup')
const STATUS_CODES = require('../../constants/statusCodes')




const user=(req,res,next)=>{
    try{
        res.redirect('/home')
    }catch(err){
        console.log('Error During user route');
        next(err)
    }
}



  
const login= (req,res)=>{
    if(req.session.user){
       
        res.redirect('/home')
        
       
    }else{
        // Assuming you have stored user information in the request object
        // const user = req.user;
        res.render('user/login',{ user: req.session.user,title:"Login",alertMessage:req.flash('errorMessage')})
    }
}
 const loginPost= async (req,res,next)=>{
    try {
        const checkUser =await userSchema.findOne({email: req.body.username})
        if(checkUser != null){
            if(checkUser.isBlocked){
                req.flash('errorMessage','Access to this account has been restricted.')
                res.redirect('/login')
            }else{
                const passwordCheck=await bcrypt.compare(req.body.password,checkUser.password)
                // console.log(passwordCheck)
                if( checkUser && passwordCheck){
                    req.session.user=checkUser.id;
                  
                    res.redirect('/home')
                 }
                else{                   
                    req.flash('errorMessage','invalid username or password')
                    res.redirect('/login')
                }
            }
        }   
    } catch (err) {

       // console.log(`error in login post ${err}`)
       next(err)
        
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
       
        return next(err);
      }
      if (!user) {
       
        return res.redirect("/login");
      } // Redirect to login if authentication fails
      req.logIn(user, (err) => {
        if (err) {
         
          return next(err);
        }
        
      

        req.session.user = user.id;
        return res.redirect("/home"); // Redirect to profile page if authentication is successful
      });
    })(req, res, next);
  };



 



 const signup=(req,res,next)=>{
    try {
        if(req.session.user){
            res.redirect('/home')
         }else{
            res.render('user/signup',{user:req.session.user,title:"Signup",alertMessage:req.flash('errorMessage')})
         }
        
    } catch (err) {
       // console.log(`this signup page render error ${err}`)
       next(err)
        
    }
 }


 const signpost= async (req,res,next)=>{
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
        res.redirect('/signup')
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
        res.redirect('/otp')
       }
    }

    catch (err) {
       // console.log(`Error during signup post ${err}`);
       next(err)
    }
}


const otp= (req,res,next)=>{
    try {
        res.render('user/OTP',{title:"OTP verification",emailAddress:req.session.email,alertMessage:req.flash('errorMessage'),otpExpireTime:req.session.otpExpireTime,user:req.session.user})
        
    } catch (err) {
       // console.log(`error in otp page render ${err}`)
        next(err)
    }
}



const otpPost = async (req,res,next)=>{
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
                    res.redirect('/login')
                }).catch((err)=>{
                    console.log(`error during registration ${err}`)
                })
            }else{
                req.flash('errorMessage','Otp invalid pls try again...')
                res.redirect('/OTP')
            }
        }
        else{
        req.flash('errorMessage','An error OCCured during otp genetation try again !')
        res.redirect('/signup')
        }

    } catch (err) {
       // console.log(`error occured in otp verification ${err}`)
       next(err)
        
    }
}

const otpResend = (req,res,next)=>{
    try {
        const emailAddress= req.params.email
        const otp=generateOtp()
        sendOtpMail(emailAddress,otp)
        req.session.otp=otp
        req.session.otpExpireTime=Date.now()
        res.status(STATUS_CODES.OK)
        req.flash('errorMessage','Otp resend successfully')
        res.redirect('/otp')
        
    } catch (err) {
       // console.log(`error during otp sended ${err}`)
       next(err)
        
    }
}
    
const home= async (req,res,next)=>{
    try {
        const selectCategory=req.query.category || 'All'
        let product;
        if(selectCategory ==='All'){
            product= await productSchema.find({isActive:true})
        }else{
            product= await productSchema.find({productCategory:selectCategory,isActive:true})
        }
        const category=await categorySchema.find({isactive:true})


        if(req.session.user){
            const userId=req.session.user

            const wishlist=await wishlistSchema.findOne({userId:userId}) 


            res.render('user/home',{title:"Home",product,category,wishlist:wishlist|| { products: [] },alertMessage:req.flash('errorMessage'),user:req.session.user})
        }
        else{

        res.render('user/home',{title:"Home",product,category,alertMessage:req.flash('errorMessage'),user:req.session.user})
        }
    } catch (err) {

        //console.log(`error in home page rendering ${err}`)
        next(err)
        
    }
}



const logout = (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.log(err)
        }else{
            res.redirect('/login')
        }
    })
}

module.exports= {
    user,home,login,loginPost,signup,signpost,otp,otpPost,otpResend,logout,loginAuth,loginAuthRedirect
}