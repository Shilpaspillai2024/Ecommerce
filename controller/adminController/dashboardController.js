const mongoose=require('mongoose')
const userSchema=require('../../model/userSchema')
const categorySchema=require('../../model/categorySchema')



const dashboard=(req,res)=>{
    try {
        if(req.session.admin){
        res.render('admin/dashboard',{admin: req.session.admin,title:"admin dashboard",alertMessage: req.flash('errorMessage')})
        }
    } catch (error) {
        console.log(`error in dashbord page`)
        
    }
}

const category = (req,res)=>{
    try {
        res.render('admin/category',{admin: req.session.admin,title:"category",alertMessage: req.flash('errorMessage'),})

        
    } catch (error) {
        console.log('error')
        
    }
}

// adding new category from model to datamodel

const addCategoryPost = async (req,res)=> {

    try{
        let category=req.body.Newcategory;

        const data ={
            categoryName:category,
            categoryAddedOn:new Date(),
            isActive:true
        }

        const checkCategory = await categorySchema.findOne({categoryName:category})

        if (checkCategory===null)
       {
        await categorySchema.insertMany(data).then(()=>{
            req.flash('error message','new category added')
            console.log(`new category added`)
            res.redirect('/admin/category')
        }).catch((err)=>{
            console.log(`error occured during adding new category ${err}`)
        })
           
       }
       else{
        req.flash('error message', "category already present")
        res.redirect('/admin/category')
       }


    }
    catch(err){
        console.log(`error in adding category ${err}`)

    }
}



module.exports={dashboard,category,addCategoryPost}