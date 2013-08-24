#! /bin/bash
set -e
currentVersion="0.0.1"
apt-get -y install git
apt-get -y install mongodb
apt-get -y install openssh-client
apt-get -y install openssh-server
apt-get -y install nodejs
apt-get -y install npm
apt-get -y install g++
apt-get -y install build-essential
apt-get -y install python-dev
apt-get -y install python-pip
apt-get -y install redis-server
apt-get -y install openjdk-6-jre-headless
pip install pymongo
pip install redis

function usage
{
    echo "usage: $0 [[-g | --global] | [-h | --help]]"
}

function install_global
{
	$(npm root -g)/concussionjs-core/install/install.sh -g
}

function install_local
{
	$HOME/concussionjs-core/install/install.sh
}

if [ "$1" = "" ]; then
	install_local
fi

while [ "$1" != "" ]; do
    case $1 in
        -g | --global )			install_global
                                ;;
        -h | --help )           usage
                                exit
                                ;;    
        *)						usage
								exit 1
    esac
    shift
done
