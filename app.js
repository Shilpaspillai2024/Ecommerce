const express=require('express');
const app=express();
const path=require('path')
const session=require('express-session')
const expresslayouts=require('express-ejs-layouts')
const dotenv=require('dotenv').config()
const user=require('./routes/userRouter')
const mongodbConnection=require('./config/mongodb')
const nocache=require('nocache')
const flash=require('connect-flash')


// env port
const port=process.env.PORT || 3000

const userRoutes=require('./routes/userRouter')

mongodbConnection();

// flash

app.use(flash())
 
//nocache
app.use(nocache())

// path setting

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.static(path.join(__dirname, 'public/image')));
app.use('/style', express.static(path.join(__dirname, 'public', 'style')));


// layouts setup

app.use(expresslayouts)

app.set('layout','./layouts/layout')

//ejs setup
app.set('view engine','ejs')
app.set('views', path.join(__dirname, 'views'));

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(session({
    secret:"your secret key",
    resave:false,
    saveUninitialized:true,
}))

app.use('/user',userRoutes)

app.get('/',(req,res)=>{
    res.redirect('/user/home')
})


app.listen(port, (err) => {
    if (err) {
        console.log(`Error occurred during port listen `);
    } else {
        console.log(`Server running on port http://localhost:${port}`);
    }
});

