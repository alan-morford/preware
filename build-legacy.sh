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
# On legacy webOS only apps in the com.palm namespace may load files of other apps,
# which Preware needs to show the icons of installed apps. (LuneOS keeps its own id.)
APPID=com.palm.app.preware2
VERSION=$(node -e 'console.log(require("./appinfo.json").version)')
OUT=deploy/$APPID
rm -rf "$OUT"
node enyo/tools/deploy.js -o "$OUT"
node -e 'var f=process.argv[1], a=JSON.parse(require("fs").readFileSync(f)); a.id=process.argv[2]; require("fs").writeFileSync(f, JSON.stringify(a, null, "\t"));' "$OUT/appinfo.json" "$APPID"
if [ "$1" = "--debug" ]; then
    echo "including debug hook"
    cat debug/DebugHook.js >> "$OUT/build/app.js"
fi
cp -r legacy/bin legacy/dbus legacy/upstart "$OUT/"
chmod 755 "$OUT/bin/"*
sed -i -e "s/@APPID@/$APPID/g" "$OUT/upstart/preware2-service-check"

mkdir -p bin
IPK=bin/${APPID}_${VERSION}_all.ipk
rm -f "$IPK" "bin/${APPID}_${VERSION}_arm.ipk"
palm-package "$OUT" -o bin
# the installer runs these as root on install / before removal
SCRIPTS=$(mktemp -d)
sed -e "s/^PID=.*/PID=\"$APPID\"/" legacy/pmPostInstall.script > "$SCRIPTS/pmPostInstall.script"
cp legacy/pmPreRemove.script "$SCRIPTS/"
chmod 755 "$SCRIPTS/"*
ar q "$IPK" "$SCRIPTS/pmPostInstall.script" "$SCRIPTS/pmPreRemove.script"
rm -rf "$SCRIPTS"
mv "$IPK" "bin/${APPID}_${VERSION}_arm.ipk"
echo "built bin/${APPID}_${VERSION}_arm.ipk"
