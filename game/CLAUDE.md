# Snake Game — Chrome Extension

## Project Overview

A snake game built as a Chrome extension that overrides the new tab page. Every time the user opens a new tab, they see the snake game.

## Tech Stack

- **Vanilla HTML, CSS, JavaScript** — no frameworks
- **Canvas API** — for rendering the game (2D context)
- **Manifest V3** — current Chrome extension standard

## Extension Type

- **New tab override** — replaces the default Chrome new tab page
- Configured via `chrome_url_overrides.newtab` in `manifest.json`
- Full tab context, persistent while open, standard web page behavior

## Development Setup

- **Local/unpacked extension** — not published to the Chrome Web Store
- Load via `chrome://extensions` > Developer mode > "Load unpacked"
- Refresh the extension card after code changes to reload

## Key Files

- `manifest.json` — extension config (Manifest V3)
- `newtab.html` — main HTML page (canvas + message overlay)
- `style.css` — styling
- `game.js` — snake game logic and Canvas rendering

## Game Design

### Visual Style
- **Full screen** — canvas fills the entire viewport, tile count calculated dynamically based on window size
- **Black background** with all-white theme
- **Snake**: head is pure white (`#fff`), body segments gradually fade to gray (brightness decreases by 8 per segment, minimum `rgb(100,100,100)`)
- **Food**: white circle
- **Text**: white, centered on screen

### Mechanics
- **Grid-based movement** — 20px tile size, snake moves one tile per tick
- **Game speed**: 150ms per tick (`setInterval`)
- **Wrap-around walls** — snake exits one edge and appears on the opposite side (no wall death)
- **Only way to lose**: self-collision (head hits own body)
- **Score**: hidden during gameplay, only shown on game over screen
- **Controls**: arrow keys to move, first key press starts the game, any arrow key restarts after game over
- **Direction reversal blocked** — pressing the opposite of current direction is ignored

### Game Loop (per tick)
1. Apply queued direction from input
2. Calculate new head position
3. Wrap coordinates if out of bounds
4. Check self-collision → game over if hit
5. Add new head to front of snake array
6. If food eaten: increment score, spawn new food (don't remove tail)
7. If no food: remove tail (snake stays same length)
8. Clear canvas and redraw everything

### Input Handling
- Keyboard input sets `nextDirection`, not `direction` directly
- Direction is applied at the start of each tick, keeping input decoupled from the game loop
- Arrow key default scroll behavior is prevented

## Design Decisions

- New tab override chosen over popup (full page, no close-on-click-away issues)
- Vanilla JS chosen over frameworks to keep it lightweight and avoid CSP complications
- `setInterval` over `requestAnimationFrame` — Snake uses discrete steps, not smooth animation
- Canvas resizes on window resize events
