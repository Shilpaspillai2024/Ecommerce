const orderSchema = require('../../model/orderSchema')
const walletSchema = require('../../model/walletSchema')
const productSchema = require('../../model/productSchema')
const userSchema = require('../../model/userSchema')
const reviewSchema = require('../../model/reviewSchema')
const catchAsync=require('../../utils/catchAsync')
const mongoose = require('mongoose')
const PDFDocument = require('pdfkit-table')
const fs = require('fs')
const path = require('path')
const Razorpay = require('razorpay')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});



const order = catchAsync(async (req, res) => {

// const order = await orderSchema.find({ userId: req.session.user, isCancelled: false }).populate('products.productId').sort({ createdAt: -1 })

    //pagination

        const productpage=10;
        
        const currentPage=parseInt(req.query.page)|| 1;
        const skip=(currentPage-1)*productpage

        const order = await orderSchema.find({ userId: req.session.user }).populate('products.productId').skip(skip).limit(productpage).sort({ createdAt: -1 })

        const totalProducts = await orderSchema.countDocuments({ userId: req.session.user, isCancelled: false });

        const pageNumber=Math.ceil(totalProducts/productpage)

        res.render('user/order', { title: "order-page", user: req.session.user, alertMessage: req.flash('errorMessage'), order, 
            pageNumber,
            currentPage,
            totalProducts })

   
})



const cancelOrder =catchAsync(async (req, res) => {


        const productpage = 10;
        const currentPage = parseInt(req.query.page) || 1;
        const skip = (currentPage - 1) * productpage;


        const orderData = await orderSchema
        .find({ userId: req.session.user, isCancelled: true })
        .populate('products.productId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(productpage);

        const order = orderData.map(ord => {
            const filteredProducts = ord.products.filter(prod => prod.productId !== null);
            return { ...ord._doc, products: filteredProducts };
        });

        const totalCancelledOrders = await orderSchema.countDocuments({
            userId: req.session.user,
            isCancelled: true,
        });
        const pageNumber = Math.ceil(totalCancelledOrders / productpage);
         res.render('user/cancelOrder', { title: "cancelOrder-page", 
            user: req.session.user,
             alertMessage: req.flash("errorMessage"), order,
             pageNumber,
             currentPage,
             totalCancelledOrders, })

   
});


const cancellOrderPost =catchAsync( async (req, res) => {
   
        const orderId = req.params.orderId;
        const userId = req.session.user;
        const order = await orderSchema.findByIdAndUpdate(orderId, { status: "cancelled", isCancelled: true })
        // let balance = order.totalPrice-(order.couponDiscount || 0)

        let balance = order.totalPrice

        if (order.paymentMethod !== 'COD') {

            const wallet = await walletSchema.findOne({ userId })


            const currentDate=new Date();

            if (wallet) {
                wallet.balance += balance;
                wallet.transaction.push({
                    typeOfPayment: 'credit',
                    amount: balance,
                    date: currentDate,
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
                        date:currentDate,
                        orderId: order._id,
                    }],
                });

                await walletNew.save();

            }
        }
        for (product of order.products) {

            await productSchema.findByIdAndUpdate(product.productId, { $inc: { productQuantity: product.quantity } })

        }


        if (order) {
            req.flash('errorMessage', 'Your order has been successfully cancelled.If you need any further assistence you can Contact out customer support...!')
            res.redirect('/cancelled-orders')
        } else {
            req.flash('errorMessage', 'We apologize, but your product is not eligible for return at this time. please contact our customer support team !....')
            res.redirect('/order')
        }

})



const returnOrder =catchAsync( async (req, res) => {
   
    const { orderId } = req.body

        const order = await orderSchema.findByIdAndUpdate(orderId,
            {
                status: 'return-pending',
                reasonforCancel: req.body.reason
            })

        if (order) {
            req.flash(
                "errorMessage",
                "Your order has been under the review for returning. Thank you."
            );
            res.redirect("/cancelled-orders")
        } else {
            req.flash(
                "errorMessage",
                "We apologize, but your product is not eligible for return at this time. If you have any questions or need further assistance, please contact our customer support team"
            );
            res.redirect("/order");
        }

   
})





const orderDetail = catchAsync(async (req, res) => {
   

        const orderId = req.params.orderId
        const order = await orderSchema.findById(orderId).populate('products.productId')

        if (!order) {
            return res.status(404).send('Order not found');
        }


        res.render('user/orderDetail', { user: req.session.user, order, title: "OrderDetail", alertMessage: req.flash('errorMessage') })

   


})



