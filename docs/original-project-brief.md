# Little Builder World

## Game Concept and MVP Requirements

**Project type:** Lightweight, mobile-first 3D web game\
**Primary devices:** Android tablets and phones\
**Game genre:** Single-player creative voxel sandbox\
**Working title:** Little Builder World

------------------------------------------------------------------------

## 1. The idea

Create a child-friendly building game inspired by the creative building
part of Minecraft.

The game is focused on building and imagination---not survival, combat,
competition, or multiplayer. A child should be able to open the game,
understand the controls quickly, and start creating whatever they
imagine.

The core philosophy is:

> There should be no wrong way to build. Give children simple tools and
> let their imagination lead.

The child should be able to create houses, schools, castles,
skyscrapers, bridges, cities, gardens, and completely imaginary
structures.

## 2. Main goals

-   Encourage creativity and imagination.
-   Let children experiment with shapes, colors, materials, and designs.
-   Support independent play with simple controls.
-   Make building relaxing and pressure-free.
-   Allow children to save their creations and return to them later.

## 3. What the game is---and is not

### The game should include

-   A 3D world made from cube-shaped blocks.
-   Free building and block removal.
-   A selection of different block materials and colors.
-   A peaceful world with no time pressure.
-   Simple touch controls for tablets and phones.
-   Local saving so a child can continue a previous creation.

### The game should not include

-   Multiplayer.
-   Enemies, fighting, or weapons.
-   Hunger, health, or survival systems.
-   Resource collection or crafting requirements.
-   Missions that force children to build a specific thing.
-   Accounts, chat, or social features.
-   Advertisements in the intended child-friendly experience.

## 4. Target users and devices

The main player is a young child who enjoys Minecraft-style building.

**Primary platform:** Android tablets and phones.\
**Delivery:** Browser-based web app, with the option to make it
installable as a Progressive Web App (PWA) later.

The interface must be designed for touch from the beginning. Buttons
should be large, readable, and easy for small fingers to tap. The game
should also work on desktop browsers for development and testing.

## 5. Visual direction

Use colorful, friendly, simple 3D voxel graphics.

Suggested world appearance:

-   Green grassy building area.
-   Blue sky and soft clouds.
-   A few trees and simple scenery.
-   Bright, easy-to-distinguish block colors.
-   Clean interface with large icons and short labels.

The world should feel welcoming and peaceful. Avoid cluttering the
screen with too many controls.

## 6. Simple user experience

### Home screen

Keep the home screen very simple, with three large options:

1.  **Let's Build!** --- start building.
2.  **Continue Building** --- load the saved world.
3.  **Settings** --- basic sound and graphics options when implemented.

### Building screen

The building screen should focus on the 3D world. Show only the controls
the child needs:

-   **Blocks:** choose a block.
-   **Build:** place blocks.
-   **Erase:** remove blocks.
-   **Fly:** make it easier to reach high places.
-   **Save:** save the current world.

Use icons with short labels. Avoid complicated menus and technical
terminology.

### Optional inspiration

A future button called **What can I build?** could show optional picture
ideas such as a house, castle, school, rocket, or bridge. These are
inspiration only---not missions or required tasks.

## 7. Touch controls

The game must be usable without a keyboard or mouse.

Suggested mobile controls:

  Action                     Touch interaction
  -------------------------- ----------------------------------------------------------
  Look around                Drag on the 3D world
  Zoom                       Pinch gesture or simple zoom controls
  Move                       Large on-screen direction controls or a virtual joystick
  Place a block              Select a block, then tap a valid building location
  Remove a block             Select Erase, then tap a block
  Fly                        Tap the Fly control
  Move camera higher/lower   Large + and − buttons
  Save                       Tap Save

Controls should be forgiving and easy to learn. Provide clear visual
feedback when a block is selected or placed.

## 8. Blocks and building pieces

### Initial block selection

The first version can start with these 12 block types:

1.  Grass
2.  Dirt
3.  Stone
4.  Wood
5.  Brick
6.  Sand
7.  Leaves
8.  Blue block
9.  Pink block
10. Yellow block
11. White block
12. Glass

Show block swatches or pictures instead of making children read long
names.

### Future building pieces

Add more useful pieces over time:

-   Doors
-   Windows
-   Stairs
-   Slabs and different block shapes
-   Roof pieces
-   Fences
-   Furniture: beds, chairs, tables, and sofas
-   Lamps and decorations
-   Flowers, bushes, and trees
-   Roads, streetlights, and signs

