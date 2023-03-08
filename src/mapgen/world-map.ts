import { Map as RotJsMap } from "rot-js/lib/index";
import { RNG } from "rot-js";
import { Game } from "../game";
import { Tile, TileType } from "../tile";
import { Point } from "../point";
import { noise2 } from "./perlin";
// import { SimplexNoise, mkSimplexNoise } from "./simplex";
import { lighten, darken } from "../color"
import { Biome, mkBiomes, mkCells } from "./voronoi";

export class WorldMap {
    private map: { [key: string]: Tile };
    private mapSize: { width: number, height: number};
    private mapScale: { width: number, height: number};
    private fullMapSize;
    cells;
    biomes: Array<Biome>;
    private cache: Array<Array<Biome>>;
    private _isZoomed: boolean;
    zoomOffset: Point;
    // private noise: SimplexNoise

    constructor(private game: Game) {
        this.map = {};
        this.mapSize = game.mapSize;
        this.mapScale = game.mapScale;
        this.cache = [];

        this._isZoomed = false;
        this.zoomOffset = new Point(0,0);
        // this.noise = mkSimplexNoise(Math.random);
    }

    generateMap(width: number, height: number): void {
        this.map = {};
        this.cells = mkCells(width,height);
        this.biomes = mkBiomes(this.cells,width,height);
        this.mapSize = this.game.mapSize;
        this.fullMapSize = { width: width, height: height };
        this.mapScale = { width: width / this.mapSize.width, height: height / this.mapSize.height }
        console.log("cells",this.cells);
        console.log("biomes",this.biomes);
    }

    gameToMapScale(p: Point): Point {
        return new Point(p.x * this.mapScale.width, p.y * this.mapScale.height);
    }

    mapToGameScale(p: Point): Point {
        return new Point(p.x / this.mapScale.width, p.y / this.mapScale.height);
    }

    getZoomedPlayerPos(p: Point): Point {
        return new Point(p.x - (this.mapSize.width / 2), p.y - (this.mapSize.height / 2));
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
        // return this.map[this.coordinatesToKey(x, y)].type;
        let biome = this.getTileBiome(x,y);
        if (biome.isOcean() || biome.isMountains()) {
            return TileType.Blank;
        } else {
            return TileType.Floor;
        }
    }

    getTileBiome(x: number, y: number): Biome {
        let cached = this.cache?.[x]?.[y];
        let biome:Biome;
        if (cached === undefined) {
            let x_noise = 10 * noise2(100 + x/ 10, 100 + y / 13);
            let y_noise = 10 * noise2(200 + x/ 10, 200 + y / 13);
    
            let cell = this.cells.delaunay.find(x + x_noise,y + y_noise);
            let biome = Object.create(this.biomes[cell]);

            let noise_val = noise2(x * 17.5,y * 25.2);

            if (noise_val > 0.2) {
                biome.baseColor = lighten(biome.baseColor).toString();
    
            } else if (noise_val < -0.2) {
                biome.baseColor = darken(biome.baseColor).toString();
            }

            biome.fg = lighten(lighten(biome.baseColor));
            
            if (this.cache[x] === undefined) {
                this.cache[x] = []
            }

            this.cache[x][y] = biome;
            return biome;
        } else {
            return cached;
        }
    }

    isPassable(x: number, y: number): boolean {
        let biome = this.getTileBiome(x,y);

        if (biome.isOcean() || biome.isMountains()) {
            return false;
        } else {
            return true;
        }
    }

