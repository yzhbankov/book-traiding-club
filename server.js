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
var https = require('https');

app.use("/", express.static('public'));
app.use("/gettradeinfo", express.static('public'));
app.use("/gettraderequestinfo", express.static('public'));
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

app.get('/logout', function (req, res) {
    req.session.destroy();
    console.log("session ends");
    res.redirect('/');
});

app.get('/mybooks', function (req, res) {
    if (!req.session.user) {
        res.redirect('/');
    } else {
        MongoClient.connect(url, function (err, db) {
            var resent = db.collection('books').find({"username": req.session.user}, {
                'username': true,
                "title": true,
                'cover_img': true
            }).toArray(function (err, result) {
                if (result.length < 1) {
                    console.log('no books found');
                    res.render('mybooks.jade', {"title": req.session.user, "books": []});
                } else {
                    console.log('books found');
                    var books = [];
                    var books_titles = [];
                    for (var i = 0; i < result.length; i++) {
                        books.push(result[i].cover_img);
                        books_titles.push(result[i].title);
                    }
                    res.render('mybooks.jade', {
                        "title": result[0].username,
                        "books": books,
                        "books_titles": books_titles
                    });
                }
            });

            db.close();
        });
    }
});

app.get('/allbooks', function (req, res) {
    if (!req.session.user) {
        res.redirect('/');
    } else {
        MongoClient.connect(url, function (err, db) {
            var resent = db.collection('books').find({}, {
                'username': true,
                "title": true,
                'cover_img': true
            }).toArray(function (err, result) {
                if (result.length < 1) {
                    console.log('no books found');
                    res.render('allbooks.jade', {"books": []});
                } else {
                    console.log('books found');
                    var books = [];
                    var books_titles = [];
                    var books_owner = [];
                    for (var i = 0; i < result.length; i++) {
                        books.push(result[i].cover_img);
                        books_titles.push(result[i].title);
                        books_owner.push(result[i].username);
                    }
                    res.render('allbooks.jade', {
                        "books": books,
                        "books_titles": books_titles,
                        "books_owners": books_owner,
                        "current_user": req.session.user
                    });
                }
            });
            db.close();
        });
    }
});

app.post('/add', function (req, res) {
    var booksData = '';
    var options = {
        hostname: 'www.googleapis.com',
        path: encodeURI('/books/v1/volumes?q=search+' + req.body.title),
        method: 'GET'
    };

    var request = https.request(options, function (response) {
        response.setEncoding('utf8');
        response.on('data', function (d) {
            booksData += d;
        });
        response.on('end', function () {
            var cover_img = JSON.parse(booksData)['items'][0]['volumeInfo']['imageLinks']['thumbnail'];
            MongoClient.connect(url, function (err, db) {
                db.collection('books').findOne({
                    "username": req.session.user,
                    "title": req.body.title
                }, function (err, item) {
                    if (item) {
                        db.close();
                        console.log("book already exist");
                    } else {
                        db.collection('books').insertOne({
                            "username": req.session.user,
                            "title": req.body.title,
                            "cover_img": cover_img
                        }, function (err, result) {
                            if (!err) {
                                console.log("book added successfuly");
                            }
                        });
                        db.close();
                    }
                });
            });
        });
    });

    request.on('error', function (e) {
        console.error(e);
    });
    request.end();

    res.redirect('/mybooks');


});

app.get('/delete/:booktitle', function (req, res) {
    if (!req.session.user) {
        res.redirect('/');
    }
    MongoClient.connect(url, function (err, db) {
        db.collection('books').remove({"username": req.session.user, "title": req.params.booktitle});
        db.close();
        res.redirect('/mybooks');
    });
});
app.get('/trade/:from/:to/:title', function (req, res) {
    var from = req.params.from;
    var to = req.params.to;
    var title = req.params.title;
    if (!req.session.user) {
        res.redirect('/');
    } else {
        MongoClient.connect(url, function (err, db) {
            db.collection('trades').findOne({
                "from": from,
                "to": to,
                "title": title
            }, function (err, item) {
                if (item) {
                    db.close();
                    console.log("book already trade");
                } else {
                    db.collection('trades').insertOne({
                        "from": from,
                        "to": to,
                        "title": title
                    }, function (err, result) {
                        if (!err) {
                            console.log("book trdade successfuly");
                        }
                    });
                    db.close();
                }
            });
        });
        res.redirect('/allbooks');
    }
});
app.get('/gettradeinfo/:from', function (req, res) {
    var from = req.session.user;

    MongoClient.connect(url, function (err, db) {
        var resent = db.collection('trades').find({"from": from}, {
            'from': true,
            "to": true,
            'title': true
        }).toArray(function (err, result) {
            if (result.length < 1) {
                console.log('no trades found');
                res.render('mytrades.jade', {"tradesTo": []});
            } else {
                console.log('trades found');
                var tradesTo = [];
                var titles = [];
                for (var i = 0; i < result.length; i++) {
                    tradesTo.push(result[i].to);
                    titles.push(result[i].title);
                }
                res.render('mytrades.jade', {
                    "tradesTo": tradesTo,
                    "titles": titles
                });
            }
        });
        db.close();
    });
});
app.get('/gettraderequestinfo/:to', function (req, res) {
    var user = req.session.user;

    MongoClient.connect(url, function (err, db) {
        var resent = db.collection('trades').find({"to": user}, {
            'from': true,
            "to": true,
            'title': true
        }).toArray(function (err, result) {
            if (result.length < 1) {
                console.log('no trade requests found');
                res.render('anothertrades.jade', {"tradesFrom": []});
            } else {
                console.log('trades found');
                var tradesFrom = [];
                var titles = [];
                for (var i = 0; i < result.length; i++) {
                    tradesFrom.push(result[i].from);
                    titles.push(result[i].title);
                }
                res.render('anothertrades.jade', {
                    "user":user,
                    "tradesFrom": tradesFrom,
                    "titles": titles
                });
            }
        });
        db.close();
    });
});
app.get('/deletetrade/:title/:to', function(req, res){
    var title = req.params.title;
    var user = req. session.user;
    var to = req.params.to;
    MongoClient.connect(url, function (err, db) {
        db.collection('trades').remove({"from": user, "to": to, "title":title});
        db.close();
        res.redirect('/gettradeinfo/' + user);
    });
});

app.get('/deleteanothertrade/:title/:from', function(req, res){
    var title = req.params.title;
    var user = req. session.user;
    var from = req.params.from;
    MongoClient.connect(url, function (err, db) {
        db.collection('trades').remove({"from": from, "to": user, "title":title});
        db.close();
        res.redirect('/gettraderequestinfo/' + user);
    });
});

app.listen(process.env.PORT || 3000, function () {
    console.log('Listening port 3000');
});