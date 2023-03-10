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
    private dist_cache: Array<Array<number>>;
    private _isZoomed: boolean;
    zoomOffset: Point;

    constructor(private game: Game) {
        this.map = {};
        this.mapSize = game.mapSize;
        this.mapScale = game.mapScale;
        this.cache = [];
        this.dist_cache = [];

        this._isZoomed = true;
        this.zoomOffset = new Point(0,0);
    }

    generateMap(width: number, height: number): void {
        this.map = {};
        this.cells = mkCells(width,height);
        this.biomes = mkBiomes(this.cells,width,height);
        this.mapSize = this.game.mapSize;
        this.fullMapSize = { width: width, height: height };
        this.mapScale = { width: width / this.mapSize.width, height: height / this.mapSize.height }
        for (let i of this.biomes) {
            console.log("creating random point for biome ",i)
            let tries = 10;
            let t = 0;
            while (t < tries) {
                let randomPoint = new Point(i.center.x + RNG.getUniformInt(-6,6), i.center.y + RNG.getUniformInt(-6,6));
                if (this.getTileBiome(randomPoint.x,randomPoint.y).cell === i.cell) {
                    i.randPoint = randomPoint;
                    break;
                }
                else {
                    tries += 1;
                }
            }
        }
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

    visDist(x1, y1, x2, y2): number {
        let x_dist = Math.abs(x1 - x2);
        let y_dist = Math.abs(y1 - y2);
        return Math.max(x_dist, y_dist);
    }

    getMapShade(x: number,y: number,n: number): number {
        let cached = this.dist_cache?.[x]?.[y];
        if (cached === undefined) {
            cached = 20;
        }
        // let cached = 10;
        if (n < cached) {
            if (this.dist_cache[x] === undefined) {
                this.dist_cache[x] = []
            }
            this.dist_cache[x][y] = n
            return n;
        } else {
            return cached;
        }
    }

    draw(playerpos: Point): void {
        if (!this._isZoomed) {
            for (let x = 0; x < this.mapSize.width; x+= 1) {
                for (let y = 0; y < this.mapSize.height; y += 1) {
                    let key = this.coordinatesToKey(x, y);
                    let screen_pos = new Point(x,y);
                    let map_pos = this.gameToMapScale(screen_pos);
                    let player_map_pos = this.mapToGameScale(playerpos);

                    let biome = this.getTileBiome(map_pos.x,map_pos.y);

                    let glyph = Tile.floor.glyph;
                    if (biome.isOcean() || biome.isMountains()) {
                        glyph = Tile.blank.glyph;
                    }

                    let dist = this.visDist(x, y, player_map_pos.x, player_map_pos.y);
                    let dist_adj = this.getMapShade(x, y, dist);

                    let bg = biome.baseColor;
                    if (dist_adj > 5) {
                        bg = darken(bg, 8 * (dist_adj - 5)).toString();
                    }
                    let fg = bg;
        
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
                    let biome = this.getTileBiome(map_pos.x,map_pos.y);

                    let glyph = Tile.floor.glyph;
                    if (biome.isOcean() || biome.isMountains()) {
                        glyph = Tile.blank.glyph;
                    }

                    let bg = biome.baseColor;
                    let fg = biome.fg;
        
                    this.game.draw(screen_pos, glyph, bg, fg);
                }
            }
        }
    }

    isZoomed(): boolean {
        return this._isZoomed;
    }

    zoomIn(playerPos: Point): void {
        if (!this._isZoomed) {
            // console.log("zooming in at",playerPos);
            this._isZoomed = true;
        }
    }

    zoomOut(playerPos: Point): void {
        if (this._isZoomed) {
            // console.log("zooming out at",playerPos);
            this._isZoomed = false;
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