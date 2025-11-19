# brackets-viewer.js

[![npm](https://img.shields.io/npm/v/brackets-viewer.svg)](https://www.npmjs.com/package/brackets-viewer)
[![Downloads](https://img.shields.io/npm/dt/brackets-viewer.svg)](https://www.npmjs.com/package/brackets-viewer)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/brackets-viewer/badge?style=rounded)](https://www.jsdelivr.com/package/npm/brackets-viewer)
[![Package Quality](https://packagequality.com/shield/brackets-viewer.svg)](https://packagequality.com/#?package=brackets-viewer)

A simple library to display tournament brackets (round-robin, swiss, single elimination, double elimination).

It contains all the logic needed to display tournaments.

### Features

- Supports translation ([i18next](https://www.i18next.com/)), which also allows you to change the vocabulary
- It was developed in vanilla JS, so you can [use it in any framework](https://github.com/Drarig29/brackets-viewer.js/discussions/74)
- A full working example of creating and displaying brackets (see [`./demo/with-ui.html`](demo/with-ui.html))
- Themes supported, with CSS variables (see [`./demo/themes`](/demo/themes))
- Display participant images next to their name ([example](https://github.com/Drarig29/brackets-viewer.js/blob/668aae1ed9db41ab21665459635cd6b71cad247c/demo/with-api.html#L34-L38))
- Do actions when a match is clicked ([example](https://github.com/Drarig29/brackets-viewer.js/blob/ed31fc4fc43336d3543411f802a8b1d9d592d467/demo/with-api.html#L53), [feature request](https://github.com/Drarig29/brackets-viewer.js/discussions/80))
- Custom round names: do you want to say "Semi Finals" instead of "Round 2"? ([example](https://github.com/Drarig29/brackets-viewer.js/blob/e548e5ac8369d2a692366718c04b24b32190866c/demo/with-api.html#L46-L59), [feature request](https://github.com/Drarig29/brackets-viewer.js/discussions/93))

![Screenshot](screenshot.png)

## How to use?

Import the library from npm using [jsDelivr](https://www.jsdelivr.com/) (you can replace `@latest` to lock a specific version):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/brackets-viewer@latest/dist/brackets-viewer.min.css" />
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/brackets-viewer@latest/dist/brackets-viewer.min.js"></script>
```

Or from GitHub with (you can replace `@master` by any branch name, tag name or commit id):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Drarig29/brackets-viewer.js@master/dist/brackets-viewer.min.css" />
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/Drarig29/brackets-viewer.js@master/dist/brackets-viewer.min.js"></script>
```

Now, you can use it with data generated using [brackets-manager](https://github.com/Drarig29/brackets-manager.js) or with crafted data following the [brackets-model](https://github.com/Drarig29/brackets-model).

**Usage:**

This will find a **unique** element with a `.brackets-viewer` class, and **append** to it:

```js
window.bracketsViewer.render({
  stages: data.stage,
  matches: data.match,
  matchGames: data.match_game,
  participants: data.participant,
});
```

If you want to clear the container's content before rendering again, use this:

```js
window.bracketsViewer.render({
  stages: data.stage,
  matches: data.match,
  matchGames: data.match_game,
  participants: data.participant,
}, {
  clear: true,
});
```

If you have multiple elements with a `.brackets-viewer` class, you must provide a `selector`:

```js
window.bracketsViewer.render({
  stages: data.stage,
  matches: data.match,
  matchGames: data.match_game,
  participants: data.participant,
}, {
  selector: '#example',
});
```

See the [full documentation](https://drarig29.github.io/brackets-docs/reference/viewer/interfaces/Config.html) for the `render()` configuration.

## Theming

The viewer styles are driven by CSS variables prefixed with `--bv-*` (backgrounds, text, highlights, borders, spacing, etc.). You can override them on any `.brackets-viewer` container or on theme-specific classes. Pass `theme` in the config to automatically add a `.bv-theme-{theme}` class to the root element:

```ts
import { renderBracket } from 'brackets-viewer';

renderBracket('#my-bracket', data, { theme: 'dashboard' });
```

Then define the variables in your stylesheet (Tailwind, plain CSS, etc.):

```css
.brackets-viewer.bv-theme-dashboard {
  --bv-bg-color: #0f172a;
  --bv-text-color: #f8fafc;
  --bv-border-color: #1e293b;
  --bv-win-color: #22c55e;
  --bv-lose-color: #ef4444;
  /* extend or override any other --bv-* token */
}
```

The default values and an example dark theme live in `src/style.scss` if you need a reference to the available tokens.

## Mapping backend DTOs

If your backend exposes stage structures using the OpenAPI schema shown in the docs, you can convert that response to the viewer's `ViewerData` shape with `convertStageStructureToViewerData`. The helper is exported from the package and also attached to the global build at `window.bracketsViewerDTO.convertStageStructureToViewerData`.

```ts
import {
  convertStageStructureToViewerData,
  type StageStructureResponse,
  type StageStandingsResponse,
} from 'brackets-viewer';

const viewerData = convertStageStructureToViewerData(
  stageStructureResponse,
  stageStandingsResponse,
  { stageName: 'Quarterfinals', stageNumber: 2 },
);

renderBracket('#target', viewerData, { theme: 'dashboard' });
```

See `demo/with-api.html` + `demo/api-data.json` for a runnable example that mirrors the OpenAPI DTOs.

## Demos

To quickly test, you can also try the demos by visiting `./demo/index.html`.

`demo/with-api.html` uses the DTO sample stored in `demo/api-data.json`, so it works offline without `json-server`. `demo/with-showcase.html` lets you pick any supported format (round-robin, swiss, single/double elim) and renders multiple mock tournaments straight from DTO data if you want to eyeball different layouts. If you still want to spin up `json-server` for the legacy `demo/db.json` file (used by the storage demo), you can:

- Run the npm script named `db` to serve the static database file `./demo/db.json`

  ```bash
  npm run db
  ```

- Or point `json-server` to your own generated data

  ```bash
  npx json-server --watch path/to/brackets-manager/db.json
  ```

## Credits

This library has been created to be used by the [Nantarena](https://nantarena.net/).

It has been inspired by:

- [Toornament](https://www.toornament.com/en_US/) (design inspiration)
- [Responsive Tournament Bracket](https://codepen.io/jimmyhayek/full/yJkdEB) (connection between matches in plain CSS)
