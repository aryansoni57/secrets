require('dotenv').config()
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
var GoogleStrategy = require('passport-google-oauth20').Strategy;


const app = express();

app.set('view engine','ejs');
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));

app.use(session({
    secret:"our little secret",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

app.get("/",(req,res)=>{
    res.render("home");
})

mongoose.connect("mongodb://localhost:27017/usersDB",{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {

    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/login",(req,res)=>{
    res.render("login");
})

app.post("/login",(req,res)=>{
    const user = new User({
        username:req.body.username,
        password:req.body.password
    })

    req.login(user,(err)=>{
        if (err) {
            console.log(err);
        }
        else
        {
            passport.authenticate("local")(req,res,()=>{
                res.redirect("/secrets");
            });
        }
    })
})

app.get("/register",(req,res)=>{
    res.render("register");
})

app.get("/secrets",(req,res)=>{

    User.find({"secret":{$ne : null}},(err,foundUser)=>{
        if (err) {
            console.log(err);
        }
        else
        {
            if(foundUser)
            {
                res.render("secrets",{userWithSecrets:foundUser})
            }
        }
    })
    
})


app.get("/submit",(req,res)=>{
    if (req.isAuthenticated()) {
        res.render("submit");
    }
    else
    {
        res.redirect("/login");
    }
})

app.post("/submit",(req,res)=>{
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id,(err,foundUser)=>{
        if(err)
        {
            console.log(err);
        }
        else{
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(()=>{res.redirect("/secrets");})
            }
        }
    });
})

app.get("/logout",(req,res)=>{
    req.logout();
    res.render("home");
})

app.post("/register",(req,res)=>{

    User.register({username:req.body.username}, req.body.password , (err,result)=>{
        if(err)
        {
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,()=>{
                res.redirect("/secrets");
            });
        }
    })
})


app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.listen(3000,()=>{
    console.log("server running");
})