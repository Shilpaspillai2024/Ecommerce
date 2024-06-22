const orderSchema=require('../../model/orderSchema')
const userSchema=require('../../model/userSchema')


const order=async(req,res)=>{


    try {


        const order=await orderSchema.find({userId:req.session.user,isCancelled: false}).populate('products.productId').sort({createdAt:-1})

        

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



const returnOrder=async(req,res)=>{
    try {

        const{orderId}=req.body

    
        const order= await orderSchema.findById(orderId)

        if(!order){
            return res.status(404).send('Order not found');
        }
        
        order.status='returned'
        await order.save()

        res.status(200).send('Return order request submitted successfully');



    } catch (err) {
        console.log(`Error: ${err}`);
        res.status(500).send('Failed to submit return order request');
        
    }
}





const orderDetail= async(req,res)=>{
    try {

         res.render('user/orderDetail', { user: req.session.user, title: "OrderDetail", alertMessage: req.flash('errorMessage') })
        
    } catch (err) {

        console.log(`error in rendering orderDetailPage`)
        
    }

  
}




module.exports={
    order,
    cancelOrder,
    cancellOrderPost,
    returnOrder,
    orderDetail
}
