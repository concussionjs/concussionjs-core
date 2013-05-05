var jsdom = require('jsdom');
var nta = require('concussion-core');
var settings = require('./settings.js');
var config = require('./config.js');
var connect = require('connect');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/kotemplate.ejs', 'utf-8');
var scriptonly = fs.readFileSync(__dirname + '/kotemplate-scriptonly.ejs', 'utf-8');
var cjsutil = fs.readFileSync(__dirname + '/cjs-utilities.js','utf-8');
var ejs = require('ejs');
var qs = require('querystring');
var http = require('http');
var exec  = require('child_process').exec;
var parse = require('./inferObjects.js');
var express = require('express');
var app = express();
var util = require('util');
var redis = require('redis');
var URLPrefix=process.env.CJS_WEB_URL;
var files2Compile = ['/js/cjs-latest.js','/js/cjs-bootstrap.js']
var files2Localize=[{templateFileName:__dirname + "/js/cjs-bootstrap.ejs",outputFileName:__dirname + "/js/cjs-bootstrap.js"}];
/*
	reference:
	var files2Localize=[{templateFileName:"concussion.ejs",outputFileName:"concussion.js"},{templateFileName:"loadEditorContent.ejs",outputFileName:"loadEditorContent.js"}];
*/

var files2Concatenate={inputFileNames:['/js/jquery-latest.js','/js/knockout-latest.js','/js/cjs-latest-compiled.js','/js/cjs-bootstrap-compiled.js'],outputFileName:'concussion.js'}
localizeFiles(files2Localize);

var s = settings();

objects = [];
nta.debug=false;

redisClient = redis.createClient(
    config().port,
    config().host
);

redisClient.on('error', function (err) {
	console.log('RedisError ' + err);
}.bind(this));

function localizeFiles(fileArray)
{
	var contents="";
	var file=fileArray.shift();
	if(file)
	{
			localizeFile(file.templateFileName,file.outputFileName,localizeFiles,fileArray);
	}
	else
	{
			compileFiles(files2Compile);
	}
}

function compileFiles(fileArray)
{
	var contents="";
	var fileName="";

	fileName=fileArray.shift();
	
	if(fileName)
	{
		console.log(fileName);
		exec(" java -jar " + __dirname + "/compiler.jar --js " + __dirname + "/" + fileName + " --js_output_file " + __dirname + "/" + fileName.replace(".js","-compiled.js")
			, function (error, stdout, stderr) {
				compileFiles(fileArray);
			});
	}
	else{
		console.log("initiating creation of concussion.js");	
		concatenateFiles(files2Concatenate.inputFileNames, files2Concatenate.outputFileName);		
	}
}

function concatenateFiles(fileArray,output)
{
	var contents="";
	var fileName="";
	console.log("Concatenating files " + JSON.stringify(fileArray));
	for(;fileArray.length>=0;)
	{
		if((fileName=fileArray.shift()))
		{
			console.log("fileName:" + fileName);
			contents += fs.readFileSync(__dirname + fileName,'utf-8') + "\n";
		}
		else
		{
			if(nta.debug)
				console.log(contents);
			
			fs.writeFile(output,contents,function(err){
				if(err)
				{
					console.error(err);
				}
				else
				{
					console.log(output + " written successfully");
				}
			});
			break;
		}

	}		
}

function localizeFile(fileName,output,callback,arg)
{
	if(nta.debug)
		console.log(fileName, " ",output);
	contents = fs.readFileSync(fileName,'utf-8');
	contentsOutput = ejs.render(contents, {locals: {'CJS_WEB_URL': process.env.CJS_WEB_URL,'cjsutil':cjsutil}})
	
	if(nta.debug)
		console.log(contentsOutput);
	fs.writeFile(output,contentsOutput,function(err){
		if(err)
		{
			console.error(err);
		}
		else
		{
			console.log(output + " written successfully");
			if(callback)
				if(arg)
					callback(arg);
		}
	});
}

