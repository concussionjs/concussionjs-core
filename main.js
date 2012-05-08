var http = require('http'),
httpProxy = require('http-proxy');
mongoose = require('mongoose');

var Schema = mongoose.Schema
        , ObjectId = Schema.ObjectId;

var Proxy = new Schema({
        url : String
        , destinationport  : String
	, destination : String
        , date : { type: Date, default: Date.now }
});


var db = mongoose.connect('mongodb://localhost/test');

var myModel = db.model('proxy',Proxy);

console.log("starting http proxy");
var urlSearch;
httpProxy.createServer(function(req,res,proxy){
	console.log(req.url);
	
	if(req.url.search("checkStatus")>-1)
	{
		res.writeHeader(200);
		res.end("proxy is active");
	}
	
	console.log(req.headers.host);
	if((""+req.headers.host).search(".com")>-1)
	{	
		console.log("nextera.com is used");
		parts = (""+req.headers.host).split(".");
		urlSearch = "/" + parts[0];
	}
	else
	{
		parts = req.url.split("/");
		urlSearch = "/" + parts[1];
		console.log("req.url: " + req.url);
	}

	if(parts.length<1)
	{	
		console.log("no application name provided")
		return;
	}

	var buffer = proxy.buffer(req);	
	var destinationport;
	
	if(urlSearch=="/favicon.ico")
	{
		return;
	}
	
	var reg = new RegExp(urlSearch,"i");
	
	myModel.findOne({url:reg},
			function(err,result)
			{
				if(err)
				{
					console.log(err);
					return;
				}
				if(result)
				{
					proxy.proxyRequest(req, res, {
                        			host: 'localhost',
                        			port: result.destinationport,
                        			buffer: buffer
					});
				}
				return;
			}
	);

}).listen(80);
