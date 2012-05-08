var http = require("http")
var nta = require("./node_modules/nextera/nextera.js")
var settings = require("./settings.js");
var url;

var s = settings();

function writeRes(res)
{
	 res.end('application ' + s.name + ' has started\n');
}

var server = nta.createServerWithStaticFiles(

	s,function (req, res) 
	{
		res.writeHead(200, {'Content-Type': 'text/plain'});
  		writeRes(res);  
	}
);

//nta.getPort(server,s.id);