function escapeSpecialCharacters(text)
{
  //console.log(text);
		text = '' + text;
  text = text.replace('[', '\\[', 'g');
  text = text.replace('\\', '\\\\', 'g');
  text = text.replace('^', '\\^', 'g');
  text = text.replace('$', '\\$', 'g');
  text = text.replace('.', '\\.', 'g');
  text = text.replace('|', '\\|', 'g');
  text = text.replace('?', '\\?', 'g');
  text = text.replace('*', '\\*', 'g');
  text = text.replace('+', '\+', 'g');
  text = text.replace('(', '\\(', 'g');
  text = text.replace(')', '\\)', 'g');
  //console.log(text);
  return text;
}

addNewObjects = function(objects,callback)
{
	if (nta.debug)
		util.debug('addNewObjects: inside addNewObjects xx' + objects.length + " " + JSON.stringify(objects));
	for (var i = 0; i < objects.length; i++)
	{
		
		if(objects[i])
		{
		if (nta.debug)
			util.debug('addNewObjects: ' + objects[i].name);
		try {
		//var currentObj = objects[i];
		//var currentName = '' + currentObj.name;
		processObject(objects[i]);
		if (nta.debug)
			util.debug('addNewObjects: currentName' + objects[i].name + ' ' + objects[i].fields.length + " " + JSON.stringify(objects[i]));
		
		}catch (e) {console.error('addNewObjects:big error', e);}
	}
}
callback();
};

processObject = function(object)
{
	if ((""+object).search('_search') < 0)
		{
		nta.getEntriesWhere({'name': object.name},'cjs_objects', function(err,result)
		{
			//console.log("addNewObjects,","inside find ", "result: ", result.length, ", ", currentObj.name);
			if (nta.debug)
				util.debug('addNewObjects: inside getEntriesWhere');
			if (err)
			{
				console.error('Error when getting entries in addNewObjects, err:', err);
				return;
			}
			if (nta.debug)
				util.debug('addNewObjects: result ' + JSON.stringify(result) + " currentName: " + object.name);
			if (result.length>0)
			{
				object.fields = dedupe(result[0].fields.concat(object.fields));
				nta.updateEntry('' + result[0]._id, {$set: object},'cjs_objects', function(err) {
						if (err)
						{
							console.error('addNewObjects err: ', err);
						}
				});
				return;
			}
			else
			{
				if (nta.debug)
					util.debug('addNewObjects: object does not exist');
				nta.createEntry(object, 'cjs_objects', function(msg) {
						if (nta.debug)
							util.debug('add new ', msg);
						//callback();
				});
			}

		});
		if (nta.debug)
			util.debug('addNewObjects: i: ', i, ' objects.length: ', objects.length);
	}
}

function setSessionId(myObjects,sessionId,i,callback)
{
	if (nta.debug)
		util.debug("myObjects.length: " + myObjects.length)
	if (i < myObjects.length)
	{
		myObjects[i].tenant_id= sessionId;
		myObjects[i].name = sessionId + '_' + myObjects[i].name;
		setSessionId(myObjects, sessionId, i + 1, callback);
	}
	else
	{
		if (nta.debug)
			util.debug('getPage: ', i);
		callback(myObjects);
	}
}

function getCJSsettings(myObjects, callback)
{
	if(myObjects[myObjects.length-1] && myObjects[myObjects.length-1]["cjs-settings"])
	{
		callback(myObjects,myObjects.pop()["cjs-settings"]);
	}else
	{
		callback(myObjects,null);
	}

}

var readRoute = app.get("/read/:objectName", function(req,res){
	readAction(req.params.objectName,req,res);
});

var readAction = function(objectName,req,res)
{
	nta.getEntries(objectName, function(err,documents) {
		res.writeHeader(200);
		res.end('' + JSON.stringify(documents));
	});
}

var getPageRoute = app.get("/getpage/:id/:pageName", function(req,res){
	getPageAction(req.params.id,req.params.pageName,req,res);
});




