#! /bin/bash
set -e

root_dir=

function usage
{
    echo "usage: $0 [[-g | --global] | [-h | --help] | [-d | --debian]]"
}

function set_root_dir_global
{
	root_dir=$(npm root -g)/concussionjs-core
}

function set_root_dir_local
{
	root_dir=$(pwd)
}

function set_root_dir_prefix
{
        root_dir=$1
}

if [ "$1" = "" ]; then
	set_root_dir_local
fi

if [ "$1" = "-d" ]; then
        set_root_dir_local
fi


case $1 in
    -g | --global )	    set_root_dir_global
                            ;;
    -p | --prefix)	    shift
			    set_root_dir_prefix
			    ;;
    -h | --help )           usage
                            exit
                            ;;
esac
pip install pymongo
pip install redis
make --directory $root_dir/install/mon install
echo "starting concussionjs-core npm install"
#Make cjs executable accessible globally
chown -R concussed:concussed $root_dir/..

#install upstart scripts
rm -f $root_dir/node_modules/concussionjs-core
ln -s $root_dir $root_dir/node_modules/concussionjs-core

cp -f $root_dir/install/upstart_scripts/api.conf /etc/init
cp -f $root_dir/install/upstart_scripts/samples.conf /etc/init
cp -f $root_dir/install/upstart_scripts/redis-server.conf /etc/init

if [ "$1" = "-g" ]; then
	cp -f $root_dir/install/concussion_global.sh /etc/profile.d/concussion.sh	
	cp -f $root_dir/install/upstart_scripts/cjs-proxy-global.conf /etc/init/cjs-proxy.conf
fi

if [ "$1" = "" ]; then
	sed -e "s;@HOME@;$root_dir;" $root_dir/install/concussion.sh > /etc/profile.d/concussion.sh
	sed -e "s;@HOME@;$root_dir;" $root_dir/install/upstart_scripts/cjs-proxy.conf > /etc/init/cjs-proxy.conf
fi

if [ "$1" = "-d" ]; then
	sed -e "s;@HOME@;$root_dir;" $root_dir/install/concussion.sh > /etc/profile.d/concussion.sh
        ln -s $root_dir/bin/cli.py /usr/local/bin/cjs
        ln -s $root_dir/node_modules/concussionjs-proxy/bin/cjs-proxy /usr/local/bin/cjs-proxy
        sed -e "s;@HOME@;$root_dir;" $root_dir/install/upstart_scripts/cjs-proxy.conf > /etc/init/cjs-proxy.conf
fi

chmod +x /etc/profile.d/concussion.sh
su - concussed -c /etc/profile.d/concussion.sh
/etc/init.d/redis-server stop
cp -f $root_dir/install/dump.rdb /var/lib/redis/dump.rdb
/etc/init.d/redis-server start
#mongo imports
mongoimport --db concussion_prod --collection apps --file $root_dir/install/mongodb_initialize/apps.json --type json
mongoimport --db concussion_prod --collection proxies --file $root_dir/install/mongodb_initialize/proxies.json --type json
mongoimport --db concussion_prod --collection cjs_objects --file $root_dir/install/mongodb_initialize/cjs_objects.json --type json
#starting services
service redis-server start
service cjs-proxy start
su - concussed -c "cjs app --start api"
su - concussed -c "cjs app --start samples"
