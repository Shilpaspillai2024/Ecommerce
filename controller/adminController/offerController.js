const offerSchema = require("../../model/offerSchema");
const productSchema = require("../../model/productSchema");
const categorySchema = require("../../model/categorySchema");
const mongoose = require("mongoose");
const STATUS_CODES = require("../../constants/statusCodes");

const OfferRender = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.page) || 1;
    const offersPerPage = 10;
    const skip = (currentPage - 1) * offersPerPage;

    const offer = await offerSchema
      .find()
      .sort({ createdAt: -1 })
      .populate("offerCategoryId")
      .populate("offerProductId")
      .skip(skip)
      .limit(offersPerPage);

    const category = await categorySchema
      .find({ isActive: true })
      .sort({ createdAt: -1 });

    const product = await productSchema
      .find({ isActive: true })
      .sort({ createdAt: -1 });

    const totalOffers = await offerSchema.countDocuments();

    const pageNumber = Math.ceil(totalOffers / offersPerPage);

    res.render("admin/offer", {
      title: "Offer Management",
      alertMessage: req.flash("errorMessage"),
      offer,
      category,
      product,
      currentPage,
      pageNumber,
      admin: req.session.admin,
    });
  } catch (err) {
    console.log(`error in rendering the offer page ${err}`);
  }
};

const addOfferPost = async (req, res) => {
  try {
    const { offerTarget, categoryOffer, productOffer, discountAmount } =
      req.body;
    // Validate required fields
    if (!offerTarget || !discountAmount) {
      req.flash("errorMessage", "Data not exist please try again later");
      return res.redirect("/admin/offer");
    }

    // Validate offerTarget specific fields
    if (offerTarget === "CATEGORY" && !categoryOffer) {
      req.flash(
        "errorMessage",
        "Category offer not found please try again later"
      );
      return res.redirect("/admin/offer");
    }

    if (offerTarget === "PRODUCT" && !productOffer) {
      req.flash(
        "errorMessage",
        "Product offer not found please try again later"
      );
      return res.redirect("/admin/offer");
    }
    // Validate discount amount
    if (discountAmount > 98) {
      req.flash("errorMessage", "Discount amount cannot exceed 98%.");
      return res.redirect("/admin/offer");
    }

    // handle offer target

    if (offerTarget === "CATEGORY") {
      const category = await categorySchema.findById(categoryOffer);

      if (!category) {
        req.flash("errorMessage", "category not found");
        return res.redirect("/admin/offer");
      }

      const checkOffer = await offerSchema.deleteOne({
        offerFor: offerTarget,
        offerCategoryId: category._id,
      });

      req.flash(
        "errorMessage",
        `Offer added for the products under ${category.categoryName}`
      );

      const newOffer = new offerSchema({
        offerFor: offerTarget.toUpperCase(),
        offerCategoryId: category._id,
        offerValue: discountAmount,
      });
      await newOffer.save();

      // Update all products under this category
      const productUnderCategory = await productSchema.find({
        productCategory: category.categoryName,
      });

      const bulkOperations = productUnderCategory.map((product) => ({
        updateOne: {
          filter: { _id: product._id },
          update: {
            productDiscount: discountAmount,
            productDiscountPrice:
              product.productPrice * (1 - discountAmount / 100),
          },
        },
      }));

      if (bulkOperations.length > 0) {
        await productSchema.bulkWrite(bulkOperations);
      }
    } else if (offerTarget === "PRODUCT") {
      const product = await productSchema.findById(productOffer);

      if (!product) {
        req.flash("errorMessage", "product not found");
        return res.redirect("/admin/offer");
      }

      const checkOffer = await offerSchema.deleteOne({
        offerFor: "PRODUCT",
        offerProductId: product._id,
      });

      req.flash(
        "errorMessage",
        `Offer added for the products  ${product.productName}`
      );

      const newOffer = new offerSchema({
        offerFor: offerTarget.toUpperCase(),
        offerProductId: product._id,
        offerValue: discountAmount,
      });
      await newOffer.save();

      (product.productDiscount = discountAmount),
        (product.productDiscountPrice =
          product.productPrice * (1 - discountAmount / 100));

      await product.save();
    }

    res.redirect("/admin/offer");
  } catch (err) {
    console.log(`Error on adding offer POST ${err}`);
    req.flash(
      "errorMessage",
      "Error occurred while adding the offer. Please try again later."
    );
    res.redirect("/admin/offer");
  }
};

const deleteOffer = async (req, res) => {
  try {
    const offerID = req.params.offerID;

    if (!offerID) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ error: "offer Id is required" });
    }

    const offerDetails = await offerSchema
      .findById(offerID)
      .populate("offerProductId")
      .populate("offerCategoryId");

    if (!offerDetails) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ error: "Offer not found" });
    }
    // if the product is deleted then make the discount of the products to zero

    if (offerDetails.offerFor === "PRODUCT") {

      const product = offerDetails.offerProductId;
      if (product) {
        product.productDiscount = 0;
        product.productDiscountPrice = product.productPrice;
        await product.save();
      } else {
        console.warn("Product not found for this offer, maybe deleted.");
      }
    }
    // if the category is deleted then make the discount of the products under the category to zero

    if (offerDetails.offerFor === "CATEGORY") {
      const categoryName = offerDetails.offerCategoryId.categoryName;
      await productSchema.updateMany({ productCategory: categoryName }, [
        {
          $set: {
            productDiscount: 0,
            productDiscountPrice: { $toDecimal: "$productPrice" },
          },
        },
      ]);
    }
    const deletedOffer = await offerSchema.findByIdAndDelete(offerID);
    if (!deletedOffer) {
      return res
        .status(STATUS_CODES.CONFLICT)
        .json({
          error:
            "Cannot delete the offer at the moment. Please try again later",
        });
    }

    return res
      .status(STATUS_CODES.OK)
      .json({ success: "Offer deleted successfully" });
  } catch (err) {
    console.log("error on delete the offer", err);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred while deleting the offer" });
  }
};

