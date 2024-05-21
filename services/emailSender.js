const nodemailer = require("nodemailer");
const dotenv=require('dotenv').config()

const transporter = nodemailer.createTransport({
  host:process.env.SMTP_HOST ,
  port: process.env.SMTP_PORT,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user:process.env.SMTP_MAIL ,
    pass:process.env.SMTP_PASSWORD,
  },
});


 function sendOtpMail(email,otp) {
  // send mail with defined transport object
  const mailOptions={
    from:process.env.SMTP_MAIL , // sender address
    to: email, 
    subject: "Verification Code from WordPlay Books", // Subject line
    text:  `Please use the verification code ${otp} to sign in. If you didn't request this, you can ignore this email.`, // plain text body
  
  };
  transporter.sendMail(mailOptions,(err,info)=>{
    if(err){
        console.log(`Error Occurred while sending Mail ${err}`)
    }else{
        console.log("Email sended successfully");
    }
  })
}

module.exports=sendOtpMail
