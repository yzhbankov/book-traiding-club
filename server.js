/**
 * Created by Iaroslav Zhbankov on 04.01.2017.
 */
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
//var url = 'mongodb://yzhbankov:password1360@ds145208.mlab.com:45208/heroku_8k6sbvf2';
var url = 'mongodb://localhost:27017/book_club';
var session = require('express-session');


app.use("/", express.static('public'));
app.use("/dashboard", express.static('public'));
app.use("/poll", express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({secret: "secretword", resave: false, saveUninitialized: true}));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function (req, res) {
    res.render('index.jade', {});
});

app.get('/signup', function (req, res) {
    res.render('signup.jade', {});
});

app.post('/signup', function (req, res) {
    var username = req.body.user;
    var email = req.body.email;
    var password = req.body.password;
    var city = req.body.city;
    var state = req.body.state;

    MongoClient.connect(url, function (err, db) {
        db.collection('users').findOne({"username": username}, function (err, item) {
            if (item) {
                db.close();
                console.log("user already exist");
                res.redirect('/signup');
            } else {
                req.session.user = username;
                db.collection('users').insertOne({
                    "username": username,
                    "email": email,
                    "city": city,
                    "state": state,
                    "password": password
                }, function (err, result) {
                    if (!err) {
                        console.log("user added successfuly");
                    }
                });
                db.close();
                res.redirect('/');
            }
        });
    });
});

app.get('/signin', function (req, res) {
    res.render('signin.jade', {});
});

app.post('/signin', function (req, res) {
    var username = req.body.user;
    var password = req.body.password;

    MongoClient.connect(url, function (err, db) {
        db.collection('users').findOne({"username": username, "password": password}, function (err, item) {
            if (item) {
                req.session.user = username;
                db.close();
                console.log("user existing");
                res.redirect('/');
            } else {
                db.close();
                console.log("password or username is invalid");
                res.redirect('/signin');
            }
        });
    });
});

app.get('/settings', function (req, res) {
    if (req.session.user) {
        res.render('settings.jade', {});
    } else {
        res.redirect('/');
    }
});

app.post('/settings', function (req, res) {
    var username = req.body.user;
    var city = req.body.city;
    var state = req.body.state;
    var curPassword = req.body.currentPassword;
    var password1 = req.body.newPassword1;
    var password2 = req.body.newPassword2;
    if (password1 === password2) {
        MongoClient.connect(url, function (err, db) {
            db.collection('users').update({"username": username, "password": curPassword},
                {"$set": {"password": password1, "city": city, "state": state}}, function (err, doc) {
                    res.redirect('/');
                    db.close();
                });
        });
    } else {
        res.redirect('/settings');
    }
});

app.get('/logout', function(req, res){
    req.session.destroy();
    console.log("session ends");
    res.redirect('/');
});

app.listen(process.env.PORT || 3000, function () {
    console.log('Listening port 3000');
});