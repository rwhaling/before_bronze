import { KEYS, DIRS, RNG } from "rot-js";
import { Game } from "../game";
import { Actor, ActorType } from "./actor";
import { Critter, Vis } from "./critter";
import { Menu } from "../menu";

import { Point } from "../point";
import { Glyph } from "../glyph";
import { InputUtility } from "../input-utility";
import * as _ from "lodash";

export class Player implements Actor {
    glyph: Glyph;
    type: ActorType;
    noise: number;
    minNoise: number;
    maxNoise: number;
    hidden: boolean;
    food: number;
    maxFood: number; 
    loot: Array<String>;
    hasArchery: boolean;
    arrows: number;
    maxArrows: number;
    target?: Critter;

    visDistBonus: number;
    listenBonus: number;
    stealthBonus: number;
    private keyMap: { [key: number]: number };
    // TODO: Action interface, availability, cooldown
    private numKeys: { [key: number]: () => void}

    constructor(private game: Game, public position: Point) {
        this.glyph = new Glyph("@", "yellow","#32926F");
        this.type = ActorType.Player;
        this.minNoise = 0;
        this.maxNoise = 25;
        this.noise = 0;
        this.food = 50;
        this.maxFood = 50;
        this.loot = [];        
        this.hasArchery = true;
        this.arrows = 5;
        this.maxArrows = 10;

        this.visDistBonus = 0;
        this.listenBonus = 0;
        this.stealthBonus = 0;

        this.keyMap = {};
        this.keyMap[KEYS.VK_W] = 0; // up
        this.keyMap[KEYS.VK_E] = 1;
        this.keyMap[KEYS.VK_D] = 2; // right
        this.keyMap[KEYS.VK_C] = 3;
        this.keyMap[KEYS.VK_S] = 4; // down
        this.keyMap[KEYS.VK_Z] = 5;
        this.keyMap[KEYS.VK_A] = 6; // left
        this.keyMap[KEYS.VK_Q] = 7;

        this.numKeys = {};
        this.numKeys[KEYS.VK_BACK_QUOTE] = () => this.aim(); 
        this.numKeys[KEYS.VK_1] = () => this.listen();
        this.numKeys[KEYS.VK_2] = () => this.hide();
        this.numKeys[KEYS.VK_3] = () => this.scout();
        this.numKeys[KEYS.VK_F] = () => this.fire();
        // this.numKeys[KEYS.VK_3] = () => this.game.messageLog.appendText("pressed 3?");
        this.numKeys[KEYS.VK_8] = () => this.showStatus();
        this.numKeys[KEYS.VK_9] = () => this.showInventory();
        this.numKeys[KEYS.VK_0] = () => this.showHelpMenu();
    }

    act(): Promise<any> {
        return InputUtility.waitForInput(this.handleInput.bind(this));
    }

    move(newPoint:Point): boolean {
        if (this.game.mapContainsEntity(newPoint.x, newPoint.y)) {
            let actor = this.game.mapContainsEntity(newPoint.x, newPoint.y);
            console.log("entering tile with actor, ",actor);
            if (actor.type === ActorType.Town) {
                console.log("entering town");
                this.game.showTownMenu();
                return true;
            } else if (actor.type === ActorType.Critter) {
                let critter = actor as Critter;
                console.log("caught critter ", critter.name);
                this.game.messageLog.appendText(`You caught a ${critter.name}!`);
                this.game.spawner.despawn(actor);
                this.loot.push(critter.name);
            }
        } else if (this.game.getNearestCamp(newPoint.x, newPoint.y)[1] === 0) {
            let camp = this.game.getNearestCamp(newPoint.x, newPoint.y)[0];
            console.log("entering camp",camp);
            this.game.messageLog.appendText(`You reach the camp`);
            this.game.showCampMenu();
            return true;
        }
        if (!this.game.mapIsPassable(newPoint.x, newPoint.y)) {
            return;
        }
        this.position = newPoint;
        this.noise = this.noise + 10 > this.maxNoise ? this.maxNoise : this.noise + 10;
        if (this.hidden) {
            let r = RNG.getPercentage();
            if (r < 40) {
                this.game.messageLog.appendText("you are no longer hidden");
                this.hidden = false;
            }  
        }
        return true;
    }

    private handleInput(event: KeyboardEvent): boolean {
        let validInput = false;
        let code = event.keyCode;
        if (!this.game.isZoomed()) {
            this.game.toggleZoom();
            validInput = true;
        }
        else if (code in this.keyMap) {
            let diff = DIRS[8][this.keyMap[code]];
            let newPoint = new Point(this.position.x + diff[0], this.position.y + diff[1]);
            let moveResult = this.move(newPoint);
            if (moveResult == true) {
                this.updateVis();
                validInput = true;
            } else {
                return;
            }
        } else if (code in this.numKeys) {
            let action = this.numKeys[code];
            action();
            validInput = true;
        } else if (code === KEYS.VK_SPACE || code === KEYS.VK_X) {
            this.updateVis();
            validInput = true;
            this.noise = this.noise - 15 < this.minNoise ? this.minNoise : this.noise - 15;
        }
        return validInput;
    }

