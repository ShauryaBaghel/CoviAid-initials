//jshint esversion:6
require("dotenv").config();
const express= require("express");
const bodyParser= require("body-parser");
const ejs= require("ejs");
const mongoose =require("mongoose");
const _=require("lodash");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const app= express();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy= require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret: process.env.SECRETAPPUSE,
  resave:false,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

//Database set up
mongoose.connect("mongodb+srv://Admin-Sha:sha123456@cluster0.dmae1.mongodb.net/userDB",{useNewUrlParser:true});
const userSchema =new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  facebookId:String,
  secret:String
});
const resourceSchema=new mongoose.Schema({
  name:String,
  email:String,
  phone:Number,
  address:String,
  city:String,
  state:String,
  zip:Number,
  resource:String,
  quantity:String,
  addInfo:String,
  userId:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User= new mongoose.model("User",userSchema);
passport.use(User.createStrategy());

const Resource= new mongoose.model("Resource",resourceSchema);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Oauth setup for google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/resources"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Oauth setup for facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/resources"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//get requests
app.get("/",function(req,res){
  res.render("homenew");
});

//for google login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/resources',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/resources');
  });

//for facebook login
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/resources',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/resources');
  });

//for local registeration
app.get("/register",function(req,res){
  res.render("register");
});

//for local login
app.get("/login",function(req,res){
  res.render("login");
});

//for logout
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

//resources page
app.get("/resources",function(req,res){
  Resource.find({},function(err,foundResources){
    if(err){
      console.log(err);
    }
    else{
      if(foundResources){
        res.render("secrets",{foundResources:foundResources})
      }
    }
  });
});

app.get("/myResources",function(req,res){
  if(req.isAuthenticated()){
    Resource.find({userId:req.user.id},function(err,foundResources){
      if(err){
        console.log(err);
      }
      else{
        if(foundResources){
          res.render("myResources",{foundResources:foundResources})
        }
      }
    });
  }
  else{
    res.redirect("/login");
  }
});

app.post("/deleteResource",function(req,res){
console.log(req.body.deleteResource);
  Resource.findByIdAndDelete(req.body.deleteResource,function(err){
    if(!err)
    {
      res.redirect("/myResources");
    }
  })
});

//submit route
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});

app.get("/ResourceId=:resourceId",function(req,res){
  Resource.findById(req.params.resourceId,function(err,foundResource){
    if(!err){
      res.render("Readmore",{foundResource:foundResource});
    }
  });
});


app.post("/submit",function(req,res){

  User.findById(req.user.id,function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
      if(foundUser){
        let resourceTemp=req.body.resource;
        if(resourceTemp==="Others")
        resourceTemp=req.body.others;
        const newResource=new Resource({
          name:req.body.name,
          email:req.body.email,
          phone:req.body.phone,
          address:req.body.address,
          city:req.body.city,
          state:req.body.state,
          zip:req.body.zip,
          resource:resourceTemp,
          quantity:req.body.quantity,
          addInfo:req.body.additionalInfo,
          userId:req.user.id
        });
        newResource.save(function(err){
          if(!err){
            res.redirect("/resources");
          }
        });
      }
    }
  });
});

//post for filter
app.post("/resources",function(req,res){
let cityVar=req.body.city,stateVar=req.body.state,resourceVar=req.body.resource,zipVar=req.body.zip;
if(req.body.city==='')
cityVar={$ne:null};
if(req.body.state=='')
stateVar={$ne:null};
if(req.body.resource=='')
resourceVar={$ne:null};
if(req.body.zip=='')
zipVar={$ne:null};
  Resource.find({city:cityVar,state:stateVar,resource:resourceVar,zip:zipVar},function(err,foundResources){
    if(err){
      console.log(err);
    }
    else{
      if(foundResources){
        res.render("secrets",{foundResources:foundResources});
      }
    }
  });
});

//post request for login and registeration
app.post("/register",function(req,res){
User.register({username:req.body.username},req.body.password,function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }
  else {
    passport.authenticate("local")(req,res,function(){
      res.redirect("/resources");
    });
  }
});
});

app.post('/login',
  passport.authenticate('local', { successRedirect: '/resources',
                                   failureRedirect: '/login' }));

//listen on port 3000
let port=process.env.PORT;
if(port==null||port==""){
  port=3000;
}
app.listen(port,function(){
  console.log("server running successfully");
});
