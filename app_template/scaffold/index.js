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

var db = mongoose.connect('mongodb://localhost/test');
Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
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
			eval("mySchema.add({" + objects[i].name + ":[]});");
		for(j=0;j<objects[i].fields.length;j++)
		{
			console.log('gen schema ',objects[i].name,".",objects[i].fields[j].name);
			if(objects[i].fields[j].name=="id" || objects[i].fields[j].name=="_id" )
				console.log("matches");
			else if(objects[i].name && objects[i].fields[j].name)
				eval("mySchema.add({" + objects[i].fields[j].name + ":String});");
		}
		if(objects[i].children)
		{
			for(j=0;j<objects[i].children.length;j++)
			{
				generateSchema(objects[i].children[j]);
			}
		}
					
	}
	mySchema.add({"_search_keys":[]});	
	mySchema.add({"_id":Schema.ObjectId});
	
	callback();
}

addNewObjects = function(callback)
{
	//console.log("addNewObjects,");
	//mySchema.add({"fields":[]});
	mySchema.add({"name":String});
	var myObject = mongoose.model("nextera_objects",mySchema);
	var newObject = new myObject();
	console.log("addNewObjects,",objects.length);
	for(i=0;i<objects.length;i++)
	{
		
		try{
		var currentObj = objects[i];
		var currentName = ""+currentObj.name;
		console.log("addNewObjects,",currentObj.fields.length, JSON.stringify(currentObj));	
		if(currentName.search("_search")<0)
		{
		myObject.find({"name":currentName},function(err,result)
		{
			console.log("addNewObjects,","inside find ", "result: ", result.length, ", ", currentObj.name);
			if(err)
			{
				console.log("addNewObjects,",err);
				return;
			}
			
			if(result.length>0)
			{
				console.log("addNewObjects,","update object ",result);
				callback();
				return;
			}
			console.log("addNewObjects,",result);
			console.log("addNewObjects,","add object");
			//setupObject(currentObj,function(obj2add){
				console.log("addNewObjects,","test",JSON.stringify(currentObj));
				newObject.name = currentObj.name;
				newObject.fields = currentObj.fields;
				newObject.save(newObject,function(err){
						if(err)
						{
							console.log("addNewObjects,",err);
						}
						console.log("addNewObjects,","successfuly added");
						callback();	
				});
			//});
				
		});
	}
		}catch(e){console.log("big error",e);}
	}
	
}


parse.runGenerateStructure("index.html",function(myObjects){
	objects=myObjects;
	mySchema.add({"fields":[]});
	mySchema.add({"name":String});
	var myObject = mongoose.model("nextera_objects",mySchema);
	var newObject = new myObject();
	
	addNewObjects(function(){
		myObject.find({},function(err,result){
				if(err)
				{
					console.log('gen structure: ,err: ',err);
					res.end(err);
					return;	
				}
				console.log("gen structure: ",JSON.stringify(result), " ",result.length);
				//generateSchemaNameValuePairs(result,function(){console.log("all done with generateSchemaNameValuePairs");objects=objects.concat(result);});
				generateSchema(result,function(){console.log("gen structure: ",mySchema)});
				objects=result;
		});
	});
		
		//generateSchema(objects,function(){console.log(mySchema)});
							
});


var generateRoutes = function(req,res,next){		
	console.log("*****\n\n\nin generateRoutes*****\n\n\n");
	
	
	console.log(JSON.stringify(objects)," ",objects.length);
	var getObjects = mongoose.model("nextera_objects",mySchema);
	skipNext=false;
	getObjects.find({},function(err,result){
					if(err)
					{
						console.log('err: ',err);
						res.end(err);
						return;	
					}
					//console.log("inside generate routes and find ", JSON.stringify(result), " ",objects[0].name);
					loopThroughObjects(result,req,res,next);
	});		
}