// check if the current selected category already has a offer
// if offer is present alert the admin
const offerCheckCategory = async (req, res) => {
  try {
    const { categoryID } = req.params;

    if (!categoryID) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ error: "category id not found" });
    }

    // convert the string into object id
    const categoryObjectID = new mongoose.Types.ObjectId(categoryID);

    // check if any offer exist
    const offerCheck = await offerSchema.findOne({
      offerFor: "CATEGORY",
      offerCategoryId: categoryObjectID,
    });

    // if offer exist then give the response
    if (offerCheck) {
      return res
        .status(STATUS_CODES.OK)
        .json({ message: "Offer exist already." });
    }
  } catch (err) {
    console.log(
      "Error on checking the offer exist and alert using fetch ",
      err
    );
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred while checking the offer exist" });
  }
};

// check if the current selected category already has a offer
// if offer is present alert the admin
const offerCheckProduct = async (req, res) => {
  try {
    const { productID } = req.params;

    if (!productID) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ error: "product id not found" });
    }

    // convert the string into object id
    const productObjectID = new mongoose.Types.ObjectId(productID);

    // check if any offer exist
    const offerCheck = await offerSchema.findOne({
      offerFor: "PRODUCT",
      offerProductId: productObjectID,
    });

    // if offer exist then give the response
    if (offerCheck) {
      return res
        .status(STATUS_CODES.OK)
        .json({ message: "Offer exist already." });
    }
  } catch (err) {
    console.log(
      "Error on checking the offer exist and alert using fetch ",
      err
    );
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ error: "An error occurred while checking the offer exist" });
  }
};

// edit offer

//first get the offer details

const getOfferDetails = async (req, res) => {
  try {
    const { offerID } = req.params;
    if (!offerID) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ error: "invalid offer id" });
    }

    const offerDetails = await offerSchema
      .findById(offerID)
      .populate("offerCategoryId")
      .populate("offerProductId");

    let offerTarget = "";

    if (offerDetails.offerFor === "CATEGORY") {
      offerTarget = offerDetails.offerCategoryId.categoryName;
    } else if (offerDetails.offerFor === "PRODUCT") {
      offerTarget = offerDetails.offerProductId.productName;
    }

    if (!offerDetails) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ error: "can't get the offer details" });
    }

    return res
      .status(STATUS_CODES.OK)
      .json({
        offerTarget: offerTarget,
        offerFor: offerDetails.offerFor,
        offerValue: offerDetails.offerValue,
        Message: "Offer details fetched",
        status: true,
      });
  } catch (err) {
    console.log(`error in fetching the offer detils ${err}`);
  }
};

const editOffer = async (req, res) => {
  try {
    const { offerID } = req.params;
    const editDiscountPercent = Number(req.body.editDiscountPercent);

    if (!offerID) {
      req.flash("errorMessage", "Offer ID is required. Please try again later");
      return res.redirect("/admin/offer");
    }
    // Validate discount amount
    if (editDiscountPercent > 98) {
      req.flash("errorMessage", "Discount amount cannot exceed 98%.");
      return res.redirect("/admin/offer");
    }

    const offerDetails = await offerSchema
      .findById(offerID)
      .populate("offerCategoryId")
      .populate("offerProductId");
    if (!offerDetails) {
      req.flash("errorMessage", "Offer not found. Please try again later");
      return res.redirect("/admin/offer");
    }

    if (offerDetails.offerFor === "PRODUCT") {
      if (offerDetails.offerProductId) {
        offerDetails.offerProductId.productDiscount = editDiscountPercent;
        offerDetails.offerProductId.productDiscountPrice =
          offerDetails.offerProductId.productPrice *
          (1 - editDiscountPercent / 100);
        // Save changes to the product
        await offerDetails.offerProductId.save();
      } else {
        req.flash("errorMessage", "Product not found. Please try again later");
        return res.redirect("/admin/offer");
      }
    }

    if (offerDetails.offerFor === "CATEGORY") {
      const category = await categorySchema.findById(
        offerDetails.offerCategoryId
      );

      if (!category) {
        req.flash("errorMessage", "Category not found");
        return res.redirect("/admin/offer");
      }
      // Find all products under the specified category
      const productUnderCategory = await productSchema.find({
        productCategory: category.categoryName,
      });
      // Create bulk update operations to apply the new discount to all products in the category
      const bulkOperations = productUnderCategory.map((product) => ({
        updateOne: {
          filter: { _id: product._id },
          update: {
            productDiscount: editDiscountPercent,
            productDiscountPrice:
              product.productPrice * (1 - editDiscountPercent / 100),
          },
        },
      }));

      // Execute the bulk update operations if there are any
      if (bulkOperations.length > 0) {
        await productSchema.bulkWrite(bulkOperations);
      }
    }

    // Update the offer value in the offer collection
    offerDetails.offerValue = editDiscountPercent;
    await offerDetails.save();

    // Redirect to the offer management page after successful update
    req.flash("errorMessage", "offer updated successfully");
    res.redirect("/admin/offer");
  } catch (err) {
    console.log("Error on editing the offer in admin ", err);
    req.flash(
      "errorMessage",
      "An error occurred while editing the offer. Please try again later."
    );
    res.redirect("/admin/offer");
  }
};

module.exports = {
  OfferRender,
  addOfferPost,
  deleteOffer,
  offerCheckCategory,
  offerCheckProduct,
  getOfferDetails,
  editOffer,
};
