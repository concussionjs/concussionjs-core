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

var DbSL = require('mongodb').Db,
  connectionSL = require('mongodb').Connection,
  serverSL = require('mongodb').Server;

var host = 'localhost';
var port = connectionSL.DEFAULT_PORT;
var dbSL = new DbSL('test', new serverSL(host, port, {}), {native_parser:false});

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

function generateSchemaB(objects,callback)
{
	
	//mySchema.add({"fields":[]});
	//mySchema.add({"name":String});
	//var myObject = mongoose.model("nextera_objects",mySchema);
	//var newObject = new myObject();

	//myObject.find({},function(err,objects)
	//{
		console.log("gen schema object.length ", objects.length);
		for(i=0;i<objects.length;i++)
		{
			if(objects[i].type == "array") 
				eval("mySchema.add({" + objects[i].name + ":[]});");
			console.log('gen schema fields.length ', objects[i].name," ",objects[i].fields.length);
			for(j=0;j<objects[i].fields.length;j++)
			{
				//console.log('gen schema ',objects[i].name,".",objects[i].fields[j].name);
				if(objects[i] && objects[i].fields[j] && objects[i].name && objects[i].fields[j].name && (objects[i].fields[j].name=="id" || objects[i].fields[j].name=="_id" || objects[i].fields[j].name=="fields") )
					console.log("gen schema matches");
				else if(objects[i] && objects[i].fields[j] && objects[i].name && objects[i].fields[j].name)
				{
					console.log('gen schema ',"mySchema.add({" + objects[i].fields[j].name + ":String});");
					eval("mySchema.add({" + objects[i].fields[j].name + ":String});");
				}
			}
			if(objects[i].children)
			{
				for(j=0;j<objects[i].children.length;j++)
				{
					generateSchemaB(objects[i].children[j]);
				}
			}
					
		}
	//}
	mySchema.add({"_search_keys":[]});	
	mySchema.add({"_id":Schema.ObjectId});
	
	callback();
}

function generateSchema(callback)
{
	var fieldSchema = new Schema();
	fieldSchema.add({name:String});
	mySchema.add({"fields":[fieldSchema]});
	mySchema.add({"name":String});

	var myObject = mongoose.model("nextera_objects",mySchema);
	var newObject = new myObject();

	myObject.find({},function(err,objects)
	{
		console.log("gen schema object.length ", objects.length);
		for(i=0;i<objects.length;i++)
		{
			if(objects[i].type == "array") 
				eval("mySchema.add({" + objects[i].name + ":[]});");
			console.log('gen schema fields.length ', objects[i].name," ",objects[i].fields.length , " ", JSON.stringify(objects[i].fields));
			for(j=0;j<objects[i].fields.length;j++)
			{
				//console.log('gen schema ',objects[i].name,".",objects[i].fields[j].name);
				if(objects[i] && objects[i].fields[j] && objects[i].name && objects[i].fields[j].name && (objects[i].fields[j].name=="id" || objects[i].fields[j].name=="_id" || objects[i].fields[j].name=="fields") )
					console.log("gen schema matches");
				else if(objects[i] && objects[i].fields[j] && objects[i].name && objects[i].fields[j].name)
				{
					console.log('gen schema ',"mySchema.add({" + objects[i].fields[j].name + ":String});");
					eval("mySchema.add({" + objects[i].fields[j].name + ":String});");
				}
			}
			if(objects[i].children)
			{
				for(j=0;j<objects[i].children.length;j++)
				{
					generateSchemaB(objects[i].children[j]);
				}
			}
					
		}
	});
	mySchema.add({"_search_keys":[]});	
	mySchema.add({"_id":Schema.ObjectId});
	
	callback(mySchema);
}

addNewObjects = function(callback)
{
	//console.log("addNewObjects,");
	mySchema.add({"fields":[]});
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
		generateSchema(function(){console.log("gen structure: ",mySchema)});
	});	
	//generateSchema(objects,function(){console.log(mySchema)});
							
});