loopThroughObjects = function(objects,req,res,next)
{
	if(req.url.search("/nextera_objects_models")>-1)
	{
		//res.writeHeader(200);
		mySchema.add({"fields":[]});
		mySchema.add({"name":String});
		if(req.url.split("/").length < 2)
		{
			console.log("no object name provided");
			return;  
		}
		
        var myObject = mongoose.model("nextera_objects",mySchema);
        var newObject = new myObject();
	    var searchTerm = req.url.split("/")[2];
	    console.log("searchTerm:" + searchTerm)
        myObject.find({"name":searchTerm},function(err,result){
				if(err)
				{
					console.log('err: ',err);
					res.end(err);
					return;
				}
				res.end(JSON.stringify(result));
		});
		return;		
	}

	for(counter=0;counter<objects.length;counter++)
	{
		console.log("objects[counter]name: ",objects[counter].name, " ",req.url);
		if(req.url == "/"+objects[counter].name)
		{
			//res.writeHeader(200);

			var myObject = mongoose.model(objects[counter].name,mySchema);
			myObject.find({},function(err,result){
				if(err)
				{
					console.log('err: ',err);
					res.end(err);
					return;
				}
				console.log("get stuff ",JSON.stringify(result));
				res.end(""+JSON.stringify(result));
			});
			skipNext=true;
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
				if(req.rawBody!="")
					var text = "newObject." + objects[counter].fields[j].name + " = JSON.parse(req.rawBody)." + objects[counter].name + "_" + objects[counter].fields[j].name;				
				else
					var text = "newObject." + objects[counter].fields[j].name + " = ''";
				eval(text);
				searchKey.push(eval("newObject." + objects[counter].fields[j].name));	
			}
			
			newObject._search_keys=searchKey;
			
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
                        var objectId = mongoose.Types.ObjectId.fromString(req.url.split("/")[3]);

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
                		res.writeHeader(200);
                        if(req.url.split("/").length < 3)
                        {
                                console.log("no search term provided");
                                return;
                        }
                        console.log("inside /" + objects[counter].name + "/update ", req.url.split("/")[3]);
                        var myObject = mongoose.model(objects[counter].name,mySchema);
                        var newObject = new myObject();
                        console.log(req.url.split("/")[3]);
                        updatedRow = JSON.parse((""+req.rawBody).replace("_id","_id_mock"));
                        var oId = mongoose.Types.ObjectId.fromString(req.url.split("/")[3]);
                        searchKey = [];
                        for(j=0;j<objects[counter].fields.length;j++)
						{	
							searchKey.push(eval("updatedRow." + objects[counter].fields[j].name));	
						}
                        
                        updatedRow._search_keys = searchKey;

                        try{
                        myObject.update({_id:oId},updatedRow).run(function(err,result){
                                if(err)
                                {
                                        console.log(err);
                                        res.end(err);
                                        return;
                                }
                                console.log("found something zzz: ", result," ",oId," ",updatedRow)
                                res.end("success");
                                return;
                        });
                    	}catch(e){console.log("e:",e);}

                    	return;
                }
	}
	
	next();
}

fs.watchFile('index.html', function(curr,prev) {
    console.log("WatchFile current mtime: " +curr.mtime);
    console.log("WatchFile previous mtime: "+prev.mtime);
    //var indexhtml = fs.readFileSync("index.html","utf8");
    //console.log("WatchFile ",indexhtml.length);
    if (curr.mtime == prev.mtime) {
        console.log("WatchFile mtime equal");
    } else {
        console.log("WatchFile mtime not equal");
        objects=[];
        try{
        parse.runGenerateStructureHTML("",function(myObjects){
			mySchema.add({"fields":[]});
			mySchema.add({"name":String});
			var myObject = mongoose.model("nextera_objects",mySchema);
			var newObject = new myObject();
			console.log("WatchFile: objects length ", myObjects.length, " ", JSON.stringify(myObjects))
			for(i=0;i<myObjects.length;i++)
			{
				console.log("WatchFile: objectname x", myObjects[i].name.trim(), "x ",myObjects[i].name.search("_search"))
				var currentName = ""+myObjects[i].name;
				var currentFields = myObjects[i].fields;
				if(myObjects[i].name.search("_search")<0)
				{
				console.log("WatchFile: name again ",currentName)
				myObject.find({name:currentName},function(err,result){
					if(err)
					{
						console.log('WatchFile err: ',err);
						res.end(err);
						return;
					}
					console.log("WatchFile: ",result.length);
					if(result.length>0)
					{
						console.log("WatchFile: update ",JSON.stringify(currentFields));
						result.fields = currentFields;
						myObject.update({name:currentName},{$set:{fields:currentFields}}).run(function(err,result)
						{
							if(err)
							{
								console.log('WatchFile err: ',err);
								return;
							}

							console.log("WatchFile: updated object ",currentName);
							
						});
					}
					else
					{
						newObject.name = myObjects[i].name;
						newObject.fields = myObjects[i].fields;
						newObject.save(function(err){
							if(err)
							{
								console.log("WatchFile err: ",err);
								return;
							}

							console.log("WatchFile: added object ",myObjects[i].name);
						});
					}
				});
			}
			}					
		});
		}catch(e){console.log("WatchFile: ",e);}
	}
	//}catch(e){console.log("WatchFile: ",e);}   
});

var server = connect.createServer(
	connect.logger({ format: ':method :url' }),
	connect.cookieParser(),
	connect.session({ secret:"test"}),
	connect.bodyParser(),
	generateRoutes,
	nta.serveStaticFilesNoWriteHead
);

nta.listen(server,s.id);



