const orderSchema=require('../../model/orderSchema')
const walletSchema=require('../../model/walletSchema')
const productSchema=require('../../model/productSchema')
const userSchema=require('../../model/userSchema')
const mongoose=require('mongoose')
const PDFDocument=require('pdfkit-table')
const fs=require('fs')
const path=require('path')


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
        // let balance=(order.totalPrice-(order.couponDiscount || 0 ))

        let balance=order.totalPrice

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

        // let balance = order.totalPrice - (order.couponDiscount || 0)
        let balance=order.totalPrice

        if(wallet){
            wallet.balance += balance;
            wallet.transaction.push({
                typeOfPayment: 'credit',
                amount: balance,
                date: Date.now(),
                orderId: order._id,
               
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
                    orderId: order._id,
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
        const order=await orderSchema.findById(orderId).populate('products.productId')

        if (!order) {
            return res.status(404).send('Order not found');
        }


         res.render('user/orderDetail', { user: req.session.user,order, title: "OrderDetail", alertMessage: req.flash('errorMessage') })
        
    } catch (err) {

        console.log(`error in rendering orderDetailPage`)
        
    }

  
}

// download the invoice of the order

const downloadInvoice=async(req,res)=>{
    try {
        const orderId=req.params.orderId;
        const orderDetails=await orderSchema.findById(orderId).populate('products.productId')
        const doc = new PDFDocument();
        const filename = `WordPlayBooks Invoice ${Date.now()}.pdf`;
      
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.setHeader("Content-Type", "application/pdf");

        doc.pipe(res);

        console.log(orderDetails)

        // Add header aligned to center
        doc
            .font("Helvetica-Bold")
            .fontSize(36)
            .text("WordPlayBooks", { align: "center", margin: 10 });
        doc
            .font("Helvetica-Bold")
            .fillColor("grey")
            .fontSize(8)
            .text("Explore the new world of Reading", {
                align: "center",
                margin: 10,
            });
        doc.moveDown();

        // doc.fontSize(10).fillColor("blue").text(`Invoice #${orderId}`);
        doc.fontSize(10).fillColor("blue").text(`Invoice #${orderDetails.orderID}`);
        doc.moveDown();
        doc.moveDown();

        // Add total sales report
        doc
            .fillColor("black")
            // .text(`Total products: ${orderDetails.products.length}`);

            .text(`Total products: ${orderDetails.products.reduce((total, product) => total + product.quantity, 0)}`);

            
        doc
            .fillColor("black")
            .text(
                `Shipping Charge: ${orderDetails.totalPrice < 500 ? "RS 50" : "Free"}`
            );
        doc
            .fontSize(10)
            .fillColor("red")
            .text(`Total Amount: Rs ${orderDetails.totalPrice.toLocaleString()}`);
        doc.moveDown();

        doc
            .fontSize(10)
            .fillColor("black")
            .text(`Payment method: ${orderDetails.paymentMethod}`);
        doc.text(`Order Date: ${orderDetails.createdAt.toDateString()}`);
        doc.moveDown();
        doc.moveDown();

        // Add address details of the company
        doc
            .fontSize(10)
            .fillColor("black")
            .text(`Address: kazhakootam,trivandrum`);
        doc.text(`Pincode: 686453`);
        doc.text(`Phone: 964 520 1531`);
        doc.moveDown();
        doc.moveDown();

        doc.fontSize(12).text(`Invoice.`, { align: "center", margin: 10 });
        doc.moveDown();

        const tableData = {
            headers: ["Product Name", "Quantity", "Price", "Product Discount","Coupon Discount", "Total"],
            rows: orderDetails.products.map((product) => {
                                const productName = product.productId?.productName || "N/A";
                const quantity = product.quantity || 0;
                const price = product.productId.productPrice || 0;
                const discount = product.productId?.productDiscount || 0;
                const coupondiscount=orderDetails.couponDiscount || 0
console.log(coupondiscount)
               
                const total = Math.round((price * (1 - discount / 100) * quantity)-(coupondiscount).toFixed(2));

                return [
                    productName,
                    quantity,
                    `Rs ${price}`,
                    `${discount} %`,
                    `Rs${coupondiscount} `,
                    `Rs ${total}`,
                ];
            }),
        };

        // Customize the appearance of the table
        await doc.table(tableData, {
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
            prepareRow: (row, i) => doc.font("Helvetica").fontSize(8),
            hLineColor: "#b2b2b2", // Horizontal line color
            vLineColor: "#b2b2b2", // Vertical line color
            textMargin: 2, // Margin between text and cell border
        });

        doc.moveDown();
        doc.moveDown();
        doc.moveDown();
        doc.moveDown();
        doc.fontSize(12).text(`Thank You.`, { align: "center", margin: 10 });
        doc.moveDown();

        // Finalize the PDF document
        doc.end();
    } catch (err) {
        console.log(`Error on downloading the invoice pdf ${err}`);
        res.status(500).send("Error generating invoice");
        
    }
}





const orderFailure=(req,res)=>
    { 
        res.render('user/orderFailure',{title:"payment failure page"})
    }









module.exports={
    order,
    cancelOrder,
    cancellOrderPost,
    returnOrder,
    orderDetail,
    downloadInvoice,
    orderFailure
}
