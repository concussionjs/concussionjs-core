var userId;
var popup;


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


function appendSecurityGateway()
{
	var sg = document.createElement('iframe');
	sg.style.display='none';
	sg.id='cjsSecurityGateway';
	document.getElementsByTagName('body')[0].appendChild(sg);
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


	if($('#cjsSecurityGateway').length==0)
	{
		console.log('no cjsSecurityGateway iframe');
		appendSecurityGateway();
	}

function checkIfLoggedIn()
{
  console.log('checkIfLoggedIn');
   $('#masthead-icon-logout').click(logoutFacebook);
   $('#cjsSecurityGateway').attr({'src':'http://<%=URLPrefix%>/security/facebook/login.htm'});
}

function loginFacebook(){
  $('#masthead-icon-logout').click(logoutFacebook);
  popup = window.open('http://<%=URLPrefix%>/auth/facebook','facebook-login',  'height=300,width=500');
}

function logoutFacebook(){
  console.log('logout');
  localStorage.setItem('userId','');
  cjs.eraseCookie('userId');
  $('#masthead-icon-logout').unbind('click');		
  $('#cjsSecurityGateway').attr({'src':'http://<%=URLPrefix%>/security/facebook/logout.htm'});
}

function sendMessage(msg){
  console.log('before send message');
  if(popup)
   popup.postMessage(msg,'*');
  else
  {
    var win = document.getElementById('cjsSecurityGateway').contentWindow;
    win.postMessage(msg,'*');
  }
  console.log('after send message');
}

function receiveMessage(event)
{
  
  var parsed = JSON.parse(event.data);

  if(parsed.msgName == 'loginComplete')
  {
    sendMessage('sendUser');
  }
  else if(parsed.msgName == 'processUser')
  {
    var user = parsed.msg;
    console.log(user.displayName + ' logged in');
   
    userId=user.id;
	if (user.displayName) {
		document.getElementById('auth-displayname').innerHTML = user.displayName;
	}
	localStorage.setItem('userId',userId);
	cjs.createCookie('userId',userId,1);
	cjs.synchSessionVariables('userId',userId);
   	<%
	for(var i=0;i<objects.length;i++)
	{
	%>
		$cjs.<%=objects[i].name%>_getRecords(userId);
	<%
	}	
	%>			
   	document.getElementById('auth-loggedout').style.display = 'none';
	document.getElementById('auth-loggedin').style.display = 'block';

    sendMessage('closeWindow');
  }
  else if(parsed.msgName == 'loggedOut')
  {
   	document.getElementById('auth-loggedout').style.display = 'block';
	document.getElementById('auth-loggedin').style.display = 'none';
	<%
	for(var i=0;i<objects.length;i++)
	{
	%>
		$cjs.<%=objects[i].name%>_getRecords();
	<%
	}	
	%>			
  }
}

window.addEventListener('message', receiveMessage, false);



$('#masthead-icon-facebook').click(loginFacebook);
$('#masthead-icon-logout').click(logoutFacebook);

checkIfLoggedIn();