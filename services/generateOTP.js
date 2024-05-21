const OtpGenarator=require('otp-generator')

const generateOtp=()=>{
    const Otp=OtpGenarator.generate(6,{
        lowerCaseAlphabets:false,
        upperCaseAlphabets: false, 
        specialChars: false 

    });
    return Otp;
}
module.exports=generateOtp