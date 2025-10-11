const userSchema = require("../../model/userSchema");
const addressSchema = require("../../model/addressSchema");
const bcrypt = require("bcrypt");
const catchAsync = require("../../utils/catchAsync");

// for profile Get

const profile = catchAsync(async (req, res) => {
  const userDetail = await userSchema.findById(req.session.user);

  res.render("user/profile", {
    title: "profile-view",
    alertMessage: req.flash("errorMessage"),
    user: req.session.user,
    userDetail,
  });
});

const personalInformation = catchAsync(async (req, res) => {
  const userId = req.session.user;
  const name = req.body.name ? req.body.name.trim() : "";
  const number = req.body.number ? req.body.number.trim() : "";

  if (!name) {
    req.flash("errorMessage", "Name cannot be empty.");
    return res.redirect("/profile");
  }

  const userDetail = await userSchema.findByIdAndUpdate(
    userId,
    { name, number },
    { new: true, runValidators: true }
  );

  req.flash("successMessage", "Personal information updated successfully.");
  res.redirect("/profile");
});

const changePassword = catchAsync(async (req, res) => {
  const userId = req.session.user;

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    req.flash(
      "errorMessage",
      "New password and confirm new password do not match."
    );
    return res.redirect("/profile");
  }

  const user = await userSchema.findById(userId);

  // Check if current password matches the user's current password
  const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordMatch) {
    req.flash("errorMessage", "Incorrect current password.");
    return res.redirect("/profile");
  }

  // Hash the new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  await userSchema.findByIdAndUpdate(userId, { password: hashedNewPassword });

  req.flash("errorMessage", "Password changed successfully.");
  res.redirect("/profile");
});

const address = catchAsync(async (req, res) => {
  const userId = req.session.user;
  const userAddress = await addressSchema.find({ userId }).sort({ _id: -1 });

  // Adding an index like number to each address
  userAddress.forEach((address, index) => {
    address.index = index + 1;
  });

  res.render("user/address", {
    title: "user-address",
    alertMessage: req.flash("errorMessage"),
    user: req.session.user,
    userAddress,
  });

  //  } catch (err) {
  //     console.log(`Error when loading the address page ${err}`)
  //     req.flash('errorMessage','Failed to load address page')
  //     res.redirect('/profile')

  //  }
});

const addAddress = catchAsync(async (req, res) => {
  const userId = req.session.user;
  const newAddress = {
    userId: userId,
    addressType: req.body.addressType,
    contactName: req.body.contactName,
    doorNo: req.body.doorNo,
    Address: req.body.homeAddress,
    areaAddress: req.body.areaAddress,
    landmark: req.body.landmark,
    phone: req.body.phone,
    pincode: req.body.pincode,
  };

  await addressSchema.insertMany(newAddress);

  req.flash("errorMessage", " address added successfully");

  res.redirect("/address");
});

const deleteAddress = catchAsync(async (req, res) => {
  const userId = req.session.user;
  const addressId = req.params.id;

  // Check if the address belongs to the user

  const address = await addressSchema.findOne({
    _id: addressId,
    userId: userId,
  });

  if (!address) {
    req.flash("errorMessage", "Address not found or not authorized to delete");
    return res.redirect("/address");
  }
  await addressSchema.deleteOne({ _id: addressId });

  req.flash("errorMessage", "Address deleted successfully");
  res.redirect("/address");
});

const editAddress = catchAsync(async (req, res) => {
  const userId = req.session.user;
  const addressId = req.params.id;

  const address = await addressSchema.findOne({
    _id: addressId,
    userId: userId,
  });

  if (!address) {
    req.flash("errorMessage", "Address not found or not authorized to edit");
    return res.redirect("/address");
  }

  res.render("user/editAddress", {
    title: "user-editAddress",
    alertMessage: req.flash("errorMessage"),
    user: req.session.user,
    address,
  });

  // } catch (err) {

  //     console.log(`Error when loading the address page ${err}`)
  //     req.flash('errorMessage','Failed to load editaddress page')
  //     res.redirect('/address')

  // }
});

const editAddressPost = catchAsync(async (req, res) => {
  const userId = req.session.user;
  const addressId = req.params.id;

  // Extract updated address details from the request body
  const {
    addressType,
    contactName,
    doorNo,
    homeAddress,
    areaAddress,
    landmark,
    phone,
    pincode,
  } = req.body;

  // Find the address by ID and update its details
  const updatedAddress = await addressSchema.findByIdAndUpdate(
    addressId,
    {
      addressType,
      contactName,
      doorNo,
      Address: homeAddress, 
      areaAddress,
      landmark,
      phone,
      pincode,
    },
    { new: true }
  );

  if (!updatedAddress) {
    req.flash("errorMessage", "Address not found or not authorized to edit");

    return res.redirect(`/edit-address/${addressId}`);
  }

  req.flash("successMessage", "Address updated successfully");
  res.redirect("/address");
});

module.exports = {
  profile,
  personalInformation,
  changePassword,
  address,
  addAddress,
  deleteAddress,
  editAddress,
  editAddressPost,
};
