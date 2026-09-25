#!/bin/bash
# Build Preware 2 for legacy webOS (Palm/HP webOS 2.x/3.x) as an installable .ipk.
#   ./build-legacy.sh           release build -> ./bin/*.ipk
#   ./build-legacy.sh --debug   also bundles debug/DebugHook.js (remote JS eval via relaunch params)
set -e
cd "$(dirname "$0")"
APPID=$(node -e 'console.log(require("./appinfo.json").id)')
OUT=deploy/$APPID
rm -rf "$OUT"
node enyo/tools/deploy.js -o "$OUT"
if [ "$1" = "--debug" ]; then
    echo "including debug hook"
    cat debug/DebugHook.js >> "$OUT/build/app.js"
fi
mkdir -p bin
palm-package "$OUT" -o bin
