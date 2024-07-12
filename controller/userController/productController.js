const productSchema = require('../../model/productSchema')
const wishlistSchema = require('../../model/wishlistSchema')

const userSchema = require('../../model/userSchema')
const categorySchema = require("../../model/categorySchema");
const cartSchema = require('../../model/cartSchema')
const reviewSchema = require('../../model/reviewSchema')




const productView = async (req, res) => {
    try {
        const productId = req.params.id
        const referrer = req.query.from || 'home'; // Default to 'home' if no referrer

        const product = await productSchema.findById(productId)


        // Check if the product exists
        if (!product) {
            req.flash("errorMessage", "Product is currently unavailable");
            return res.redirect('/user/home');
        }


        // for review display

        let oneStar = 0;
        let twoStar = 0;
        let threeStar = 0;
        let fourStar = 0;
        let fiveStar = 0;
        let totalRating = 0;
        let reviewCount = 0;
        let review = await reviewSchema.findOne({ productId: product._id }).populate('reviews.userId')

        if (review) {
            review.reviews.forEach((ele) => {
                totalRating += ele.star;
                reviewCount++;
                if (ele.star === 1) {
                    oneStar++
                }
                if (ele.star === 2) {
                    twoStar++
                }
                if (ele.star === 3) {
                    threeStar++
                }
                if (ele.star === 4) {
                    fourStar++
                }
                if (ele.star === 5) {
                    fiveStar++
                }
            })

        }

        const averageRating = reviewCount ? (totalRating / reviewCount).toFixed(1) : 0;

        const similarProducts = await productSchema.find({ productCategory: product.productCategory, _id: { $ne: productId } })


        // if current product is in the cart then set the itemInCart to true else it will be false
        let itemInCart = false

        // if user logged in then check the cart items
        if (req.session.user) {
            // check the product is already in the cart
            const cartCheck = await cartSchema.findOne({ userId: req.session.user }).populate('items.productId')

            if (cartCheck) {
                cartCheck.items.forEach((items) => {
                    if (items.productId.id === productId) {
                        itemInCart = true
                    }


                })
            }


        }


        if (product.length === 0) {
            req.flash("errorMessage", "product is currently unavailable")
            res.redirect('/user/home')
        }

        let wishlist = { products: [] };
        if (req.session.user) {
            const userId = req.session.user;
            wishlist = await wishlistSchema.findOne({ userId });
        }


        res.render('user/productDetail',
            {
                title: product.productName,
                product,
                wishlist,
                similarProducts,
                itemInCart,
                review,
                oneStar,
                twoStar,
                threeStar,
                fourStar,
                fiveStar,
                averageRating,
                alertMessage: req.flash('errorMessage'), user: req.session.user, referrer: referrer
            })




    } catch (err) {
        console.log(`Error during product detail page ${err}`)
    }
}


const productSeemore = async (req, res) => {
    try {
        const category = await categorySchema.find({ isActive: true });

        const allCategory = category.map(item => item.categoryName);
        const selectedCategory = req.query.collections || allCategory;
        const minPrice = parseInt(req.query.minPrice) || 0;
        const maxPrice = parseInt(req.query.maxPrice) || 100000;
        const productRating = parseInt(req.query.ratings) || 0;
        const availability = req.query.availability === 'in-stock' ? { productQuantity: { $gt: 0 } } : {};
        const sortOption = req.query.sort || 'latest';
        const userSearch = req.query.userSearch || "";


        // Pagination parameters
        const productsPerPage = 8;
        const currentPage = parseInt(req.query.page) || 1;
        const skip = (currentPage - 1) * productsPerPage;


        let query = {
            productName: { $regex: userSearch, $options: 'i' },
            productCategory: { $in: selectedCategory },
            isActive: true,
            productPrice: { $gte: minPrice, $lte: maxPrice },
            ...availability,
        };
        // Count the total number of products matching the query
        const productsCount = await productSchema.countDocuments(query);


        // Find products with pagination
        let products = await productSchema.find(query).skip(skip).limit(productsPerPage);

        // Apply rating filter
        if (productRating > 0) {
            products = await Promise.all(products.map(async (product) => {
                const reviews = await reviewSchema.findOne({ productId: product._id });
                if (reviews) {
                    const totalStars = reviews.reviews.reduce((acc, review) => acc + review.star, 0);
                    const averageRating = reviews.reviews.length ? (totalStars / reviews.reviews.length).toFixed(1) : 0;
                    // Check if the average rating falls within the desired range
                    if (Math.floor(averageRating) === productRating) {
                        return product;
                    }
                }
                return null; // Return null for products that don't match the rating filter
            }));

            // Filter out null values from the products array
            products = products.filter(product => product !== null);
        }


        switch (sortOption) {
            case 'price-high-low':

                products.sort((a, b) => parseFloat(b.productPrice) - parseFloat(a.productPrice))

                break;
            case 'price-low-high':
                products.sort((a, b) => parseFloat(a.productPrice) - parseFloat(b.productPrice))

                break;
            case 'latest':
                products.sort((a, b) => b.createdAt - a.createdAt)
                break;
            case 'a-z':
                products.sort((a, b) => a.productName.localeCompare(b.productName))
                break;
            case 'z-a':
                products.sort((a, b) => b.productName.localeCompare(a.productName))
                break;

        }

        let wishlist = { products: [] };
        if (req.session.user) {
            const userId = req.session.user;
            wishlist = await wishlistSchema.findOne({ userId });
        }

        res.render('user/productSeemore', {
            category,
            product: products,
            alertMessage: req.flash('errorMessage'),
            wishlist,
            user: req.session.user,
            pageNumber: Math.ceil(productsCount / productsPerPage),
            currentPage,
            totalPages: productsCount,
            appliedFilters: req.query
        });
    } catch (err) {
        console.log(`Error during product detail page ${err}`);
        res.status(500).send('Internal Server Error');
    }
};





module.exports = {
    productView, productSeemore
}