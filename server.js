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

app.listen(process.env.PORT || 3000, function () {
    console.log('Listening port 3000');
});