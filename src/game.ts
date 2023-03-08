import { Display, Scheduler, KEYS, RNG, Util } from "rot-js/lib/index";

import Simple from "rot-js/lib/scheduler/simple";

import { Player } from "./actors/player";
import { Town } from "./actors/town";
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

        this.debugMode = false;

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
            console.log("click", ev.offsetX, ev.offsetX, worldCoords.x, worldCoords.y, biome);
        });
        // document.querySelector("#canvas").addEventListener("click", (ev) => { console.log("click",ev); });

        this.gameState = new GameState();
        // this.map = new Map(this);
        this.map = new WorldMap(this);
        this.actionLine = new ActionLine(this, this.actionLinePosition, this.gameSize.width)
        this.statusLine = new StatusLine(this, this.statusLinePosition, this.gameSize.width, { maxBoxes: this.maximumBoxes });
        this.messageLog = new MessageLog(this, this.actionLogPosition, this.gameSize.width, 6);

        this.initializeGame();
        this.mainLoop();
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

    showTownMenu(): void {
        console.log("loot:", _.countBy( this.player.loot));
        this.gameState.currentMenu = this.town.getTownMenu();
        // this.gameState.currentMenu = new Menu(40,30, "Welcome to town\n\n", 0, [
        //     {text: "SHOP", result: {}},
        //     {text: "QUESTS", result: {}},
        //     {text: "LEAVE", result: {}},
        // ], (m) => {console.log("callback?",m); return true});
        return
    }
    
    getPlayerPosition(): Point {
        return this.player.position;
    }

    getTileType(x: number, y: number): TileType {
        return this.map.getTileType(x, y);
    }

    getRandomTilePositions(type: TileType, quantity: number = 1): Point[] {
        return this.map.getRandomTilePositions(type, quantity);
    }
        
    toggleZoom(): void {
        let pos = this.getPlayerPosition();
        if (this.map.isZoomed()) {
            console.log("zooming out at ",pos);
            this.map.zoomOut(pos);
        } else {
            console.log("zooming in at",pos);
            this.map.zoomIn(pos);
        }
    }

    private initializeGame(): void {
        this.display.clear();

        this.messageLog.clear();
        if (!this.gameState.isGameOver() || this.gameState.doRestartGame()) {
            this.resetStatusLine();
            this.writeHelpMessage();
        }
        this.gameState.reset();
        // this.gameState.currentMenu = new Menu(40,30, "Welcome to dawn of bronze\n\n", false, 0, [
        //     {text: "OK", result: {}},
        //     {text: "MAYBE", result: {}},
        //     {text: "NO", result: {}},
        // ])

        this.map.generateMap(this.mapSize.width * 3, this.mapSize.height * 4);
        // this.generateBoxes();

        // let startingBiome = this.map.biomes.find( i => i.name === "lightForest");
        // let startingPoint = this.map.cells.points[startingBiome.cell]

        this.scheduler = new Scheduler.Simple();

        this.spawner = new Spawner(this, this.map, 5, 5);
        let startingPoint = this.spawner.getStartPoint();

        this.player = new Player(this, new Point(Math.floor(startingPoint[0]), Math.floor(startingPoint[1])));
        // spawn town
        this.town = new Town(this, this.map, new Point(Math.floor(startingPoint[0]) + 3, Math.floor(startingPoint[1])));

        // this.createBeings();
        this.scheduler.add(this.player, true);
        this.scheduler.add(this.spawner, true);

        this.drawPanel();
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
                    console.log("spawner turn done, skipping rendering");
                    continue;
                }
            }

            // this.drawPanel();

            if (this.gameState.currentMenu) {
                let menu = this.gameState.currentMenu;
                console.log("drawing menu",menu);
                this.drawBox(40,8,35,30,"black");
                // let t = padCenter(menu.text, 20, "");
                let t = Util.format("%b{black}%s", menu.text)
                this.display.drawText(45, 8, t);
                let i = 0
                for (let i = 0; i < menu.selections.length; i++) {
                    let m = menu.selections[i];

                    if (i == menu.currentSelection) {
                        let t = Util.format("%b{yellow}* %s", m.text)
                        this.display.drawText(50, 9 + i, t);                            
                    } else {
                        let t = Util.format("%b{black}- %s", m.text)
                        this.display.drawText(50, 9 + i, t);
                    }
                }


                await InputUtility.waitForInput(this.handleMenuInput.bind(this));
                console.log("back to main loop");
                this.drawPanel(); // ugly
                // this.gameState.currentMenu = null;
            }

            if (this.gameState.isGameOver()) {
                await InputUtility.waitForInput(this.handleInput.bind(this));
                this.initializeGame();
            }
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

            // let mobs = this.spawner.spawn

            for (let s of this.spawner.spawns) {
                let scaled_spawn_delta = new Point(s.position.x - playerpos.x, s.position.y - playerpos.y);
                let scaled_spawn_pos = new Point(center.x + scaled_spawn_delta.x, center.y + scaled_spawn_delta.y);
                let spawn_bg = this.map.getTileBiome(s.position.x, s.position.y).baseColor;
                this.draw(scaled_spawn_pos, s.glyph, spawn_bg);
            }
            // let scaled_town_pos = this.map.getZoomedPlayerPos(this.town.position);
            // console.log("town pos",this.town.position, "scaled:",scaled_town_pos);
            let townbg = this.map.getTileBiome(this.town.position.x, this.town.position.y).baseColor;
            this.draw(scaled_town_pos, this.town.glyph, townbg);

            let scaled_player_pos = this.map.getZoomedPlayerPos(playerpos);
            let playerbg = this.map.getTileBiome(playerpos.x,playerpos.y).baseColor;
            this.draw(center, this.player.glyph, playerbg);    

        } else {
            let scaled_town_pos = this.map.mapToGameScale(this.town.position);
            // console.log("town pos",this.town.position, "scaled:",scaled_town_pos);
            let townbg = this.map.getTileBiome(this.town.position.x, this.town.position.y).baseColor;
            this.draw(scaled_town_pos, this.town.glyph, townbg);

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