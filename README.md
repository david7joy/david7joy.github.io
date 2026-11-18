# David Joy — The Idea Studio

A personal portfolio inside a real-time 3D studio, served from this repository by GitHub Pages. There is no build step.

## Files

- `index.html` — copy, links and the content panels (Projects, Conversations, My story, Connect)
- `app.js` — dialogs, URL state, keyboard navigation, motion preferences and the Dallas clock
- `world.js` — the Three.js scene: geometry, lighting, shaders, object picking and camera controls
- `world.css`, `studio.css` — layout, typography and panels
- `vendor/` — Three.js 0.180.0 and helpers (MIT, see `vendor/THREE-LICENSE.txt`)
- `assets/studio-panorama.png` — the still image shown when WebGL is unavailable

## Preview locally

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

The page uses JavaScript modules, so it needs a local server and will not run from the file system.

The earlier dashboard version of this site is in the git history (commit `5bf468d`).
