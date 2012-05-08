var jsdom = require("jsdom");
var nta = require("./node_modules/nextera/nextera.js")
var settings = require("./settings.js");
var connect = require('connect');
var fs = require("fs");
var html = fs.readFileSync("kotemplate.ejs","utf-8");
var ejs = require("ejs");

var http = require("http");
var parse = require("./testParse.js");

var s = settings();
var mongoose = require('mongoose')
var ObjectId = require('mongoose').Types.ObjectId;
var db = mongoose.connect('mongodb://localhost/test');
Schema = mongoose.Schema;

objects = [];
var mySchema = new Schema();

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


function generateSchema(Objects,callback)
{
	for(i=0;i<objects.length;i++)
	{
		if(objects[i].type == "array") 
			eval("mySchema.add({"+objects[i].name+":[]});");
		for(j=0;j<objects[i].fields.length;j++)
		{
			// console.log('gen schema ',objects[i].fields[j]);
			if(objects[i].fields[j]=="id")
				console.log("matches");
			else
				eval("mySchema.add({"+objects[i].fields[j]+":String});");
		}
		for(j=0;j<objects[i].children.length;j++)
		{
			generateSchema(objects[i].children[j]);
		}
					
	}
	mySchema.add({"_search_keys":[]});	
	mySchema.add({"_id":ObjectId});
	callback();
}

parse.runGenerateStructure("index.html",function(myObjects){
		objects=myObjects;
		generateSchema(objects,function(){console.log(mySchema)});			
});

var generateRoutes = function(req,res,next){		
	console.log("*****\n\n\nin generateRoutes*****\n\n\n");
	for(counter=0;counter<objects.length;counter++)
	{
		if(req.url == "/"+objects[counter].name)
		{
			res.writeHeader(200);
			var myObject = mongoose.model(objects[counter].name,mySchema);
			myObject.find({},function(err,result){
				if(err)
				{
					console.log('err: ',err);
					res.end(err);
					return;
				}
				// console.log(JSON.stringify(result));
				res.end(""+JSON.stringify(result));
			});
			return;
		}

		if(req.url.search("/"+objects[counter].name +"/create")>-1)
        	{
			// console.log("inside " + objects[counter].name + "_create ", req.rawBody);
			var myObject = mongoose.model(objects[counter].name,mySchema);
			var newObject = new myObject();
			var searchKey=[];
			for(j=0;j<objects[counter].fields.length;j++)
			{
				var text = "newObject." + objects[counter].fields[j] + " = JSON.parse(req.rawBody)." + objects[counter].name + "_" + objects[counter].fields[j];				
				eval(text)
				searchKey.push(eval("newObject." + objects[counter].fields[j]));
				newObject._search_keys=searchKey;	
			}
			newObject.save(function(err){
				if(err)
				{
					console.log('err: ',err);
					res.end("failure");
					return;
				}
				console.log("success");
			});
			res.end("success");
              		return;
        	}
		
		if(req.url.search("/"+objects[counter].name +"/search")>-1)
                {
			if(req.url.split("/").length < 3)
			{
				console.log("no search term provided");
				return;  
			}
			//console.log("inside " + objects[counter].name + "_search ", req.url.split("/")[3]);
                        var myObject = mongoose.model(objects[counter].name,mySchema);
                        var newObject = new myObject();
	                var searchTerm = req.url.split("/")[3];
                        var reg = new RegExp('.*' + escapeSpecialCharacters(searchTerm).split(" ").join(".*|.*") + '.*','i');
                        // console.log(reg);
                        
			myObject.find({_search_keys:reg},function(err,result){
                                if(err)
                                {
                                        console.log('err: ',err);
                                        return;
                                }
                                console.log("no error");
                                console.log(""+JSON.stringify(result));
				res.end(JSON.stringify(result));
                        });
			return;
                }
		
		if(req.url.search("/"+objects[counter].name +"/delete")>-1)
                {
                        if(req.url.split("/").length < 3)
                        {
                                console.log("no search term provided");
                                return;
                        }
			console.log("inside " + objects[counter].name + "_delete ", req.url.split("/")[3]);
                        var myObject = mongoose.model(objects[counter].name,mySchema);
                        var newObject = new myObject();	
                        var objectId = ObjectId.fromString(req.url.split("/")[3]);

                        //console.log(req.rawBody);
			//res.writeHead(200);
                        myObject.remove({_id:objectId},function(err,result){
                                if(err)
                                {	
					
                                	console.log('err: ',err);
					res.end("failure");
                                        return;
                        	}
                        	console.log("Object with id ",req.url.split("/")[3], " was successfully removed");
                        });
			res.end("success");
			return;
                }
	
		if(req.url.search("/"+objects[counter].name +"/update")>-1)
                {
                        if(req.url.split("/").length < 3)
                        {
                                console.log("no search term provided");
                                return;
                        }
                        console.log("inside " + objects[counter].name + "_delete ", req.url.split("/")[3]);
                        var myObject = mongoose.model(objects[counter].name,mySchema);
                        var newObject = new myObject();

                        var objectId = ObjectId.fromString(req.url.split("/")[3]);

                        //console.log(req.rawBody);

                        myObject.findOne({_id:objectId},function(err,result){
                                if(err)
                                {
                                        console.log(err);
                                        res.end(err);
                                        return;
                                }
                                result = JSON.parse(req.rawBody);
                                console.log(JSON.stringify(req.rawBody));
                                result.save(function(err){
                                        if(err)
                                        {
                                                console.log('err: ',err);
                                                res.end(err);
                                                return;
                                        }
                                        res.end("success");
					return;
                                });
                        });
                }
	}
	/*if(req.url=="/"){
		res.writeHeader(200);
		res.end(example);
	}*/
	next();
	
}

var server = connect.createServer(
	connect.logger({ format: ':method :url' }),
	connect.cookieParser(),
	connect.session({ secret:"test"}),
	connect.bodyParser(),
	generateRoutes,
	nta.serveStaticFilesNoWriteHead
);

nta.listen(server,s.id);



