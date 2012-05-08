var jsdom = require("jsdom");
var nta = require("./node_modules/nextera/nextera.js");
var settings = require("./settings.js");
var connect = require('connect');
var fs = require("fs");
var html = fs.readFileSync("kotemplate.ejs","utf-8");
var ejs = require("ejs");

var http = require("http");
var parse = require("./testParse.js");

var s = settings();

objects = [];

function escapeSpecialCharacters(text)
{
        //console.log(text);
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
        //console.log(text);
        return text;
}

addNewObjects = function(callback)
{
	
	for(i=0;i<objects.length;i++)
	{
		
		try{
		var currentObj = objects[i];
		var currentName = ""+currentObj.name;
		//console.log("addNewObjects: currentName",currentName," ",currentObj.fields.length, JSON.stringify(currentObj));	
		if(currentName.search("_search")<0)
		{
		nta.getEntriesWhere({"name":currentName},"nextera_objects",function(err,result)
		{
			//console.log("addNewObjects,","inside find ", "result: ", result.length, ", ", currentObj.name);
			if(err)
			{
				console.log("addNewObjects,",err);
				return;
			}
			
			if(result.length>0)
			{
				//console.log("addNewObjects, result.length>0 ",JSON.stringify(result));
				currentObj.fields = dedupe(result[0].fields.concat(currentObj.fields));
				nta.updateEntry(""+result[0]._id,{$set:currentObj},"nextera_objects",function(err){
						if(err)
						{
							console.log("addNewObjects err: ",err);
						}
						//console.log("addNewObjects,","successfuly added");
						callback();	
				});
				return;
			}
			
			nta.updateEntry(result[0]._id,{$set:currentObj},"nextera_objects",function(err){
				if(err)
				{
					console.log("addNewObjects err: ",err);
				}
				
				callback();	
			});
			
				
		});
	}
		}catch(e){console.log("big error",e);}
	}
	
}


parse.runGenerateStructure("index.html",function(myObjects){
	objects=myObjects;
	addNewObjects(function(){
	});							
});


var generateRoutes = function(req,res,next){		
	skipNext=false;
	
	nta.getEntries("nextera_objects",function(err,result){
		if(err)
		{
			//console.log('err: ',err);
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
		
		if(req.url.split("/").length < 2)
		{
			return;  
		}
		
        var newObject = {};
	    var searchTerm = req.url.split("/")[2];
	    
		nta.getEntriesWhere({"name":searchTerm},"nextera_objects",function(err,result){
				if(err)
				{
					res.end(err);
					return;
				}
				res.end(JSON.stringify(result));
		});
		return;		
	}

	for(counter=0;counter<objects.length;counter++)
	{
		if(req.url == "/"+objects[counter].name)
		{	
			nta.getEntries(objects[counter].name,function(err,documents){
				res.end(""+JSON.stringify(documents));
			})
			skipNext=true;
			return;
		}

		if(req.url.search("/"+objects[counter].name +"/create")>-1)
        {
				var searchKey = [];
				var object = {};
				setupObject(searchKey,0,objects,counter,req,object,function(newObject){
					nta.createEntry(newObject,objects[counter].name,function(msg){
						res.end(msg);
					});	
            	});
            return;
        }
		
		if(req.url.search("/"+objects[counter].name +"/search")>-1)
        {
			if(req.url.split("/").length < 3)
			{
				return;  
			}
			
	        var searchTerm = req.url.split("/")[3];
            nta.searchEntries(searchTerm,objects[counter].name,function(err,documents){                     
				res.end(JSON.stringify(documents));
            });
			return;
        }
		
		if(req.url.search("/"+objects[counter].name +"/delete")>-1)
        {
            if(req.url.split("/").length < 3)
            {
            	//console.log("no search term provided");
                return;
            }
				
            var objectId = req.url.split("/")[3];

            nta.deleteEntry(objectId,objects[counter].name,function(err,documents){
            	if(err)
            	{
            		res.end("failure");
            	}
            	else
            	{
	            	res.end("success");
	            }
            });
                        
			return;
        }
	
		if(req.url.search("/"+objects[counter].name +"/update")>-1)
                {
                		res.writeHeader(200);
                        if(req.url.split("/").length < 3)
                        {
                                //console.log("no search term provided");
                                return;
                        }
                        
                        updatedRow = JSON.parse((""+req.rawBody).replace("_id","_id_mock"));
                        var oId = req.url.split("/")[3];
                        searchKey = [];
                        for(j=0;j<objects[counter].fields.length;j++)
						{	
							searchKey.push(eval("updatedRow." + objects[counter].fields[j].name));	
						}
                        
                        updatedRow._search_keys = searchKey;

                        try{
                       		nta.updateEntry(oId,updatedRow,objects[counter].name,function(err,documents){
                       			if(err)
                       			{
                       				res.end("failure");
                       			}
                       			else
                       			{
                       				res.end("success");
                       			}
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
			//console.log("create: searchKey: ",searchKey);	
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
		//console.log("create: text:",text);
		eval(text);
		//console.log("create: eval",eval("newObject." + objects[counter].fields[j].name));
		
		//console.log("create: newObject: ", JSON.stringify(newObject));
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
    
    if (curr.mtime == prev.mtime) {
        //console.log("WatchFile mtime equal");
    } else {
        //console.log("WatchFile mtime not equal");
        objects=[];
        try{
        parse.runGenerateStructureHTML("",function(myObjects){
			var newObject = {};//myObject();	
			for(i=0;i<myObjects.length;i++)
			{
				//console.log("WatchFile: objectname x", myObjects[i].name.trim(), "x ",myObjects[i].fields.length);
				var currentName = ""+myObjects[i].name;
				var currentFields = myObjects[i].fields;
				if(myObjects[i].name.search("_search")<0)
				{
				//console.log("WatchFile: name again ",currentName)
				nta.getEntriesWhere({name:currentName},"nextera_objects",function(err,result){
					if(err)
					{
						console.log('WatchFile err: ',err);
						res.end(err);
						return;
					}
					//console.log("WatchFile: ",JSON.stringify(result));
					if(result.length>0)
					{
						//console.log("WatchFile: testParse: update before",currentName, " ",JSON.stringify(currentFields), " result:", JSON.stringify(result[0].fields));
						try{
							result[0].fields = dedupe(result[0].fields.concat(currentFields));
						}catch(e){console.log("testParse: " + e);}
						// console.log("WatchFile: testParse: update after",currentName, " ",JSON.stringify(result[0].fields));
						nta.updateEntry(""+result[0]._id,{$set:{fields:result[0].fields}},"nextera_objects",function(err,result)
						{
							if(err)
							{
								//console.log('WatchFile err testParse: ',err);
								return;
							}
							
							//console.log("WatchFile: testParse: updated object ",currentName);
							
								//generateSchema(function(){console.log("gen structure: ",mySchema)});
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
						nta.createEntry(newObject,"nextera_objects",function(err,docs){
							if(err)
							{
								//console.log("WatchFile err: ",err);
								return;
							}

							//console.log("WatchFile: added object ",currentName);
							nta.getEntries("nextera_objects",function(err,result){
								if(err)
								{
									//console.log('gen structure: ,err: ',err);
									res.end(err);
									return;	
								}
								
								objects=result;
							});
						});
					}
				});
			}
			}					
		});
		}catch(e){console.log("WatchFile: testParse:",e);}
	}  
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



