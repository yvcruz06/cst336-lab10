/* App Configuration */
var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var mysql = require('mysql');
var app = express();
var session = require('express-session');


app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use(session({
  secret: 'top secret code!',
  resave: true,
  saveUninitialized: true
}));


/* Configure MySQL DBMS */
// mysql://bc7a8d0a27b048:dac785fc@us-cdbr-east-06.cleardb.net/heroku_1b02916b4249400?reconnect=true
const connection = mysql.createConnection({
    host: 'us-cdbr-east-06.cleardb.net',
    user: 'bc7a8d0a27b048',
    password: 'dac785fc',
    database: 'heroku_1b02916b4249400'
});
connection.connect();

/* Middleware */
function isAuthenticated(req, res, next){
    if(!req.session.authenticated) res.redirect('/login');
    else next();
}

/* The handler for the DEFAULT route */
app.get('/', function(req, res){
    res.render('home');
});


//The handler for the /author route 
app.get('/quotes', function(req, res){
    var stmt = 'select * from l9_author join l9_quotes on ' + 
               'l9_author.authorId=l9_quotes.authorId ' +
               'where firstName=\'' + req.query.firstname + 
               '\' and lastName=\'' + req.query.lastname + '\' and ' +
               'category=\'' + req.query.category + '\' and ' +
               'sex=\'' + req.query.gender + '\' and ' + 
               'quote like \'%' + req.query.keyword + '%\';'
               
          
    connection.query(stmt, function(error, results){
        if(error) throw error;
        var name = results[0].firstName + ' ' + results[0].lastName;
        var info = results[0];
        info.dob = info.dob.toString().split(' ').slice(0,4).join(' ');
	    info.dod = info.dod.toString().split(' ').slice(0,4).join(' ');
	   
        res.render('quotes', {name: name, quotes: results, info: info});      
    });

});

app.get('/login', function(req, res){
    res.render('login', {loginError: false});
});

app.post('/login', function(req, res){

    var user = req.body.username;
    var pass = req.body.password;
        if(user == "admin" && pass == "admin"){      //user is in db
            req.session.authenticated = true;
            res.redirect('/home2');
        }
        else {
            console.log("Incorrect Login!");
            res.render('login', {loginError: true});
        }
                
});


/* Logout Route */
app.get('/logout', function(req, res){
   req.session.destroy();
   res.redirect('/');
});



app.get('/home2', isAuthenticated, function(req, res){
    var stmt = 'SELECT * FROM l9_author;';
    console.log(stmt);
    var authors = null;
    connection.query(stmt, function(error, results){
        if(error) throw error;
        if(results.length) {
            results.forEach(function(result) {
                result.dob = result.dob.toString().split(' ').slice(0,4).join(' ');
	            result.dod = result.dod.toString().split(' ').slice(0,4).join(' ');
	        })     
            authors = results;
            
            res.render('home2', {authors: authors});
        }    
    });
});

app.get('/confirmation/:aid', isAuthenticated, function(req, res) {
    console.log(req.params.aid);
    var stmt = 'SELECT * FROM l9_author WHERE authorId=' + req.params.aid + ';';
    connection.query(stmt, function(error, result){
       if(error) throw error;
       if(result.length){
        var author = result[0];
        res.render('confirmation', {author: author}); 
       }
    });
});



// Create a new author - Get author information 
app.get('/author2/new', isAuthenticated, function(req, res){
    res.render('author_new');
});

// Create a new author - Add author into DBMS 
app.post('/author2/new', function(req, res){
   //console.log(req.body);
   connection.query('SELECT COUNT(*) FROM l9_author;', function(error, result){
       if(error) throw error;
       if(result.length){
            var authorId = result[0]['COUNT(*)'] + 1;
            var stmt = 'INSERT INTO l9_author ' +
                      '(authorId, firstName, lastName, dob, dod, sex, profession, country, biography) '+
                      'VALUES ' +
                      '(' + 
                       authorId + ',"' +
                       req.body.firstname + '","' +
                       req.body.lastname + '","' +
                       req.body.dob + '","' +
                       req.body.dod + '","' +
                       req.body.sex + '","' +
                       req.body.profession + '","' +
                       req.body.country + '","' +
                       req.body.biography + '"' +
                       ');';
            console.log(stmt);
            connection.query(stmt, function(error, result){
                if(error) throw error;
                res.redirect('/home2');
            })
       }
   });
});

// Show an author record 
app.get('/author2/:aid', isAuthenticated, function(req, res){
    var stmt = 'SELECT * FROM l9_author WHERE authorId=' + req.params.aid + ';';
    console.log(stmt);
    connection.query(stmt, function(error, results){
       if(error) throw error;
       if(results.length){
           var author = results[0];
           author.dob = author.dob.toString().split(' ').slice(0,4).join(' ');
           author.dod = author.dod.toString().split(' ').slice(0,4).join(' ');
           res.render('author2', {author: author});
       }
    });
});