var generateRoutes = function(req,res,next){		
	console.log("*****\n\n\nin generateRoutes*****\n\n\n");
	mySchema.add({name:String});
	mySchema.add({fields:[]});
	
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
			//generateSchema(function(mySchema){
			//	var Any = new Schema({ any: {} });
			//	var myObject = mongoose.model(objects[counter].name,Any);
				//console.log("create: schema:",JSON.stringify(mySchema));
				//var newObject = new myObject();
				// var setupObject = function(objects,counter,req,newObject,callback)
				var searchKey = [];
				var object = {};
				setupObject(searchKey,0,objects,counter,req,object,function(newObject){
					//console.log("create: newObject:", JSON.stringify(newObject), " ",JSON.stringify(mySchema));
					dbSL.open(function(err, db) {
    					db.collection(objects[counter].name, function(err, collection) {
        					collection.insert(newObject, function(err, docs) {
        						console.log(JSON.stringify(docs)); 
        						res.end("success");
							});
    					});
					});
            	});
            //});
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

var setupObject = function(searchKey,fieldIndex,objects,counter,req,newObject,callback)
{		
	var j = fieldIndex;
		
	if(fieldIndex==objects[counter].fields.length)
	{	
		try{
			console.log("create: searchKey: ",searchKey);	
			//newObject._search_keys=searchKey;
			callback(newObject);
		}catch(e){console.log("create: ",e);}
		return;
	}
	else if(fieldIndex < objects[counter].fields.length)
	{
		if(req.rawBody!="")
			var text = "newObject." + objects[counter].fields[j].name + " = JSON.parse(req.rawBody)." + objects[counter].name + "_" + objects[counter].fields[j].name;				
		else
			var text = "newObject." + objects[counter].fields[j].name + " = ''";
		console.log("create: text:",text);
		eval(text);
		console.log("create: eval",eval("newObject." + objects[counter].fields[j].name));
		
		console.log("create: newObject: ", JSON.stringify(newObject));
		searchKey.push(eval("newObject." + objects[counter].fields[j].name));
		newObject._search_keys=searchKey;
		setupObject(searchKey,fieldIndex+1,objects,counter,req,newObject,callback);
	}			
}

var dedupe = function(arr)
{
	var arrTrackDupes = [];
	var retArr = [];
	for(i=0;i<arr.length;i++)
	{
		//console.log("testParse: ",arr[i].name, " ",retArr.length, " ",arrTrackDupes.indexOf(arr[i].name));
		if(arrTrackDupes.indexOf(arr[i].name)==-1)
		{
			arrTrackDupes[arrTrackDupes.length]=arr[i].name;
			retArr[retArr.length]=arr[i];	
		}
	}

	return retArr;
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
				console.log("WatchFile: objectname x", myObjects[i].name.trim(), "x ",myObjects[i].fields.length);
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
						//console.log("WatchFile: testParse: update before",currentName, " ",JSON.stringify(currentFields), " result:", JSON.stringify(result[0].fields));
						try{
							result[0].fields = dedupe(result[0].fields.concat(currentFields));
						}catch(e){console.log("testParse: " + e);}
						//console.log("WatchFile: testParse: update after",currentName, " ",JSON.stringify(result[0].fields));
						myObject.update({name:currentName},{$set:{fields:result[0].fields}}).run(function(err,result)
						{
							if(err)
							{
								console.log('WatchFile err testParse: ',err);
								return;
							}
							
							console.log("WatchFile: testParse: updated object ",currentName);
							
								generateSchema(function(){console.log("gen structure: ",mySchema)});
						});
						objects = result;
					}
					/*else if(!myObjects[i])
					{
						console.log("Watchfile myObjects[i] was undefined");
						return;
					}*/
					else
					{	
						newObject.name = currentName;
						newObject.fields = currentFields;//myObjects[i].fields;
						newObject.save(function(err){
							if(err)
							{
								console.log("WatchFile err: ",err);
								return;
							}

							console.log("WatchFile: added object ",currentName);
							myObject.find({},function(err,result){
								if(err)
								{
									console.log('gen structure: ,err: ',err);
									res.end(err);
									return;	
								}
								
								console.log("gen structure44: ",JSON.stringify(result), " ",result.length);
								//generateSchemaNameValuePairs(result,function(){console.log("all done with generateSchemaNameValuePairs");objects=objects.concat(result);});
								objects=result;
								//generateSchema(result,function(){console.log("gen structure: ",mySchema)});
							});
						});
					}
				});
			}
			}					
		});
		}catch(e){console.log("WatchFile: testParse:",e);}
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