var getPageAction = function(id,pageName,req,res)
{
	
	console.log(req.params.id);
	var searchKey = [];
	var object = {};
	res.writeHeader(200);
	
	if (nta.debug)
		util.debug('getPage: session id: ', id, ' ', pageName);

	nta.getEntriesWhere({'id': id, 'name': pageName},'pages', function(err,objects) {
		if(err)
		{
			console.err("err: " + err);
			return;
		}
		else if(objects && objects.length > 0)
		{
			res.end(objects[0].html);
		}
		else
			res.end("");
	});

	return;
}

var getScriptRoute = app.get("/getScript/:id/:pageName", function(req,res){
	getScriptAction(req.params.id,req.params.pageName,req,res);
});

var getScriptAction =  function(id,pageName,req,res)
{
	var object = {};
	res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/javascript'});
	
	if (nta.debug)
		util.debug('getScript x: session id: ' + id + ' pagename ' + pageName);

	nta.getEntriesWhere({'id': id, 'name': pageName},'pages', function(err,objects) {
		if (nta.debug)
			util.debug('getScript: ' + JSON.stringify(objects));
		if (objects && objects.length > 0 && objects[0].html)
		{
			parse.runGenerateStructureHTML(objects[0].html, function(myObjects) {
				var myName = myObjects[0].name;
				setSessionId(myObjects, 'id_' + id, 0, function(myObjects) {
					if ( nta.debug)
					{
						util.debug('getScript: setSession ' +  id + ' ' + JSON.stringify(myObjects));
						util.debug('getScript: ' + objects[0].html);
						util.debug('getScript: setSessionId');
					}
					addNewObjects(myObjects, function() {
						if ( nta.debug)
						{
							util.debug('getScript: addNewObjects');
							util.debug('getScript: ' + JSON.stringify(myObjects));
						}
						res.end(ejs.render(scriptonly, {locals: {'myObjects': dedupe(myObjects),'URLPrefix':URLPrefix}}));
					});
				});
			});
		}
	});
    
    return;
}

var postGetScriptRoute = app.all("/postGetScript/:isparsed",function(req,res){
	postGetScriptAction(req.params.isparsed,req,res);
});

var postGetScriptAction = function(isparsed,req,res)
{
	res.writeHeader(200);
	if (!nta.debug)
    	util.debug(req.rawBody);

	try{
	var args = qs.parse(req.url.split('?')[1]);
	if (nta.debug)
		util.debug(req.body + ' postGetScript x: session id: ' + args.id + ' HTML rawBody ' + args.html);
	if(req.rawBody)
	{
		var html = req.rawBody;
		var id = args.sid;
	}
	else
	{	
		var html = args.html;
		var id = args.id;
	}
	if(isparsed && isparsed.toLowerCase()=="true")
	{
		if (nta.debug)
			util.debug("isparsed html: " + html)
		
		var myObjects = JSON.parse(html);
		
		if (nta.debug)
			util.debug("myObjects length: " + myObjects.length)
		
		getCJSsettings(myObjects,function(myObjects, CJSsettings){
			if(!nta.debug)
				util.debug(JSON.stringify(CJSsettings));
			setSessionId(myObjects, 'id_' + id, 0, function(myObjects) {
				if ( nta.debug)
				{
					util.debug('getScript: setSession ' +  id + ' ' + JSON.stringify(myObjects) + " " + myObjects[0].name);
				}

				addNewObjects(myObjects, function() {
					if (nta.debug)
					{
						util.debug('getScript: addNewObjects');
						util.debug('getScript: ' + JSON.stringify(myObjects));
					}	
			
					res.end(ejs.render(scriptonly, {locals: {'dirname':__dirname, 'myObjects': dedupe(myObjects),'URLPrefix':URLPrefix, 'CJSsettings':CJSsettings}}));
				});
			});
		});	
	}
	else
	{
		parse.runGenerateStructureHTML(html, function(myObjects) {
			var myName = myObjects[0].name;
			if(nta.debug)
				util.debug("myName:" + myName + " length " + myObjects.length + " json " + JSON.stringify(myObjects));
			setSessionId(myObjects, 'id_' + id, 0, function(myObjects) {
				if ( nta.debug)
				{
					util.debug('getScript: setSession ' +  id + ' ' + JSON.stringify(myObjects));
				}
	
				addNewObjects(myObjects, function() {
					if ( nta.debug)
					{
						util.debug('getScript: addNewObjects');
						util.debug('getScript: ' + JSON.stringify(myObjects));
					}	
				
					res.end(ejs.render(scriptonly, {locals: {'myObjects': dedupe(myObjects),'URLPrefix':URLPrefix}}));
				});
			});
		});
	}
	}catch(error){console.log("custom error: " + error);res.end("error");}
}

