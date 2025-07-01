const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const expresslayouts = require("express-ejs-layouts");
const dotenv = require("dotenv").config();
const user = require("./routes/userRouter");
const mongodbConnection = require("./config/mongodb");
const nocache = require("nocache");
const flash = require("connect-flash");
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const passportSetup = require("./config/passport-setup");
// const setCartItemCount = require('./middleware/cartItemCount')
const setUserData = require("./middleware/setUserDataMiddleware");
const homeController = require("./controller/userController/userController");

// env port
const port = process.env.PORT || 3000;

const userRoutes = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");

mongodbConnection();

// made the uploads file static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// path setting

app.use(express.static(path.join(__dirname, "public")));

app.use(express.static(path.join(__dirname, "public/image")));
app.use("/style", express.static(path.join(__dirname, "public", "style")));

// layouts setup

app.use(expresslayouts);

app.set("layout", "./layouts/layout");

//ejs setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// flash

app.use(flash());

//nocache
app.use(nocache());

// Middleware to set cart item count and wishlist item count
app.use(setUserData);

app.use(passport.initialize());
app.use(passport.session());

app.use("/", userRoutes);
app.use("/admin", adminRouter);

// app.get('/', (req, res) => {
//     res.redirect('/user/home')
// })

app.get("/", homeController.user);

app.get("*", (req, res) => {
  res.render("pageNotfound", { title: "page Not Found" });
});

app.listen(port, (err) => {
  if (err) {
    console.log(`Error occurred during port listen `);
  } else {
    console.log(`Server running on port http://localhost:${port}`);
  }
});
