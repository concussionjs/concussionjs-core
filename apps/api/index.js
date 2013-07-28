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
var https = require('https');
var exec  = require('child_process').exec;
var parse = require('./inferObjects.js');
var express = require('express');
var app = express();
var util = require('util');
var redis = require('redis');
var AWS = require('aws-sdk');
var s3 = new AWS.S3({params: {Bucket: 'cjs-uploads'}});
var route53 = new AWS.Route53({apiVersion: '2012-12-12'});
var passport = require('passport');
var mime = require('mime');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var FacebookStrategy = require('passport-facebook').Strategy;
var s3bucketSuffix = ".s3-website-us-east-1.amazonaws.com";
var hostedZoneId = "Z36J7ZXTJWEGZI"
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://"+process.env.CJS_WEB_URL+"/auth/facebook/callback"
  },
  function(token, tokenSecret, profile, done) {
	console.log("login successful");
	var user = profile;
	var credentials = {};
	user.token = token;
	user.tokenSecret = tokenSecret;
	done(null,user);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});
 
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var URLPrefix=process.env.CJS_WEB_URL;
var files2Compile = ['/js/cjs-latest.js','/js/cjs-bootstrap.js', '/js/cjs-bootstrap-customLink.ejs']
var files2Localize=[{templateFileName:__dirname + "/js/cjs-bootstrap.ejs",outputFileName:__dirname + "/js/cjs-bootstrap.js"},{templateFileName:__dirname + "/security/facebook/logout.ejs",outputFileName:__dirname + "/security/facebook/logout.htm"}];
/*
	reference:
	var files2Localize=[{templateFileName:"concussion.ejs",outputFileName:"concussion.js"},{templateFileName:"loadEditorContent.ejs",outputFileName:"loadEditorContent.js"}];
*/

