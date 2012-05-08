var jsdom = require('jsdom');
var fs = require('fs');
var objects = [];
var myCallback;
module.exports.objects = objects;

module.exports.runGenerateStructure = function(fileName,callback)
{
	myCallback=callback;
	//console.log("inside generate structure");
	var html = fs.readFileSync(fileName).toString();
	//console.log('html:',html);
	objects = [];
	
	jsdom.env(html, [
  	'assets/js/libs/jquery-1.5.min.js'
	],processHTML);
}

module.exports.runGenerateStructureHTML = function(html,callback)
{
	myCallback=callback;
	
	//var html = fs.readFileSync(fileName).toString();
	//console.log('runGenerateStructureHTML:',html);
	objects = [];
	
	jsdom.env('index.html', [
  	'assets/js/libs/jquery-1.5.min.js'
	],processHTML);
}


function getChildren(window,node)
{
	try{

			return window.$(node).find('[data-bind]');

	}catch(e){console.log(e.stack);}
}


function recurseStructure(window,node,parentChildList,my_prefix)
{
	//console.log("inside recurse");
	window.$(node).each(function (index) {
		//console.log(this);
		var currentObject = new Object();
		if(my_prefix)
			var prefix = my_prefix;
		else
			var prefix = "";
		currentObject.fields = [];
		currentObject.children = [];
		listOfChildren = getChildren(window,this);
		
		if(window.$(this).attr("data-bind").split(":")[0] == "submit")
		{
			currentObject.type = "submit";
			var objectName = window.$(this).attr("data-bind").split(":")[1].split("_")[0];
			//console.log("testParse: x ", objectName);
			prefix = objectName + "_";
			//console.log("testParse: y", prefix);
		}
		
		currentObject.name = window.$(this).attr("data-bind").split(":"+prefix)[1];
		//console.log("testParse: ", currentObject.name);
		
		if(window.$(this).attr("data-bind").split(":")[0] == "foreach")
			currentObject.type = "array";
		
		for(i=0;i<listOfChildren.length;i++)
		{
			//console.log(window.$(listOfChildren[i]).attr("data-bind"));
			//console.log(getChildren(window,listOfChildren[i]).length);
			
			//console.log(window.$(listOfChildren[i]).attr("data-bind").split(":")[0]);
			if(window.$(listOfChildren[i]).attr("data-bind").split(":")[1].search("nextera_admin")>-1)
			{
				//console.log("node for nextera admin function");
			}
			else if(window.$(listOfChildren[i]).attr("data-bind").split(":")[0]=="css")
			{
				//console.log("node is a css node");
			}
			//else if(currentObject.type=="submit")
			//{
			//	console.log("do nothing", listOfChildren[i]);
			//}
			else if(currentObject.type=="array")
                        {
                                //console.log("children for each");
                                currentObject.fields.push({"name":window.$(listOfChildren[i]).attr("data-bind").split(":")[1]});
                        }
			else if(window.$(listOfChildren[i]).attr("data-bind").split(":")[1]=="$data")
			{
				//console.log("do not add as field");
			}	
			else if(getChildren(window,listOfChildren[i]).length == 0)
				currentObject.fields.push({"name":window.$(listOfChildren[i]).attr("data-bind").split(":")[1]});
			else
			{
				recurseStructure(window,listOfChildren[i],currentObject.children,prefix);
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
		var prefix="";
		currentObject.fields = [];
		currentObject.children = [];
		listOfChildren = getChildren(window,this);
		currentObject.name = window.$(this).attr("data-bind").split(":")[1];
		if(window.$(this).attr("data-bind").split(":")[0] == "submit")
		{
			currentObject.type = "submit";
			var objectName = window.$(this).attr("data-bind").split(":")[1].split("_")[0];
			currentObject.name=objectName;
			//console.log("testParse: z", objectName);
			prefix = objectName + "_";
			//console.log("testParse: w", prefix);
			//return;
		}	
		//console.log("1243 ", index)
		if(window.$(this).attr("data-bind").split(":")[0] == "foreach")
			currentObject.type = "array";
		if(currentObject.name.search("nextera_admin")>-1)
		{
			//console.log("node for nextera admin function");
			return;
		}	
		for(i=0;i<listOfChildren.length;i++)
		{
			
			//console.log("data-bind: " + window.$(listOfChildren[i]).attr("data-bind"));	
			
			if(window.$(listOfChildren[i]).attr("data-bind").split(":")[0]=="css")
			{
				//console.log("node is a css node");
			}
			else if(window.$(listOfChildren[i]).attr("data-bind").split(":")[0]=="click")
			{
				//console.log("node is a click node");
			}
			//else if(currentObject.type=="submit")
			//{
			//	console.log("do nothing ", listOfChildren[i]);
			//}
			else if(getChildren(window,listOfChildren[i]).length == 0)
			{
				var name = window.$(listOfChildren[i]).attr("data-bind").split(":"+prefix)[1];
				currentObject.fields.push({"name":name});
				//console.log("testParse: v", name);
			}
			else
			{
				recurseStructure(window,listOfChildren[i], currentObject.children);
			}
		}
		if(!currentObject.name)
			currentObject.name = window.$(this).attr("data-bind").split(":")[1];
		
		//if(currentObject.type!="submit")
		objects.push(currentObject);
	});
	//console.log("WatchFile myCallBack: ",JSON.stringify(objects));
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