var getEntriesByTenantObjectIdRoute = app.get("/getEntriesByTenantObjectId/:objectName",function(req,res){
	getEntriesByTenantObjectIdAction(req.params.objectName,req,res);
});


var getEntriesByTenantObjectIdAction = function(objectName,req,res)
{	       
	res.writeHeader(200);
	var where={};
	if(req.url.split('?').length > 1)
	{
		where = qs.parse(req.url.split('?')[1]);
    	util.debug("where: " + JSON.stringify(where));
	}
	else
		util.debug("req.url.split <= 1");
    nta.getEntriesByTenantObjectId(objectName, where, "instances", function(err,documents) {
		res.end(JSON.stringify(documents));
	});
	
	return;
}

var createInstanceRoute = app.all("/createInstance/:objectName",function(req,res){
	createInstanceAction(req.params.objectName, req, res);
});

var createInstanceAction = function(objectName,req,res)
{
	searchKey = [];
	object = {};

	if (!nta.debug)
		util.debug('create: rawBody:' + objectName + ' ' + req.rawBody);

	util.debug("JSON.parse(req.rawBody) " + JSON.parse(req.rawBody) + " " + req.rawBody);
	
	//res.writeHeader(200);
	if(!req.rawBody)
		res.end("error: no body posted");
	else{
		if(req.rawBody=='{}')
		{
			util.debug("inside empty json object received");
			nta.getEntriesWhere({'name': objectName},'cjs_objects', function(err,result) {
				if (err)
				{
					res.end(err);
					console.error('getEntriesWhere err: ', err);
					return;
				}
				setupObject(searchKey, 0, result, [0], req, object, function(newObject) {
					if(newObject)
					{
						//var newObject = JSON.parse(req.rawBody)[objectName];
						util.debug(JSON.stringify(newObject));
						newObject.tenant_object_id = objectName;
						nta.createEntry(newObject, "instances", function(msg) {
							res.end(msg);
						});
					}
					else
					{
						res.end("failure");
					}
				});		
			});
		}
		else
		{
			/*nta.getEntriesWhere({'name': objectName},'cjs_objects', function(err,result) {
			if (err)
			{
				res.end(err);
				console.error('getEntriesWhere err: ', err);
				return;
			}
			setupObject(searchKey, 0, result, [0], req, object, function(newObject) {
				if(newObject)
				{*/
					var newObject = JSON.parse(req.rawBody)[objectName];
					util.debug(JSON.stringify(newObject));
					newObject.tenant_object_id = objectName;
					nta.createEntry(newObject, "instances", function(msg) {
						res.end(msg);
					});
				/*}
				else
				{
					res.end("failure");
				}
			});		
		});*/
		}
	}
}

var createKeyRoute = app.all("/create/:objectName/:key",function(req,res){
	if (nta.debug)
		util.debug('***inside create***');
	createKeyAction(req.params.objectName, req.params.key, req, res);
});

