const orderSchema = require('../../model/orderSchema')
const walletSchema = require('../../model/walletSchema')
const productSchema = require('../../model/productSchema')
const userSchema = require('../../model/userSchema')
const reviewSchema = require('../../model/reviewSchema')
const mongoose = require('mongoose')
const PDFDocument = require('pdfkit-table')
const fs = require('fs')
const path = require('path')
const Razorpay = require('razorpay')

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});



const order = async (req, res) => {


    try {


        const order = await orderSchema.find({ userId: req.session.user, isCancelled: false }).populate('products.productId').sort({ createdAt: -1 })



        res.render('user/order', { title: "order-page", user: req.session.user, alertMessage: req.flash('errorMessage'), order })

    } catch (err) {

        console.log(`error in rendering the orderDetail page ${err}`)

    }
}



const cancelOrder = async (req, res) => {

    try {

        const order = await orderSchema.find({ userId: req.session.user, isCancelled: true }).populate('products.productId').sort({ createdAt: -1 })
        res.render('user/cancelOrder', { title: "cancelOrder-page", user: req.session.user, alertMessage: req.flash("errorMessage"), order })

    } catch (err) {

        console.log(`error in rendering the cancel the order page ${err}`)

    }
}


const cancellOrderPost = async (req, res) => {
    try {
        const orderId = req.params.orderId

        const userId = req.session.user

        const order = await orderSchema.findByIdAndUpdate(orderId, { status: "cancelled", isCancelled: true })
        // let balance=(order.totalPrice-(order.couponDiscount || 0 ))

        let balance = order.totalPrice

        if (order.paymentMethod !== 'COD') {

            const wallet = await walletSchema.findOne({ userId })

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
        for (product of order.products) {

            await productSchema.findByIdAndUpdate(product.productId, { $inc: { productQuantity: product.quantity } })

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



const returnOrder = async (req, res) => {
    try {

        const { orderId } = req.body



        const userId = req.session.user


        const order = await orderSchema.findById(orderId)

        if (!order) {
            return res.status(404).send('Order not found');
        }

        order.status = 'returned'
        await order.save()


        const wallet = await walletSchema.findOne({ userId })

        // let balance = order.totalPrice - (order.couponDiscount || 0)
        let balance = order.totalPrice

        if (wallet) {
            wallet.balance += balance;
            wallet.transaction.push({
                typeOfPayment: 'credit',
                amount: balance,
                date: Date.now(),
                orderId: order._id,

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

        for (product of order.products) {

            await productSchema.findByIdAndUpdate(product.productId, { $inc: { productQuantity: product.quantity } })

        }

        res.status(200).send('Return order request submitted successfully');



    } catch (err) {
        console.log(`Error: ${err}`);
        res.status(500).send('Failed to submit return order request');

    }
}





const orderDetail = async (req, res) => {
    try {

        const orderId = req.params.orderId
        const order = await orderSchema.findById(orderId).populate('products.productId')

        if (!order) {
            return res.status(404).send('Order not found');
        }


        res.render('user/orderDetail', { user: req.session.user, order, title: "OrderDetail", alertMessage: req.flash('errorMessage') })

    } catch (err) {

        console.log(`error in rendering orderDetailPage`)

    }


}



const addReview = async (req, res) => {
    try {

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

        //find exsisting rating of the pproduct

        let review = await reviewSchema.findOne({ productId: productObjId });


        if (review) {
            let userReviewed = false;
            for (let i = 0; i < review.reviews.length; i++) {
                if (review.reviews[i].userId === req.session.user) {
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


    } catch (err) {

        console.error(`Error on adding review via fetch post: ${err}`);
        return res.status(500).json({ error: "Internal server error" });

    }
}





// download the invoice of the order

const downloadInvoice = async (req, res) => {
    try {
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
    } catch (err) {
        console.log(`Error on downloading the invoice pdf ${err}`);
        res.status(500).send("Error generating invoice");

    }
}


//payment retyr with razorpay

const retryRazorPay = async (req, res) => {

    try {
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

    } catch (err) {

        console.log(`Error from Razorpay retry: ${err}`);

    }

}





const proceedPayment = async (req, res) => {

    try {

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

    } catch (err) {
        console.log(`error from retry payment ${err}`)

    }

}



const removeOrder = async (req, res) => {
    try {

        const orderId = req.params.id
        const order = await orderSchema.findByIdAndDelete(orderId)
        if (order) {
            req.flash('errorMessage', 'order Suceefully removed')
            res.redirect('/user/order')
        }

    } catch (err) {
        console.log(`error from remove order ${err}`)

    }
}




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
