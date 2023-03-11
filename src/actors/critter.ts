import * as d3 from "d3";
import * as _ from "lodash";
import { DIRS, RNG } from "rot-js";

import { Actor, ActorType } from "./actor"
import { Point } from "../point";
import { Glyph } from "../glyph";
import { Game } from "../game";

export enum Vis {
    Hidden,
    NotSeen,
    Seen,
}

export class Critter implements Actor {
    type: ActorType.Critter;
    vis: Vis;
    visChanceBonus: number;
    visDistBonus: number;
    playerVis: Vis;
    moveChance: number;
    aggressiveChance: number;
    aggressive: boolean;
    turnsSeen: number;
    hp: number;
    foodValue: number;
    rng: () => number;

    constructor(private game: Game, public name: string, public position: Point, public glyph: Glyph, visDistBonus?: number, hp?: number, aggressiveChance?: number, params?: any) {
        if (!params) {
            params = {};
        }
        this.type = ActorType.Critter;
        this.rng = d3.randomLcg();
        this.vis = Vis.NotSeen;
        this.visChanceBonus = params.visChanceBonus || 0;
        this.visDistBonus = visDistBonus || 0;
        this.moveChance = 35 + d3.randomInt(0,15)();
        this.hp = hp || 1;
        this.aggressiveChance = aggressiveChance || 0;
        this.foodValue = params.foodValue || 2;

        this.aggressive = false;
        this.turnsSeen = 0;
        this.playerVis = Vis.NotSeen;
        this.glyph.foregroundColor = "black";
    }

    act(): Promise<any> {
        // console.log("turn for critter:", this.name);
        this.updateVis();
        let newPoint: Point;

        if (this.playerVis !== Vis.Seen) {
            let chance = d3.randomInt(0,100)();
            if (chance > this.moveChance) { 
                return Promise.resolve() 
            }
            let r = d3.randomInt(0,8)();
            let dir = DIRS[8][r];
            newPoint = new Point(this.position.x + dir[0], this.position.y + dir[1]);

       
            
        } else if (this.playerVis === Vis.Seen) {
            let rand_dirs = _.shuffle(DIRS[8]);
            this.turnsSeen += 1;
            if (this.aggressive) {
                // check if switch to flee?
                let mindist = 9999                
                for (let di = 0; di < 8; di++) {
                    let d = rand_dirs[di];
                    // console.log("checking flee dir: ", d)
                    let dPoint = new Point(this.position.x + d[0], this.position.y + d[1]);
                    let dist = this.visDist2(dPoint,this.game.getPlayerPosition());
                    if (dist < mindist) {
                        // console.log("new best:", d, dPoint)
                        mindist = dist;
                        newPoint = dPoint;
                    }
                }    

            } else {
                // check if time to despawn?
                let maxdist = 0;
                for (let di = 0; di < 8; di++) {
                    let d = rand_dirs[di];
                    // console.log("checking flee dir: ", d)
                    let dPoint = new Point(this.position.x + d[0], this.position.y + d[1]);
                    let dist = this.visDist2(dPoint,this.game.getPlayerPosition());
                    if (dist > maxdist) {
                        // console.log("new best:", d, dPoint)
                        maxdist = dist;
                        newPoint = dPoint;
                    }
                }    
            }
        }
        // check if initiating combat here?
        if (this.aggressive && newPoint.x === this.game.getPlayerPosition().x && newPoint.y === this.game.getPlayerPosition().y) {
            console.log("attacking");
            this.game.player.hp -= 1;
            this.game.messageLog.appendText(`the ${this.name} gores you for 1 HP damage`);
            this.game.player.checkHp(); // arguably better in player's turn
            return Promise.resolve();
        }
        else if (!this.game.mapIsPassable(newPoint.x, newPoint.y)) {
            console.log("stopping, cannot approach further");
            return Promise.resolve();
        } else {
            this.position = newPoint;
            return Promise.resolve();
        }
    }

    private visDist2(point1: Point, point2: Point): number {
        let x_dist = Math.abs(point1.x - point2.x);
        let y_dist = Math.abs(point1.y - point2.y);
        return Math.max(x_dist, y_dist);
    }

    private visDist(point: Point): number {
        let x_dist = Math.abs(this.position.x - point.x);
        let y_dist = Math.abs(this.position.y - point.y);
        return Math.max(x_dist, y_dist);
    }


    private updateVis(): void {
        let player = this.game.player;
        let dist = this.visDist(player.position);
        let minDist = 3 + this.visDistBonus - player.stealthBonus;
        if (dist <= minDist) {
            if (this.playerVis !== Vis.Seen) {
                let threshold = player.noise + this.visChanceBonus
                let r = RNG.getPercentage();
                // noise should probably be higher?
                if (r <= threshold && !player.hidden) {
                    let agg_chance = RNG.getPercentage();
                    if (agg_chance < this.aggressiveChance) {
                        this.aggressive = true;
                        this.playerVis = Vis.Seen;
                        this.glyph.foregroundColor = "red";
                        this.game.messageLog.appendText("the " + this.name + " charges at you!");
                    } else {
                        this.playerVis = Vis.Seen;
                        this.glyph.foregroundColor = "yellow";
                        this.game.messageLog.appendText("the " + this.name + " sees you and flees!");    
                    }
                }    
            }
        }
        return;
    }
}