    private visDist(point: Point): number {
        let x_dist = Math.abs(this.position.x - point.x);
        let y_dist = Math.abs(this.position.y - point.y);
        return Math.max(x_dist, y_dist);
    }

    private aim(): void {
        console.log("aiming?", this.game.spawner.spawns);
        let tmp: Critter
        let min_dist = 9999;
        for (let spawn of this.game.spawner.spawns) {
            // TODO: cycle?
            let c = spawn as Critter
            let dist = this.visDist(spawn.position);
            if (dist < min_dist && c.vis === Vis.Seen) {
                tmp = c
                min_dist = dist
            }
        }
        this.target = tmp
        return;
    }

    private fire(): void {
        if (this.arrows <= 0) {
            this.game.messageLog.appendText("you are out of arrows")
            console.log("no arrows");
            return
        }
        if (this.target) {
            this.arrows -= 1;
            // TODO - chance to hit
            // TODO - chance to alert target
            this.game.messageLog.appendText(`You shot a ${this.target.name}!`);
            this.game.spawner.despawn(this.target);
            this.loot.push(this.target.name);
            console.log("fire!");
            return
        } else {
            this.game.messageLog.appendText("you must aim [~] before firing your bow")
            console.log("no target!")
            return
        }
        return;
    }

    private listen(): void {
        this.game.messageLog.appendText("you listen carefully to your surroundings");
        for (let spawn of this.game.spawner.spawns) {
            let dist = this.visDist(spawn.position);
            if (dist <= 7 + this.listenBonus) {
                if (spawn.type == ActorType.Critter) {
                    let critter = spawn as Critter;
                    if (critter.vis !== Vis.Seen) {
                        critter.vis = Vis.Seen
                        critter.glyph.foregroundColor = "white";
                        this.game.messageLog.appendText(`You hear a ${critter.name}!`);
                    }
                }
            }
        }
        return;
    }

    private hide(): void {
        this.game.messageLog.appendText("you hide amidst some tall grasses [-1 food]");
        if (this.food >= 2) {
            this.food -= 1;
        } else {
            return
        }

        this.hidden = true;
        return;
    }

    private scout(): void {
        let biome = this.game.getTileBiome(this.position.x,this.position.y);
        this.game.messageLog.appendText("you hide amidst some tall grasses [-3 food]");
        if (this.food >= 4) {
            this.food -= 3;
        } else {
            return
        }

        this.game.messageLog.appendText(`you scout the surrounding ${biome.name} - press any key when done`);

        // this.game.messageLog.appendText()
        let [nearestCamp, distance] = this.game.getNearestCamp(this.position.x, this.position.y);
        if (distance < 16 && nearestCamp.discovered === false) {
            let direction = this.game.getCardinalDirection(this.position.x, this.position.y, nearestCamp.position.x, nearestCamp.position.y);
            let message = `you see signs to the ${direction} of a good camp site`
            this.game.messageLog.appendText(message);
        }
        if (distance < 5 && nearestCamp.discovered === false) {
            nearestCamp.discovered = true;
            this.game.messageLog.appendText("you find a camp site close by");

        }
        this.game.toggleZoom();
        return;
    }

    private showStatus(): void {
        let statusMenuText = "  STATUS  \n\n";
        statusMenuText += `  VISION: 5 + ${this.visDistBonus}\n- you can see creatures up to ${5 + this.visDistBonus} squares away\n`;
        statusMenuText += `  HEARING: 7 + ${this.listenBonus}\n- you can hear creatures up to ${7 + this.listenBonus} squares away\n`;
        statusMenuText += `  STEALTH: ${this.stealthBonus}\n- creatures can see you ${this.stealthBonus} fewer squares away than normal\n`;
        this.game.gameState.currentMenu = new Menu(40,30, statusMenuText, 0, [
            {text: "OK", result: {}},
        ], (m) => { console.log("status menu callback?"); return true});

    }

    private showInventory(): void {
        let loot = _.countBy( this.game.player.loot);
        let invMenuText = "  INVENTORY  \n\n"
        for (let l in loot) {
            invMenuText += `${loot[l]} ${l}\n`
        }
        this.game.gameState.currentMenu = new Menu(40,30, invMenuText, 0, [
            {text: "OK", result: {}},
        ], (m) => { console.log("inv menu callback?"); return true});

    }

    private showHelpMenu(): void {
        this.game.gameState.currentMenu = new Menu(40,30, "Help menu TBD\n\n", 0, [
            {text: "OK", result: {}},
        ], (m) => { console.log("help menu callback?"); return true});
        return
    
    }

    updateVis(): void {
        for (let spawn of this.game.spawner.spawns) {
            let dist = this.visDist(spawn.position);
            if (dist <= 5 + this.visDistBonus) {
                if (spawn.type == ActorType.Critter) {
                    let critter = spawn as Critter;
                    if (critter.vis !== Vis.Seen) {
                        critter.vis = Vis.Seen
                        critter.glyph.foregroundColor = "white";
                        this.game.messageLog.appendText(`You spot a ${critter.name}!`);
                    }
                }
            }
        }
        return;
    }
}