var createKeyAction = function(objectName,key,req,res)
{
	searchKey = [];
	object = {};

	if (nta.debug)
		util.debug('create: rawBody:' + objectName + ' ' + req.rawBody);
	
	res.writeHeader(200);
	if(!req.rawBody)
		res.end("error: no body posted");
	else{
		nta.getEntriesWhere({'name': objectName},'cjs_objects', function(err,result) {
			if (err)
			{
				res.end(err);
				console.error('getEntriesWhere err: ', err);
				return;
			}
			if (nta.debug)
				util.debug("get this right");
			setupObject(searchKey, 0, result, [0], req, object, function(newObject) {
				if (nta.debug)
					util.debug("create: setupObjectOutput:" + JSON.stringify(newObject));
				newObject.key=key;
				nta.createEntry(newObject, objectName, function(msg) {
					if (nta.debug)
						util.debug("create: " + msg)
					res.end(msg);
				});
			});		
		});
	}
}

var getEntryWhereRoute = app.get("/getEntryWhere/:objectName",function(req,res){
	getEntryWhereAction(req.params.objectName,req,res);
});

var getEntryWhereAction = function(objectName,req,res)
{
	var where = qs.parse(req.url.split('?')[1]);
	if (nta.debug)
		util.debug(JSON.stringify(where));
	res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
	nta.getEntryWhere(where, objectName, function(err,documents) {
		if (nta.debug)
			util.debug(err + " " + JSON.stringify(documents));
		res.end(JSON.stringify(documents[0]));
    });
	
	return;
}

var getEntriesByNameRoute = app.get("/getEntriesByName/:objectName/:where",function(req,res){
	getEntriesByNameAction(req.params.objectName,req.params.where,req,res);
});

var getEntriesByNameAction = function(objectName,where,req,res)
{
	if (nta.debug)
		util.debug(JSON.stringify(where));
	res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
	nta.getEntriesByName(where, objectName, function(err,documents) {
		res.end(JSON.stringify(documents));
    });
	
	return;
}

var deleteRoute = app.get("/delete/:objectName/:id", function(req,res){
	deleteAction(req.params.objectName,req.params.id,req,res);
});

var deleteAction = function(objectName,id,req,res)
{
	res.writeHeader(200);
	nta.deleteEntry(id, objectName, function(err,documents) {
        if (err)
        {
        	res.end('failure');
        }
        else
        {
	    	res.end('success');
	   	}
    });

	return;
}

var updateRoute = app.post("/update/:objectName/:tenantObjectId/:id", function(req,res){
	if(nta.debug)
		util.debug("updateRoute " + req.rawBody);
	updateAction(req.params.objectName,req.params.tenantObjectId,req.params.id,req,res);
});

var updateAction = function(objectName,tenantObjectId,id,req,res)
{
	res.writeHeader(200);
	updatedRow = JSON.parse(('' + req.rawBody).replace('_id', '_id_mock'));
    updatedRow.tenant_object_id = tenantObjectId;

	nta.updateEntry(id, updatedRow, objectName, function(err,documents) {
		if (err)
		{
			res.end('failure');
		}
		else
		{
			res.end('success');
		}
	});

	return;
}

var updateWhereRoute = app.post('/updateWhere/:objectName',function(req,res){
	updateWhereAction(req.params.objectName,req,res);
});

var updateWhereAction = function(objectName,req,res)
{
	if (nta.debug)
			util.debug('updatePage:x ', req.rawBody, ' url', req.url);
	res.writeHeader(200);
	
	updatedRow = JSON.parse(('' + req.rawBody).replace('_id', '_id_mock'));
	var where = qs.parse(req.url.split('?')[1]);
	if (nta.debug)
			util.debug(JSON.stringify(where));
	

	try {
		nta.updateEntryWhere(where, updatedRow, objectName, function(err,documents) {
			if (err)
			{
				res.end('failure');
			}
			else
			{
				res.end('success');
			}
		});
	}catch (e) {console.error('err:', e);}

}

