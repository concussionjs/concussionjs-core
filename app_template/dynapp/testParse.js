var jsdom = require('jsdom');
var fs = require('fs');
var objects = [];
var myCallback;
module.exports.objects = objects;
var jquery = fs.readFileSync("./assets/js/libs/jquery-1.5.min.js").toString();
module.exports.runGenerateStructure = function(fileName,callback)
{
	myCallback=callback;
	console.log("inside generate structure");
	var html = fs.readFileSync(fileName).toString();
	//console.log(html);
	objects = [];
	// 'http://code.jquery.com/jquery-1.5.min.js'
	// assets/js/libs/jquery-1.7.1.min.js	
	jsdom.env(
		{
			"html":html 
			,"scripts":['assets/js/libs/jquery-1.5.min.js']
			,"done":processHTML
		}
		);
}


function getChildren(window,node)
{
	try{
		return window.$(node).find('[data-bind]');
	}catch(e){console.log(e.stack);}
}


function recurseStructure(window,node,parentChildList)
{
	console.log("inside recurse");
	window.$(node).each(function (index) {
		//console.log(this);
		var currentObject = new Object();
		currentObject.fields = [];
		currentObject.children = [];
		listOfChildren = getChildren(window,this);
		currentObject.name = window.$(this).attr("data-bind").split(":")[1];
		
		if(window.$(this).attr("data-bind").split(":")[0] == "submit")
			currentObject.type = "submit";
		
		if(window.$(this).attr("data-bind").split(":")[0] == "foreach")
			currentObject.type = "array";
		
		for(i=0;i<listOfChildren.length;i++)
		{
			//console.log(window.$(listOfChildren[i]).attr("data-bind"));
			//console.log(getChildren(window,listOfChildren[i]).length);
			
			console.log(window.$(listOfChildren[i]).attr("data-bind").split(":")[0]);
			
			if(window.$(listOfChildren[i]).attr("data-bind").split(":")[0]=="css")
			{
				console.log("node is a css node");
			}
			else if(currentObject.type=="submit")
			{
				console.log("do nothing", listOfChildren[i]);
			}
			else if(window.$(listOfChildren[i]).attr("data-bind").split(":")[1]=="$data")
			{
				console.log("do not add as field");
			}	
			else if(getChildren(window,listOfChildren[i]).length == 0)
				currentObject.fields.push(window.$(listOfChildren[i]).attr("data-bind").split(":")[1]);
			else
			{
				recurseStructure(window,listOfChildren[i],currentObject.children);
			}

		}
		
		currentObject.name = window.$(this).attr("data-bind").split(":")[1];
		
		if(currentObject.type!="submit")
			parentChildList.push(currentObject);
	});

}

function processHTML(errors,window){
 	
	if(errors)
	{
		console.log(errors);
		return;
	}
	
	window.$('[data-bind]').filter(function(){return window.$(this).parents("[data-bind]").length==0}).each(function (index) {
		var currentObject = new Object();
		currentObject.fields = [];
		currentObject.children = [];
		listOfChildren = getChildren(window,this);
		currentObject.name = window.$(this).attr("data-bind").split(":")[1];
		if(window.$(this).attr("data-bind").split(":")[0] == "submit")
			currentObject.type = "submit";
		if(window.$(this).attr("data-bind").split(":")[0] == "foreach")
			currentObject.type = "array";

		for(i=0;i<listOfChildren.length;i++)
		{
			
			console.log(window.$(listOfChildren[i]).attr("data-bind").split(":")[0]);	
			if(window.$(listOfChildren[i]).attr("data-bind").split(":")[0]=="css")
			{
				console.log("node is a css node");
			}
			else if(currentObject.type=="submit")
			{
				console.log("do nothing ", listOfChildren[i]);
			}
			else if(getChildren(window,listOfChildren[i]).length == 0)
				currentObject.fields.push(window.$(listOfChildren[i]).attr("data-bind").split(":")[1]);
			else
			{
				recurseStructure(window,listOfChildren[i], currentObject.children);
			}
		}
		
		currentObject.name = window.$(this).attr("data-bind").split(":")[1];
		
		if(currentObject.type!="submit")
			objects.push(currentObject);
	});

	myCallback(objects);	
}

function printStuff(objects,nextThing)
{
	console.log("top of printstuff: ", objects.length);
	for(i=0;i<objects.length;i++)
	{
		console.log("object: ",objects[i].name," ",objects[i].type, " ",objects[i].children.length);
		for(j=0;j<objects[i].fields.length;j++)
		{
			console.log("fields: ",objects[i].fields[j]);
		}
		for(j=0;j<objects[i].children.length;j++)
		{
			console.log("just before printStuff");
			nextThing(objects[i].children);
		}

		
	}	
}

module.exports.printStuff = printStuff;
