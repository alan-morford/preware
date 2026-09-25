Preware 2
=======
Preware 2 is the LuneOS on-device homebrew installer.

The webos-ports feed is enabled by default, and other feeds
can be enabled or added by selecting `Manage Feeds` from
the app menu.  Downloaded packages can be installed by
selection `Install Package` from the app menu.

Building/Installation
-------
At present, this only runs under LuneOS 
(no mocking is set up to develop in the browser).

To rebuild and install on a LuneOS device attached via USB, run this command in the app directory:
`./build-and-deploy.sh`
Then, in Chrome, surf to `localhost:1122` to debug.


Legacy webOS (Palm/HP webOS 2.x/3.x)
-------
Preware 2 also runs on legacy webOS; it was developed against an HP TouchPad on webOS 3.0.5.
There it uses the package manager service of the original Preware
(`org.webosinternals.ipkgservice`, bundled in `legacy/`) and the original Preware's
default feeds, instead of `org.webosports.service.ipkg`. `preware.Platform`
(`source/model/platform.js`) decides which one to use from the user agent.

To build, run `./build-legacy.sh`. It produces `bin/com.palm.app.preware2_<version>_arm.ipk`.
The legacy build uses the app id `com.palm.app.preware2`: legacy webOS only lets apps in the
`com.palm` namespace load files of other apps, which is needed to show the icons of installed apps.
The package
which can be installed with `palm-install`, WebOS Quick Install or the original Preware.
The device must be in developer mode.

On install, `legacy/pmPostInstall.script` runs as root and
- installs the package manager service, unless an identical copy is already installed
  (it is the same service the original Preware installs, so the two can be installed side by side),
- writes the original Preware's default feed configuration to `/media/cryptofs/apps/etc/ipkg`,
  keeping feeds that were disabled disabled.

`legacy/pmPreRemove.script` removes the service again, unless the original Preware is still installed.
Removing the original Preware removes the service; reinstall Preware 2 to get it back.

Differences from LuneOS:
- Instead of sliding panels, `preware.ColumnPanels` (`source/ColumnPanels.js`) keeps the menu on the left and
  opens the other panels in columns to its right (in landscape the list stays next to the package details).
- 3D acceleration is turned off, the TouchPad's WebKit (534.6) often did not paint the package list panel.
- The legacy service can stop answering feed downloads when two updates run at once, so only one update runs
  at a time, and a feed that is silent for a minute counts as failed and the service is restarted.
- The toolbar grabber is always shown and tapping it goes back one panel, because the TouchPad has no gesture area.
- Up to 6 feeds are downloaded at the same time (service API 18 or later), like the original Preware.

`./build-legacy.sh --debug` additionally bundles `debug/DebugHook.js`: relaunching the app with
`{"pw2eval": "<js>"}` evaluates the JavaScript in the app and writes the result to the system log.
Never ship such a build.

To-do [out of date]
-----

First step is to convert needed stuff from preware/app/model to enyo. The status is as follows:

Working:
- prefs cookie should be working (tested in browser)
- basic IPKGService communictation (version, device id, tested on TouchPad)

Implemented (but untested):
- more complex IPKGService communication
- deviceProfile.js
- feeds.js
- palmProfile.js
- help.js

only Partly-Implemented:
- db8storage (used for just type)
- packageModel.js (renamed from package.js)
- filePicker.js (does some Mojo stuff to display stuff.. need to replace that)

not implemented at all:
- packages.js
- resourceHandler.js
- stayAwake.js

UI TO-DOs
- if a Repeater has no items, display a message in the blank space
