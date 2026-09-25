#!/bin/bash
# Build Preware 2 for legacy webOS (Palm/HP webOS 2.x/3.x) as an installable .ipk.
#   ./build-legacy.sh           release build -> ./bin/*.ipk
#   ./build-legacy.sh --debug   also bundles debug/DebugHook.js (remote JS eval via relaunch params)
#
# The package bundles the package manager service of the original Preware
# (org.webosinternals.ipkgservice, ARM build, see legacy/) and installs it together
# with the original Preware's default feeds from legacy/pmPostInstall.script.
set -e
cd "$(dirname "$0")"
APPID=$(node -e 'console.log(require("./appinfo.json").id)')
VERSION=$(node -e 'console.log(require("./appinfo.json").version)')
OUT=deploy/$APPID
rm -rf "$OUT"
node enyo/tools/deploy.js -o "$OUT"
if [ "$1" = "--debug" ]; then
    echo "including debug hook"
    cat debug/DebugHook.js >> "$OUT/build/app.js"
fi
cp -r legacy/bin legacy/dbus legacy/upstart "$OUT/"
chmod 755 "$OUT/bin/"*

mkdir -p bin
IPK=bin/${APPID}_${VERSION}_all.ipk
rm -f "$IPK" "bin/${APPID}_${VERSION}_arm.ipk"
palm-package "$OUT" -o bin
# the installer runs these as root on install / before removal
ar q "$IPK" legacy/pmPostInstall.script legacy/pmPreRemove.script
mv "$IPK" "bin/${APPID}_${VERSION}_arm.ipk"
echo "built bin/${APPID}_${VERSION}_arm.ipk"
