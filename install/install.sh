#! /bin/bash
set -e

root_dir=

function set_root_dir_global
{
	root_dir=$(npm root -g)
}

function set_root_dir_local
{
	root_dir=$(npm root)
}

if [ "$1" = "" ]; then
	set_root_dir_local
fi

case $1 in
    -g | --global )			set_root_dir_global
                            ;;
    -h | --help )           usage
                            exit
                            ;;    
    *)						usage
                            exit 1
    esac
done

make --directory $root_dir/concussionjs-core/install/mon install
#echo "starting concussionjs-core npm install"
#npm --prefix $HOME/concussionjs-core install $HOME/concussionjs-core
#Make cjs executable accessible globally
chown -R concussed:concussed $root_dir
#ln -s /usr/local/lib/node_modules $HOME/concussionjs-core/proxy/node_modules
#install upstart scripts
rm -f $root_dir/concussionjs-core/node_modules/concussionjs-core
ln -s $root_dir/concussionjs-core $root_dir/concussionjs-core/node_modules/concussionjs-core

cp -f $root_dir/concussionjs-core/install/upstart_scripts/cjs-proxy.conf /etc/init
cp -f $root_dir/concussionjs-core/install/upstart_scripts/api.conf /etc/init
cp -f $root_dir/concussionjs-core/install/upstart_scripts/samples.conf /etc/init
cp -f $root_dir/concussionjs-core/install/upstart_scripts/redis-server.conf /etc/init

if [ $1 = "-g" ] || [ $1 = "--global" ]; then
	cp -f $root_dir/concussionjs-core/install/concussion_global.sh /etc/profile.d/concussion.sh	
fi

if [ $1 = "" ]; then
	cp -f $root_dir/concussionjs-core/install/concussion.sh /etc/profile.d	
fi

chmod +x /etc/profile.d/concussion.sh
su - concussed -c /etc/profile.d/concussion.sh
/etc/init.d/redis-server stop
cp -f $root_dir/concussionjs-core/install/dump.rdb /var/lib/redis/dump.rdb
/etc/init.d/redis-server start
#mongo imports
mongoimport --db concussion_prod --collection apps --file $root_dir/concussionjs-core/install/mongodb_initialize/apps.json --type json
mongoimport --db concussion_prod --collection proxies --file $root_dir/concussionjs-core/install/mongodb_initialize/proxies.json --type json
mongoimport --db concussion_prod --collection cjs_objects --file $root_dir/concussionjs-core/install/mongodb_initialize/cjs_objects.json --type json
#starting services
service redis-server restart
service cjs-proxy start
su - concussed -c "cjs app --start api"
su - concussed -c "cjs app --start samples"
