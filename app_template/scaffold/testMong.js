var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var noSchema = new Schema({
	name: String,
	fields:[]
});

var db = mongoose.connect("mongdb://localhost/test");

var myModel = db.model("nextera_objects",noSchema);

myModel.find({},function(err,results)
{
	console.log(results);
});
