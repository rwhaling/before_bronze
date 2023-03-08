import { KEYS, DIRS } from "rot-js";
import { Game } from "../game";
import { Actor, ActorType } from "./actor";
import { Critter, Vis } from "./critter";

import { Point } from "../point";
import { Glyph } from "../glyph";
import { InputUtility } from "../input-utility";

export class Player implements Actor {
    glyph: Glyph;
    type: ActorType;
    noise: number;
    minNoise: number;
    maxNoise: number;
    private keyMap: { [key: number]: number };
    private numKeys: Array<number>;
    private actions: Array<() => void>; 

    constructor(private game: Game, public position: Point) {
        this.glyph = new Glyph("@", "yellow","#32926F");
        this.type = ActorType.Player;
        this.minNoise = 0;
        this.maxNoise = 25;
        this.noise = 0;

        this.keyMap = {};
        this.keyMap[KEYS.VK_W] = 0; // up
        this.keyMap[KEYS.VK_E] = 1;
        this.keyMap[KEYS.VK_D] = 2; // right
        this.keyMap[KEYS.VK_C] = 3;
        this.keyMap[KEYS.VK_S] = 4; // down
        this.keyMap[KEYS.VK_Z] = 5;
        this.keyMap[KEYS.VK_A] = 6; // left
        this.keyMap[KEYS.VK_Q] = 7;

        this.numKeys = [
            KEYS.VK_BACK_QUOTE,
            KEYS.VK_1,
            KEYS.VK_2,
            KEYS.VK_3,
            KEYS.VK_4,
            KEYS.VK_5,
            KEYS.VK_6,
            KEYS.VK_7,
            KEYS.VK_8,
            KEYS.VK_9,
            KEYS.VK_0,
        ]
        
        this.actions = [
            () => console.log("pressed backtick?"),
            () => console.log("pressed 1?"),
            () => console.log("pressed 2?")
        ]
    }

    act(): Promise<any> {
        return InputUtility.waitForInput(this.handleInput.bind(this));
    }

    move(newPoint:Point): boolean {
        if (this.game.mapContainsEntity(newPoint.x, newPoint.y)) {
            let actor = this.game.mapContainsEntity(newPoint.x, newPoint.y);
            console.log("entering tile with actor, ",actor);
            if (actor.type === ActorType.NPC) {
                console.log("entering town");

                this.game.showTownMenu();
                return true;
            } else if (actor.type === ActorType.Critter) {
                let critter = actor as Critter;
                console.log("caught critter ", critter.name);
                this.game.messageLog.appendText(`You caught a ${critter.name}!`);
                this.game.spawner.despawn(actor);
            }
        }
        if (!this.game.mapIsPassable(newPoint.x, newPoint.y)) {
            return;
        }
        this.position = newPoint;
        this.noise = this.noise + 10 > this.maxNoise ? this.maxNoise : this.noise + 10;
        return true;
    }

    private handleInput(event: KeyboardEvent): boolean {
        let validInput = false;
        let code = event.keyCode;
        if (code in this.keyMap) {
            let diff = DIRS[8][this.keyMap[code]];
            let newPoint = new Point(this.position.x + diff[0], this.position.y + diff[1]);
            let moveResult = this.move(newPoint);
            if (moveResult == true) {
                this.updateVis();
                validInput = true;
            } else {
                return;
            }
        } else if (this.numKeys.includes(code)) {
            console.log("pressed num key?")
            let idx = this.numKeys.indexOf(code);
            let action = this.actions[idx];
            action();
        } else if (code === KEYS.VK_SPACE || code === KEYS.VK_X) {
            this.updateVis();
            validInput = true;
            this.noise = this.noise - 15 < this.minNoise ? this.minNoise : this.noise - 15;
        } else if (code === KEYS.VK_RETURN) {
            this.game.toggleZoom();
            validInput = true;
        }
        return validInput;
    }

    private visDist(point: Point): number {
        let x_dist = Math.abs(this.position.x - point.x);
        let y_dist = Math.abs(this.position.y - point.y);
        return Math.max(x_dist, y_dist);
    }

    updateVis(): void {
        for (let spawn of this.game.spawner.spawns) {
            let dist = this.visDist(spawn.position);
            if (dist <= 5) {
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