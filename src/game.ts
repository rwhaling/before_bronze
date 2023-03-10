import { Display, Scheduler, KEYS, RNG, Util } from "rot-js/lib/index";

import Simple from "rot-js/lib/scheduler/simple";

import { Player } from "./actors/player";
import { Town, Camp } from "./actors/town";
import { GameState } from "./game-state";
import { Actor, ActorType } from "./actors/actor";
import { Point } from "./point";
import { Glyph } from "./glyph";
import { ActionLine } from "./ui/action-line";
import { StatusLine } from "./status-line";
import { MessageLog } from "./message-log";
import { Menu } from "./menu";
import { InputUtility } from "./input-utility";
import { Tile, TileType } from "./tile";
import { WorldMap } from "./mapgen/world-map";
import { Spawner } from "./actors/spawner";
import * as _ from "lodash";
import { Biome } from "./mapgen/voronoi";
import { Critter, Vis } from "./actors/critter";

export class Game {
    private display: Display;
    private scheduler: Simple;
    private map: WorldMap;
    private statusLine: StatusLine;
    private actionLine: ActionLine;
    messageLog: MessageLog;
    debugMode: boolean

    player: Player;
    private town: Town;
    spawner: Spawner;
    startingPoint: Point;

    private gameSize: { width: number, height: number };
    mapSize: { width: number, height: number };
    mapScale: { width: number, height: number };
    private actionLinePosition: Point;
    private statusLinePosition: Point;
    private actionLogPosition: Point;
    gameState: GameState;

    private foregroundColor = "white";
    private backgroundColor = "#084081";
    private maximumBoxes = 10;

    constructor() {
        this.gameSize = { width: 120, height: 60 };
        
        this.mapSize = { width: this.gameSize.width, height: this.gameSize.height - 8 };
        this.mapScale = { width: 4, height: 3}
        this.actionLinePosition = new Point(0, this.gameSize.height - 8);
        this.statusLinePosition = new Point(0, this.gameSize.height - 7);
        this.actionLogPosition = new Point(0, this.gameSize.height - 6);

        this.debugMode = true;

        this.display = new Display({
            width: this.gameSize.width,
            height: this.gameSize.height,
            fontSize: 12,
            fg: this.foregroundColor,
            bg: "#084081"
        });
        document.body.appendChild(this.display.getContainer());
        console.log(document.body);
        console.log(this.display.getContainer());
        console.log(this.display);
        this.display.getContainer().addEventListener("click", (ev) => { 
            // TODO: check if zoomed
            let worldCoords = this.map.gameToMapScale(new Point(Math.floor(ev.offsetX / 8), Math.floor(ev.offsetY / 12)));
            let biome = this.map.getTileBiome(worldCoords.x, worldCoords.y);
            let dir = this.getCardinalDirection(this.player.position.x, this.player.position.y, worldCoords.x, worldCoords.y);
            console.log("click dir:", dir, "offset:", ev.offsetX, ev.offsetX, "coords", worldCoords.x, worldCoords.y, "biome", biome);
        });

        this.gameState = new GameState();
        this.map = new WorldMap(this);
        this.actionLine = new ActionLine(this, this.actionLinePosition, this.gameSize.width)
        this.statusLine = new StatusLine(this, this.statusLinePosition, this.gameSize.width, { maxBoxes: this.maximumBoxes });
        this.messageLog = new MessageLog(this, this.actionLogPosition, this.gameSize.width, 6);

        this.initializeGame();
        this.mainLoop();
    }

