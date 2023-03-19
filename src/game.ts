import { Display, Scheduler, KEYS, RNG, Util } from "rot-js/lib/index";

import Simple from "rot-js/lib/scheduler/simple";

import { Player } from "./actors/player";
import { Town, Camp } from "./actors/town";
import { GameState } from "./game-state";
import { Actor, ActorType } from "./actors/actor";
import { Point } from "./point";
import { Glyph } from "./glyph";
import { UI } from "./ui/ui"
import { MessageLog } from "./ui/message-log";
import { InputUtility } from "./ui/input-utility";
import { Tile, TileType } from "./tile";
import { WorldMap } from "./mapgen/world-map";
import { Spawner } from "./actors/spawner";
import * as _ from "lodash";
import { Biome } from "./mapgen/voronoi";
import { Critter, Vis } from "./actors/critter";
import { Menu } from "./menu";

export class Game {
    private display: Display;
    // private scheduler: Simple;
    private map: WorldMap;
    // private statusLine: StatusLine;
    // private actionLine: ActionLine;
    messageLog: MessageLog;
    debugMode: boolean

    player: Player;
    private town: Town;
    spawner: Spawner;
    startingPoint: Point;

    private gameSize: { width: number, height: number };
    mapSize: { width: number, height: number };
    mapScale: { width: number, height: number };
    gameState: GameState;

    private foregroundColor = "white";
    private backgroundColor = "#084081";

    private ui: UI

    constructor() {
        this.gameSize = { width: 120, height: 60 };
        
        this.mapSize = { width: this.gameSize.width, height: this.gameSize.height - 8 };
        this.mapScale = { width: 4, height: 3}

        this.debugMode = false;

        this.display = new Display({
            width: this.gameSize.width,
            height: this.gameSize.height,
            fontSize: 12,
            fg: this.foregroundColor,
            bg: "#084081"
        });

        this.ui = new UI(this, this.display, this.gameSize.width, this.gameSize.height);

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
        this.messageLog = this.ui.messageLog;// HACK

        // todo: bring up main menu first, do not initialize

        this.initializeGame();
        this.mainLoop();
    }

    private initializeGame(): void {
        this.display.clear();

        this.messageLog.clear();

        this.gameState.reset();
        this.resetStatusLine();
        this.writeHelpMessage();

        this.map.generateMap(this.mapSize.width * 3, this.mapSize.height * 4);

        // this.scheduler = new Scheduler.Simple();

        this.spawner = new Spawner(this, this.map, 5, 5);
        let startingBiome = this.map.biomes.find( i => i.name === "forest");
        this.startingPoint = startingBiome.center;

        this.player = new Player(this, this.startingPoint);

        this.town = new Town(this, this.map, startingBiome, startingBiome.randPoint);

        // this.scheduler.add(this.player, true);
        // this.scheduler.add(this.spawner, true);

        this.drawPanel();
    }

    private async mainLoop(): Promise<any> {
        while (true) {
            if (!this.gameState.currentMenu) {
                await this.mainTurn();
            }

            if (this.gameState.currentMenu) {
                this.drawPanel();
                let code = await this.modalTurn(this.gameState.currentMenu);

                console.log("back to main loop",code);
            }
        }
    }    

    private async mainTurn(): Promise<any> {
        this.player.updateVis();
        this.drawPanel();
        await this.player.act();
        this.ui.statusLine.turns += 1;
        for (let spawn of this.spawner.spawns) {
            await spawn.act();
        }
        await this.spawner.act();
    }

    private async modalTurn(menu:Menu): Promise<any> {
        this.ui.drawMenu(menu);
        let code = await InputUtility.waitForInput(this.handleMenuInput.bind(this));
        return code
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
        // console.log("nearest camp,", tmp,min);
        return [tmp,min]
    }

    isZoomed(): boolean {
        return this.map.isZoomed();
    }

    toggleZoom(): void {
        let pos = this.getPlayerPosition();
        if (this.map.isZoomed()) {
            this.map.zoomOut(pos);
        } else {
            this.map.zoomIn(pos);
        }
    }

    private drawPanel(): void {
        this.display.clear();
        let playerpos = this.player.position;
        // this.map.draw(playerpos);
        if (this.map.isZoomed()) {
            this.map.drawZoomed(this.ui, this.player)
            this.ui.drawMapZoomed(this.map, this.player, this.spawner.spawns as Array<Critter>, this.town, this.town.camps)
        } else {
            this.map.drawMacro(this.ui, this.player)
            this.ui.drawMapMacro(this.map, this.player, this.spawner.spawns as Array<Critter>, this.town, this.town.camps)            
        }

        this.ui.actionLine.draw(this.player);
        this.ui.statusLine.draw(this.player);
        this.ui.messageLog.draw();
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

    private writeHelpMessage(): void {
        let helpMessage = [
            'Press 0 for more detailed help at any time.',
            `Move with ASDW/QEZC, and use the number keys 1-3 for skills.  Use S/W and Return to navigate menus.`,
            "Welcome to the world of DAWN OF BRONZE;"
        ];

        for (let index = helpMessage.length - 1; index >= 0; --index) {
            this.ui.messageLog.appendText(helpMessage[index]);
        }
    }

    private resetStatusLine(): void {
        this.ui.statusLine.reset();
    }
}