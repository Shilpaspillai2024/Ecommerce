const cartSchema = require('../../model/cartSchema')
const productSchema = require('../../model/productSchema')


const cart = async (req, res) => {
    try {
        const cart = await cartSchema.findOne({ userId: req.session.user }).populate('items.productId')

        var totalPrice = 0;
        var totalPriceWithOutDiscount = 0;
        var cartItemCount = 0;
        if (cart) {
            // find the total price of cart items

            cart.items.forEach((ele) => {
                // if the product has not discount then
                if (ele.productId.productDiscount === 0) {
                    totalPrice += (ele.productId.productPrice * ele.productCount);
                    totalPriceWithOutDiscount += (ele.productId.productPrice * ele.productCount);
                }
                //if the product has discount
                else {
                    const discountPrice = (ele.productId.productPrice * ele.productCount) - ((ele.productId.productDiscount / 100) * (ele.productId.productPrice * ele.productCount))
                    totalPrice += discountPrice

                    totalPriceWithOutDiscount += (ele.productId.productPrice * ele.productCount)
                }
                cartItemCount += ele.productCount
            })
            // if the totalPrice and payable amount in the cart and the calculated total price is different then update the collection with the new values

            if (cart.payableAmount != totalPrice || cart.totalPrice != totalPriceWithOutDiscount) {

                cart.payableAmount = Math.round(totalPrice);
                cart.totalPrice = Math.round(totalPriceWithOutDiscount);
            }
            await cart.save();

           
        }
       
        res.render('user/cart', { title: "cart", cart, totalPrice, cartItemCount, totalPriceWithOutDiscount, alertMessage: req.flash('errorMessage'), user: req.session.user })

    } catch (err) {

        console.log(`error rendering in the cart ${err}`)

    }
}



// add product to cart



const addToCartPost = async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.session.user;
        const productPrice = parseInt(req.query.price);
        const productQuantity = 1;

        // Find the product from the collection
        const actualProductDetails = await productSchema.findById(productId);
  

        if (actualProductDetails.productQuantity <=0) {
            return res.status(404).json({ error: "Product is out of stock" })
        }

        // Check if the user already has a cart
        const checkUserCart = await cartSchema.findOne({ userId: req.session.user }).populate('items.productId');

        if (checkUserCart) {
            let productExist = false;

            // Check if the product already exists in the cart
            checkUserCart.items.forEach((ele) => {

                // if (ele.productId.id === productId) {

                    if (ele.productId && ele.productId.id === productId){
                    productExist = true;

                    // ele.productCount += 1; 


                }
            });

            if (!productExist) {
                checkUserCart.items.push({ productId: actualProductDetails._id, productCount: 1, productPrice: productPrice });
            }

            await checkUserCart.save();


        }
        else {



            const newCart = new cartSchema({
                userId: userId,
                items: [{ productId: actualProductDetails._id, productCount: 1, productPrice: productPrice }]
            });

            await newCart.save();
        }
        // req.flash('errorMessage', "Product successfully added to cart.");
        return res.status(200).json({ message: "Product added to cart" })


        // res.redirect(`/user/product-view/${productId}`);
    }
    catch (err) {
        console.log(`Error during adding product to cart: ${err}`);
    }
}


// remove product from cart

const removeCartItem = async (req, res) => {
    try {

        productId = req.params.id

        const cartItems = await cartSchema.findOne({ userId: req.session.user }).populate('items.productId')

        if (cartItems === null) {
            return res.status(404).json({ success: false, error: "Cart not found" });
        }

        // filter out the cart products without the removed products
        const newCart = cartItems.items.filter((ele) => {
            if (ele.productId.id != productId) {
                return ele
            }
        })
        cartItems.items = newCart;

        await cartItems.save()

        return res.status(200).json({ success: true, message: "Product removed from cart" });


    } catch (err) {
        console.log(`Error removing product from cart: ${err}`);
        return res.status(500).json({ success: false, error: `An error occurred while removing the product from the cart: ${err}` })

    }
}

const incrementProduct = async (req, res) => {
    try {
        const productId = req.params.productId
        const productQuantity = req.body.quantity

        const product = await productSchema.findById(productId)


        if (!productQuantity) {
            return res.status(404).json({ error: "Product quantity not found" })
        }

        if (productQuantity >= product.productQuantity) {

            return res.status(404).json({ error: "Product is not in that much count pls decrement" })
        }



        const cart = await cartSchema.findOne({ userId: req.session.user }).populate('items.productId')

        const productCart = cart.items.filter((ele) => {
            if (ele.productId.id === productId) {
                return ele
            }
        })

        // console.log(productCart)

        productCart[0].productCount += 1;


        let totalPrice = 0
        let productTotal = 0
        let totalPriceWithoutDiscount = 0

        cart.items.forEach((ele) => {
            totalPriceWithoutDiscount += ele.productId.productPrice * ele.productCount
            totalPrice += ele.productId.productDiscountPrice * ele.productCount
            if (ele.productId.id === productId) {
                productTotal = ele.productId.productDiscountPrice * ele.productCount
            }
        })

        // update the total price of the cart
        cart.payableAmount = Math.round(totalPrice);
        cart.totalPrice = Math.round(totalPriceWithoutDiscount);

        await cart.save()


        let savings = totalPriceWithoutDiscount - totalPrice

        // return the product quantity
        return res.status(200).json({
            productCount: productCart[0].productCount,
            productTotal: productTotal,
            total: totalPrice,
            subTotal: totalPriceWithoutDiscount,
            savings: savings,

        })

    } catch (err) {
        console.log(`Error on incrementing the product quantity ${err}`);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}


// decrement product quantity
const decrementProduct = async (req, res) => {
    try {
        const productId = req.params.productId
        const productQuantity = req.body.quantity

        if (!productQuantity) {
            return res.status(404).json({ error: "Product quantity not found" })
        }

        const cart = await cartSchema.findOne({ userId: req.session.user }).populate('items.productId')

        const productCart = cart.items.filter((ele) => {
            if (ele.productId.id === productId) {
                return ele
            }
        })

        productCart[0].productCount -= 1;


        let totalPrice = 0
        let productTotal = 0
        let totalPriceWithoutDiscount = 0

        cart.items.forEach((ele) => {
            totalPriceWithoutDiscount += ele.productId.productPrice * ele.productCount
            totalPrice += ele.productId.productDiscountPrice * ele.productCount
            if (ele.productId.id === productId) {
                productTotal = ele.productId.productDiscountPrice * ele.productCount
            }
        })

        // update the total price of the cart
        cart.payableAmount = Math.round(totalPrice);
        cart.totalPrice = Math.round(totalPriceWithoutDiscount);

        await cart.save()


        let savings = totalPriceWithoutDiscount - totalPrice

        // return the product quantity
        return res.status(200).json({
            productCount: productCart[0].productCount,
            productTotal: productTotal,
            total: totalPrice,
            subTotal: totalPriceWithoutDiscount,
            savings: savings,

        })

    } catch (err) {
        console.log(`Error on decrementing the product quantity ${err}`);
        return res.status(500).json({ error: "Internal Server Error" })
    }
}








module.exports = {
    cart,
    addToCartPost,
    incrementProduct,
    decrementProduct,

    removeCartItem
}
