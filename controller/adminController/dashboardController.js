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


const category = async(req,res)=>{
    try {
        const categorySearch = req.query.categorySearch || '';
        const category = await categorySchema.find({ categoryName: { $regex: categorySearch, $options: 'i' } })
        res.render('admin/category',{admin: req.session.admin,title:"Category List",category,alertMessage: req.flash('errorMessage'),})

        
    } catch (error) {
        console.log('error')
        
    }
}

// adding new category from model to datamodel

const addCategoryPost = async (req,res)=> {

    try{
        let categoryName=req.body.Newcategory;

        const category ={
            categoryName:categoryName,
            categoryAddedOn:new Date(),
            isActive:true
        }

        const checkCategory = await categorySchema.findOne({categoryName:categoryName})

        if (checkCategory===null)
       {
        await categorySchema.insertMany(category).then(()=>{
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