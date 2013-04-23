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
	if (!nta.debug)
		util.debug('addNewObjects: inside addNewObjects xx' + objects.length + " " + JSON.stringify(objects));
	for (var i = 0; i < objects.length; i++)
	{
		
		if(objects[i])
		{
		if (!nta.debug)
			util.debug('addNewObjects: ' + objects[i].name);
		try {
		//var currentObj = objects[i];
		//var currentName = '' + currentObj.name;
		processObject(objects[i]);
		if (!nta.debug)
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
				if (!nta.debug)
					util.debug('addNewObjects: object does not exist');
				nta.createEntry(object, 'cjs_objects', function(msg) {
						if (!nta.debug)
							util.debug('add new ', msg);
						//callback();
				});
			}

		});
		if (nta.debug)
			util.debug('addNewObjects: i: ', i, ' objects.length: ', objects.length);
	}
}


var generateRoutes = function(req,res,next) {
	skipNext = false;
	console.log('debug:', req.url," host:", req.headers.host, " origin: ", req.headers.origin , " referer: ", req.headers.referer);
	if (nta.debug)
		util.debug('req.url: generateroutes: req.headers.host:', req.headers.host, ' req.headers.host', 'req.url ',req.url,' req.rawBody: ', req.rawBody);

	nta.getEntries('cjs_objects', function(err,result) {
		if (err)
		{
			res.end(err);
			console.error('getEntries err: ', err);
			return;
		}
		///console.log("objects: ", JSON.stringify(result));
		loopThroughObjects(result, req, res, next);
	});
};

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
    util.debug(req.rawBody);

	try{
	var args = qs.parse(req.url.split('?')[1]);
	// if (nta.debug)
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
		util.debug("isparsed html: " + html)
		var myObjects = JSON.parse(html);
		util.debug("myObjects length: " + myObjects.length)
		setSessionId(myObjects, 'id_' + id, 0, function(myObjects) {
				if ( !nta.debug)
				{
					util.debug('getScript: setSession ' +  id + ' ' + JSON.stringify(myObjects) + " " + myObjects[0].name);
				}
	
				addNewObjects(myObjects, function() {
					if (!nta.debug)
					{
						util.debug('getScript: addNewObjects');
						util.debug('getScript: ' + JSON.stringify(myObjects));
					}	
				
					res.end(ejs.render(scriptonly, {locals: {'myObjects': dedupe(myObjects),'URLPrefix':URLPrefix}}));
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
    nta.getEntriesByTenantObjectId(objectName, "instances", function(err,documents) {
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

	//if (nta.debug)
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
			setupObject(searchKey, 0, result, [0], req, object, function(newObject) {
				if(newObject)
				{
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
}

var createKeyRoute = app.all("/create/:objectName/:key",function(req,res){
	util.debug('***inside create***');
	createKeyAction(req.params.objectName, req.params.key, req, res);
});

var createKeyAction = function(objectName,key,req,res)
{
	searchKey = [];
	object = {};

	if (!nta.debug)
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
			util.debug("get this right");
			setupObject(searchKey, 0, result, [0], req, object, function(newObject) {
				util.debug("create: setupObjectOutput:" + JSON.stringify(newObject));
				newObject.key=key;
				nta.createEntry(newObject, objectName, function(msg) {
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
	if (!nta.debug)
		util.debug(JSON.stringify(where));
	res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
	nta.getEntryWhere(where, objectName, function(err,documents) {
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
	if (!nta.debug)
			util.debug('updatePage:x ', req.rawBody, ' url', req.url);
	res.writeHeader(200);
	
	updatedRow = JSON.parse(('' + req.rawBody).replace('_id', '_id_mock'));
	var where = qs.parse(req.url.split('?')[1]);
	if (!nta.debug)
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


loopThroughObjects = function(objects,req,res,next)
    {
	if (req.url.search('/cjs_objects_models') > -1)
	{

		if (req.url.split('/').length < 2)
		{
			return;
		}

    var newObject = {};
    var searchTerm = '';
    if (req.url.search('.com') > -1)
    {
	    	searchTerm = req.url.split('.com')[1].split('/')[2].split('?')[0];
		}
	    else
	    {
	    	searchTerm = req.url.split('/')[2].split('?')[0];
	    	if (nta.debug)
				util.debug('searchTerm: 3', searchTerm);
	    }

	    if (nta.debug)
			util.debug('searchTerm: ', searchTerm, req.url);
		nta.getEntriesWhere({'name': searchTerm},'cjs_objects', function(err,result) {
				if (err)
				{
					res.end(err);
					console.error('getEntriesWhere err: ', err);
					return;
				}
				res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'application/json'});
				res.end(JSON.stringify(result));
		});
		return;
	}
	//console.log("updatePage: url",req.url);

	for (counter = 0; counter < objects.length; counter++)
	{
		//console.log("inside loop: ", counter , " /", objects[counter].name, " ", req.url.split("?")[0].split(".com")[1] );
		if (req.url.split('?')[0].split('.com')[1] == '/' + objects[counter].name
			||
			req.url.split('?')[0] == '/' + objects[counter].name)
		{
			nta.getEntries(objects[counter].name, function(err,documents) {
				res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'application/json'});
				res.end('' + JSON.stringify(documents));
			});
			skipNext = true;
			return;
		}
		else if (req.url.search('/getUUID') > -1)
		{
			res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
			nta.createEntry({expiration_date: new Date(), test: 444},'sessions', function(msg,obj) {
				if (nta.debug)
					util.debug(JSON.stringify(obj));
				res.end('' + obj[0]._id);
			});
			return;
		}
		else if (req.url.search('/getMergedJSandHTML') > -1)
		{
			var searchKey = [];
			var object = {};
			//console.log(req.rawBody);
			var sessionId = req.url.split('/')[req.url.split('/').length - 1];

				if (nta.debug)
					util.debug('session id: ', sessionId);
				parse.runGenerateStructureHTML(req.rawBody, function(myObjects) {
					//objects = objects.concat(myObjects);
					var myName = myObjects[0].name;
					//myObjects[0].name=sessionId+"_"+myObjects[0].name;
					setSessionId(myObjects, sessionId, 0, function(myObjects) {
						if (nta.debug)
							util.debug(sessionId, ' ', JSON.stringify(myObjects));
						addNewObjects(myObjects, function() {
							if (nta.debug)
								util.debug(JSON.stringify(myObjects));
							//ejs.render(html,{locals:{myObjects:myObjects}})
							var mergedJSandHTML = ('' + req.rawBody).split(myName).join(myObjects[0].name);
							res.write(mergedJSandHTML);
							//res.write(koScript);
							//console.log(myObjects[0].name," ",(""+req.rawBody).replace(myObjects[0].name,sessionId+"_"+myObjects[0].name));
							res.end();
							fs.writeFileSync(sessionId + '.html', mergedJSandHTML, 'utf-8');
						});
					});
				});
      return;
		}
		else if (req.url.search('/getPage') > -1)
		{
			var searchKey = [];
			var object = {};
			res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
			if (nta.debug)
				util.debug('querystring: ', req.url.split('?').length);
			var args = qs.parse(req.url.split('?')[1]);
			var id = args.id;
			var pagename = args.pagename;
			if (nta.debug)
				util.debug('getPage: session id: ', id, ' ', pagename);

			nta.getEntriesWhere({'id': id, 'name': pagename},'pages', function(err,objects) {
				if (nta.debug)
					util.debug('why double:, number of matching pages ', objects.length);
				if (nta.debug)
					console.log("objects.length :" + objects.length);
				if (nta.debug)
					util.debug("objects :" + objects[0].html);
				
				res.end(objects[0].html);
			});

      return;
		}
		else if (req.url.search('/getScript') > -1)
		{
			var searchKey = [];
			var object = {};
			res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/javascript'});
			console.log("inside call to getScript: ",req.rawBody);
			var args = qs.parse(req.url.split('?')[1]);
			console.log("inside call to getScript: ",args);
			var id = args.id;
			var pagename = args.pagename;
			if (nta.debug)
				util.debug('getScript x: session id: ' + id + ' pagename ' + pagename);

			nta.getEntriesWhere({'id': id, 'name': pagename},'pages', function(err,objects) {
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
		else if (req.url.search('/postGetScript') > -1)
		{
			var searchKey = [];
			var object = {};
			res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/javascript'});
			console.log("inside call to postGetScript: rawBody: ", req.rawBody);
			var args = qs.parse(req.url.split('?')[1]);
			//parsedArgs = JSON.parse(args);
			console.log("inside call to postGetScript: args: ",args);

			var id = args.id;
			//var pagename = args.pagename;
			if (nta.debug)
				util.debug('getScript x: session id: ' + id + ' pagename ' + pagename);

					parse.runGenerateStructureHTML(args.html, function(myObjects) {
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
				//}
			//});


      return;
		}
		else if (req.url.search('/' + objects[counter].name + '/create') > -1)
    {
				var searchKey = [];
				var object = {};
				if(req.url.split("/create/").length>1)

				if (nta.debug)
					util.debug('create: rawBody: ', req.rawBody);
				res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'application/json'});
				setupObject(searchKey, 0, objects, counter, req, object, function(newObject) {
					nta.createEntry(newObject, objects[counter].name, function(msg) {
						res.end(msg);
					});
            	});
      return;
    }
    else if (req.url.search('/' + objects[counter].name + '/instanceCreate') > -1)
    {
				var searchKey = [];
				var object = {};
				
				if (nta.debug)
					util.debug('create: rawBody: ', req.rawBody);
				res.writeHeader(200, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'application/json'});
				setupObject(searchKey, 0, objects, counter, req, object, function(newObject) {
					newObject.tenant_object_id = objects[counter].name;
					nta.createEntry(newObject, "instances", function(msg) {
						res.end(msg);
					});
            	});
      return;
    }
	else if (req.url.search('/' + objects[counter].name + '/search') > -1)
    {
			if (req.url.split('/').length < 3)
			{
				return;
			}
			res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
	        var searchTerm = req.url.split('/')[3];
      nta.searchEntries(searchTerm, objects[counter].name, function(err,documents) {
				res.end(JSON.stringify(documents));
      });
			return;
    }
    else if (req.url.search('/' + objects[counter].name + '/getEntryWhere/') > -1)
    {
		var where = qs.parse(req.url.split('?')[1]);
		if (nta.debug)
			util.debug(JSON.stringify(where));
		res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
		nta.getEntryWhere(where, objects[counter].name, function(err,documents) {
			//console.log(documents.length);
			res.end(JSON.stringify(documents[0]));
      	});
			return;
    }
    else if (req.url.search('/' + objects[counter].name + '/getEntriesByName/') > -1)
    {
		var args = qs.parse(req.url.split('?')[1]);
		var where = args.where;
		res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
		nta.getEntriesByName(where, objects[counter].name, function(err,documents) {
        	//console.log(documents.length);
			res.end(JSON.stringify(documents));
		});
		
		return;
    }
	else if (req.url.search('/' + objects[counter].name + '/getEntriesByTenantObjectId/') > -1)
    {
		var args = qs.parse(req.url.split('?')[1]);
		var where = args.where;
	       
		res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
    	nta.getEntriesByTenantObjectId(where, "instances", function(err,documents) {
            	//console.log(documents.length);
				res.end(JSON.stringify(documents));
		});
		return;
    }
	else if (req.url.search('/' + objects[counter].name + '/delete') > -1)
    {
		res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'application/json'});
		if (req.url.split('/').length < 3)
		{
			//console.log("no search term provided");
			return;
		}
		if (req.url.search('.com') > -1)
		{
			var objectId = req.url.split('.com')[1].split('/')[3].split('?')[0];
		}
		else
		{
        	var objectId = req.url.split('/')[3].split('?')[0];
		}
        
        nta.deleteEntry(objectId, objects[counter].name, function(err,documents) {
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

	else if (req.url.search('/' + objects[counter].name + '/update/') > -1)
    {
    	if (nta.debug)
			util.debug('updatePage: ', req.rawBody);
		res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
      	if (req.url.split('/').length < 3)
      	{
      		//console.log("no search term provided");
        	return;
      	}

      	updatedRow = JSON.parse(('' + req.rawBody).replace('_id', '_id_mock'));
      	var oId;

      	if (req.url.search('.com') > -1)
        {
        	var oId = req.url.split('.com')[1].split('/')[3].split('?')[0];
		}
        else
        {
        	var oId = req.url.split('/')[3].split('?')[0];
        }

		if (nta.debug)
			util.debug('oId: ', oId);
		
		searchKey = [];
		for (j = 0; j < objects[counter].fields.length; j++)
		{
			searchKey.push(eval('updatedRow.' + objects[counter].fields[j].name));
		}

      	updatedRow._search_keys = searchKey;

		try {
        	nta.updateEntry(oId, updatedRow, objects[counter].name, function(err,documents) {
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

		return;
    }
	else if (req.url.search('/' + objects[counter].name + '/instanceUpdate/') > -1)
    {
        if (nta.debug)
			util.debug('updatePage: ', req.rawBody);
        res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Headers': 'application/json'});
      	if (req.url.split('/').length < 3)
      	{
        	//console.log("no search term provided");
        	return;
      	}

      	updatedRow = JSON.parse(('' + req.rawBody).replace('_id', '_id_mock'));
      	updatedRow.tenant_object_id = objects[counter].name;
      	
      	var oId;

      	if (req.url.search('.com') > -1)
        {
        	var oId = req.url.split('.com')[1].split('/')[3].split('?')[0];
        }
        else
        {
        	var oId = req.url.split('/')[3].split('?')[0];
        }


      	if (nta.debug)
			util.debug('oId: ', oId);
      	searchKey = [];
    	for (j = 0; j < objects[counter].fields.length; j++)
	  	{
			searchKey.push(eval('updatedRow.' + objects[counter].fields[j].name));
		}

      	updatedRow._search_keys = searchKey;

      	try {
        	nta.updateEntry(oId, updatedRow, "instances", function(err,documents) {
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
		
		return;
    }
    else if (req.url.search('/' + objects[counter].name + '/updateWhere/?') > -1)
    {
		if (nta.debug)
			util.debug('updatePage:x ', req.rawBody, ' url', req.url);
		res.writeHeader(200);//, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'application/json'});
		if (req.url.split('/').length < 3)
		{
			//console.log("no search term provided");
			return;
		}

		updatedRow = JSON.parse(('' + req.rawBody).replace('_id', '_id_mock'));

		var where = qs.parse(req.url.split('?')[1]);

		if (nta.debug)
			util.debug('updatePage: where: ', JSON.stringify(where));
		
		searchKey = [];
		for (j = 0; j < objects[counter].fields.length; j++)
		{
			searchKey.push(eval('updatedRow.' + objects[counter].fields[j].name));
		}

		updatedRow._search_keys = searchKey;

      	try {
        	nta.updateEntryWhere(where, updatedRow, objects[counter].name, function(err,documents) {
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
		return;
    }
	}
		next();
};

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
		if (!nta.debug)
			util.debug('create: rawBody:xx ' + req.rawBody);
		if (!nta.debug)
			util.debug('create: text: tt ' +   text);

		eval(text);
		//console.log("create: eval",eval("newObject." + objects[counter].fields[j].name));

		if (!nta.debug)
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