    draw(playerpos: Point): void {
        if (!this._isZoomed) {
            for (let x = 0; x < this.mapSize.width; x+= 1) {
                for (let y = 0; y < this.mapSize.height; y += 1) {
                    let key = this.coordinatesToKey(x, y);
                    let screen_pos = new Point(x,y);
                    let map_pos = this.gameToMapScale(screen_pos);
                    // let glyph = this.map[key].glyph;
                    // let x_noise = 10 * noise2(100 + map_pos.x/ 10, 100 + map_pos.y / 13);
                    // let y_noise = 10 * noise2(200 + map_pos.x/ 10, 200 + map_pos.y / 13);
                    // let cell = this.cells.delaunay.find(map_pos.x + x_noise,map_pos.y + y_noise);

                    // let biome = this.biomes[cell];
                    let biome = this.getTileBiome(map_pos.x,map_pos.y);

                    let glyph = Tile.floor.glyph;
                    if (biome.isOcean() || biome.isMountains()) {
                        glyph = Tile.blank.glyph;
                    }

                    // let cell = this.cells.delaunay.find(map_pos.x,map_pos.y);
                    let bg = biome.baseColor;
                    let fg = biome.baseColor;
                    // let fg = lighten(lighten(biome.baseColor)).toString();

                    // let noise_val = noise2(screen_pos.x * 17.5,screen_pos.y * 25.2);
        
                    // if (noise_val > 0.2) {
                    //     bg = lighten(bg).toString();
                    // } else if (noise_val < -0.2) {
                    //     bg = darken(bg).toString();
                    // }
        
                    this.game.draw(screen_pos, glyph, bg, fg);
                }
            }    
        } else if (this._isZoomed) {
            let offset = new Point(playerpos.x - (this.mapSize.width / 2), playerpos.y - (this.mapSize.height / 2));

            for (let x = 0; x < this.mapSize.width; x+= 1) {
                for (let y = 0; y < this.mapSize.height; y += 1) {
                    let key = this.coordinatesToKey(x, y);
                    let map_pos = new Point(x + offset.x, y + offset.y);
                    let screen_pos = new Point(x,y);
                    // console.log("offset:",offset, "screen_pos:", screen_pos, "map_pos:",map_pos);
                    // let map_pos = new Point(x + this.zoomOffset.x, y + this.zoomOffset.y);
            // for (let key in this.map) {
                    // let pos = this.keyToPoint(key);
                    // let scaled_pos = new Point(this.zoomOffset.x + (pos.x / 4.0), this.zoomOffset.y + (pos.y / 3.0));
                    // let glyph = this.map[key].glyph;
                    // let glyph = Tile.floor.glyph;
                    // let x_noise = 10 * noise2(100 + map_pos.x/ 10, 100 + map_pos.y / 13);
                    // let y_noise = 10 * noise2(200 + map_pos.x/ 10, 200 + map_pos.y / 13);
                    // let cell = this.cells.delaunay.find(map_pos.x + x_noise,map_pos.y + y_noise);

                    // let biome = this.biomes[cell];
                    let biome = this.getTileBiome(map_pos.x,map_pos.y);

                    let glyph = Tile.floor.glyph;
                    if (biome.isOcean() || biome.isMountains()) {
                        glyph = Tile.blank.glyph;
                    }


                    let bg = biome.baseColor;
                    // let fg = lighten(lighten(biome.baseColor)).toString();
                    // TODO: add zooming back in, but cached
                    let fg = biome.fg;

                    // let noise_val = noise2(map_pos.x * 17.5,map_pos.y * 25.2);
        
                    // if (noise_val > 0.2) {
                    //     bg = lighten(bg).toString();
                    // } else if (noise_val < -0.2) {
                    //     bg = darken(bg).toString();
                    // }
        
                    this.game.draw(screen_pos, glyph, bg, fg);
                }
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

            // let newOffset = new Point(4.0 * Math.floor(playerPos.x / 4.0), 3.0 * Math.floor(playerPos.y / 3.0));
            // // buggy, TODO fix
            // let x_center_off = Math.floor(this.mapSize.width / 2) / 4.0;
            // let y_center_off = Math.floor(this.mapSize.height / 2) / 3.0;

            // // let newPos = new Point(((playerPos.x/4.0) - newOffset.x),((playerPos.y/3.0) - newOffset.y));
            // this.zoomOffset = new Point(newOffset.x - x_center_off, newOffset.y - y_center_off);
            // console.log("old pos:",playerPos, "new offset:",newOffset);
        }
    }

    zoomOut(playerPos: Point): void {
        if (this._isZoomed) {
            console.log("zooming out at",playerPos);
            this._isZoomed = false;
            // this.zoomOffset = new Point(0,0);            
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