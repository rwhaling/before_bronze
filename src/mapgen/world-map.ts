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
    private mapSize;
    private mapScale;
    private cells;
    private biomes;
    private _isZoomed: boolean;
    zoomOffset: Point;
    // private noise: SimplexNoise

    constructor(private game: Game) {
        this.map = {};
        this.mapSize = game.mapSize;
        this.mapScale = game.mapScale;

        this._isZoomed = false;
        this.zoomOffset = new Point(0,0);
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

    draw(playerpos: Point): void {
        if (!this._isZoomed) {
            for (let key in this.map) {
                let pos = this.keyToPoint(key);
                let glyph = this.map[key].glyph;
                let cell = this.cells.delaunay.find(pos.x,pos.y);
                let bg = this.biomes[cell];
                let fg = lighten(lighten(this.biomes[cell])).toString();
                let noise_val = noise2(pos.x * 17.5,pos.y * 25.2);
    
                if (noise_val > 0.2) {
                    bg = lighten(bg).toString();
                } else if (noise_val < -0.2) {
                    bg = darken(bg).toString();
                }
    
                this.game.draw(pos, glyph, bg, fg);
            }    
        } else if (this._isZoomed) {
            for (let key in this.map) {
                let pos = this.keyToPoint(key);
                // let scaled_pos = new Point(pos.x * this.mapScale.x, pos.y * this.mapScale.y)
                // 0,0 in map coords = the player position at global 
                // let scaled_x = (pos.x - x_center_off) * this.mapScale.width;
                // let scaled_y = (pos.y - y_center_off) * this.mapScale.height;
                let scaled_pos = new Point(this.zoomOffset.x + (pos.x / 4.0), this.zoomOffset.y + (pos.y / 3.0));
                let glyph = this.map[key].glyph; // TODO fix
                let cell = this.cells.delaunay.find(scaled_pos.x,scaled_pos.y);
                let bg = this.biomes[cell];
                let fg = lighten(lighten(this.biomes[cell])).toString();
                let noise_val = noise2(pos.x * 17.5,pos.y * 25.2);
    
                if (noise_val > 0.2) {
                    bg = lighten(bg).toString();
                } else if (noise_val < -0.2) {
                    bg = darken(bg).toString();
                }
    
                this.game.draw(pos, glyph, bg, fg);
            }
        }
    }

    isZoomed(): Boolean {
        return this._isZoomed;
    }

    zoomIn(playerPos: Point): void {
        if (!this._isZoomed) {
            console.log("zooming in at",playerPos);
            this._isZoomed = true;
            let newOffset = new Point(4.0 * Math.floor(playerPos.x / 4.0), 3.0 * Math.floor(playerPos.y / 3.0));
            // buggy, TODO fix
            let x_center_off = Math.floor(this.mapSize.width / 2) / 4.0;
            let y_center_off = Math.floor(this.mapSize.height / 2) / 3.0;

            let newPos = new Point(((playerPos.x/4.0) - newOffset.x),((playerPos.y/3.0) - newOffset.y));
            this.zoomOffset = new Point(newOffset.x - x_center_off, newOffset.y - y_center_off);
            console.log("old pos:",playerPos, "new offset:",newOffset, "new position:", newPos);
        }
    }

    zoomOut(playerPos: Point): void {
        if (this._isZoomed) {
            console.log("zooming out at",playerPos);
            this._isZoomed = false;
            this.zoomOffset = new Point(0,0);            
        }
    }


    private coordinatesToKey(x: number, y: number): string {
        return x + "," + y;
    }

    private keyToPoint(key: string): Point {
        let parts = key.split(",");
        return new Point(parseInt(parts[0]), parseInt(parts[1]));
    }
}