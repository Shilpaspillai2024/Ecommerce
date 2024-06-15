const orderSchema=require('../../model/orderSchema')
const userSchema=require('../../model/userSchema')


const order=async(req,res)=>{


    try {


        const order=await orderSchema.find({userId:req.session.user,isCancelled: false}).populate('products.productId')

        

        res.render('user/order',{title:"order-page",user:req.session.user,alertMessage:req.flash('errorMessage') ,order})
        
    } catch (err) {

        console.log(`error in rendering the orderDetail page ${err}`)
        
    }
}



const cancelOrder=async(req,res)=>{

    try {

        const order=await orderSchema.find({userId:req.session.user,isCancelled: true}).populate('products.productId').sort({ createdAt: -1 })

  

        res.render('user/cancelOrder',{title:"cancelOrder-page",user:req.session.user,alertMessage:req.flash("errorMessage"),order})
        
    } catch (err) {

        console.log(`error in rendering the cancel the order page ${err}`)
        
    }
}


const cancellOrderPost= async(req,res)=>{
    try {
        const orderId=req.params.orderId

        const order=await orderSchema.findByIdAndUpdate(orderId,{status:"cancelled",isCancelled: true})

        if (order) {
            req.flash('errorMessage', 'Your order has been successfully cancelled.If you need any further assistence you can Contact out customer support...!')
            res.redirect('/user/cancelled-orders')
        } else {
            req.flash('errorMessage', 'We apologize, but your product is not eligible for return at this time. please contact our customer support team !....')
            res.redirect('/user/order')
        }

        
    } catch (err) {

        console.log(`there is an error occuring cancelling the orde ${err}`)
        
    }
}

module.exports={
    order,
    cancelOrder,
    cancellOrderPost
}
