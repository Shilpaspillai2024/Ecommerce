const userSchema = require('../../model/userSchema')
const walletSchema = require('../../model/walletSchema')
const productSchema = require('../../model/productSchema')

const orderSchema = require('../../model/orderSchema')

const order = async (req, res) => {
    try {
        // const orderSearch=req.query.orderSearch || '';

        const productpage = 10;
        const currentPage = parseInt(req.query.page) || 1
        const skip = (currentPage - 1) * productpage

        const order = await orderSchema.find().populate('products.productId').populate('userId').skip(skip).limit(productpage).sort({ createdAt: -1 })

        // Count total number of products
        const totalProducts = await orderSchema.find();

        // Calculate total number of pages
        const pageNumber = Math.ceil(totalProducts.length / productpage);

        res.render('admin/order', {
            admin: req.session.admin,
            title: 'Order List',
            pageNumber,
            currentPage,
            totalProducts: totalProducts.length,
            alertMessage: req.flash('errorMessage'),
             order
        })

    } catch (err) {

        console.log(`error in loading the order page ${err}`)

    }
}


const orderView = async (req, res) => {

    try {
        const orderId = req.params.orderId

        const order = await orderSchema.findById(orderId).populate('products.productId').populate('userId')

        res.render('admin/orderDetail', { admin: req.session.admin, title: "OrderDetail", alertMessage: req.flash('errorMessage'), order })

    } catch (err) {
        console.log(`error in rendering orderDetail page ${err}`)

    }
}




const editOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const neworderStatus = req.body.orderStatus;

        // const productDeliveryStatusEnum = ['processing', 'confirmed', 'pending', 'shipped', 'cancelled', 'delivered', 'returned'];
        const productDeliveryStatusEnum = ['processing', 'confirmed', 'pending', 'shipped', 'cancelled', 'delivered'];

        if (!productDeliveryStatusEnum.includes(neworderStatus)) {
            throw new Error('Invalid order status');
        }
        const order = await orderSchema.findById(orderId);

        if (!order) {
            throw new Error('Order not found');
        }
        if (order.status === 'returned') {
            throw new Error('Order status cannot be changed once returned');
        }

        if (order.status === 'delivered') {
            throw new Error('Order status cannot be changed once delivered');
        }
        if (order.status === 'cancelled') {
            throw new Error('Order status cannot be changed once cancelled');
        }

        order.status = neworderStatus;
        // Check if the order status is cancelled and set isCancelled to true
        if (neworderStatus === 'cancelled') {
            order.isCancelled = true;
        } else {
            order.isCancelled = false; // Optional: reset isCancelled if status changes from cancelled to something else
        }
        await order.save();

        req.flash('errorMessage', 'Order status updated');
        res.redirect('/admin/order');

    } catch (err) {
        console.error(`Error in editOrderStatus: ${err}`);
        req.flash('errorMessage', `Failed to update order status: ${err.message}`);
        res.redirect('/admin/order');
    }
};



const returnOrder = async (req, res) => {
    try {

        const orderId = req.params.id


        const userId = req.session.user


        if (!userId) {
            return res.status(400).send('User ID not found in session');
        }



        // update the order details as cancelled orders
        const order = await orderSchema.findByIdAndUpdate(orderId, {
            status: "returned",
            isCancelled: true
        });


        if (!order) {
            return res.status(404).send('Order not found');
        }




        const wallet = await walletSchema.findOne({ userId })


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


        req.flash('errorMessage', 'Order successfully returned');
        return res.redirect('/admin/order');



    } catch (err) {
        console.log(`Error: ${err}`);
        res.status(500).send('Failed to submit return order request');

    }
}


module.exports = {
    order,
    orderView,
    returnOrder,
    editOrderStatus
}