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
            req.flash('errorMessage','new category added')
            console.log(`new category added`)
            res.redirect('/admin/category')
        }).catch((err)=>{
            console.log(`error occured during adding new category ${err}`)
        })
           
       }
       else{
        req.flash('errorMessage', "category already present")
        res.redirect('/admin/category')
       }


    }
    catch(err){
        console.log(`error in adding category ${err}`)

    }
}


// edit cateory from model 

const editCategoryPost= async (req,res)=>{
    try {

        const id = req.body.catid
        const name = req.body.catname

        const checkCat = await categorySchema.findOne({categoryName:name})

        if(checkCat==null){
            await categorySchema.findByIdAndUpdate(id,{categoryName:name})
            req.flash('errorMessage','Success: Category update successfully')
            res.redirect('/admin/category')
        }else{
            req.flash('errorMessage','Warning: Category already exists. Please ensure no duplicates are being added.')
            res.redirect("/admin/category")
        }
        
    } catch (err) {
        console.log(`error in editing category ${err}`)
    }
}

//delete category

const deleteCategory = async (req,res)=>{
    try {
        const CatId=req.params.id
         
        const deleteCat=await categorySchema.findByIdAndDelete(CatId)
        if(deleteCat!=null){
            req.flash('errorMessage','Category Deleted successfully')
            res.redirect('/admin/category')
        }
        else{
            req.flash('errorMessage','unable to delete the category')
            res.redirect('/admin/category')
        }
        
    } catch (err) {
        console.log(`error in deleting category ${err}`)
        
    }
}

// deactivatecategory

 const deactivateCategory=async (req,res)=>{
      try {
        
        const deactId=req.params.id

        const deactCat=await categorySchema.findByIdAndUpdate(deactId,{isActive:false})
         
        res.redirect('/admin/category')
      } catch (err) {

        console.log(`error during deactivating the category ${err}`)
        
      }
 }

 // activateCategory
  const activateCategory= async (req,res)=>{
      try { 
        const actid=req.params.id
        const actCat=await categorySchema.findByIdAndUpdate(actid,{isActive:true})
        res.redirect('/admin/category')

        
      } catch (err) {
        console.log(`error during activating the category ${err}`)
        
      }
  }

module.exports={
    dashboard,
    category,
    addCategoryPost,
    editCategoryPost,
    deleteCategory,
    deactivateCategory,
    activateCategory
}