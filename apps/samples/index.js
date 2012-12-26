var http = require("http")
var connect = require("connect")
var nta = require("./node_modules/nextera/nextera.js")
var settings = require("./settings.js");
var url;

var s = settings();

var server = connect.createServer(
	connect.logger(), // Log responses to the terminal using Common Log Format.
	connect.compress(), // Gzip the output stream when the browser wants it.
	connect.static(__dirname) // Serve all static files in the current dir.
);

nta.listen(server, s.id);