const addReview = catchAsync(async (req, res) => {
   

        const productId = req.params.productId


        const rating = parseInt(req.body.rating)
        const reviewFeedback = req.body.reviewFeedback
        const userDetails = await userSchema.findById(req.session.user)

        // Check if rating is a valid number
        if (isNaN(rating)) {
            return res.status(400).json({ error: "Invalid rating provided" });
        }



        const product = await productSchema.findById(productId)

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }



        const productObjId = product._id

        //find exsisting rating of the product

        let review = await reviewSchema.findOne({ productId: productObjId });


        if (review) {
            let userReviewed = false;
            for (let i = 0; i < review.reviews.length; i++) {
                if (review.reviews[i].userId.toString() === req.session.user) {
                    userReviewed = true;
                    // Update existing review
                    review.reviews[i].description = reviewFeedback;
                    review.reviews[i].star = rating;
                    break;
                }
            }
            // If user hasn't reviewed, add a new review
            if (!userReviewed) {
                review.reviews.push({
                    userId: userDetails._id,
                    description: reviewFeedback,
                    star: rating,
                });
            }

            // Calculate average rating
            let totalRating = 0;
            for (let i = 0; i < review.reviews.length; i++) {
                totalRating += review.reviews[i].star;
            }
            review.rating = totalRating / review.reviews.length;

            // Save the updated review
            await review.save();
            return res
                .status(200)
                .json({ success: "Review updated", averageRating: review.rating });
        } else {
            // If no review exists, create a new one
            const newReview = new reviewSchema({
                productId: productObjId,
                reviews: [
                    {
                        userId: userDetails._id,
                        description: reviewFeedback,
                        star: rating,
                    },
                ],
                rating: rating, // Initial rating for the new review
            });

            // Save the new review
            await newReview.save();

            return res
                .status(200)
                .json({ success: "Review added", averageRating: newReview.rating });
        }


    
})





// download the invoice of the order

const downloadInvoice =catchAsync( async (req, res) => {
   
        const orderId = req.params.orderId;
        const orderDetails = await orderSchema.findById(orderId).populate('products.productId')
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
            headers: ["Product Name", "Quantity", "Price", "Product Discount", "Coupon Discount", "Total"],
            rows: orderDetails.products.map((product) => {
                const productName = product.productId?.productName || "N/A";
                const quantity = product.quantity || 0;
                const price = product.productId.productPrice || 0;
                const discount = product.productId?.productDiscount || 0;
                const coupondiscount = orderDetails.couponDiscount || 0
                console.log(coupondiscount)

                const total = Math.round((price * (1 - discount / 100) * quantity) - (coupondiscount).toFixed(2));

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
   
})


//payment retyr with razorpay

const retryRazorPay =catchAsync( async (req, res) => {

        const { orderId } = req.body




        // Check if orderId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).send('Invalid orderId');
        }

        const order = await orderSchema.findById(orderId)

        // Check if the order exists
        if (!order) {
            return res.status(404).send('Order not found');
        }
        // razorpay order created

        const razorpayOrder = await razorpay.orders.create({
            amount: order.totalPrice * 100,
            currency: "INR",
            receipt: "receipt#1",
        })




        if (razorpayOrder) {


            return res.status(200).json({ ...order.toObject(), razorpayOrderId: razorpayOrder.id })
        } else {
            return res.status(404).send('Retry Payment Failed')
        }

   

})





const proceedPayment =catchAsync( async (req, res) => {

      const { orderId, razorpayOrderId } = req.body


        //update status of order

        const update = {
            razorpayOrderId: razorpayOrderId,
            status: 'processing'
        }
        const order = await orderSchema.findByIdAndUpdate(orderId, update);
        for (let product of order.products) {
            await productSchema.findByIdAndUpdate(product.productId, {
                $inc: { productQuantity: -product.quantity }
            });
        }

        res.status(200).json(order)

   
})



const removeOrder =catchAsync(async (req, res) => {

        const orderId = req.params.id
        const order = await orderSchema.findByIdAndDelete(orderId)
        if (order) {
            req.flash('errorMessage', 'order Suceefully removed')
            res.redirect('/order')
        }

  
});




const orderFailure = (req, res) => {
    res.render('user/orderFailure', { title: "payment failure page" })
}


module.exports = {
    order,
    cancelOrder,
    cancellOrderPost,
    returnOrder,
    orderDetail,
    downloadInvoice,
    retryRazorPay,
    proceedPayment,
    removeOrder,
    orderFailure,
    addReview
}