## 9. MVP scope --- Version 0.1

The first playable version should stay small. The purpose is to test
whether a child can understand the game and enjoy building.

### Required for MVP

-   A simple 3D grassy world.
-   Basic block placement.
-   Basic block removal.
-   12 initial block types.
-   Touch-friendly block selection.
-   Camera rotation and zoom.
-   Basic movement controls.
-   A simple elevated/flying camera view.
-   Save and continue building.
-   A clean home screen.
-   Works in a modern mobile browser.

### Not required for MVP

-   Multiplayer.
-   Accounts or online profiles.
-   Large procedural worlds.
-   Animals or animated characters.
-   Complex physics.
-   Advanced building tools.
-   Missions, achievements, or progression systems.
-   In-game purchases.

## 10. Suggested technology

Use a lightweight web technology stack:

  Technology                 Purpose
  -------------------------- ----------------------------------------
  Three.js                   3D graphics and voxel world
  JavaScript                 Game logic and controls
  HTML                       Game structure
  CSS                        Interface and responsive layout
  Vite                       Local development and production build
  LocalStorage / IndexedDB   Save worlds in the browser
  PWA support (later)        Installable web app and offline access

Start with Three.js and Vite. Avoid a heavyweight game engine for the
first web prototype.

## 11. Performance priorities

The game should run smoothly on common Android phones and tablets, not
just powerful computers.

Priorities:

-   Keep the initial world small and manageable.
-   Render only the block faces that need to be seen.
-   Use chunking or instancing as the world grows.
-   Limit unnecessary shadows and expensive effects.
-   Use simple materials and low-cost lighting.
-   Scale rendering quality based on device performance.
-   Avoid loading large assets unnecessarily.
-   Test on a real tablet or phone early.

## 12. Saving

For the first version, save the world locally in the browser.

The child should be able to:

-   Save the current build.
-   Continue building later.
-   Start a new world after confirmation.

Explain clearly that local browser saves are stored on that device and
browser. Clearing browser data or changing devices may remove or fail to
transfer those saves. Cloud saving can be considered later if needed.

## 13. Development roadmap

### V0.1 --- Basic Builder

-   3D world.
-   Place and remove blocks.
-   Initial block palette.
-   Basic camera controls.
-   Basic movement and fly view.
-   Save and load one world.
-   Test on Android devices.

### V0.2 --- Easier Building

-   Improve touch controls.
-   Make camera movement more intuitive.
-   Add undo and redo.
-   Add copy, move, and rotate tools.
-   Improve block selection and placement feedback.

### V0.3 --- More Things to Build

-   Doors, windows, stairs, and roofs.
-   Furniture and decorations.
-   More block materials and colors.
-   Better terrain options.

### V0.4 --- Bigger Creative Worlds

-   Multiple saved worlds.
-   More terrain types.
-   Trees, flowers, and decorative objects.
-   Optional day and night settings.
-   Improved world size and performance.

### V0.5 --- Polish and Sharing

-   Screenshot gallery of creations.
-   Optional picture inspiration.
-   PWA installation.
-   Offline support after the game has been loaded and cached.
-   Further performance and usability improvements.

## 14. How to test the MVP

Test with the intended child player, without explaining every control
first.

Observe:

-   Can the child start a world without help?
-   Can they select a block?
-   Can they place and remove blocks?
-   Can they understand how to look around?
-   Can they move or fly without frustration?
-   Can they save and continue?
-   Which controls are confusing or too small?

Improve the interface based on what the child actually finds easy.

## 15. Current project setup

The initial project scaffold uses:

-   Three.js
-   JavaScript
-   Vite
-   HTML and CSS

### Run locally

1.  Install Node.js (LTS).

2.  Open the project folder in VS Code.

3.  Open the integrated terminal.

4.  Install dependencies:

    ``` bash
    npm install
    ```

5.  Start the development server:

    ``` bash
    npm run dev
    ```

6.  Open the local address printed by Vite, usually
    `http://localhost:5173`.

### Test on a phone or tablet

Connect the computer and Android device to the same Wi-Fi network, then
run:

``` bash
npm run dev -- --host 0.0.0.0
```

Open the Network URL shown by Vite on the mobile device.

### Build for hosting

``` bash
npm run build
```

The production files are generated in the `dist` folder. These can be
deployed to a static hosting service such as Netlify.

------------------------------------------------------------------------

## Product principle to keep

**Do not tell the child what to build. Give them simple tools, a world
to build in, and the freedom to imagine.**
