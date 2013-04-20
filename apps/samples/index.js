var http = require("http")
var connect = require("connect")
var nta = require("concussion-core")
var settings = require("./settings.js");
var fs = require('fs');
var ejs = require('ejs');
var url;
var files2Localize=[{templateFileName:__dirname + "/twitter-bootstrap/blog/index.ejs",outputFileName:__dirname + "/twitter-bootstrap/blog/index.html"},{templateFileName:__dirname + "/foundation/timesheet/index.ejs",outputFileName:__dirname + "/foundation/timesheet/index.html"}];
var s = settings();

for(i=0;i<files2Localize.length;i++)
{
	localizeFile(files2Localize[i].templateFileName,files2Localize[i].outputFileName);
}

function localizeFile(fileName,output)
{
	console.log(fileName, " ",output);
	contents = fs.readFileSync(fileName,'utf-8');
	//console.log(contents);
	//contents.replace("@@CJS_WEB_URL@@", process.env.CJS_WEB_URL);
	contentsOutput = ejs.render(contents, {locals: {'CJS_WEB_URL': process.env.CJS_WEB_URL}})
	console.log(contentsOutput);
	fs.writeFile(output,contentsOutput,function(err){
		if(err)
		{
			console.error(err);
		}
		else
			console.log(output + " written successfully");
	});
}

var server = connect.createServer(
	connect.logger(), // Log responses to the terminal using Common Log Format.
	connect.static(__dirname) // Serve all static files in the current dir.
);

nta.listen(server, s.id);
