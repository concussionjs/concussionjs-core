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

function appendGoogle()
{
  var gSignInWrapper = document.createElement('span');
  var customBtn = document.createElement('span');
  var g = document.createElement('a');

  gSignInWrapper.setAttribute('id','gSignInWrapper');

  customBtn.setAttribute('id','customBtn');
  customBtn.setAttribute('class','customGPlusSignIn');

  g.setAttribute('class','masthead-icon');
  g.setAttribute('id','masthead-icon-google');
  g.setAttribute('title','Google');

  customBtn.appendChild(g);
  gSignInWrapper.appendChild(customBtn);

  document.getElementById('auth-loggedout').appendChild(gSignInWrapper);
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
  appendGoogle();
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
  
  if($('#masthead-icon-google').length==0)
  {
    appendGoogle(); 
  }
  else
  {
    console.log('facebook login link exists');
  }
}



(function() {
       var po = document.createElement('script'); 
       po.type = 'text/javascript'; 
       po.async = true;
       po.src = 'https://apis.google.com/js/client:plusone.js?onload=render';
       var s = document.getElementsByTagName('script')[0]; 
       s.parentNode.insertBefore(po, s);
 })();
var userId;
var accessToken;

 function render() {
    gapi.signin.render('customBtn', {
      'callback': 'signinCallback',
      'clientid': '895398398018.apps.googleusercontent.com',
      'cookiepolicy': 'single_host_origin',
      'requestvisibleactions': 'http://schemas.google.com/AddActivity',
      'scope': 'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/userinfo.profile'
    });
  }

function signinCallback(authResult) {
	if (authResult['error'])
	{
		console.log('there was an error logging in');
	}
	else
	{
		$('#masthead-icon-logout').click(googleLogout);
		document.getElementById('auth-loggedout').style.display = 'none';
		document.getElementById('auth-loggedin').style.display = 'block';
		accessToken = authResult['access_token'];
		gapi.auth.setToken(authResult);
		setUserIdLoadRecords(); 
		console.log('after cjs createcookie');
	}
}

function setUserIdLoadRecords(){
    
    gapi.client.load('oauth2', 'v2', function() {
    	  if(gapi.client.oauth2)
          {	
          	var request = gapi.client.oauth2.userinfo.get();
          	request.execute(setUserIdCallback);
          }
    });
}

function setUserIdCallback(obj)
{
    if (obj['id']) {
     userId = obj['id'];
    }
    cjs.createCookie('userId',userId,1);
    cjs.synchSessionVariables('userId', userId);
    console.log(JSON.stringify(obj));
    if (obj['name']) {
		document.getElementById('auth-displayname').innerHTML = obj['name'];
	}
    <%
	for(var i=0;i<objects.length;i++)
	{
	%>
	$mvm.<%=objects[i].name%>_getRecords(userId);
	<%
	}	
	%>			
}

function disconnectUser(accessToken) {
  var revokeUrl = 'https://accounts.google.com/o/oauth2/revoke?token=' + accessToken;
  $.ajax({
    type: 'GET',
    url: revokeUrl,
    async: false,
    contentType: 'application/json',
    dataType: 'jsonp',
    success: function(nullResponse) {
     	document.getElementById('auth-loggedout').style.display = 'block';
		document.getElementById('auth-loggedin').style.display = 'none';
    },
    error: function(e) { 
		console.log(e);
    }
  });
}

var googleLogout= function(){
	disconnectUser(accessToken);
	console.log('googleLogout');
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
}
