ConcussionJS Core Platform
===============================
What is it?
------------
ConcussionJS is a platform that enables you to create dynamic web applications with only HTML and CSS. You provide the HTML, and the platform generates everything from the client-side code to the REST APIs necessary to support your application. 

Build your first application < 5 minutes following the tutorial at http://www.concussionjs.com

Run ConcussionJS platform one of four ways
-----------------------------

###1. As a cloud platform (fastest to test)
Include the public concussion.js javascript file in your HTML following the instructions at http://www.concussionjs.com/ in the "Getting Started" section

###2. As a self-installable Debian package
* __Step 1__: Download http://www.concussionjs.com/concussionjscore-0.0.1.deb

* __Step 2__: Install gdebi install utility

```	
    $ apt-get install gdebi
```

* __Step 3__: Use gdebi to install the Debian package

```	
    $ gdebi concussionjs-core-latest.deb
```

###3. Install via NPM
*Detailed instructions below*

###4. Install from source
*Detailed instructions below*

Instructions to install via NPM  (Option 3 above)
-----------------

### Pre-requisites
*Ubuntu 12.04 Linux or higher 
	(Note:only configuration tested, though it will likely work on other OS's in the debian family)
* git
* mongodb
* nodejs
* npm
* g++
* build-essential
* python-dev
* python-pip
* redis-server
* openjdk-6-jre-headless

We have also provided an install script for those starting from a fresh OS install. Refer to Optional Step 2 below

### 1. Install ConcussionJS Core Platform with NPM

From the shell:

```
    $ sudo npm install concusionjs-core -g
```

*The '-g' option will make the 'cjs' and 'cjs-proxy' bin-script available system-wide (usually linked from '/usr/local/bin'). Without the -g option you will be installing the concussionjs-core libraries in the current directory*

* __IMPORTANT NOTE 1__ : *You have to install the library with the '-g' extension because the libraries have dependencies to the global npm root directory*

* __IMPORTANT NOTE 2__ : *`npm install -g` should install the concussionjs-core package in /usr/local/lib/node_modules/concussionjs-core* 

### OPTIONAL Step 2. Install all linux package dependencies

From CONCUSSIONJS_CORE_DIR/install/os_install/YOUR_OS directory:

```
    $ cd CONCUSSIONJS_CORE_DIR/install/os_install/YOUR_OS
    $ sudo ./install.sh
```

*Only Ubuntu currently supported

### 3. Configuring the server (config.json)

The ConcussionJS Core Platform uses mongodb for object persistence, and Redis to support the rate-limiting proxy configuration.

```
    {
        "mongodb": {
            "port": 27017,
            "host": "127.0.0.1"
        },
        "redis": {
        	"port": 6379,
        	"host": "127.0.0.1"
    	},"facebook": {
            "app_id":"",
            "app_secret":""
        },
        "aws":{
        "hosted_zone_id":"",
        "bucket_name":"cjs_uploads",
        "region":"us-east-1"
        },
        "google":{
            "clientid": ""
        }
    }
```

* __mongodb__: MongoDB configuration (host & port)
* __redis__: Redis configuration (host & port)
* __facebook__: facebook authentication configuration (app id, app secret)
* __google__: google authentication configuration (clientid)
* __aws__: Amazon web services S3 (bucket_name, region) and route53 (hosted_zone_id) configuration

### 4. Configure the cjs-proxy server (config.json)

cjs-proxy uses a Redis server to manage its configuration (and to share its state across the multiple workers). You can use the Redis server to change its configuration while it's running or simply check the health state of a backend.

The config file is under CONCUSSIONJS_CORE_DIR/node_modules/concussionjs-proxy/config/cjs_config.json

```	
	{
    	"server": {
        	"debug": true,
        	"accessLog": "/var/log/hipache_access.log",
        	"port": 80,
        	"workers": 1,
        	"maxSockets": 100,
        	"deadBackendTTL": 30
    	},
    	"redis": {
        	"port": 6379,
        	"host": "127.0.0.1"
    	}
	}
```

* __server.accessLog__: location of the Access logs, the format is the same as
nginx
* __server.port__: Port to listen to (HTTP)
* __server.workers__: Number of workers to be spawned (specify at least 1, the
master process does not serve any request)
* __server.maxSockets__: The maximum number of sockets which can be opened on
each backend (per worker)
* __server.deadBackendTTL__: The number of seconds a backend is flagged as
`dead' before retrying to proxy another request to it
* __server.https__: SSL configuration (omit this section to disable HTTPS)
* __redis__: Redis configuration (host & port)

### 5. Run concussionJS install scripts

From CONCUSSIONJS_CORE_DIR/install directory

```
    $ cd CONCUSSIONJS_CORE_DIR/install
    $ sudo ./install.sh -g
```

Instructions to install from source  (Option 4 above)
-----------------

### Pre-requisites
*Ubuntu 12.04 Linux or higher 
    (Note:only configuration tested, though it will likely work on other OS's in the debian family)
* git
* mongodb
* nodejs
* npm
* g++
* build-essential
* python-dev
* python-pip
* redis-server
* openjdk-6-jre-headless

We have also provided an install script for those starting from a fresh OS install. Follow optional step 4

### 1. Clone ConcussionJS Core Platform into home directory (i.e., $HOME)

From your home directory:

```
    $ cd $HOME
    $ git clone https://github.com/concussionjs/concussionjs-core
```

### 2. Run the `npm install` from the concussionjs-core directory to install all package dependencies

```
    $ cd $HOME/concussionjs-core
    $ npm install
```

### 3. Link CLI and proxy executables to /usr/local/bin directory

```
    $ sudo ln -s $HOME/concussionjs-core/bin/cli.py /usr/local/bin/cjs
    $ sudo ln -s $HOME/concussionjs-core/node_modules/cjs-proxy/bin/cjs-proxy /usr/local/bin/cjs-proxy
```

### OPTIONAL Step 4. Install all linux package dependencies

From $HOME/concussionjs-core/install/os_install/YOUR_OS directory:

```
    $ cd $HOME/concussionjs-core/install/os_install/YOUR_OS
    $ sudo ./install.sh
```

*Only Ubuntu currently supported 

### 5. Configuring the server (config.json)

The ConcussionJS Core Platform uses mongodb for object persistence, and Redis to support the rate-limiting proxy configuration.

```
    {
        "mongodb": {
            "port": 27017,
            "host": "127.0.0.1"
        },
        "redis": {
            "port": 6379,
            "host": "127.0.0.1"
        },"facebook": {
            "app_id":"",
            "app_secret":""
        },
        "aws":{
        "hosted_zone_id":"",
        "bucket_name":"cjs_uploads",
        "region":"us-east-1"
        },
        "google":{
            "clientid": ""
        }
    }
```

* __mongodb__: MongoDB configuration (host & port)
* __redis__: Redis configuration (host & port)
* __facebook__: facebook authentication configuration (app id, app secret)
* __google__: google authentication configuration (clientid)
* __aws__: Amazon web services S3 (bucket_name, region) and route53 (hosted_zone_id) configuration

### 6. Configure the cjs-proxy server (config.json)

cjs-proxy uses a Redis server to manage its configuration (and to share its state across the multiple workers). You can use the Redis server to change its configuration while it's running or simply check the health state of a backend.

The config file is under $HOME/concussionjs-core/node_modules/concussionjs-proxy/config/cjs_config.json

``` 
    {
        "server": {
            "debug": true,
            "accessLog": "/var/log/hipache_access.log",
            "port": 80,
            "workers": 1,
            "maxSockets": 100,
            "deadBackendTTL": 30
        },
        "redis": {
            "port": 6379,
            "host": "127.0.0.1"
        }
    }
```

* __server.accessLog__: location of the Access logs, the format is the same as
nginx
* __server.port__: Port to listen to (HTTP)
* __server.workers__: Number of workers to be spawned (specify at least 1, the
master process does not serve any request)
* __server.maxSockets__: The maximum number of sockets which can be opened on
each backend (per worker)
* __server.deadBackendTTL__: The number of seconds a backend is flagged as
`dead' before retrying to proxy another request to it
* __server.https__: SSL configuration (omit this section to disable HTTPS)
* __redis__: Redis configuration (host & port)

### 7. Run concussionJS install script to import redis and mongo db records, and initiate servers

From $HOME/concussionjs-core/install directory

```
    $ cd $HOME/concussionjs-core
    $ sudo ./install.sh
```

The ConcussionJS Community's Mission
=====================================

**Our mission is to bring down the barriers to creating, and learning how to create, modern applications and drive platform adoption by:**

* Applying a model-driven, rather than code driven, approach
* Reducing the technical expertise required (e.g., web server, app server, database, web services, JavaScript) to build apps
* Increasing the power of HTML and CSS skills
* Ensuring that learnability for first time users is sacred, and that time to learn a task is proportional to its complexity
* Providing a way for people to interact with the platform at all points along the interest curve (e.g., "I just heard about the platform and am still skeptical" to "I love the technology and want to deploy it behind my firewall" to "I have drunk the kool aid, and now want to contribute to the codebase") that only requires a level of effort proportional to the interest level

Our Platform Roadmap
====================
**The platform's initial target usecases are:**

* Building simple, graphically rich web applications
* Rapid prototyping (e.g., turning a static HTML prototype into an interactive, database backed application)

As the community grows and platform matures, the goal is to support increasingly sophisticated use cases, and ultimately support both enterprise-ready business applications and web-scale, consumer facing apps.

**In addition, we believe that to become a dominant platform ConcussionJS must be able to:**

* Run on-demand and on-premises
* Operate on-line and off-line
* Deploy as both a multi-tenant and single-tenant solution
* Deploy as a self-installable package, a virtual appliance, an AWS image, and even be run without deploying anything at all (e.g., a hosted JavaScript include + freely available backend services)
* Support apps for native mobile, web mobile, tablet, desktop, and, eventually, TV and larger formats
* Incrementally scale at all layers of the stack
* Provide application QA, integrity verification, and remediation
* Offer built-in analytics, dashboards, and performance management

We are just at the beginning of this journey, and there is much to do to fully realize this vision. If you've been frustrated with the inefficieny of building apps and want to take up arms against the encumbant platforms, please join us on github and contribute. 

**Immediate areas we would like your help with include, but are not limited to, the following:**

* Adding support for KnockoutJS alternatives, in particular AngularJS (www.angularjs.org)
* Integrating better security and identity management
* Improving admin console's support for data object model and instance management, including searching and displaying large record sets
* Building examples of ConcussionJS in action