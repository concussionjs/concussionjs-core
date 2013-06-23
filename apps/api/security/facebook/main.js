var userId;

function appendLoggedOut()
{
	var div = document.createElement('div');
	div.setAttribute('id','auth-loggedout');
	document.getElementById('auth-status').appendChild(div);
}

function appendLoggedIn()
{
	var div = document.createElement('div');
	var span = document.createElement('span');
	var a = document.createElement('a');
		
	div.setAttribute('id','auth-loggedin');
	div.setAttribute('class','auth-hide');				
	span.setAttribute('id','auth-displayname');

	a.setAttribute('class','masthead-icon');
	a.setAttribute('id','masthead-icon-logout');
	a.setAttribute('title','Logout');
	div.appendChild(span);
	div.appendChild(a);

	document.getElementById('auth-status').appendChild(div);
}

function appendFb()
{
	var fb = document.createElement('a');
	fb.setAttribute('class','masthead-icon');
	fb.setAttribute('id','masthead-icon-facebook');
	fb.setAttribute('title','Facebook');
	document.getElementById('auth-loggedout').appendChild(fb);
}

function appendStatus()
{
	var div = document.createElement('div');
	div.setAttribute('id','auth-status');
	document.getElementsByTagName('body')[0].appendChild(div);
}

if($('#auth-status').length==0)
{
	console.log('no auth-status div');
	appendStatus();
	appendLoggedOut();
	appendLoggedIn();
	appendFb();
}
else
{
	if($('#auth-loggedout').length==0)
	{
		appendLoggedOut();
	}

	if($('#auth-loggedin').length==0)
	{
		appendLoggedIn();
	}
	
	if($('#masthead-icon-facebook').length==0)
	{
		appendFb();	
	}
	else
	{
		console.log('facebook login link exists');
	}
}

	(function(d){
    	var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
    	if (d.getElementById(id)) {return;}
    	js = d.createElement('script'); js.id = id; js.async = true;
    	js.src = '//connect.facebook.net/en_US/all.js';
    	ref.parentNode.insertBefore(js, ref);
	}(document));

	window.fbAsyncInit = function() {
	FB.init({
		appId      : '231629423618271', 
		status     : true, 
		cookie     : true, 
		xfbml      : true
	});
		
	FB.Event.subscribe('auth.statusChange', function(response) {
		if (response.authResponse) {
			FB.api('/me', function(me){
				userId=me.id;
				if (me.name) {
					document.getElementById('auth-displayname').innerHTML = me.name;
				}
				cjs.createCookie('userId',userId,1);
				cjs.synchSessionVariables('userId',userId);
				<%
					for(var i=0;i<objects.length;i++)
					{
				%>
				$mvm.<%=objects[i].name%>_getRecords();
				<%
					}	
				%>				
			});
			$('#masthead-icon-logout').click(facebookLogout);
			document.getElementById('auth-loggedout').style.display = 'none';
			document.getElementById('auth-loggedin').style.display = 'block';
		} 
		else 
		{
			document.getElementById('auth-loggedout').style.display = 'block';
			document.getElementById('auth-loggedin').style.display = 'none';
		}
	});

	$('#masthead-icon-facebook').click(function(){FB.login();});
	$('#facebook-signup').click(function(){FB.login();});
	
	var facebookLogout = function(){
		console.log('facebookLogout');
		FB.logout();
		userId=''; 
		cjs.eraseCookie('userId');
		$('#masthead-icon-logout').unbind('click');
		<%
			for(var i=0;i<objects.length;i++)
			{
		%>
			$mvm.<%=objects[i].name%>_getRecords();
		<%
			}	
		%>					
	};
}