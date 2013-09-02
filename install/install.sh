make --directory $HOME/concussionjs-core/install/mon install
#echo "starting concussionjs-core npm install"
#npm --prefix $HOME/concussionjs-core install $HOME/concussionjs-core
#Make cjs executable accessible globally
chown -R concussed:concussed $HOME
#ln -s /usr/local/lib/node_modules $HOME/concussionjs-core/proxy/node_modules
#install upstart scripts
rm -f $HOME/concussionjs-core/node_modules/concussionjs-core
ln -s $HOME/concussionjs-core $HOME/concussionjs-core/node_modules/concussionjs-core

cp -f $HOME/concussionjs-core/install/upstart_scripts/cjs-proxy.conf /etc/init
cp -f $HOME/concussionjs-core/install/upstart_scripts/api.conf /etc/init
cp -f $HOME/concussionjs-core/install/upstart_scripts/samples.conf /etc/init
cp -f $HOME/concussionjs-core/install/upstart_scripts/redis-server.conf /etc/init
cp -f $HOME/concussionjs-core/install/concussion.sh /etc/profile.d
chmod +x /etc/profile.d/concussion.sh
su - concussed -c /etc/profile.d/concussion.sh
/etc/init.d/redis-server stop
cp -f $HOME/concussionjs-core/install/dump.rdb /var/lib/redis/dump.rdb
/etc/init.d/redis-server start
#mongo imports
mongoimport --db concussion_prod --collection apps --file $HOME/concussionjs-core/install/mongodb_initialize/apps.json --type json
mongoimport --db concussion_prod --collection proxies --file $HOME/concussionjs-core/install/mongodb_initialize/proxies.json --type json
mongoimport --db concussion_prod --collection cjs_objects --file $HOME/concussionjs-core/install/mongodb_initialize/cjs_objects.json --type json
#starting services
service redis-server restart
service cjs-proxy start
su - concussed -c "cjs app --start api"
su - concussed -c "cjs app --start samples"