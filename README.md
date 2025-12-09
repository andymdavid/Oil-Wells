# Sats Miner

Sats Miner is a browser-based tribute to classic tunnel-digging arcade games built entirely in vanilla JavaScript and the HTML5 canvas. Pilot your drill deep into the soil, gobble up spinning Bitcoin coins, and race back to the surface before enemies shred your pipe or the global timer hits zero.

## Key Features

- **Hand-crafted level:** 32×17 tile grid with curved tunnel art, animated Bitcoin pellets, festive decorations, and two enemy archetypes (skittering spiders and armored worms).
- **Skillful movement:** Navigate the drill with the arrow keys. The pipe can't cross itself and must retract cleanly back to the well.
- **Pipe physics:** A polished pipe renderer keeps tubes orthogonal and lets enemies sever them if they make contact.
- **Enemy behavior:** Type 01 spiders skitter bi-directionally along open lanes and are vulnerable to the drill head. Type 02 worms are invulnerable—weave around them or retract quickly.
- **Timer pressure:** You have 150 seconds for the entire game. Time keeps counting even after losing a life; hitting zero costs a life.
- **Progressive retraction:** Holding space engages a retract that accelerates the longer you hold it, letting you zip back to safety once you’ve pushed deep.
- **Stylized presentation:** Custom surface illustration, decorated menu cover art, and HUD showing score, global timer, lives, and control hints.

## Controls

- `Arrow Keys` — Move the drill up/down/left/right within the tunnels.
- `Space` (hold) — Retract the drill back along its pipe. The speed ramps up the longer it’s held.
- `Enter` — Start the game from the home screen.

## Gameplay Tips

1. **Plan your route.** The pipe can’t cross itself; chart clean turns before diving deeper.
2. **Watch the timer.** The countdown is global—running out of time deducts a life without refilling the clock.
3. **Respect the enemies.** Type 01 spiders can be drilled head-on. Type 02 worms must be avoided entirely.
4. **Mind the pipe.** Enemies touching the pipe instantly cost you a life, so retract if a swarm draws near.
5. **Use the retract boost.** Holding space for more than a second drastically increases retract speed.

## Running the Game

1. Ensure you have a modern browser (Chrome, Firefox, Edge, Safari) that supports HTML5 canvas.
2. Clone or download this repository.
3. Open `index.html` in your browser. No build steps or dependencies are required.

## Project Structure

```
index.html    # Minimal shell that boots the canvas game
game.js       # All game logic, rendering, and states (Menu, Play, Game Over)
```

## Future Ideas

- Procedural tunnel generation or additional levels.
- Power-ups (temporary shields, time extensions, pipe repair kits).
- Audio cues for timer warnings, retraction boost, and enemy hits.
- Touch/mobile control scheme.

Enjoy mining sats! Contributions via pull requests or suggestions are welcome.
