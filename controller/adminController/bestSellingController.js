const mongoose = require('mongoose')
const categorySchema = require('../../model/categorySchema')
const productSchema = require('../../model/productSchema')
const orderSchema = require('../../model/orderSchema')


const bestSelling = async (req, res) => {
    try {
        const currentPage = parseInt(req.query.page) || 1;
        const productsPerPage = 10;
        const skip = (currentPage - 1) * productsPerPage;


        const order = await orderSchema.aggregate([
            { $unwind: "$products" },
            { $group: { _id: "$products.productId", productCount: { $sum: 1 } } },
            { $sort: { productCount: -1 } },
            { $limit: 10 },
            { $skip: skip },
            { $limit: productsPerPage } // Pagination limit
        ]);


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

        const pageNumber = Math.ceil(10 / productsPerPage);

        // Aggregate to find the bestselling category
        const topCategories = await orderSchema.aggregate([
            { $unwind: "$products" },
            {
                $lookup: {
                    from: "products", // the collection name of your productSchema
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            { $group: { _id: "$productDetails.productCategory", categoryCount: { $sum: 1 } } },
            { $sort: { categoryCount: -1 } },
            { $limit: 2 }
        ]);

        const topCategory = topCategories.map(category => category._id);
        res.render('admin/bestsellers', {
            admin: req.session.admin,
            title: "Trending Products",
            alertMessage: req.flash("errorMessage"),
            product: bestsellingProducts,
            topCategory,
            currentPage,
            pageNumber
        });

    } catch (err) {
        console.log(`Error on rendering bestselling products page ${err}`);

    }

}

module.exports = {
    bestSelling
}