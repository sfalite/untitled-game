# Chaos City.io — Update v6 test report

Static checks:
- All 12 tree collision circles have radius 15 world pixels (30×30 diameter); tree art remains 128×128.
- Removed the translucent atlas image overlay from road tiles.
- Removed the floor2 road marking/crosswalk renderer and its draw call.
- Confirmed the death scream asset exists and is referenced by a relative game asset path.
- Death simulation state records `deathSeq`, `deathX`, and `deathY` before teleporting the player to the respawn point.
- Client only plays a scream when it observes a new death sequence; playback is stereo-panned and attenuated by distance. Local self-death remains audible after respawn.
- Simulation bundle version bumped to 7.

Not performed:
- Official `npx moddio test` (requires SDK dependencies).
- Live browser multiplayer test on modd.io.
