# PixiJS render prototype dependency

This project adds PixiJS 8.23.0 as an optional renderer prototype. It is loaded as a bundled npm dependency, never from a CDN at runtime.

The modd.io CLI normally manages these files with `npx moddio add pixi.js@8.23.0` and creates `npm/package-lock.json`. The package manifest is pinned to the same exact version; if your build reports a missing/invalid package lock, run that command once from the game project with network access, then commit the generated lock file.