    private initializeGame(): void {
        this.display.clear();

        this.messageLog.clear();
        // if (!this.gameState.isGameOver() || this.gameState.doRestartGame()) {
        // }
        this.gameState.reset();
        this.resetStatusLine();
        this.writeHelpMessage();

        this.map.generateMap(this.mapSize.width * 3, this.mapSize.height * 4);

        this.scheduler = new Scheduler.Simple();

        this.spawner = new Spawner(this, this.map, 5, 5);
        let startingBiome = this.map.biomes.find( i => i.name === "lightForest");
        this.startingPoint = startingBiome.center;

        // let startingPoint = this.spawner.getStartPoint();

        this.player = new Player(this, this.startingPoint);
        // spawn town
        this.town = new Town(this, this.map, startingBiome, startingBiome.randPoint);

        // this.createBeings();
        this.scheduler.add(this.player, true);
        this.scheduler.add(this.spawner, true);

        this.drawPanel();
    }

    
    draw(position: Point, glyph: Glyph, bg?: string, fg?: string): void {
        let foreground = fg || glyph.foregroundColor || this.foregroundColor;
        let background = bg || glyph.backgroundColor || this.backgroundColor;
        this.display.draw(position.x, position.y, glyph.character, foreground, background);
    }

    drawText(position: Point, text: string, maxWidth?: number): void {
        this.display.drawText(position.x, position.y, text, maxWidth);
    }

    mapIsPassable(x: number, y: number): boolean {
        if (this.player.position.x === x && this.player.position.y === y) {
            return false;
        }
        for (let spawn of this.spawner.spawns) {
            if (spawn.position.x === x && spawn.position.y === y) {
                return false;
            }
        }

        return this.map.isPassable(x, y);
    }

    mapContainsEntity(x: number, y: number): Actor | undefined {
        if (this.town.position.x === x && this.town.position.y === y) {
            return this.town;
        } else {
            for (let spawn of this.spawner.spawns) {
                if (spawn.position.x === x && spawn.position.y === y) {
                    return spawn;
                }
            }
            return
        }
    }

    getBiomeDirection(x1: number, y1: number, biome: string): string {
        let idx = this.map.biomes.findIndex( i => i.name === biome);
        // TODO: occasionally errors on load - check biome validity
        let center = this.map.cells.points[idx]
        let b = this.map.biomes[idx]
        let dir = this.getCardinalDirection(x1, y1, center[0], center[1]);
        return dir
    }

    getCardinalDirection(x1: number, y1: number, x2: number, y2: number): string {
        let atan = Math.atan2(y1 - y2,  x1 - x2);
        let cardinal_dir = "east"
        if (atan > (Math.PI * 0.875)) { 
            cardinal_dir = "east"
        } else if (atan > (Math.PI * 0.625)) {
            cardinal_dir = "northeast"
        } else if (atan > (Math.PI * 0.375)) {
            cardinal_dir = "north"
        } else if (atan > (Math.PI * 0.125)) {
            cardinal_dir = "northwest"
        } else if (atan > (Math.PI * -0.125)) {
            cardinal_dir = "west"
        } else if (atan > (Math.PI * -0.375)) {
            cardinal_dir = "southwest"
        } else if (atan > (Math.PI * -0.625)) {
            cardinal_dir = "south"
        } else if (atan > (Math.PI * -0.875)) {
            cardinal_dir = "southeast"
        }
        return cardinal_dir
    }

    showTownMenu(): void {
        this.gameState.currentMenu = this.town.getTownMenu();
        return
    }

    showCampMenu(): void {
        this.gameState.currentMenu = this.town.getCampMenu();
        return
    }


    getPlayerPosition(): Point {
        return this.player.position;
    }

    getTileType(x: number, y: number): TileType {
        return this.map.getTileType(x, y);
    }

    getTileBiome(x: number, y: number): Biome {
        return this.map.getTileBiome(x,y)
    }

    getRandomTilePositions(type: TileType, quantity: number = 1): Point[] {
        return this.map.getRandomTilePositions(type, quantity);
    }