var addDomainRoute = app.get("/domains/add/:type/:name", function(req,res){
	addDomainAction(req.params.type,req.params.name,req,res);
});

var addDomainAction = function(type,name,req,res)
{
	//res.writeHeader(200);
	redisClient.sadd( "registered", [name], function(err,obj) {
    	if(err)
    		res.end('error: '  + err)
    	else
    	{
    		res.end('success');
        }
    });

	return;
}

var removeDomainRoute = app.get("/domains/remove/:type/:name", function(req,res){
	removeDomainAction(req.params.type,req.params.name,req,res);
});

var removeDomainAction = function(type,name,req,res)
{
	//res.writeHeader(200);
	redisClient.srem( "registered", [name], function(err,obj) {
    	if(err)
    		res.end('error: '  + err)
    	else
    	{
    		res.end('success');
        }
    });

	return;
}

var setupObject = function(searchKey,fieldIndex,objects,counter,req,newObject,callback)
{
try{
	var j = fieldIndex;
	if (nta.debug)
		util.debug('setupObject: rawBody4U: ' + req.rawBody + " " + objects[counter].name);
		
	if (fieldIndex == objects[counter].fields.length)
	{
		try {
			if (nta.debug)
				console.log("create:field index is " + fieldIndex + " " + objects[counter].fields.length);
			//newObject._search_keys=searchKey;
			callback(newObject);
		}catch (e) {console.log('create: ', e);}
		return;
	}
	else if (fieldIndex < objects[counter].fields.length)
	{
		if (req.rawBody != '' && req.rawBody != "{}")
			var text = 'newObject.' + objects[counter].fields[j].name + ' = JSON.parse(req.rawBody).' + objects[counter].name + '.' + objects[counter].fields[j].name;
		else
			var text = 'newObject.' + objects[counter].fields[j].name + " = ''";
		if (nta.debug)
			util.debug('create: rawBody:xx ' + req.rawBody);
		if (nta.debug)
			util.debug('create: text: tt ' +   text);

		eval(text);
		//console.log("create: eval",eval("newObject." + objects[counter].fields[j].name));

		if (nta.debug)
			util.debug('create: newObject: '+ JSON.stringify(newObject));
		searchKey.push(eval('newObject.' + objects[counter].fields[j].varname));
		newObject._search_keys = searchKey;
		setupObject(searchKey, fieldIndex + 1, objects, counter, req, newObject, callback);
	}
}catch(e){return callback(null);}
};

var extractObj=function(name)
{
	var arr = name.split("_");
	if(arr[0]=="id" && arr.length>2)
		return {id:arr[1],obj_name: arr[2]};
	else
		return null;
}

var dedupe = function(arr)
    {
	var arrTrackDupes = [];
	var retArr = [];
	for (i = 0; i < arr.length; i++)
	{
		//console.log("testParse: ",arr[i].name, " ",retArr.length, " ",arrTrackDupes.indexOf(arr[i].name));
		if (arrTrackDupes.indexOf(arr[i].name) == -1)
		{
			arrTrackDupes[arrTrackDupes.length] = arr[i].name;
			retArr[retArr.length] = arr[i];
		}
	}

	return retArr;
};

crossDomainRules = function () {
   return function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
      next();
   };
};

var server = connect.createServer(
	connect.logger({ format: ':method :url' }),
	connect.cookieParser(),
	//connect.session({ secret: 'test'}),
	connect.bodyParser(),
	crossDomainRules(),
	addDomainRoute,
	readRoute,
	getPageRoute,
	getScriptRoute,
	postGetScriptRoute,
	getEntriesByTenantObjectIdRoute,
	createInstanceRoute,
	createKeyRoute,
	getEntriesByNameRoute,
	getEntryWhereRoute,
	deleteRoute,
	updateRoute,
	updateWhereRoute,
	//generateRoutes,
	nta.serveStaticFilesNoWriteHead,
	connect.static(__dirname)
);

nta.listen(server, s.id);



