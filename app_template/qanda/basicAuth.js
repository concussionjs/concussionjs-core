var base64 = require("./base64");
var mongoose = require('mongoose')
var url = require('url');
var fs = require('fs');
var login = fs.readFileSync("/root/nextera/apps/demoqanda/login/login.html");
var connect = require('connect');


var db = mongoose.connect('mongodb://localhost/test');
Schema = mongoose.Schema;
var userSchema = new Schema();
userSchema.add({
username: String,
password: String});
var users = mongoose.model("users",userSchema);

var checkCredentials = function(email,password,req,res,next)
{
	users.findOne({username:email},function(err,doc){
      		console.log("found something");
		if(err || !doc)
                {
                     unauthorized(res,req,next);	   
			return;
                }
		else if(doc.password == password)
		{
			
			req.session.username=email;
			console.log("session: " + req.session.username);
			next();
		}
		else
		{
			unauthorized(res,req,next);
    			return;			
		}

	});
}

module.exports = function basicAuth(realm) {
  
  realm = realm || "Authorization Required";
  
  console.log("realm: " +  realm);  
  
  

  function unauthorized(res,req,next) {
   	if(req.body){
		var email = req.body["email"];
		var password = req.body["password"];
	}

	if(req.url.search("^.*login/")==0)
	{
		next();
		return;
	}
	else if(email && password)
	{
		checkCredentials(email,password,req,res,next)
		return;		
	}
      
  	res.writeHead(200);
	res.write(login); 
	res.end();

  }

  

  return function(req, res, next) {
    
    if(req.session && !req.session["username"])
    {
	unauthorized(res,req,next);
    }
    else
    {
	next();
    }

  }
};
