import { KEYS, DIRS, RNG } from "rot-js";
import { Game } from "../game";
import { Actor, ActorType } from "./actor";
import { Critter, Vis } from "./critter";
import { Menu } from "../menu";

import { Point } from "../point";
import { Glyph } from "../glyph";
import { InputUtility } from "../input-utility";
import * as _ from "lodash";
import { Biome } from "../mapgen/voronoi";

export class Player implements Actor {
    glyph: Glyph;
    type: ActorType;
    noise: number;
    minNoise: number;
    maxNoise: number;
    hidden: boolean;
    listening: boolean;
    food: number;
    maxFood: number; 
    hp: number;
    maxHp: number;
    hunger: number;
    loot: Array<string>;
    archeryLevel: number;
    arrows: number;
    maxArrows: number;
    
    target?: Critter;

    visDistBonus: number;
    listenBonus: number;
    listenCostBonus: number;
    stealthBonus: number;
    hideCostBonus: number;
    scoutCostBonus: number;
    private keyMap: { [key: number]: number };
    // TODO: Action interface, availability, cooldown
    private numKeys: { [key: number]: () => void}

    constructor(private game: Game, public position: Point) {
        this.glyph = new Glyph("@", "white","#32926F");
        this.type = ActorType.Player;
        this.minNoise = 0;
        this.maxNoise = 25;
        this.hidden = false;
        this.listening = false;
        this.noise = 0;
        this.food = 25;
        this.maxFood = 25;
        this.hunger = 0;
        this.hp = 1;
        this.maxHp = 1;
        this.loot = [];        
        this.archeryLevel = 0;
        this.arrows = 5;
        this.maxArrows = 5;

        this.visDistBonus = 0;
        this.listenBonus = 0;
        this.listenCostBonus = 0;
        this.stealthBonus = 0;
        this.hideCostBonus = 0;
        this.scoutCostBonus = 0;

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
        this.numKeys[KEYS.VK_R] = () => this.aim(); 
        this.numKeys[KEYS.VK_1] = () => this.listen();
        this.numKeys[KEYS.VK_2] = () => this.hide();
        this.numKeys[KEYS.VK_3] = () => this.scout();
        this.numKeys[KEYS.VK_F] = () => this.fire();
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
                if (this.arrows <= this.maxArrows) {
                    this.arrows = this.maxArrows;
                    this.game.messageLog.appendText("You replenish your arrows in town;")    
                }
                if (this.game.player.hp < this.game.player.maxHp) {
                    this.game.messageLog.appendText("Your HP is replenished")
                }        
                this.game.showTownMenu();
                return true;
            } else if (actor.type === ActorType.Critter) {
                let critter = actor as Critter;
                critter.hp -= 1;
                if (critter.hp > 1) {
                    this.game.messageLog.appendText(`You attacked the ${critter.name} with your spear for 1 hp damage!`);
                    this.target.playerVis = Vis.Seen;
                    if (this.target.aggressiveChance > 0) {
                        this.target.aggressive = true;
                    }
                    return true;
                }
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
        this.hunger += 5;
        this.checkHunger();
        this.position = newPoint;
        this.noise = this.noise + 10 > this.maxNoise ? this.maxNoise : this.noise + 10;
        if (this.hidden) {
            let r = RNG.getPercentage();
            if (r < 40) {
                this.game.messageLog.appendText("You are no longer hidden.");
                this.hidden = false;
            }  
        }
        if (this.listening) {
            let r = RNG.getPercentage();
            if (r < 30) {
                this.game.messageLog.appendText("You are no longer attuned to your surroundings.");
                this.listening = false;
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
            this.updateVis();
            this.checkHunger();
            validInput = true;
        } else if (code === KEYS.VK_SPACE || code === KEYS.VK_X) {
            this.updateVis();
            validInput = true;
            this.noise = this.noise - 10 < this.minNoise ? this.minNoise : this.noise - 10;
        }
        return validInput;
    }

    private checkHunger(): void {
        if (this.hunger >= 100) {
            this.hunger = 0
            this.food -= 1
        } 
        if (this.food < 0) {
            this.game.messageLog.appendText("You starved.");
            this.game.gameState.currentMenu = this.getDeathMenu();
        }
        if (this.food <= 5 && this.hunger == 0) {
            this.game.messageLog.appendText("You are very hungry - find food soon or you will starve!")
        }
    }

    checkHp(): void {
        if (this.hp <= 0) {
            this.game.messageLog.appendText("You were killed.");
            this.game.gameState.currentMenu = this.getDeathMenu();
        }
    }

    private getDeathMenu(): Menu {
        let message = "You have died.  Dawn of Bronze is a difficult game\nfeaturing PERMANENT DEATH.\n\nDo you wish to CHEAT?\n"
        return new Menu(60, 30, "GAME OVER\n\n" + message, 0, [
            {text: "YES", result: {}},
        ], (m) => this.deathMenuCallback(m));
    }

    private deathMenuCallback(m:Menu): boolean {
        console.log("death menu callback?"); 
        this.game.gameState.cheatCount += 1;
        this.food = this.maxFood;
        this.hp = this.maxHp;
        this.position = this.game.startingPoint;
        return true
    }

    private visDist(point: Point): number {
        let x_dist = Math.abs(this.position.x - point.x);
        let y_dist = Math.abs(this.position.y - point.y);
        return Math.max(x_dist, y_dist);
    }

    private aim(): void {
        if (this.archeryLevel === 0) {
            return;
        }
        console.log("aiming?", this.game.spawner.spawns);
        let tmp: Critter
        let min_dist = 9999;
        for (let spawn of this.game.spawner.spawns) {
            // TODO: cycle?
            let c = spawn as Critter
            if (c === this.target) { 
                continue
            }
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
        if (this.archeryLevel === 0) {
            return;
        }
        if (this.arrows <= 0) {
            this.game.messageLog.appendText("You are out of arrows")
            console.log("no arrows");
            return
        }
        if (this.target) {
            // TODO accuracy based on distance/level
            let dist = this.visDist(this.target.position);
            let accuracy = this.getAccuracy(dist);
            this.arrows -= 1;
            let r = RNG.getUniformInt(0,100);
            if (r < accuracy) {
                this.target.hp -= 1;
                if (this.target.hp >= 1) {
                    this.game.messageLog.appendText(`You attacked the ${this.target.name} with your bow for 1 hp damage!`);
                    this.target.playerVis = Vis.Seen;
                    if (this.target.aggressiveChance > 0) {
                        this.target.aggressive = true;
                    }
                    return ;
                }
                this.game.messageLog.appendText(`You shot a ${this.target.name}!`);
                this.game.spawner.despawn(this.target);
                this.loot.push(this.target.name);    
            } else {
                this.game.messageLog.appendText(`You shot at a ${this.target.name}, but missed!`);
            }
            return
        } else {
            this.game.messageLog.appendText("You must aim [R] before firing your bow.")
            console.log("no target!")
            return
        }
    }

    private getAccuracy(dist: number) {
        if (this.archeryLevel === 0) {
            return 0;
        } else if (this.archeryLevel === 1) {
            if (dist <= 2) { return 80; }
            else if (dist <= 3) { return 25; }
            else { return 0 }    
        } else if (this.archeryLevel === 2) {
            if (dist <= 2) { return 80; }
            else if (dist <= 3) { return 60; } 
            else if (dist <= 4) { return 20; }
            else { return 0 }    
        } else if (this.archeryLevel === 3) {
            if (dist <= 3) { return 80; }
            else if (dist <= 4) { return 60; } 
            else if (dist <= 5) { return 35; }
            else { return 0 }    
        }
    }

    private listen(): void {
        let listenCost = 1 - this.listenCostBonus;
        if (this.food > listenCost) {
            this.food -= listenCost;
        } else {
            return
        }
        let message = "You listen carefully to your surroundings."
        if (listenCost > 0) {
            message += ` [-${listenCost} food]`
        }

        this.game.messageLog.appendText(message);
        this.listening = true;
        for (let spawn of this.game.spawner.spawns) {
            let dist = this.visDist(spawn.position);
            if (dist <= 8 + this.listenBonus) {
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
        let hideCost = 2 - this.hideCostBonus;
        if (this.food > hideCost) {
            this.food -= hideCost;
        } else {
            return
        }
        this.game.messageLog.appendText(`You hide amidst some tall grasses [-${hideCost} food]`);

        this.hidden = true;
        return;
    }

    private scout(): void {
        let biome = this.game.getTileBiome(this.position.x,this.position.y);
        let scoutCost = 4 - this.scoutCostBonus;
        if (this.food > scoutCost) {
            this.food -= scoutCost;
        } else {
            this.game.messageLog.appendText("You are too hungry! find more food quickly, before you starve!")
            return
        }

        this.game.messageLog.appendText(`You scout the surrounding ${biome.name}; press any key when done. [-${scoutCost} food]`);
        this.game.messageLog.appendText(this.getBiomeDescription(biome));        

        // this.game.messageLog.appendText()
        let [nearestCamp, distance] = this.game.getNearestCamp(this.position.x, this.position.y);
        if (distance < 16 && nearestCamp.discovered === false) {
            let direction = this.game.getCardinalDirection(this.position.x, this.position.y, nearestCamp.position.x, nearestCamp.position.y);
            let message = `You see signs to the ${direction} of a good camp site.`
            this.game.messageLog.appendText(message);
        }
        if (distance < 5 && nearestCamp.discovered === false) {
            nearestCamp.discovered = true;
            this.game.messageLog.appendText("You find a camp site close by.");

        }
        this.game.toggleZoom();
        return;
    }

    private getBiomeDescription(b:Biome): string {
        let message = ""
        if (b.name === "forest") {
            message += "This sheltered forest contains quail, squirrel, rabbits, and a few skittish deer."
        } else if (b.name === "steppe") {
            message += "The austere steppes are home to grouse, foxes, and hares."
        } else if (b.name === "grasslands") {
            message += "These fruitful grasslands are brimming with grouse, partridge, and hare, as well as dangerous wild boar."
        } else if (b.name === "scrublands") {
            message += "The seemingly desolate scrub shelters rabbits, hares, and foxes; a pack of wild boars forages here occasionally."
        } else if (b.name === "taiga") {
            message += "The deep taiga is home to deer, partridges, and foxes; beware the solitary moose that wander in the snow."            
        }
        return message
    }

    private showStatus(): void {
        let statusMenuText = "  STATUS  \n\n";
        statusMenuText += `--VISION--\nYou can see creatures up to ${5 + this.visDistBonus} squares away\n`;
        if (this.stealthBonus > 0) {
            statusMenuText += `--STEALTH--\nCreatures can see you ${this.stealthBonus} fewer squares away\n`;
        }
        statusMenuText += `--LISTEN--\nYou can hear creatures up to ${8 + this.listenBonus} squares away\n(costs ${1 - this.listenCostBonus} food)\n`;
        statusMenuText += `--HIDE--\nMost creatures cannot see you while hidden\n(costs ${2 - this.hideCostBonus} food)\n`
        statusMenuText += `--SCOUT--\nYou can explore the area, and reveal nearby camps\n(costs ${4 - this.scoutCostBonus} food)\n`
        if (this.archeryLevel === 1) {
            statusMenuText += `--AIM--\nYou must aim at a nearby target before firing your bow\n`
            statusMenuText += `--FIRE--\nOnce aimed, you can fire your bow (less accurate at range 3+, costs 1 arrow)\n`
        } else if (this.archeryLevel === 2) {
            statusMenuText += `--AIM--You must aim at a nearby target before firing your bow\n`
            statusMenuText += `--FIRE--Once aimed, you can fire your bow (less accurate at range 4+, costs 1 arrow)\n`
        } else if (this.archeryLevel === 3) {
            statusMenuText += `--AIM--You must aim at a nearby target before firing your bow\n`
            statusMenuText += `--FIRE--Once aimed, you can fire your bow (less accurate at range 5+, costs 1 arrow)\n`
        }
        this.game.gameState.currentMenu = new Menu(80,30, statusMenuText, 0, [
            {text: "OK (PRESS RETURN)", result: {}},
        ], (m) => { console.log("status menu callback?"); return true});

    }

    private showInventory(): void {
        let loot = _.countBy( this.game.player.loot);
        let invMenuText = "  INVENTORY  \n\n"
        for (let l in loot) {
            invMenuText += `${loot[l]} ${l}\n`
        }
        this.game.gameState.currentMenu = new Menu(60,30, invMenuText, 0, [
            {text: "OK (PRESS RETURN)", result: {}},
        ], (m) => { console.log("inv menu callback?"); return true});

    }

    private showHelpMenu(): void {
        let debug_desc = "ENABLE DEBUG MODE?"
        if (this.game.debugMode) {
            debug_desc = "DISABLE DEBUG MODE"
        }
        let helpMessage = "HELP\n"
        helpMessage += "Try not to starve.\nCatch animals, and trade them in town or camp for more food.\n"
        helpMessage += "Use ASDW to move, or QEZC to move diagonally.\n\n"
        helpMessage += "You have skills that can help you, but they all consume more food -\n"
        helpMessage += "[1] LISTENS to your surroundings and locates nearby creatures\n"
        helpMessage += "[2] HIDES so that your prey does not detect you\n"
        helpMessage += "[3] SCOUTS the surrounding area, and may reveal a nearby campsite △\n\n"
        helpMessage += "⌂ is TOWN, your home base.  NPCs there offer different quests and upgrades:\n"
        helpMessage += "QUEST offers you upgrades in exchange for particular prey,\n"
        helpMessage += "SCOUT offers you upgrades if you find a particular distant camp site,\n"
        helpMessage += "TRADE offers you upgrades for free after exchanging enough loot.\n\n"
        helpMessage += "If you die, you can CHEAT to continue, or turn on DEBUG MODE below.\n"


        this.game.gameState.currentMenu = new Menu(80,30, helpMessage, 0, [
            {text: "OK (PRESS RETURN)", result: {}},
            {text: debug_desc, result: {}},

        ], (m) => this.helpMenuCallback(m));
        return
    
    }

    private helpMenuCallback(m:Menu): boolean {
        if (m.currentSelection === 1 ) {
            this.game.debugMode = (!this.game.debugMode);
        }
        return true;
    }

    updateVis(): void {
        for (let spawn of this.game.spawner.spawns) {
            let dist = this.visDist(spawn.position);
            let threshold = 5 + this.visDistBonus;
            if (this.listening) {
                threshold = 8 + this.listenBonus
            }
            if (dist <= threshold) {
                if (spawn.type == ActorType.Critter) {
                    let critter = spawn as Critter;
                    if (critter.vis !== Vis.Seen) {
                        critter.vis = Vis.Seen
                        critter.glyph.foregroundColor = "white"; // hack
                        this.game.messageLog.appendText(`You spot a ${critter.name}!`);
                    }
                }
            }
        }
        return;
    }
}