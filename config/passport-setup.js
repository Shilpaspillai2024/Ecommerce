const passport=require('passport')
const GoogleStrategy=require('passport-google-oauth20')
const dotenv=require('dotenv').config()
const User = require('../model/userSchema'); // Adjust the path to your user schema



passport.serializeUser((user, done) => {
  done(null, user.id); // Serialize only the user ID
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); // Attach the full user object to req.user
  } catch (err) {
    done(err, null);
  }
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://wordplaybooks.shop/auth/google/redirect",
    // passReqToCallback: true,
  },
  async function(accessToken,refreshToken, profile, done) {
    try {
      // Check if the user already exists in your database
      let user = await User.findOne({ email:profile.emails[0].value });                                                                                                                                                                                                                                                                                                                                                                                
      if (!user) {
        // If the user does not exist, create a new user
        user = new User({
        
          name: profile.displayName,
          // email: profile.emails[0].value,
          email:profile.emails[0].value,
          googleId:profile.id

          // profilePic: profile.photos[0].value,

          
        });
        await user.save();
      }
      done(null, user);
    } catch (err) {
      console.log(`${err}`)
    }
  }
));


