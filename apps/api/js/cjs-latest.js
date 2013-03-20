/*! cjs v@0.0.1 concussionjs.com | concusionjs.com/license */

(function(window,undefined){

	
var cjs = function(){
};

var objects=[];
var objectsCollection={};

cjs.prototype.inferObjects = function( html ) {
	objects=[];
	objectsCollection={}
	this.parseHTML(html);
	// console.log(JSON.stringify(objects));
	return objects;
}

cjs.prototype.compare = function(answer,sample){
	if(answer.length != sample.length)
		return false;
	return this.findNameInList(answer,sample)
}

cjs.prototype.parseHTML = function (html, parent, prefix){
	//console.log("parsing: " +  html);
	var databind = pkg.knockout.filterNestedNodes(pkg.knockout.parseDatabinds(html));
	for(var i=0;i<databind.length;i++)
	{		
		var directive = pkg.knockout.getDirective($(databind[i]).attr("data-bind"));
		var construct = pkg.knockout.constructs[directive.toLowerCase()];
		if(!construct)
		{
			throw new Error('InvalidDirective');
		}
		var obj = construct($(databind[i]),parent,prefix);
		if(obj && !parent)
		{
			if(!objectsCollection[obj.name])
			{
				objectsCollection[obj.name]=obj;			
				objects[objects.length]=obj;
			}

		}					
	}	
}

pkg = {
	knockout:{
		getObjectName : function(token)
		{
	 		var tokens = token.split(".");
	 		if(tokens.length > 1)
	 			return tokens[0];
	 		else
	 			return null;
		}
		,
		getParameter : function(token,prefix)
		{
			var tokens = token.split(",")[0].split(":");	
			if(tokens.length>0)
			{	
				tokens[1] = $.trim(tokens[1])
				if(prefix)
				{
					var prefixRemoved = tokens[1].split(prefix+".");
					if(prefixRemoved.length==1)
						return prefixRemoved[0];
					else if(prefixRemoved.length==2)
						return prefixRemoved[1];
					else
						return null;
				}
				else
					return tokens[1];
			}
			else
				return null;
		}
		,
		getDirective : function(token)
		{
			var tokens = token.split(",")[0].split(":");
			if(tokens.length>0)
			{	
				tokens[0] = $.trim(tokens[0]);
				return tokens[0];
			}
			else
				return null;
		}
		,
		parseDatabinds : function(token)
		{
			var hiddenDIV = $('<div></div>').html(token);
			return $('[data-bind]',hiddenDIV);
		}
		,
		filterNestedNodes : function(dom)
		{
			return $(dom).filter(function(){return window.$(this).parents("[data-bind]").length==0})
		}
		,
		processPeers : function(dom,parent,prefix)
		{
			if(dom.length>1)
				for(i=1;i<dom.length;i++)
				{
					parseHTML(dom[i],parent,prefix);
				}
		}	
		,
		constructs : {
		attr: function(token,parent,prefix){
			// do nothing
		},
		click: function(token,parent,prefix){
			// do nothing
		},
		foreach: function(token,parent,prefix){
			var obj = {};
			obj.name = pkg.knockout.getObjectName(pkg.knockout.getParameter($(token).attr("data-bind")));
			obj.type = "array";
			obj.children = [];
			if(objectsCollection[obj.name])
				obj = objectsCollection[obj.name];
			cjs.prototype.parseHTML($(token)[0].innerHTML,obj);
			if(parent)
			{
				if(!parent.children)
					parent.children = [];
				parent.children[parent.children.length]=obj;
				return null;
			}
			else
				return obj;
		},
		text:function(token,parent,prefix){
			if(parent)
			{
				if(parent.fields)
				{
					var name = pkg.knockout.getParameter($(token).attr("data-bind"),prefix);
					if(name && name != "")
					{
						(parent.fields[parent.fields.length]={}).name=name;
						cjs.prototype.dedupe(parent.fields);
					}
				}
				else
				{
					parent.fields=[];
					var name = pkg.knockout.getParameter($(token).attr("data-bind"),prefix);
					if(name && name!="")
						(parent.fields[0]={}).name=name;
				}
				return null;
			}
		},
		value:function(token,parent,prefix){
			if(parent)
			{
				if(parent.fields)
				{	
					var name = 	pkg.knockout.getParameter($(token).attr("data-bind"),prefix);
					if(name && name!="")
					{
						(parent.fields[parent.fields.length]={}).name=name;
						cjs.prototype.dedupe(parent.fields);	
					}
				}
				else
				{
					parent.fields=[];
					var name = pkg.knockout.getParameter($(token).attr("data-bind"),prefix);
					if(name && name!="")
					{
						(parent.fields[0]={}).name=name;
					}
				}
				return null;
			}
		},
		submit: function(token,parent,prefix){			
			var obj = {};
			obj.name = pkg.knockout.getObjectName(pkg.knockout.getParameter($(token).attr("data-bind")));
			obj.type = "array";
			obj.children = [];
			if(objectsCollection[obj.name])
				obj = objectsCollection[obj.name];
			cjs.prototype.parseHTML($(token)[0].innerHTML,obj,obj.name);
			if(parent)
			{
				if(!parent.children)
					parent.children = [];
				parent.children[parent.children.length]=obj;
				return null;
			}
			else
				return obj;
		}
	}
}
}

cjs.prototype.dedupe = function(arr)
{
	var arrTrackDupes = [];
	/*if(arr.length>0)
	{

	}*/
	
	var retArr = [];
	for (var i = 0; i < arr.length; i++)
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

cjs.prototype.findNameInList = function(arr1,arr2)
{
	var i = 0;
	var j = 0;
	var found;
	if(!arr1 && !arr2)
		return true;
	if(!arr1 && arr2)
		return false;
	if(arr1 && !arr2)
		return false;
	while(i<arr1.length)
	{
		var found = false;
		while(j<arr2.length)
		{
			if(arr1[i].name == arr2[j].name && arr1[i].type == arr2[j].type)
			{	
				
				if(this.findNameInList(arr1[i].children,arr2[j].children))
				{
					if(this.findNameInList(arr1[i].fields,arr2[j].fields))
						found = true; 
				}
				//else
				//	if(cjs.findNameInList(arr1[i].fields,arr2[j].fields))
				//		found = true;
			}
			j++;
		}
		if(!found)
			return false;
		j=0;
		i++;
	}
	return true;
}

/*
* utilities
*/
cjs.prototype.createUUID=function() {		
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "";

    var uuid = s.join("");
    //alert(uuid);
    return uuid;
}

cjs.prototype.createUUID=function(callback) {
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "";

    var uuid = s.join("");
    //alert(uuid);
    callback(uuid);
}

cjs.prototype.getUUID=function(callback) {
    $.get("http://testdrive.concussionjs.com/getUUID",function(res)
    {
    	callback(res);
    });	
}

cjs.prototype.createCookie = function(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
	localStorage.setItem("sessionId",value);
}

cjs.prototype.readCookie = function(name) {
	var nameEQ = name + "=";
	if(document.cookie)
	{
		var ca = document.cookie.split(';');
		//alert(document.cookie);
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
	}
	else if(localStorage.getItem("sessionId"))
	{
		return localStorage.getItem("sessionId");
	}
	return null;
}

cjs.prototype.eraseCookie = function(name) {
	createCookie(name,"",-1);
}

cjs.prototype.getPage = function(callback)
{
		//console.log("countgp: " + (countgp++));

		var vars = [], hash;
		var q = document.URL.split('?')[1];
		page= {};
		if(q != undefined)
		{
			q = q.split('&');
			for(var i = 0; i < q.length; i++)
			{
				hash = q[i].split('=');
				vars.push(hash[1]);
				vars[hash[0]] = hash[1];
			}
		}
		console.log("vars[id]=" + vars["id"]);
		if(!vars["id"] && !cjs.prototype.readCookie("sessionId"))
		{
			cjs.prototype.createUUID(function(id){
			cjs.prototype.createCookie("sessionId",id,1);								
			page.id=cjs.prototype.readCookie("sessionId");
			page.html=$('html')[0].innerHTML;
			page.name='index';
			callback(page);	
		});
	}
	else if(vars["id"])
	{
		cjs.prototype.createCookie("sessionId",vars["id"],1)
		page.id=vars["id"];
		page.html=$('html')[0].innerHTML;
		page.name='index';
		callback(page);
	}
	else 
	{
		page.id=cjs.prototype.readCookie("sessionId");
		page.html=$('html')[0].innerHTML;
		page.name='index';
		callback(page);	
	}
}

window.cjs = new cjs();

})(window);