var files2Concatenate={inputFileNames:['/js/jquery-latest.js','/js/knockout-latest.js','/js/cjs-latest-compiled.js','/js/cjs-bootstrap-compiled.js'],outputFileName:'concussion.js'}
var customLinkFiles2Concatenate={inputFileNames:['/js/jquery-latest.js','/js/knockout-latest.js','/js/cjs-latest-compiled.js','/js/cjs-bootstrap-customLink-compiled.ejs'],outputFileName:'customLink.ejs'}

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
		exec(" java -jar " + __dirname + "/compiler.jar --js " + __dirname + "/" + fileName + " --js_output_file " + __dirname + "/" + fileName.replace(".","-compiled.")
			, function (error, stdout, stderr) {
				compileFiles(fileArray);
			});
	}
	else{
		console.log("initiating creation of concussion.js");	
		concatenateFiles(files2Concatenate.inputFileNames, files2Concatenate.outputFileName);
		concatenateFiles(customLinkFiles2Concatenate.inputFileNames, customLinkFiles2Concatenate.outputFileName);		
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
			contents += fs.readFileSync(__dirname + fileName,'utf8') + "\n";
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

var customLinkRoute = app.get("/customLink/:customLinkName", function(req,res){
	customLinkAction(req.params.objectName,req.params.customLinkName,req,res);
});

var customLinkAction = function(objectName,customLinkName,req,res)
{
	
	var validateArg = customLinkName.split(".js");
	console.log(req.headers.referer);
	if(validateArg.length<2)
	{
		res.end(customLinkName + " invalid filename");
	}
	else
	{
		if(validateArg[0])
		{	
			nta.getEntriesWhere({'key': validateArg[0]},'cjs_users', function(err,objects) {
				if (nta.debug)
					util.debug('getScript: ' + JSON.stringify(objects));
				if (objects && objects.length > 0)
				{
					fs.readFile(__dirname + '/customLink.ejs','utf-8', function(err,data){
						if(err) throw err;
						res.setHeader("Content-Type", 'text/plain');
						res.end(ejs.render(data, {locals: {'CJS_WEB_URL':URLPrefix, 'tenantId':validateArg[0]}}));
					});
				}
				else
				{
					res.end(customLinkName + " invalid filename");
				}
			});
		}
		else
		{
			res.end(customLinkName + " invalid filename");
		}
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

var searchRoute = app.get("/search/:objectName/:searchTerm", function(req,res){
	searchAction(req.params.objectName,req.params.searchTerm,req,res);
});

var searchAction = function(objectName,searchTerm,req,res)
{
	nta.searchInstances(searchTerm,objectName, function(err,documents) {
		//res.writeHeader(200);
		res.end('' + JSON.stringify(documents));
	});
}

var searchUserIdRoute = app.get("/search/:objectName/:id/:searchTerm", function(req,res){
	searchUserIdAction(req.params.objectName,req.params.id,req.params.searchTerm,req,res);
});

var searchUserIdAction = function(objectName, userId, searchTerm,req,res)
{
	nta.searchInstancesById(searchTerm,objectName, userId, function(err,documents) {
		//res.writeHeader(200);
		res.end('' + JSON.stringify(documents));
	});
}

var getCountByMonthRoute = app.get("/getCountByMonth/:collectionName", function(req,res){
	getCountByMonthAction(req.params.collectionName,req,res);
});

var getCountByMonthAction = function(collectionName,req,res)
{

	var args = qs.parse(req.url.split('?')[1]);
	var total = args.total;
	var type = args.type;
	nta.getCountByMonth(collectionName, function(err,documents) {
		//res.writeHeader(200);
		var results = {
			graph:{	
				"title": collectionName + " count by month",
				"total": total,
				"datasequences": [{
					"title" : "X-" + collectionName,
					"refreshEveryNSeconds" : 120,
					"datapoints" : JSON.parse(JSON.stringify(documents).replace(/_id/ig,"title"))
				}]
			}
		}

		if(args && args.type && args.type!="")
		{
			results.graph.type=type;
		}
		if(args && args.total && args.total!="")
		{
			results.graph.total=true;
		}

		res.end('' + JSON.stringify(results));
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
	//res.writeHeader(200);
	if (!nta.debug)
    	util.debug("postGetScript: " + req.rawBody);

	//try{
	var args = qs.parse(req.url.split('?')[1]);
	if (!nta.debug)
		util.debug(req.rawBody + ' postGetScript x: session id: ' + args.sid + ' HTML rawBody ' + args.html + ' tenant id: ' + args.tenantId);
	

	if(req.rawBody)
	{
		var html = req.rawBody;
		var id = args.sid;
		var tenantId = args.tenantId;
	}
	else
	{	
		var html = args.html;
		var id = args.id;
		var tenantId = args.tenantId;
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
				util.debug("settings: " + JSON.stringify(CJSsettings));
			setSessionId(myObjects, 'id_' + ((tenantId)?tenantId:id), 0, function(myObjects) {
				if (!nta.debug)
				{
					util.debug('getScript: setSession ' +  ((tenantId)?tenantId:id) + ' ' + JSON.stringify(myObjects) + " " + myObjects[0].name);
				}

				addNewObjects(myObjects, function() {
					if (!nta.debug)
					{
						util.debug('getScript: addNewObjects');
						util.debug('getScript: ' + JSON.stringify(myObjects));
					}	
					
					var text2write = ejs.render(scriptonly, {locals: {'tenantId':tenantId,'dirname':__dirname, 'myObjects': dedupe(myObjects),'URLPrefix':URLPrefix, 'CJSsettings':CJSsettings}});
					if (nta.debug)
						console.log(text2write);
					res.end(text2write);
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
	//}catch(error){console.log("custom error: " + error);res.end("error");}
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
						nta.createEntry(newObject, "instances", function(status,msg) {
							res.end(JSON.stringify(msg));
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
					nta.createEntry(newObject, "instances", function(status, msg) {
						res.end(JSON.stringify(msg));
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


var uploadFileTenantOnlyRoute = app.post("/upload/:tenantId", function(req,res){
	try{
		uploadFileAction(req.params.tenantId,null,req,res);
	}catch(e){console.log(e);}
});

var uploadFileRoute = app.post("/upload/:tenantId/:userId", function(req,res){
	try{
		uploadFileAction(req.params.tenantId,req.params.userId,req,res);
	}catch(e){console.log(e);}
});

var uploadFileAction = function(tenantId, userId,req,res)
{
	try{
	console.log("req.files: " + process.env.CJS_WEB_URL.replace("api",tenantId) + " " + tenantId + " " + JSON.stringify(req.files));

	var tmp_path = req.files["file-0"].path;
    // set where the file should actually exists - in this case it is in the "images" directory
    console.log(tmp_path);
    var target_path = '/tmp/' + req.files["file-0"].name;
    if(userId!=null)
    {
    	s3 = new AWS.S3({params: {Bucket: process.env.CJS_WEB_URL.replace("api",tenantId).replace("local-","")}});
    	var key = "cjs-uploads/" + userId + "/" + req.files["file-0"].name;
    }
    else
    {
    	s3 = new AWS.S3({params: {Bucket: process.env.CJS_WEB_URL.replace("api",tenantId).replace("local-","")}});
    	var key = req.files["file-0"].name;

    }
    console.log(target_path + " " + process.env.CJS_WEB_URL.replace("api",tenantId).replace("local-",""));
 
	AWS.config.update({
    	region: 'us-east-1'
	});
	
	//AWS.S3({params: {Bucket: 'cjs-uploads'}});
	fs.readFile(tmp_path,function(err, data){
		if (err)
      		console.log(err)
    	else
      	{
      		console.log(mime.lookup(req.files["file-0"].name));
			s3.putObject({ ACL: 'public-read', ContentType: mime.lookup(req.files["file-0"].name),Body:data,Key: key}, function(err,data) {
    			if (err)
      				console.log(err)
    			else
    			{
      				console.log("Successfully uploaded data to myBucket/myKey");
      				res.end(req.files["file-0"].name + " " + JSON.stringify(data) + " written to s3")
      			}
  			});
  		}	
	});
	   
    /*fs.rename(tmp_path, target_path, function(err) {
        if (err) throw err;
        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
        fs.unlink(tmp_path, function() {
            if (err) throw err;
            res.send('File uploaded to: ' + target_path + ' - ' + req.files.thumbnail.size + ' bytes');
        });
    });*/
	}catch(e){console.log(e);}
} 

var createBucketRoute = app.get("/createbucket/:bucketName", function(req,res){
	try{
		createBucketAction(req.params.bucketName,req,res);
	}catch(e){console.log(e);}
});

var createBucketAction = function(bucketName,req,res)
{
	try{
	 
		AWS.config.update({
    		region: 'us-east-1'
		});
	
		s3.createBucket(
			{ ACL: 'public-read',
			Bucket: bucketName, 
			} , function(err,data) {
    		if (err)
      			console.log(err)
    		else
    		{
      			res.end("successfully create bucket " + bucketName);
      		}
  		});
	}catch(e){console.log(e);}
} 

var getDNSNamesRoute = app.get("/getDNSNames/:recordName", function(req,res){
try{
		getDNSNamesAction(hostedZoneId,req.params.recordName,req,res);
	}catch(e){console.log(e);}
});

var getDNSNamesAction = function(hostedZoneId,recordName,req,res)
{
	try{
		route53.config.update({
    		region: 'us-east-1'
		});
	
		route53.listResourceRecordSets(
			{HostedZoneId: hostedZoneId, StartRecordName:recordName, StartRecordType: "CNAME", MaxItems: "1"
			} , function(err,data) {
    		if (err){
      			console.log(err);
      			res.end(JSON.stringify(err));
      		}
    		else
    		{
      			res.end(JSON.stringify(data));
      		}
  		});
	}catch(e){console.log(e);}
}

var enableWebConfigRoute = app.get("/enablewebconfig/:bucketName", function(req,res){
	try{
		enableWebConfigAction(req.params.bucketName,req,res);
	}catch(e){console.log(e);}
});



var enableWebConfigAction = function(bucketName,req,res)
{
	try{
	 
		AWS.config.update({
    		region: 'us-east-1'
		});
	
		s3.putBucketWebsite(
			{Bucket: bucketName,
			 WebsiteConfiguration:{
			 	IndexDocument:{Suffix:'index.htm'}
			 }
			} , function(err,data) {
    		if (err)
      			console.log(err)
    		else
    		{
      			res.end("successfully enabled web config " + bucketName);
      		}
  		});
	}catch(e){console.log(e);}
}

var addDNSRoute = app.get("/adddns/:dnsName", function(req,res){
	try{
		addDNSAction(req.params.dnsName,req,res);
	}catch(e){console.log(e);}
});

var addDNSAction = function(dnsName,req,res)
{
	try{
	 
		route53.config.update({
    		region: 'us-east-1'
		});
	
		route53.changeResourceRecordSets(
			{HostedZoneId: hostedZoneId,
			 ChangeBatch:{
			 	Changes:[
			 		{
			 			Action: "CREATE",
			 			ResourceRecordSet:{
			 				Name:dnsName,
			 				Type: "CNAME",
			 				TTL: 60,
			 				ResourceRecords:[{
			 					Value: dnsName + s3bucketSuffix
			 				}]
			 			}
			 		}
			 	]
			 }
			} , function(err,data) {
    		if (err){
      			console.log(err);
      			res.end(JSON.stringify(err));
      		}
    		else
    		{
      			res.end("successfully add DNS entry for " + dnsName);
      		}
  		});
	}catch(e){console.log(e);}
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

var googleAuthRoute = app.get('/auth/google', passport.authenticate('google'));

var facebookAuthRoute = app.get('/auth/facebook', passport.authenticate('facebook'));

var facebookCallbackRoute = app.get('/auth/facebook/callback', 
		passport.authenticate('facebook',
			{ successRedirect: '/account/facebook', failureRedirect: '/auth/facebook' }
));

var googleCallbackRoute = app.get('/auth/google/callback', 
		passport.authenticate('google',
			{ successRedirect: '/account/google', failureRedirect: '/auth/google' }
));

var accountFacebookRoute = app.get('/account/facebook',
  ensureLoggedIn('/auth/facebook'),
  function(req, res) {
  	req.user._json.token = req.user.token;
  	console.log(JSON.stringify(req.user));
    res.end("<script>\nlocalStorage.setItem('token','"+ req.user.token + "');console.log('confirm executing');\nif(window.opener){window.opener.postMessage(JSON.stringify({msgName:'loginComplete',msg:''}),'*');}else{parent.postMessage(JSON.stringify({msgName:'loginComplete',msg:''}),'*');}\nfunction receiveMessage(event){\n\nif(event.data == 'sendUser'){\nif(window.opener){window.opener.postMessage(JSON.stringify({msgName:'processUser',msg:" + JSON.stringify(req.user) + "}),'*');}else{parent.postMessage(JSON.stringify({msgName:'processUser',msg:" + JSON.stringify(req.user)  + "}),'*');}}\nelse if(event.data=='closeWindow'){\nwindow.close();\n}\n};\n window.addEventListener('message', receiveMessage, false);\n </script>");
  });

var accountGoogleRoute = app.get('/account/google',
  ensureLoggedIn('/auth/google'),
  function(req, res) {
  	req.user._json.token = req.user.token;
  	console.log(JSON.stringify(req.user));
    res.end("<script>\nlocalStorage.setItem('token','"+ req.user.token + "');console.log('confirm executing');\nif(window.opener){window.opener.postMessage(JSON.stringify({msgName:'loginComplete',msg:''}),'*');}else{parent.postMessage(JSON.stringify({msgName:'loginComplete',msg:''}),'*');}\nfunction receiveMessage(event){\n\nif(event.data == 'sendUser'){\nif(window.opener){window.opener.postMessage(JSON.stringify({msgName:'processUser',msg:" + JSON.stringify(req.user) + "}),'*');}else{parent.postMessage(JSON.stringify({msgName:'processUser',msg:" + JSON.stringify(req.user)  + "}),'*');}}\nelse if(event.data=='closeWindow'){\nwindow.close();\n}\n};\n window.addEventListener('message', receiveMessage, false);\n </script>");
  });

var checkLoginFacebookRoute = app.get('/checkLoginStatus/facebook',  
  function(req, res) {
  	console.log("checkLoginStatus facebook");
  	if(req.user)
  		res.end("<script>\nconsole.log('confirm executing');\nif(window.opener){window.opener.postMessage(JSON.stringify({msgName:'loginComplete',msg:''}),'*');}else{parent.postMessage(JSON.stringify({msgName:'loginComplete',msg:''}),'*');}\nfunction receiveMessage(event){\n\nif(event.data == 'sendUser'){\nif(window.opener){window.opener.postMessage(JSON.stringify({msgName:'processUser',msg:" + JSON.stringify(req.user)  + "}),'*');}else{parent.postMessage(JSON.stringify({msgName:'processUser',msg:" + JSON.stringify(req.user) + "}),'*');}}\nelse if(event.data=='closeWindow'){\nwindow.close();\n}\n};\n window.addEventListener('message', receiveMessage, false);\n </script>"); 
  	else
  		res.end("loggedOut")
});

var checkLoginGoogleRoute = app.get('/checkLoginStatus/google',  
  function(req, res) {
  	console.log("checkLoginStatus google");
  	if(req.user)
  		res.end("<script>\nconsole.log('confirm executing');\nif(window.opener){window.opener.postMessage(JSON.stringify({msgName:'loginComplete',msg:''}),'*');}else{parent.postMessage(JSON.stringify({msgName:'loginComplete',msg:''}),'*');}\nfunction receiveMessage(event){\n\nif(event.data == 'sendUser'){\nif(window.opener){window.opener.postMessage(JSON.stringify({msgName:'processUser',msg:" + JSON.stringify(req.user)  + "}),'*');}else{parent.postMessage(JSON.stringify({msgName:'processUser',msg:" + JSON.stringify(req.user) + "}),'*');}}\nelse if(event.data=='closeWindow'){\nwindow.close();\n}\n};\n window.addEventListener('message', receiveMessage, false);\n </script>"); 
  	else
  		res.end("loggedOut")
});

var logoutRoute = app.get('/logout',
  function(req, res) {
    var token = req.user.token;
    var userId = req.user.id;
   
	req.logout();
	res.end("logged out successfully")
  });

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
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Pragma', 'no-cache');
      next();
   };
};

setRawBody = function(req,res,next){
  var connectBodyParser = connect.bodyParser();
  var expressBodyParser = express.bodyParser({uploadDir:'/home/concussed/uploads'});
  console.log( req.url + " req.url.indexOf = " + req.url.search(/upload/));
  if (req.url.search(/upload/)>-1)
  {
  	expressBodyParser(req,res,next);
  }
  else
  {
  	connectBodyParser(req,res,next);
  }
}

var debugPrint = function(text)
{
	return function (res,req,next)
	{
		if(nta.debug)
			console.log(text);
		next();
	}
}
var server = connect.createServer(
	connect.logger({ format: ':method :url' }),
	express.cookieParser(),
	express.session({ secret: 'keyboard cat' }),
	passport.initialize(),
	passport.session(),
	setRawBody,
	//connect.session({ secret: 'test'}),
	debugPrint("\n\n**cookieParser**\n\n"),
	debugPrint("\n\n**setRawBody**\n\n"),
	crossDomainRules(),
	debugPrint("\n\n**crossDomain**\n\n"),
	addDomainRoute,
	debugPrint("\n\n**addDomain**\n\n"),
	readRoute,
	debugPrint("\n\n**readRoute**\n\n"),
	getPageRoute,
	debugPrint("\n\n**getPage**\n\n"),
	getScriptRoute,
	debugPrint("\n\n**getScript**\n\n"),
	searchRoute,
	searchUserIdRoute,
	getCountByMonthRoute,
	createBucketRoute,
	enableWebConfigRoute,
	postGetScriptRoute,
	accountFacebookRoute,
	accountGoogleRoute,
	facebookAuthRoute,
	facebookCallbackRoute,
	checkLoginFacebookRoute,
	getDNSNamesRoute,
	googleAuthRoute,
	googleCallbackRoute,
	checkLoginGoogleRoute,
	debugPrint("\n\n**postGetScript**\n\n"),
	getEntriesByTenantObjectIdRoute,
	debugPrint("\n\n**getEntriesByTenantObjectId**\n\n"),
	createInstanceRoute,
	debugPrint("\n\n**createInstance**\n\n"),
	createKeyRoute,
	getEntriesByNameRoute,
	getEntryWhereRoute,
	deleteRoute,
	updateRoute,
	updateWhereRoute,
	uploadFileRoute,
	uploadFileTenantOnlyRoute,
	customLinkRoute,
	//generateRoutes,
	nta.serveStaticFilesNoWriteHead,
	connect.static(__dirname)
);

nta.listen(server, s.id);



