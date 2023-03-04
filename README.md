# dawn_of_bronze [7DRL 2023 edition]

Dawn of Bronze is an open-world rogue like about hunting, gathering, and stealth, set in the late neolithic - most conflict is between humans (the player) and delicious animals, but an underlying theme is the transition from hunter-gatherer lifestyles to agriculture, the establishment of militarized city-states, the early domestication of horses, and the origin of smelting.

## Credits/Resources

- Built with [rot.js](https://github.com/ondras/rot.js/blob/master/src/constants.ts)
- Project stubs bootstrapped from Mizar999's [rotjs-typescript-basics](https://github.com/Mizar999/rotjs-typescript-basics)
- Drawing on procedural map gen techniques from [Red Blob Games](http://www-cs-students.stanford.edu/~amitp/game-programming/polygon-map-generation/) and [Here Dragons Abound](https://heredragonsabound.blogspot.com/2016/10/making-islands.html)
- I did some preliminary work on map gen in d3.js, notebooks viewable here: [https://observablehq.com/d/b3ca2e42cae284b6](https://observablehq.com/d/b3ca2e42cae284b6)

## Instructions

```bash
    npm install
```

```bash
    npm run build
```

```bash
    npm run serve
```

```bash
    npx concurrently npm:watch npm:serve
```