// Edit an author record - Display an author information //
app.get('/author2/:aid/edit', isAuthenticated, function(req, res){
    var stmt = 'SELECT * FROM l9_author WHERE authorId=' + req.params.aid + ';';
    connection.query(stmt, function(error, results){
       if(error) throw error;
       if(results.length){
           var author = results[0];
           author.dob = author.dob.toISOString().split('T')[0];
           author.dod = author.dod.toISOString().split('T')[0];
           res.render('author_edit', {author: author});
       }
    });
});

// Edit an author record - Update an author in DBMS 
app.put('/author2/:aid', function(req, res){
    console.log(req.body);
    var stmt = 'UPDATE l9_author SET ' +
                'firstName = "'+ req.body.firstname + '",' +
                'lastName = "'+ req.body.lastname + '",' +
                'dob = "'+ req.body.dob + '",' +
                'dod = "'+ req.body.dod + '",' +
                'sex = "'+ req.body.sex + '",' +
                'profession = "'+ req.body.profession + '",' +
                'portrait = "'+ req.body.portrait + '",' +
                'country = "'+ req.body.country + '",' +
                'biography = "'+ req.body.biography + '"' +
                'WHERE authorId = ' + req.params.aid + ";"
    //console.log(stmt);
    connection.query(stmt, function(error, result){
        if(error) throw error;
        res.redirect('/author2/' + req.params.aid);
    });
});

// Delete an author record 
app.get('/author2/:aid/delete', isAuthenticated, function(req, res){
    var stmt = 'DELETE from l9_author WHERE authorId='+ req.params.aid + ';';
    connection.query(stmt, function(error, result){
        if(error) throw error;
        res.redirect('/home2');
    });
});


// Create a new quote - Get quote information 
app.get('/author2/:aid/quotes2/new', isAuthenticated, function(req, res){
    res.render('quote_new', {authorId: req.params.aid});
});

// Create a new quote - Add quote into DBMS 
app.post('/author2/:aid/quotes2', function(req, res){
    //console.log(req.body);
    connection.query('SELECT COUNT(*) FROM l9_quotes;', function(error, result){
       if(error) throw error;
       if(result.length){
            var quoteId = result[0]['COUNT(*)'] + 10;
            var stmt = 'INSERT INTO l9_quotes ' +
                      '(quoteId, quote, authorId, category, likes) '+
                      'VALUES ' +
                      '(' + 
                       quoteId + ',"' +
                       req.body.quote + '",' +
                       req.params.aid + ',"' +
                       req.body.category + '",' +
                       req.body.likes +
                       ');';
            console.log(stmt);
            connection.query(stmt, function(error, result){
                if(error) throw error;
                res.redirect('/author2/'+ req.params.aid +'/quotes2');
            })
       }
    });
});

// Show a quote record 
app.get('/author2/:aid/quotes2', isAuthenticated,function(req, res){
    var stmt = 'select firstName, lastName, quote, quoteId '+
               'from l9_author, l9_quotes '+
               'where l9_author.authorId=l9_quotes.authorId '+
               'and l9_author.authorId='+ req.params.aid + ';';
    console.log(stmt);
    var name = null;
    var quotes = null;
    connection.query(stmt, function(error, results){
        if(error) throw error;
        if(results.length){
            name = results[0].firstName + ' ' + results[0].lastName;
            quotes = results;
        }
        res.render('quotes2', {name: name, authorId: req.params.aid, quotes: quotes});
    });
});

// Edit a quote record - Display a quote information 
app.get('/author2/:aid/quotes2/:qid/edit', isAuthenticated, function(req, res){
    var stmt = 'SELECT * FROM l9_quotes WHERE quoteId=' + req.params.qid + ';';
    connection.query(stmt, function(error, results){
       if(error) throw error;
       if(results.length){
           res.render('quote_edit', {quote: results[0]});
       }
    });
});

// Edit a quote record - Update a quote in DBMS 
app.put('/author2/:aid/quotes2/:qid', function(req, res){
    //console.log(req.body);
    var stmt = 'UPDATE l9_quotes SET ' +
                'quote = "'+ req.body.quote + '",' +
                'likes = '+ req.body.likes + ',' +
                'category = "'+ req.body.category + '" ' +
                'WHERE quoteId = ' + req.params.qid + ";"
    console.log(stmt);
    connection.query(stmt, function(error, result){
        if(error) throw error;
        res.redirect('/author2/' + req.params.aid + '/quotes2');
    });
});

// Delete a quote record 
app.get('/author2/:aid/quotes2/:qid/delete', isAuthenticated, function(req, res){
    var stmt = 'DELETE from l9_quotes WHERE quoteId='+ req.params.qid + ';';
    connection.query(stmt, function(error, result){
        if(error) throw error;
        res.redirect('/author2/' + req.params.aid + '/quotes2/');
    });
});
//
// Error Route
app.get('*', function(req, res){
   res.render('error'); 
});

//starting server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

