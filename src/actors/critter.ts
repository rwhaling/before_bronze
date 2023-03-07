import * as d3 from "d3";
import { DIRS } from "rot-js";

import { Actor, ActorType } from "./actor"
import { Point } from "../point";
import { Glyph } from "../glyph";
import { Game } from "../game";

export class Critter implements Actor {
    type: ActorType.Critter;
    rng: () => number;

    constructor(private game: Game, public name: string, public position: Point, public glyph: Glyph) {
        this.type = ActorType.Critter;
        this.rng = d3.randomLcg();
    }

    act(): Promise<any> {
        console.log("turn for critter:", this.name);
        let r = d3.randomInt(0,8)();
        let dir = DIRS[8][r];
        let newPoint = new Point(this.position.x + dir[0], this.position.y + dir[1]);
        if (!this.game.mapIsPassable(newPoint.x, newPoint.y)) {
            Promise.resolve();
        } else {
            this.position = newPoint;
            return Promise.resolve();
        }
    }


}