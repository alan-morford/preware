#!/bin/bash

#build
node enyo/tools/deploy.js -o deploy/com.palm.app.preware2

#figure out how to deploy
DEVICE=1
adb get-state 1>/dev/null 2>&1 && devfound=true || devfound=false
if [ "$devfound" = "false" ]; then
    echo "lune-install: no devices found via adb, assuming emulator"
    DEVICE=0
fi
ADDRESS=localhost
PORT=5522

if [ "$2" != "" ]; then
    ADDRESS=$2
    PORT=22
fi

if [ "$3" != "" ]; then
    PORT=$3
fi

# launchCommand="/usr/bin/luna-send -n 10 -f luna://com.palm.applicationManager/open '{ \"id\": \"com.palm.app.preware2\", \"params\": { \"type\": \"install\", \"file\":\"http:\/\/packages.webosarchive.com/AppPackages/com.jonandnic.enyo.webbtracker_1.0.1_all.ipk\" } }'"
launchCommand="/usr/bin/luna-send -n 10 -f luna://com.palm.applicationManager/open '{ \"id\": \"com.palm.app.preware2\", \"params\": { } }'"
if [ $DEVICE -eq 1 ]; then
    #deploy for connected device
    adb push deploy/com.palm.app.preware2 /usr/palm/applications/com.palm.app.preware2
    adb shell restart luna-next
    sleep 15
    adb shell $launchCommand
    adb forward tcp:1122 tcp:1122
    exit
else
    #deploy for emulator
    scp -r -P $PORT deploy/com.palm.app.preware2 root@$ADDRESS:/usr/palm/applications/
    ssh root@$ADDRESS -p $PORT restart luna-next
    sleep 5
    ssh root@$ADDRESS -p $PORT $launchCommand
    exit
fi