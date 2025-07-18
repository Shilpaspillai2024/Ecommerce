const voucher_code = require("voucher-code-generator");
const couponSchema = require("../../model/couponSchema");
const STATUS_CODES=require("../../constants/statusCodes")

const coupon = async (req, res) => {
  try {
    const couponSearch = req.query.search || "";
    const currentPage = parseInt(req.query.page) || 1;
    const couponsPerPage = 10;
    const skip = (currentPage - 1) * couponsPerPage;

    const totalCoupons = await couponSchema.countDocuments({
      couponName: { $regex: couponSearch, $options: "i" },
    });

    const coupon = await couponSchema
      .find({ couponName: { $regex: couponSearch, $options: "i" } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(couponsPerPage);

    const pageNumber = Math.ceil(totalCoupons / couponsPerPage);
    res.render("admin/coupons", {
      title: "Coupons",
      coupon,
      admin: req.session.admin,
      alertMessage: req.flash("errorMessage"),
      currentPage,
      pageNumber,
    });
  } catch (err) {
    console.log(`Error while rendering the coupon page ${err}`);
  }
};

const addCoupon = async (req, res) => {
  try {
    const { couponName, discountAmount, minAmount, expiryDate } = req.body;

    const trimmedCouponName = couponName.trim();
    const discount = parseFloat(discountAmount);
    const min = parseFloat(minAmount);

    // Validation
    if (
      isNaN(discount) ||
      isNaN(min) ||
      discount <= 0 ||
      min <= 0 ||
      discount >= min
    ) {
      req.flash(
        "errorMessage",
        "Discount must be greater than 0 and less than minimum amount"
      );
      return res.redirect("/admin/coupons");
    }

    // check if the same coupon exist or not
    const checkCoupon = await couponSchema.find({
      couponName: { $regex: `^${trimmedCouponName}$`, $options: "i" },
    });
    if (checkCoupon.length>0) {
      req.flash("errorMessage", "Coupon already exist");
      return res.redirect("/admin/coupons");
    }

    // Generate a random coupon code using voucher_codes library

    const code = voucher_code.generate({
      length: 9,
      count: 1,
      charset: "alphanumeric",
    }); // Extract the first generated code from the array

    // redirect if coupon code is not generated
    if (!code[0]) {
      req.flash("errorMessage", "error on creating coupon code pls try again");
      return res.redirect("/admin/coupons");
    }

    const newCoupon = new couponSchema({
      couponName: trimmedCouponName,
      couponCode: code[0],
      discount,
      minAmount: min,
      expiryDate,
    });

   
    await newCoupon.save();
    req.flash("errorMessage", "New coupon added");
    res.redirect("/admin/coupons");
  } catch (err) {
    console.log(`error while adding the coupon ${err}`);
  }
};

const editCoupon = async (req, res) => {
  try {
    const couponID = req.params.id;

    const checkCoupon = await couponSchema.findById(couponID);

    if (!checkCoupon) {
      req.flash("errorMessage", "cannot find the coupon please try again");
      return res.redirect("/admin/coupons");
    }

    let couponChange = false;
    // change the values of the coupon if it is edited by the user
    if (checkCoupon.expiryDate != req.body.newDate) {
      console.log(
        "file: couponController.js:86 ~ editCoupon ~ checkCoupon.expiryDate!=req.body.newDate:",
        checkCoupon.expiryDate != req.body.newDate
      );
      couponChange = true;
      checkCoupon.expiryDate = req.body.newDate;
    }
    if (checkCoupon.discount != req.body.newDiscount) {
      console.log(
        "file: couponController.js:91 ~ editCoupon ~ checkCoupon.discount!=req.body.newDiscount:",
        checkCoupon.discount != req.body.newDiscount
      );
      couponChange = true;
      checkCoupon.discount = req.body.newDiscount;
    }
    if (checkCoupon.minAmount != req.body.newMinPurchase) {
      console.log(
        "file: couponController.js:96 ~ editCoupon ~ checkCoupon.minAmount!=req.body.newMinPurchase:",
        checkCoupon.minAmount != req.body.newMinPurchase
      );
      couponChange = true;
      checkCoupon.minAmount = req.body.newMinPurchase;
    }

    if (couponChange) {
      // save the changes in coupon collection
      await checkCoupon.save();
      req.flash("errorMessage", `${checkCoupon.couponName} Coupon Edited`);
      return res.redirect("/admin/coupons");
    }
    req.flash(
      "errorMessage",
      `There is nothing to edit on ${checkCoupon.couponName}`
    );
    res.redirect("/admin/coupons");
  } catch (err) {
    console.log(`error in editing the coupon ${err}`);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponID = req.params.id;

    if (!couponID) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({
          error: "Cannot delete the coupon right now please try again later",
        });
    }

    const coupon = await couponSchema.findByIdAndDelete(couponID);

    if (coupon) {
      return res.status(STATUS_CODES.OK).json({ message: "Coupon deleted successfully" });
    } else {
      return res
        .status(STATUS_CODES.FORBIDDEN)
        .json({ error: "cannot delete the coupon please try again later" });
    }
  } catch (err) {
    console.log(`Error on deleting the coupon ${err}`);
    return res
      .status(STATUS_CODES.FORBIDDEN)
      .json({ error: "cannot delete the coupon please try again later" });
  }
};

const blockCoupon = async (req, res) => {
  try {
    const couponID = req.params.id;
    if (!couponID) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({
          error: "Cannot block the coupon right now please try again later",
        });
    }

    const coupon = await couponSchema.findByIdAndUpdate(couponID, {
      isActive: false,
    });

    if (coupon) {
      return res.status(STATUS_CODES.OK).json({ message: "Coupon blocked successfully" });
    } else {
      return res
        .status(STATUS_CODES.FORBIDDEN)
        .json({ error: "cannot block the coupon please try again later" });
    }
  } catch (err) {
    console.log(`error while during the coupon block ${err}`);
  }
};

const unblockCoupon = async (req, res) => {
  try {
    const couponID = req.params.id;
    if (!couponID) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({
          error: "Cannot unblock the coupon right now please try again later",
        });
    }

    const coupon = await couponSchema.findByIdAndUpdate(couponID, {
      isActive: true,
    });

    if (coupon) {
      return res.status(STATUS_CODES.OK).json({ message: "Coupon unblocked successfully" });
    } else {
      return res
        .status(STATUS_CODES.FORBIDDEN)
        .json({ error: "cannot unblock the coupon please try again later" });
    }
  } catch (err) {
    console.log(`error while during the coupon unblock ${err}`);
  }
};

module.exports = {
  coupon,
  addCoupon,
  editCoupon,
  deleteCoupon,
  blockCoupon,
  unblockCoupon,
};