    getNearestCamp(x: number, y:number): [Camp,number] {
        let tmp = this.town.camps[0];
        let min = 999999;
        for (let c of this.town.camps) {
            let dist = Math.max(Math.abs(x - c.position.x),Math.abs(y - c.position.y))
            if (dist < min) {
                min = dist
                tmp = c
            }
        }
        console.log("nearest camp,", tmp,min);
        return [tmp,min]
    }

    isZoomed(): boolean {
        return this.map.isZoomed();
    }

    toggleZoom(): void {
        let pos = this.getPlayerPosition();
        if (this.map.isZoomed()) {
            // console.log("zooming out at ",pos);
            this.map.zoomOut(pos);
        } else {
            // console.log("zooming in at",pos);
            this.map.zoomIn(pos);
        }
    }

    addActor(a:Actor) {
        this.scheduler.add(a,true);
    }

    removeActor(a:Actor) {
        this.scheduler.remove(a);
    }

    private async mainLoop(): Promise<any> {
        let actor: Actor;
        while (true) {
            if (!this.gameState.currentMenu) {
                actor = this.scheduler.next();
                if (!actor) {
                    break;
                }
                if (actor.type === ActorType.Player ) {
                    this.player.updateVis();
                    this.drawPanel();                
                }         
                await actor.act();
                if (actor.type === ActorType.Player) {
                    this.statusLine.turns += 1;
                    this.drawPanel();
                } else if (actor.type === ActorType.Spawner) {
                    // console.log("spawner turn done, skipping rendering");
                    continue;
                }
            }

            // this.drawPanel();

            if (this.gameState.currentMenu) {
                let menu = this.gameState.currentMenu;
                console.log("drawing menu",menu);
                this.drawBox(40,8,35,30,"black");
                let offset = 1;
                // let t = padCenter(menu.text, 20, "");
                for (let line of menu.text.split("\n")) {
                    this.display.drawText(44, 8 + offset, `%b{black}%c{white}${line}`)                
                    offset += 1
                }
                // let t = Util.format("%b{black}%s", menu.text)
                // this.display.drawText(45, 8, t);
                let i = 0
                offset += 1
                for (let i = 0; i < menu.selections.length; i++) {
                    let m = menu.selections[i];

                    if (i == menu.currentSelection) {
                        let t = `%b{yellow}%c{black} * ${m.text}`
                        this.display.drawText(46, 8 + offset, t);                            
                    } else {
                        let t = Util.format("%b{black}- %s", m.text)
                        this.display.drawText(46, 8 + offset, t);
                    }
                    offset += 1;
                }


                await InputUtility.waitForInput(this.handleMenuInput.bind(this));
                console.log("back to main loop");
                this.drawPanel(); // ugly
                // this.gameState.currentMenu = null;
            }

            // if (this.gameState.isGameOver()) {
            //     await InputUtility.waitForInput(this.handleInput.bind(this));
            //     this.initializeGame();
            // }
        }
    }

