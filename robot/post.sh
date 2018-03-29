#!/bin/bash

if [[ "$#" -ne "2" ]]; then
	echo "usage: $0 <username> <password>"
	echo "If on central WiFi and not logged in, sends a login request."
	echo "Otherwise fails and does nothing interesting."
	echo "Requires curl and perl to be installed."
	exit 1
fi

gate_num=$(curl "google.com" | perl -ne '/https:\/\/wlc(\d+)/; print "$1\n"')

echo "${gate_num}"

curl -X POST \
--referer "https://wlc${gate_num}-web.net.ed.ac.uk/login.html?redirect=detectportal.firefox.com/success.txt" \
--user-agent "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/60.0" \
-H "Host: wlc${gate_num}-web.net.ed.ac.uk" \
-H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
-H "Accept-Language: en-US,en;q=0.5" \
-H "Accept-Encoding: gzip, deflate" \
-H "Content-Type: application/x-www-form-urlencoded" \
-H "Connection: close" \
-H "Upgrade-Insecure-Requests: 1" \
--data "buttonClicked=4&err_flag=0&err_msg=&info_flag=0&info_msg=&redirect_url=http%3A%2F%2Fdetectportal.firefox.com%2Fsuccess.txt&network_name=Guest+Network&username=$1&password=$2" \
"https://wlc${gate_num}-web.net.ed.ac.uk/login.html"

