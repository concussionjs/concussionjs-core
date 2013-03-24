var http = require("http")
var connect = require("connect")
var nta = require("concussion-core")
var settings = require("./settings.js");
var url;

var s = settings();

var server = connect.createServer(
	connect.logger(), // Log responses to the terminal using Common Log Format.
	connect.static(__dirname) // Serve all static files in the current dir.
);

nta.listen(server, s.id);
