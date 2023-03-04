import { Map as RotJsMap } from "rot-js/lib/index";
import { RNG } from "rot-js";
import { Game } from "../game";
import { Tile, TileType } from "../tile";
import { Point } from "../point";
import { noise2 } from "./perlin";
// import { SimplexNoise, mkSimplexNoise } from "./simplex";
import { lighten, darken } from "../color"
import { mkBiomes, mkCells } from "./voronoi";

export class WorldMap {
    private map: { [key: string]: Tile };
    private cells;
    private biomes;
    // private noise: SimplexNoise

    constructor(private game: Game) {
        this.map = {};
        // this.noise = mkSimplexNoise(Math.random);
    }

    generateMap(width: number, height: number): void {
        this.map = {};
        this.cells = mkCells(width,height);
        this.biomes = mkBiomes(this.cells,width,height);
        console.log("cells",this.cells);
        console.log("biomes",this.biomes);

        for (let x = 0; x < width; x+= 1) {
            for (let y = 0; y < height; y += 1) {

              this.map[this.coordinatesToKey(x, y)] = Tile.floor;
                
            }
        }
        
        // let digger = new RotJsMap.Digger(width, height);
        // digger.create(this.diggerCallback.bind(this));
    }

    setTile(x: number, y: number, tile: Tile): void {
        this.map[this.coordinatesToKey(x, y)] = tile;
    }

    getRandomTilePositions(type: TileType, quantity: number = 1): Point[] {
        let buffer: Point[] = [];
        let result: Point[] = [];
        for (let key in this.map) {
            if (this.map[key].type === type) {
                buffer.push(this.keyToPoint(key));
            }
        }

        let index: number;
        while (buffer.length > 0 && result.length < quantity) {
            index = Math.floor(RNG.getUniform() * buffer.length);
            result.push(buffer.splice(index, 1)[0]);
        }
        return result;
    }

    getTileType(x: number, y: number): TileType {
        return this.map[this.coordinatesToKey(x, y)].type;
    }

    getTileBiome(x: number, y: number): string {
        let cell = this.cells.delaunay.find(x,y);
        let bg = this.biomes[cell];
        let noise_val = noise2(x * 17.5,y * 25.2);
        if (noise_val > 0.2) {
            bg = lighten(bg).toString();

        } else if (noise_val < -0.2) {
            bg = darken(bg).toString();
        }

        return bg;
    }

    isPassable(x: number, y: number): boolean {
        return this.coordinatesToKey(x, y) in this.map;
    }

    draw(): void {
        for (let key in this.map) {
            let pos = this.keyToPoint(key);
            let glyph = this.map[key].glyph;
            let cell = this.cells.delaunay.find(pos.x,pos.y);
            let bg = this.biomes[cell];
            let fg = lighten(lighten(this.biomes[cell])).toString();
            // let noise_val = this.noise.noise2D(pos.x * 17.5,pos.y * 25.2);
            let noise_val = noise2(pos.x * 17.5,pos.y * 25.2);

            // let bg = this.coordinatesToKey(pos.x,pos.y)

            // console.log(pos,noise_val);
            if (noise_val > 0.2) {
                bg = lighten(bg).toString();

            } else if (noise_val < -0.2) {
                bg = darken(bg).toString();
            }
            // console.log(pos.x,pos.y,noise_val, bg);

            this.game.draw(pos, glyph, bg, fg);
        }
    }

    private coordinatesToKey(x: number, y: number): string {
        return x + "," + y;
    }

    private keyToPoint(key: string): Point {
        let parts = key.split(",");
        return new Point(parseInt(parts[0]), parseInt(parts[1]));
    }

    private diggerCallback(x: number, y: number, wall: number): void {
        if (wall) {
            return;
        }
        this.map[this.coordinatesToKey(x, y)] = Tile.floor;
    }
}