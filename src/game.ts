import { Display, Scheduler, KEYS, RNG } from "rot-js/lib/index";
import Simple from "rot-js/lib/scheduler/simple";

import { Player } from "./player";
import { GameState } from "./game-state";
import { Actor, ActorType } from "./actor";
import { Point } from "./point";
import { Glyph } from "./glyph";
import { StatusLine } from "./status-line";
import { MessageLog } from "./message-log";
import { InputUtility } from "./input-utility";
import { Tile, TileType } from "./tile";
import { Map } from "./map";
import { WorldMap } from "./mapgen/world-map";

export class Game {
    private display: Display;
    private scheduler: Simple;
    private map: WorldMap;
    private statusLine: StatusLine;
    private messageLog: MessageLog;

    private player: Player;

    private gameSize: { width: number, height: number };
    private mapSize: { width: number, height: number };
    private statusLinePosition: Point;
    private actionLogPosition: Point;
    private gameState: GameState;

    private foregroundColor = "white";
    private backgroundColor = "#084081";
    private maximumBoxes = 10;

    constructor() {
        this.gameSize = { width: 120, height: 50 };
        this.mapSize = { width: this.gameSize.width, height: this.gameSize.height - 4 };
        this.statusLinePosition = new Point(0, this.gameSize.height - 4);
        this.actionLogPosition = new Point(0, this.gameSize.height - 3);

        this.display = new Display({
            width: this.gameSize.width,
            height: this.gameSize.height,
            fontSize: 12,
            bg: "#084081"
        });
        document.body.appendChild(this.display.getContainer());

        this.gameState = new GameState();
        // this.map = new Map(this);
        this.map = new WorldMap(this);
        this.statusLine = new StatusLine(this, this.statusLinePosition, this.gameSize.width, { maxBoxes: this.maximumBoxes });
        this.messageLog = new MessageLog(this, this.actionLogPosition, this.gameSize.width, 3);

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
        return this.map.isPassable(x, y);
    }
    
    getPlayerPosition(): Point {
        return this.player.position;
    }

    checkBox(x: number, y: number): void {
        switch (this.map.getTileType(x, y)) {
            case Tile.box.type:
                this.map.setTile(x, y, Tile.searchedBox);
                this.statusLine.boxes += 1;
                break;
            case Tile.searchedBox.type:
                this.map.setTile(x, y, Tile.destroyedBox);
                this.messageLog.appendText("You destroy this box!");
                break;
            case Tile.destroyedBox.type:
                this.messageLog.appendText("This box is already destroyed.");
                break;
            default:
                this.messageLog.appendText("There is no box here!");
                break;
        }
    }

    getTileType(x: number, y: number): TileType {
        return this.map.getTileType(x, y);
    }

    getRandomTilePositions(type: TileType, quantity: number = 1): Point[] {
        return this.map.getRandomTilePositions(type, quantity);
    }
    
    toggleZoom(): void {
        let pos = this.getPlayerPosition();
        if (this.map.isZoomed) {
            console.log("zooming out at",pos);
            this.map.isZoomed = false;
            this.map.zoomOffset = new Point(0,0);
        } else {
            console.log("zooming in at",pos);
            this.map.isZoomed = true;
            let newOffset = new Point(4.0 * Math.floor(pos.x / 4.0), 3.0 * Math.floor(pos.y / 3.0));
            // buggy, TODO fix
            // let newX = (pos.x - (3 * newOffset.x)

            let newPos = new Point(((pos.x/4.0) - newOffset.x),((pos.y/3.0) - newOffset.y));
            this.map.zoomOffset = newOffset;
            this.player.move(newPos);
            console.log("old pos:",pos, "new offset:",newOffset, "new position:", newPos);
        }
    }

    private initializeGame(): void {
        this.display.clear();

        this.messageLog.clear();
        if (!this.gameState.isGameOver() || this.gameState.doRestartGame()) {
            this.resetStatusLine();
            this.writeHelpMessage();
        } else {
            this.statusLine.boxes = 0;
        }
        this.gameState.reset();

        this.map.generateMap(this.mapSize.width, this.mapSize.height);
        this.generateBoxes();
        this.createBeings();
        this.scheduler = new Scheduler.Simple();
        this.scheduler.add(this.player, true);

        this.drawPanel();
    }

    private async mainLoop(): Promise<any> {
        let actor: Actor;
        while (true) {
            actor = this.scheduler.next();
            if (!actor) {
                break;
            }

            await actor.act();
            if (actor.type === ActorType.Player) {
                this.statusLine.turns += 1;
            }
            if (this.gameState.foundPineapple) {
                this.statusLine.pineapples += 1;
            }

            this.drawPanel();

            if (this.gameState.isGameOver()) {
                await InputUtility.waitForInput(this.handleInput.bind(this));
                this.initializeGame();
            }
        }
    }

    private drawPanel(): void {
        this.display.clear();
        this.map.draw();
        let playerpos = this.player.position;
        let playerbg = this.map.getTileBiome(playerpos.x,playerpos.y);
        this.draw(this.player.position, this.player.glyph, playerbg);

        this.statusLine.draw();
        this.messageLog.draw();
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

    private generateBoxes(): void {
        let positions = this.map.getRandomTilePositions(TileType.Floor, this.maximumBoxes);
        for (let position of positions) {
            this.map.setTile(position.x, position.y, Tile.box);
        }
    }

    private createBeings(): void {
        let positions = this.map.getRandomTilePositions(TileType.Floor, 1);
        this.player = new Player(this, positions.splice(0, 1)[0]);
    }


    private resetStatusLine(): void {
        this.statusLine.reset();
        this.statusLine.maxBoxes = this.maximumBoxes;
    }
}