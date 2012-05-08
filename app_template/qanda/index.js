var connect = require('connect');
var urlpaser = require('url');
var qs = require('querystring');
var nta = require('./node_modules/nextera/nextera.js')
var settings = require('./settings.js')
var mongoose = require('mongoose')
var ObjectId = require('mongoose').Types.ObjectId;
var fs = require('fs')
var login = fs.readFileSync('login/login.html')
var basicAuth = require('./basicAuth')

var db = mongoose.connect('mongodb://localhost/test');
Schema = mongoose.Schema;


var userSchema = new Schema();

userSchema.add({
username: String,
password: String});

var questionSchema = new Schema();
questionSchema.add({
title: String,
text: String,
votes: String,
answers: [],
tags:[],
_search_keys:[]

});

var questions = mongoose.model("questions",questionSchema);
var users = mongoose.model("users",userSchema);

var s = settings();
var authCheck = function (req, res, next) {
    url = req.urlp = urlpaser.parse(req.url, true);

    // ####
    // Logout
    if ( url.pathname.search('^.*/logout') == 0 ) {
      req.session.destroy();
    }

    // ####
    // Is User already validated?
    if (req.session && req.session.auth == true) {
      console.log('already authorized');
      next(req,res); // stop here and pass to the next onion ring of connect
      return;
    }
	   
    if ( url.pathname.search('^.*/login') == 0)
    {
	console.log("checking stuff");
      	if(!url.query.name || !url.query.pwd)
	{
		 res.writeHead(403);
               res.end(login);
               return;
	}
	
	users.findOne({username:url.query.name},function(err,doc){
      		console.log("found something");
		if(err || !doc)
                {
                        console.log(err);
                        res.writeHead(403);
                        res.end('user not found');
                        return;
                }
		else if(doc.password == url.query.pwd)
		{
			console.log("password is correct");
			req.session.auth = true;
			// 'http://code.jquery.com/jquery-latest.js'
			
			res.writeHead(302, {
        			'location': 'http://107.20.230.20:8000/brianj/search.html'
    			});
			
			res.end();
			//next(req,res);
			return;
		}
		else
		{
			console.log("password is not correct");
			res.writeHead(403);
    			res.end(login);
    			return;			
		}

	});
	if(users.findOne({username:url.query.name}).size()==0)
	{
		console.log("username not found");
                res.writeHead(403);
                res.end(login);
                return;
	}
	
    }
    else{
    // User is not unauthorized. Stop talking to him.
    res.writeHead(403);
    res.end(login);
    return;
    }
}

var showLogin = function(req,res,next){
	res.writeHead(200, { 'Content-Type': 'text/html' });
	res.write(login);
       next();
}

var displayStuff = function(req,res,next){
	//res.writeHead(200, { 'Content-Type': 'text/html' });	 
	res.end();
}

var getQuestions = function(req,res,next)
{
	if(req.url.split("?")[0] == "/questions")
	{
		if(req.url.split("?").length > 1 && qs.parse(req.url.split("?")[1]).id)
		{
			var objectId = ObjectId.fromString(qs.parse(req.url.split("?")[1]).id);
			console.log(objectId);
			questions.find({_id:objectId},function(err,result){
				if(err)
				{
					console.log('err: ',err);
					res.end(err);
					return;
				}
				console.log("no error");
				res.end(""+JSON.stringify(result));
			});
			return;
		}
		else
		{
			questions.find({},function(err,result){
				if(err)
				{
					console.log('err: ',err);
					res.end(err);
					return;
				}
				console.log("no error");
				res.end(""+JSON.stringify(result));
			});
			return;
		}
	}
	else
	{
		next();
	}	
}

var addQuestion = function(req,res,next)
{
        if(req.url.search("/addQuestion")>-1)
        {
		console.log("inside addQuestion ",req.rawBody);
		var q = new questions();
		q.title = JSON.parse(req.rawBody).newQuestionTitle;
		q.tags = JSON.parse(req.rawBody).newQuestionTags.split(",");
		q._search_keys = JSON.parse(req.rawBody).newQuestionTitle.split(" ").concat(q.tags);
		q.save(function(err){
			if(err)
			{
				res.end(err);
			}
			res.end("success");
		});		
            		
              return;
        }
        else
        {
              next();
        }
}


var saveQuestions = function(req,res,next)
{
        if(req.url.search("/saveQuestions")>-1)
        {
		
			
            		var objectId = ObjectId.fromString(qs.parse(req.url.split("?")[1]).id);

			//console.log(req.rawBody);

        		questions.findOne({_id:objectId},function(err,result){
				if(err)
				{
					console.log(err);
					res.end(err);
					return;
				}
				result.answers= JSON.parse(req.rawBody);
				console.log(req.rawBody);
				console.log(JSON.stringify(result.answers));
				result.save(function(err){
                        		if(err)
                        		{
                                		console.log('err: ',err);
                                		res.end(err);
                                		return;
                        		}
                        		res.end("success");
                		});
			});
                return;
        }
        else
        {
                next();
        }
}

function escapeSpecialCharacters(text)
{
	console.log(text);
	text = ""+text;
	text = text.replace('[','\\[','g');
	text = text.replace('\\','\\\\','g');
	text = text.replace('^','\\^','g');
	text = text.replace('$','\\$','g');
	text = text.replace('.','\\.','g');
	text = text.replace('|','\\|','g');
	text = text.replace('?','\\?','g');
	text = text.replace('*','\\*','g');
	text = text.replace('+','\+','g');
	text = text.replace('(','\\(','g');
	text = text.replace(')','\\)','g');
	console.log(text);
	return text;
}

var search = function(req,res,next)
{ 
	
	if(req.url.split("?")[0] == "/search")
	{
		if(req.url.split("?").length > 1 && qs.parse(req.url.split("?")[1]).searchTerm)
		{
			var searchTerm = qs.parse(req.url.split("?")[1]).searchTerm;
			console.log("search term: " , searchTerm);
			var reg = new RegExp('.*' + escapeSpecialCharacters(searchTerm).split(" ").join(".*|.*") + '.*','i');
			console.log(reg);
			questions.find({_search_keys:reg},function(err,result){
				if(err)
				{
					console.log('err: ',err);
					res.end(err);
					return;
				}
				console.log("no error");
				res.end(""+JSON.stringify(result));
			});
			return;
		}
		else
		{
			questions.find({},function(err,result){
				if(err)
				{
					console.log('err: ',err);
					res.end(err);
					return;
				}
				console.log("no error");
				res.end(""+JSON.stringify(result));
			});
			return;
		}
	}
	else
	{
		next();
	}	
}


var server = connect.createServer(
      connect.logger({ format: ':method :url' }),
      connect.cookieParser(),
      connect.session({ secret:"test"}),
      connect.bodyParser(),
      basicAuth(),
      search,
      addQuestion,
      getQuestions,
      saveQuestions,
      nta.serveStaticFiles
);



nta.listen(server,s.id)