    private drawBox(x,y,width,height,color?): void {
        console.log("drawing box");
        let c = color || "#FFFFFF";
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                this.display.draw(x + i, y + j," ",c,c);
            }
        }
    }

    private drawPanel(): void {
        this.display.clear();
        let playerpos = this.player.position;
        this.map.draw(playerpos);
        let center = new Point(Math.floor(this.mapSize.width / 2), Math.floor(this.mapSize.height / 2));
        if (this.map.isZoomed()) {
            let scaled_town_delta = new Point(this.town.position.x - playerpos.x, this.town.position.y - playerpos.y);
            let scaled_town_pos = new Point(center.x + scaled_town_delta.x, center.y + scaled_town_delta.y);


            for (let s of this.spawner.spawns) {
                let scaled_spawn_delta = new Point(s.position.x - playerpos.x, s.position.y - playerpos.y);
                let scaled_spawn_pos = new Point(center.x + scaled_spawn_delta.x, center.y + scaled_spawn_delta.y);
                let spawn_bg = this.map.getTileBiome(s.position.x, s.position.y).baseColor;
                let c = s as Critter
                if (this.player.target === c && c.vis === Vis.Seen) {
                    spawn_bg = "black"
                }

                this.draw(scaled_spawn_pos, s.glyph, spawn_bg);
            }

            let townbg = this.map.getTileBiome(this.town.position.x, this.town.position.y).baseColor;
            this.draw(scaled_town_pos, this.town.glyph, townbg);

            for (let c of this.town.camps) {
                if (c.discovered) {
                    let scaled_camp_delta = new Point(c.position.x - playerpos.x, c.position.y - playerpos.y)
                    let scaled_camp_pos = new Point(center.x + scaled_camp_delta.x, center.y + scaled_camp_delta.y)
                    let campBg = this.map.getTileBiome(c.position.x, c.position.y).baseColor;
                    this.draw(scaled_camp_pos, this.town.campGlyph, campBg);    
                }    
            }


            let scaled_player_pos = this.map.getZoomedPlayerPos(playerpos);
            let playerbg = this.map.getTileBiome(playerpos.x,playerpos.y).baseColor;
            let playerfg = "white"
            if (this.player.hidden) {
                playerfg = "black";
            }
            this.draw(center, this.player.glyph, playerbg, playerfg);    

        } else {
            let scaled_town_pos = this.map.mapToGameScale(this.town.position);
            // console.log("town pos",this.town.position, "scaled:",scaled_town_pos);
            let townbg = this.map.getTileBiome(this.town.position.x, this.town.position.y).baseColor;
            this.draw(scaled_town_pos, this.town.glyph, townbg);
            for (let c of this.town.camps) {
                if (c.discovered) {
                    let scaled_camp_pos = this.map.mapToGameScale(c.position);
                    let campBg = this.map.getTileBiome(c.position.x, c.position.y).baseColor;
                    this.draw(scaled_camp_pos, this.town.campGlyph, campBg);    
                }    
            }

            let scaled_player_pos = this.map.mapToGameScale(playerpos);
            let playerbg = this.map.getTileBiome(playerpos.x,playerpos.y).baseColor;
            this.draw(scaled_player_pos, this.player.glyph, playerbg); 
            
        }

        this.actionLine.draw();
        this.statusLine.draw();
        this.messageLog.draw();
    }

    private handleMenuInput(event: KeyboardEvent): boolean {
        let code = event.keyCode;
        console.log("received menu input", code);
        if (code === KEYS.VK_S  || code === KEYS.VK_DOWN) {
            if (this.gameState.currentMenu) {
                this.gameState.currentMenu.currentSelection += 1;
                if (this.gameState.currentMenu.currentSelection >= this.gameState.currentMenu.selections.length) {
                    this.gameState.currentMenu.currentSelection = 0;
                }
                return true;
            }
        } else if (code === KEYS.VK_W || code === KEYS.VK_UP) {
            if (this.gameState.currentMenu) {
                this.gameState.currentMenu.currentSelection -= 1;
                if (this.gameState.currentMenu.currentSelection < 0) {
                    this.gameState.currentMenu.currentSelection = this.gameState.currentMenu.selections.length - 1;
                }
            }
            return true;
        } else if (code === KEYS.VK_SPACE || code === KEYS.VK_RETURN) {
            let m = this.gameState.currentMenu;
            this.gameState.currentMenu = null;
            m.invokeCallback();
        }
        return true;
    }

    private handleInput(event: KeyboardEvent): boolean {
        let code = event.keyCode;
        return code === KEYS.VK_SPACE || code === KEYS.VK_RETURN;
    }

    private writeHelpMessage(): void {
        let helpMessage = [
            `Move with ASDW/QEZC, search with 'spacebar' or 'return'.`,
        ];

        for (let index = helpMessage.length - 1; index >= 0; --index) {
            this.messageLog.appendText(helpMessage[index]);
        }
    }

    private resetStatusLine(): void {
        this.statusLine.reset();
    }
}