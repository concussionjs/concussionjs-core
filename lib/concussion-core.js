url = require('url');
path = require('path');
http = require('http');
fs = require('fs');
qs = require('querystring');
util = require('util');
mime = require('mime');
ejs = require('ejs');
dirRoot = "/home/concussed/concussionjs-core/apps/api/";
var html = fs.readFileSync(dirRoot + 'kotemplate.ejs', 'utf-8');
var adminhtml = fs.readFileSync(dirRoot + 'kotemplate-admin.ejs', 'utf-8');
var superadminhtml = fs.readFileSync(dirRoot + 'kotemplate-superadmin.ejs', 'utf-8');
var parse = require('./inferObjects.js');
var koScript = '';
module.exports.koScript = koScript;
module.exports.debug = false;
var debug = module.exports.debug;
var BSON = require('mongodb').BSONPure;
var DbSL = require('mongodb').Db;
var connectionSL = require('mongodb').Connection;
var serverSL = require('mongodb').Server;
var host = 'localhost';
var port = connectionSL.DEFAULT_PORT;
console.log("port:", port);
var dbSL = new DbSL('concussion_prod', new serverSL(host, port, {}), {native_parser: false});
var db;

module.serverSL = serverSL;
module.exports.DbSL = DbSL;
module.exports.dbSL = dbSL;
module.exports.db = db;

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

module.exports.createEntry = function(newObject,collectionName, callback)
{
    	db.collection(collectionName, function(err, collection) {
        	collection.insert(newObject, function(err, docs) {
        		callback('success', docs);
			     });
    	});
}

module.exports.getEntries = function(collectionName,callback)
    {
	//dbSL.open(function(err, db) {
    	db.collection(collectionName, function(err, collection) {
        	collection.find({}).sort({"_id":"1"}).toArray(function(err, documents) {
      if (err)
      {
                	console.error(err);
      }
      else
      {
                	callback(err, documents);
      }
			});
    	});
	//});
};

module.exports.getEntriesWhere = function(where,collectionName,callback)
    {
	//console.log(JSON.stringify(where)," ",collectionName," db ",db);
	//dbSL.open(function(err, db) {
    	if (!db)
  {
    dbSL.open(function(err, mydb) {
      db = mydb;
      db.collection(collectionName, function(err, collection) {
        collection.find(where).sort({"_id":"1"}).toArray(function(err, documents) {
          if (err)
          {
            console.error(err);
          }
          else
          {
            callback(err, documents);
          }
        });
      });
    });
  }
  else
  {
    db.collection(collectionName, function(err, collection) {
        	       collection.find(where).sort({"_id":"1"}).toArray(function(err, documents) {
        if (err)
        {
                	               console.error(err);
        }
        else
        {
                	               callback(err, documents);
        }
			});
    	        });
	//});
  }
};

module.exports.getEntryWhere = function(where,collectionName,callback)
    {
  //var oid = new BSON.ObjectID(id);
  //console.log("oid:",oid);
  //console.log(JSON.stringify(where)," ",collectionName);
  db.collection(collectionName, function(err, collection) {
    collection.find(where).toArray(function(err, documents) {
      if (err)
      {
        console.error(err);
      }
      else
      {
        //console.log("documents ", JSON.stringify(documents[0]));
        callback(err, documents);
      }
    });
  });
};

module.exports.getEntriesByName = function(whereRegExp,collectionName,callback)
    {
  //var oid = new BSON.ObjectID(id);
  //console.log("oid:",oid);
  //console.log(whereName," ",whereRegExp);
  var reg = new RegExp('.*' + escapeSpecialCharacters(whereRegExp).split(' ').join('.*|.*') + '.*', 'i');
  db.collection(collectionName, function(err, collection) {
    collection.find({'name': reg}).sort({"_id":"1"}).toArray(function(err, documents) {
      if (err)
      {
        console.error(err);
      }
      else
      {
        //console.log("documents ", JSON.stringify(documents[0]));
        callback(err, documents);
      }
    });
  });
};

module.exports.getEntriesByTenantObjectId = function(tenantObjectId,collectionName,callback)
    {
  //var oid = new BSON.ObjectID(id);
  //console.log("oid:",oid);
  //console.log(whereName," ",whereRegExp);
  //var reg = new RegExp('.*' + escapeSpecialCharacters(whereRegExp).split(' ').join('.*|.*') + '.*', 'i');
  db.collection(collectionName, function(err, collection) {
    collection.find({'tenant_object_id': tenantObjectId}).sort({"_id":"1"}).toArray(function(err, documents) {
      if (err)
      {
        console.error(err);
      }
      else
      {
        //console.log("documents ", JSON.stringify(documents[0]));
        callback(err, documents);
      }
    });
  });
};


module.exports.getEntryById = function(id,collectionName,callback)
    {
	var oid = new BSON.ObjectID(id);
  //console.log("oid:",oid);
    	db.collection(collectionName, function(err, collection) {
        	collection.findOne({_id: oid},function(err, documents) {
      if (err)
      {
                	console.error(err);
      }
      else
      {
        //console.log("documents ", JSON.stringify(documents));
                	callback(err, documents);
      }
			});
    	});
};

