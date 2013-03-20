$.ajaxSetup({
	cache: true
});

window.onload = function(){
			cjs.getPage(function(page){
				
				var sessionId = cjs.readCookie("sessionId");
				var error;
				//console.log($.stringify(cjs.inferObjects(page.html)));
				//console.log("countme: " + (countme++));
				$.post("http://api.local-concussionjs.com/postGetScript/true/?sid="+sessionId,$.stringify(cjs.inferObjects(page.html)),function(result){
						//console.log(result);
						eval(result);							
						$("body").append("<a href=\"#\" onclick=\"window.open(\'http://api.local-concussionjs.com/admin.html?id=" + sessionId + "\');\"> <img style=\"position: absolute; top: 0; right: 0; border: 0;\" src=\"http://api.local-concussionjs.com/concussion_admin.png\" alt=\"Fork me on GitHub\"> </a>");
					});
			});
}
