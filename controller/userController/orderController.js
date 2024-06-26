const orderSchema=require('../../model/orderSchema')
const walletSchema=require('../../model/walletSchema')
const productSchema=require('../../model/productSchema')
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

        const userId=req.session.user

        const order=await orderSchema.findByIdAndUpdate(orderId,{status:"cancelled",isCancelled: true})
        let balance=(order.totalPrice-(order.couponDiscount || 0 ))

        if(order.paymentMethod !=='COD'){
            
            const wallet = await walletSchema.findOne({userId})
            
            if (wallet) {
                wallet.balance += balance;
                wallet.transaction.push({
                    typeOfPayment: 'credit',
                    amount: balance,
                    date: Date.now(),
                    orderId: order._id
                });

                await wallet.save();
    
            } else {
    
                const walletNew = new walletSchema({
                    userId,
                    balance,
                    transaction: [{
                        typeOfPayment: 'credit',
                        amount: balance,
                        date: Date.now(),
                        orderId: order._id,
                    }],
                });

                await walletNew.save();
    
            }
        }
        for(product of order.products) {
            
            await productSchema.findByIdAndUpdate(product.productId,{$inc :{productQuantity : product.quantity}})

        }


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

        const userId=req.session.user

    
        const order= await orderSchema.findById(orderId)

        if(!order){
            return res.status(404).send('Order not found');
        }
        
        order.status='returned'
        await order.save()


        const wallet = await walletSchema.findOne({userId})

        let balance = order.totalPrice - (order.couponDiscount || 0)

        if(wallet){
            wallet.balance += balance;
            wallet.transaction.push({
                typeOfPayment: 'credit',
                amount: balance,
                date: Date.now(),
                orderId: order.orderID,
            });

            await wallet.save();

        }else{

            const walletNew = new walletSchema({
                userId,
                balance,
                transaction: [{
                    typeOfPayment: 'credit',
                    amount: balance,
                    date:Date.now(),
                    orderId: order.orderID,
                }],
            });

            await walletNew.save();

        }

        for(product of order.products) {
            
            await productSchema.findByIdAndUpdate(product.productId,{$inc :{productQuantity : product.quantity}})

        }

        res.status(200).send('Return order request submitted successfully');



    } catch (err) {
        console.log(`Error: ${err}`);
        res.status(500).send('Failed to submit return order request');
        
    }
}





const orderDetail= async(req,res)=>{
    try {

        const orderId=req.params.orderId
        console.log(orderId)

        const order=await orderSchema.findById(orderId).populate('products.productId')

        console.log(order)
        if (!order) {
            return res.status(404).send('Order not found');
        }


         res.render('user/orderDetail', { user: req.session.user,order, title: "OrderDetail", alertMessage: req.flash('errorMessage') })
        
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
