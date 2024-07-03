const mongoose = require('mongoose')
const categorySchema = require('../../model/categorySchema')
const productSchema = require('../../model/productSchema')
const orderSchema = require('../../model/orderSchema')


const bestSelling=async(req,res)=>{
    try {

        const order=await orderSchema.aggregate([
            {$unwind:"$products"},{$group:{_id:"$products.productId",productCount:{$sum:1}}},
            {$sort:{productCount:-1}},
            {$limit:10}
        ])


        // Extract product IDs from the order results
        const productArray = order.map(ele => ele._id.valueOf());

        // Get the product details
        const products = await productSchema.find({ _id: { $in: productArray } });

        // Combine product details with order counts
        const bestsellingProducts = products.map(product => {
            const orderInfo = order.find(o => o._id.equals(product._id));
            return {
                ...product.toObject(),
                productCount: orderInfo ? orderInfo.productCount : 0
            };
        });

        bestsellingProducts.sort((a, b) => b.productCount - a.productCount)

      

        const topCategory = new Set();
        bestsellingProducts.forEach((ele) => {
            topCategory.add(ele.productCategory.trim())
        })


        res.render('admin/bestsellers', {
            admin:req.session.admin,
            title: "Trending Products",
            alertMessage: req.flash("errorMessage"),
            product: bestsellingProducts,
            topCategory
        });
        
    } catch (err) {
        console.log(`Error on rendering bestselling products page ${err}`);
        
    }

}

module.exports={
    bestSelling
}