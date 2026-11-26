# Tiled Export

The F3 diagnostics overlay includes **EXPORT TILED MAP** only when the local player's modd.io name equals `free2win` (case-insensitive). The map export contains the full 42×42 tile layout and object geometry. The portable ZIP also includes rasterized building/prop artwork so the portable map looks like the game immediately when opened in Tiled.

In an owner editable draft preview, the export also writes `maps/chaos-city-export.tmj` via the modd.io SDK `project.saveFile` API. That project-saved map keeps the geometry editable and references the current project's existing assets. Tiled image paths are relative; keep the `assets` folder beside the TMJ or use the generated portable ZIP.
