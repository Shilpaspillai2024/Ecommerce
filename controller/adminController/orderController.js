const orderSchema = require('../../model/orderSchema')

const order = async (req, res) => {
    try {
        // const orderSearch=req.query.orderSearch || '';
       

        const order = await orderSchema.find().populate('products.productId').populate('userId').sort({createdAt:-1})

        res.render('admin/order', { admin: req.session.admin, title: 'Order List', alertMessage: req.flash('errorMessage'), order })

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
        const orderStatus = req.body.orderStatus;

        const productDeliveryStatusEnum = ['processing', 'confirmed', 'shipped', 'cancelled', 'delivered', 'returned'];

        if (!productDeliveryStatusEnum.includes(orderStatus)) {
            throw new Error('Invalid order status');
        }

       



        const order = await orderSchema.findById(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        order.status = orderStatus;


       
        // Check if the order status is cancelled and set isCancelled to true
        if (orderStatus === 'cancelled') {
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


module.exports = {
    order,
    orderView,
    editOrderStatus
}