module.exports.searchEntries = function(searchTerm,collectionName,callback)
    {
	var reg = new RegExp('.*' + escapeSpecialCharacters(searchTerm).split(' ').join('.*|.*') + '.*', 'i');
	//dbSL.open(function(err, db) {
    	db.collection(collectionName, function(err, collection) {
        	collection.find({_search_keys: reg}).sort({"_id":"1"}).toArray(function(err, documents) {
      if (err)
      {
                	console.error(err);
      }
      else
      {
                	callback(err, documents);
      }
			});
    	});
	//});
};

module.exports.deleteEntry = function(id,collectionName,callback)
    {
	var oid = new BSON.ObjectID(id);

    	db.collection(collectionName, function(err, collection) {
        	collection.remove({_id: oid},function(err, documents) {
            callback(err, documents);
			     });
    	});

};

module.exports.updateEntry = function(id,newObject,collectionName,callback)
    {
	var oid = new BSON.ObjectID(id);
	//console.log(oid);
	//dbSL.open(function(err, db) {
    	db.collection(collectionName, function(err, collection) {
        	collection.update({_id: oid},newObject, function(err,documents) {
      callback(err, documents);
			});
    	});
	//});
};

module.exports.updateEntryWhere = function(where,newObject,collectionName,callback)
    {
  //var oid = new BSON.ObjectID(id);
  //console.log(oid);
  //dbSL.open(function(err, db) {
  db.collection(collectionName, function(err, collection) {
    collection.update(where, newObject, {upsert: true, safe: true}, function(err, result) {
      callback(err, result);
    });
  });
  //});
};



module.exports.listen = function(server,id) {
	dbSL.open(function(err, mydb) {
    db = mydb;
    exports.getEntryById(id, 'apps', function(err,doc) {
      server.listen(doc.port);
      appLocation = doc.location;
      appName = doc.name;
    });
  });
};

module.exports.initiateDB = function(callback)
{
  dbSL.open(function(err, mydb) {
    db = mydb;
    callback(db);
  });
}


module.exports.createServer = function(settings,createserver)
{
	dbSL.open(function(err, mydb) {
    db = mydb;
    var server = http.createServer(function(req,res) {
		  createserver(req, res);
    });
    listen(server, settings.id);
  });
};

module.exports.createServerWithStaticFiles = function(settings,createserver)
{
  var server = http.createServer(function(req,res) {
    serveStaticFiles(req, res, createserver);
  });
  listen(server, settings.id);
};

function getExtension(filename) {
  var i = filename.lastIndexOf('.');
  return (i < 0) ? '.htm' : filename.substr(i);
}

module.exports.serveStaticFilesNoWriteHead = function(req,res,next) {
  if (debug)
    util.debug('url: ', req.url);
  var uri;
  var sessionId = qs.parse(req.url.split('?')[1]).id;
  if (req.url.search('concussionjs.com') > -1)
  {
    var uri = url.parse(req.url).pathname.split('?')[0].split('.com/')[1];
    req.url = uri;
  }
  else
  {
    uri = url.parse(req.url).pathname;
  }

    var dirname = appLocation;//path.dirname(process.cwd());

  if (debug)
    util.debug(dirname, ' uri:', uri);

  var filename = path.join(dirname, uri);

  if (debug)
    util.debug('filename: ', filename);

  path.exists(filename, function(exists) {
      if (!exists)
      {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.write('404 Not Found\n');
      res.end();
      console.error('error:', filename + ' does not exist');
        return;
    }

    if (fs.statSync(filename).isDirectory())
      {
        filename += '/index.html';
      }

    fs.readFile(filename, 'binary', function(err, file) 
      {

          if (err)
          {
                    res.write(err + '\n');
                    res.end();
                    next();
                    console.error('Error reading file ', filename, ' err:', err);
                    return;

          }
          

          if (filename && (filename.search('/admin') > -1) && uri.search('.js') == -1 && filename.search('.css') == -1 && filename.search('/index.html') == -1)
        {
          //res.writeHead(200,{'Content-Type':'text/html','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'X-Requested-With'});
            res.writeHead(200, {'Content-Type': mime.lookup(getExtension(filename)), 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Requested-With'});
            if (debug)
              util.debug('just before getEntries');
            var reg = new RegExp('.*' + escapeSpecialCharacters(sessionId).split(' ').join('.*|.*') + '.*', 'i');
            exports.getEntriesWhere({$or:[{name:reg},{name:'cjs_objects'}]},'cjs_objects', function(err,objects) {
              if (objects)
              {
                if (filename.search('/admin') > -1)
                {
                  if (debug)
                    util.debug('sessionId: ', sessionId, ' ', req.url);
                  //objects = objects.filter(function(element,index,array) {return element.name.search(sessionId) > -1 || element.name.search('cjs_objects') > -1});
                  res.write(ejs.render(adminhtml, {locals: {myObjects: [objects, sessionId]}}));
                }
                else
                {
                  res.write(ejs.render(html, {locals: {myObjects: objects}}));
                }
                res.write(koScript);
                res.write(file, 'binary');
                res.end();
              }
              else
              {
                next()
              }
          });
        }
        else if (filename.search('/getPage') == -1)
        {
                    next()
        }

      });
      return true;
    });
};
