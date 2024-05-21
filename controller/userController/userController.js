const userSchema = require('../../model/userSchema')

const bcrypt=require('bcrypt')


const user=(req,res)=>{
    try{
        res.redirect('/user/home')
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
        res.render('user/login',{ user: req.session.user,title:"Login",alertMessage:req.flash('errorMessage')})
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

    //     const checkUserExist= await userSchema.find({email:req.body.email})

    //     if(checkUserExist.length === 0 ){

    //         userSchema.insertMany(userData).then((result)=>{
    //             req.flash('errorMessage',"User Registration is successful")
    //             return res.redirect('/user/login')

    //         }).catch((err) => {
    //             console.log(`Error while inserting new user ${err}`);
    //     })
        
    // } 
    // else {
    //     req.flash('errorMessage','User already exist')
    //     return res.redirect('/user/login')
    //  }
    // }

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

    catch (error) {
        console.log(`Error during signup post ${err}`);
    }
}

module.exports= {
    user,login,loginPost,signup,signpost
}