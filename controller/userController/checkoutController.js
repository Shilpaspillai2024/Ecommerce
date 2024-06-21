const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')
const userSchema = require('../../model/userSchema')
const addressSchema = require('../../model/addressSchema')
const orderSchema = require('../../model/orderSchema')
const Razorpay = require('razorpay')
const mongoose = require('mongoose')



const checkout = async (req, res) => {
    try {



        const address = await addressSchema.find({ userId: req.session.user }).populate('userId');;





        const cartDetails = await cartSchema.findOne({ userId: req.session.user }).populate('items.productId')

        const cartItems = cartDetails.items



        res.render('user/checkout', { title: "checkout-page", cartDetails, cartItems, user: req.session.user, alertMessage: req.flash('errorMessage'), address })

    } catch (err) {

        console.error(`Error when rendering the checkout pager: ${err}`);

    }
}



const addcheckoutAddress = async (req, res) => {
    try {
        const userId = req.session.user


        const newAddress = {
            userId: userId,
            addressType: req.body.addressType,
            contactName: req.body.contactName,
            doorNo: req.body.doorNo,
            Address: req.body.homeAddress,
            areaAddress: req.body.areaAddress,
            landmark: req.body.landmark,
            phone: req.body.phone,
            pincode: req.body.pincode
        }

        await addressSchema.insertMany(newAddress)

        req.flash('errorMessage', ' address added successfully');

        res.redirect('/user/checkout');

    }
    catch (err) {
        console.error(`Error during adding address to DB: ${err}`);
        req.flash('errorMessage', err.message || 'Failed to add address. Please try again later.');
        res.redirect('/user/checkout');

    }
}








const deletecheckoutAddress = async (req, res) => {
    try {

        const userId = req.session.user;
        const addressId = req.params.id;

        // Check if the address belongs to the user

        const address = await addressSchema.findOne({ _id: addressId, userId: userId })

        if (!address) {
            req.flash('errorMessage', 'Address not found or not authorized to delete');
            return res.redirect('/user/checkoutaddress');
        }
        await addressSchema.deleteOne({ _id: addressId });

        req.flash('errorMessage', 'Address deleted successfully');
        res.redirect('/user/checkout');


    } catch (err) {
        console.error(`Error during deleting address from DB: ${err}`);
        req.flash('errorMessage', err.message || 'Failed to delete address. Please try again later.');
        res.redirect('/user/checkout');

    }
}



const OrderPlaced = async (req, res) => {
    try {
        const userId = req.session.user

        let { name, email, phone, address, paymentMethod } = req.body

        const cart = await cartSchema.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(404).send('Cart is empty or not found ')
        }
        let totalPrice = 0;
        const orderProducts = cart.items.map(product => {
            const price = product.productPrice;
            totalPrice += price * product.productCount
            return {
                productId: product.productId._id,
                quantity: product.productCount,
                price: price
            }
        })


        // in addressSchema i refer userschema,and in orderschema the address stored as a string(it contain objectid ) ,it take as a object need this for address

        let addressObj = {}

        let patterns = {
            contactName: /contactName: '([^']+)'/,
            doorNo: /doorNo: (\d+)/,
            Address: /Address: '([^']+)'/,
            areaAddress: /areaAddress: '([^']+)'/,
            pincode: /pincode: (\d+)/,
            landmark: /landmark: '([^']+)'/,
            phone: /phone: (\d+)/,
            addressType: /addressType: '([^']+)'/
        };

        for (let key in patterns) {
            let match = address.match(patterns[key]);
            if (match) {
                addressObj[key] = isNaN(match[1]) ? match[1] : parseInt(match[1]);
            }
        }



        const order = new orderSchema({
            userId,
            contactInfo: { name, email, phone },
            address: addressObj,
            products: orderProducts,
            totalPrice,
            paymentMethod: paymentMethod,
            status: 'processing',
        })


        await order.save();

        for (let product of orderProducts) {
            await productSchema.findByIdAndUpdate(product.productId, {
                $inc: { productQuantity: -product.quantity }
            })
        }

        cart.items = [];
        await cart.save();
        res.redirect("/user/orderConfirm")
    } catch (error) {
        console.log(`error from checkoutproceed ${error}`)
        res.status(404).send('cannot procceed checkout')
    }

}



const orderConfirm = async (req, res) => {

    try {



        res.render('user/orderConfirm', { title: "order-confirm-page" })

    } catch (err) {

        console.log(`error in render the confirm order page..! ${err}`)

    }
}






module.exports = {
    checkout, addcheckoutAddress, deletecheckoutAddress, OrderPlaced, orderConfirm

}