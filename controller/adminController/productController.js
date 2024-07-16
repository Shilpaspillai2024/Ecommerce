const mongoose = require('mongoose')
const productSchema = require('../../model/productSchema')
const categorySchema = require('../../model/categorySchema')
const offerSchema = require('../../model/offerSchema')
const multer = require('../../middleware/multer')
const fs = require('fs')


const product = async (req, res) => {
  try {
    const productSearch = req.query.productSearch || '';

    const currentPage = parseInt(req.query.page) || 1;
    const productsPerPage = 10;
    const skip = (currentPage - 1) * productsPerPage;

    const totalProducts = await productSchema.countDocuments({ productName: { $regex: productSearch, $options: 'i' } });

    const products = await productSchema.find({ productName: { $regex: productSearch, $options: 'i' } })
      .skip(skip)
      .limit(productsPerPage);

    const pageNumber = Math.ceil(totalProducts / productsPerPage);


    // const products = await productSchema.find({ productName: { $regex: productSearch, $options: 'i' } })


    // const products= await productSchema.find()
    res.render('admin/product', {
      admin: req.session.admin, title: "Product List", products,
      alertMessage: req.flash('errorMessage'),
      currentPage,
      pageNumber,
      productSearch
    })

  } catch (err) {

    console.log(`error in product page load ${err}`)

  }
}

//render the add-product page
const addProduct = async (req, res) => {
  try {

    // get all category details from the category collection ,the categories are Active
    const productCategory = await categorySchema.find({ isActive: true })

    // before render the page check whether the category is empty if its empty then send a flash message
    if (productCategory.length === 0) {
      req.flash('errorMessage', 'Product Category is empty, please add at least one category')
    }

    res.render('admin/addproducts', { admin: req.session.admin, title: "Add-product", alertMessage: req.flash('errorMessage'), productCategory })
  } catch (err) {

    console.log(`error in add-product render`)

  }
}
// multer as a middleware for multiple image upload
// the /maximum size is set as 4 
const multermiddle = multer.array("productImage", 4);

// addproduct post



const addProductPost = async (req, res) => {
  try {
    const imageArray = [];
    req.files.forEach((img) => {
      imageArray.push(img.path);
    });


    // find the productDiscount Price



    const offer = await offerSchema.find({ offerFor: "CATEGORY" }).populate('offerCategoryId')

    let discountPrice = req.body.productPrice
    let discount = 0

    // find if the product is under the offer
    for (const off of offer) {
      if (off.offerCategoryId.categoryName === req.body.productCategory) {
        discount = off.offerValue
        discountPrice = (req.body.productPrice * (1 - off.offerValue / 100))
        discountPrice = discountPrice.toFixed(2);
        break;
      }
    }


    // Product details from the form
    const productDetails = {
      productName: req.body.productName.trim(),// Removes spaces around the product name
      productAuthor: req.body.productAuthor.trim(),// Removes spaces around the product author
      productPrice: req.body.productPrice,
      productDescription: req.body.productDescription.trim(),// Removes spaces around the product description
      productQuantity: req.body.productQuantity,
      productCategory: req.body.productCategory,
      productImage: imageArray,
      productDiscount: discount,
      productDiscountPrice: discountPrice,
    };

    // Check for existing product case-insensitively
    const checkProduct = await productSchema.findOne({
      productName: { $regex: new RegExp('^' + req.body.productName + '$', 'i') },
      productCategory: req.body.productCategory
    });

    if (!checkProduct) {
      await productSchema.insertMany(productDetails)
      req.flash('errorMessage', 'Product added successfully');
      res.redirect('/admin/product');
    } else {
      req.flash('errorMessage', 'Product already exists');
      res.redirect('/admin/add-product');
    }
  } catch (err) {
    console.error(`Error during adding new product to DB: ${err}`);
    req.flash('errorMessage', err.message || 'Failed to add product. Please try again later.');
    res.redirect('/admin/add-product');
  }
};


const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productSchema.findById(productId)
    const productCategory = await categorySchema.find()
    if (product) {
      res.render('admin/editproduct', { admin: req.session.admin, title: "Add-product", alertMessage: req.flash('errorMessage'), product, productCategory })

    }
    else {
      req.flash('errorMessage', 'Unable to edit the product. Please try again')
      res.redirect('/admin/product')
    }



  } catch (err) {
    console.log(`eeror in edit page load ${err}`)

  }
}

const editProductPost = async (req, res) => {
  try {
    const id = req.params.id
    const imageToDelete = JSON.parse(req.body.deletedImages || '[]');

    //  for cropper image
    const croppedImages = JSON.parse(req.body.croppedImages || '[]');

    imageToDelete.forEach(x => fs.unlinkSync(x));



    if (imageToDelete.length > 0) {
      await productSchema.findByIdAndUpdate(id, {
        $pull: { productImage: { $in: imageToDelete } }
      })
    }

    const product = await productSchema.findById(id);



    const { productPrice, productQuantity, productDescription } = req.body;

    let imgArray = []

    // Save cropped images
    croppedImages.forEach((base64Data, index) => {
      const base64Image = base64Data.split(';base64,').pop();
      const fileName = `uploads/${Date.now()}-${index}.jpg`;
      fs.writeFileSync(fileName, base64Image, { encoding: 'base64' });
      imgArray.push(fileName);
    });

    const newImages = [...product.productImage, ...imgArray]



    // Update product details including images
    await productSchema.findByIdAndUpdate(id, {
      productPrice,
      productQuantity,
      productDescription,
      productImage: newImages,
      // productDiscountedPrice: discountPrice

    });



    req.flash('errorMessage', 'Product updated successfully');
    res.redirect('/admin/product');
  } catch (err) {
    console.error(`Error updating product: ${err}`);
    req.flash('errorMessage', err.message || 'Failed to update product. Please try again later.');
    res.redirect(`/admin/edit-product/${req.params.id}`);
  }
};

// product deactivating
const productInactive = async (req, res) => {
  try {
    const productId = req.params.id;
    const productInactive = await productSchema.findByIdAndUpdate(productId, { isActive: false })
    if (productInactive) {
      req.flash('errorMesage', 'the product is blocked and currently not available for users')

    } else {
      req.flash('errorMessage', 'product not found')
    }
    res.redirect('/admin/product')

  } catch (err) {
    console.log(`error in deactivating product ${err}`)

  }
}

//product activating

const productActive = async (req, res) => {
  try {
    const productId = req.params.id;
    const productActive = await productSchema.findByIdAndUpdate(productId, { isActive: true })
    if (productActive) {
      req.flash('errorMessage', 'the product is unblocked')
    }
    else {
      req.flash('errorMessage,"product is not found')
    }
    res.redirect('/admin/product')

  } catch (err) {
    console.log(`error in activating product ${err}`)

  }
}


// Delete the product 
const productDelete = async (req, res) => {
  try {
    const productId = req.params.id;
    const img = await productSchema.findById(productId)

    img.productImage.forEach((image) => {
      fs.unlinkSync(image)
    })
    const deleteProduct = await productSchema.findByIdAndDelete(productId)

    if (deleteProduct) {
      req.flash('errorMessage', 'Product Deleted successfully')
      res.redirect('/admin/product')
    }
    else {
      req.flash('errorMessage', 'unable to delete the the product')
      res.redirect('/admin/product')
    }

  } catch (err) {
    console.log(`error in deletion of products ${err}`)

  }
}

module.exports = {
  product,
  addProduct,
  multermiddle,
  addProductPost,
  editProduct,
  editProductPost,
  productInactive,
  productActive,
  productDelete
}