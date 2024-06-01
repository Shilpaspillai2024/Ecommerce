

const order= (req,res)=>{
    try {

        res.render('admin/order',{admin:req.session.admin,title:'Order List',alertMessage:req.flash('errorMessage')})
        
    } catch (err) {

        consolelog(`error in loading the order page ${err}`)
        
    }
}


module.exports={order}