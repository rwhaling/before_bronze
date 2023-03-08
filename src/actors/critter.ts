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
    playerVis: Vis;
    rng: () => number;

    constructor(private game: Game, public name: string, public position: Point, public glyph: Glyph) {
        this.type = ActorType.Critter;
        this.rng = d3.randomLcg();
        this.vis = Vis.NotSeen;
        this.playerVis = Vis.NotSeen;
        this.glyph.foregroundColor = "black";
    }

    act(): Promise<any> {
        console.log("turn for critter:", this.name);
        this.updateVis();

        let r = d3.randomInt(0,8)();
        let dir = DIRS[8][r];
        let newPoint = new Point(this.position.x + dir[0], this.position.y + dir[1]);

        let maxdist = 0;
        if (this.playerVis === Vis.Seen) {
            let rand_dirs = _.shuffle(DIRS[8]);
            for (let di = 0; di < 8; di++) {
                let d = rand_dirs[di];
                console.log("checking flee dir: ", d)
                let dPoint = new Point(this.position.x + d[0], this.position.y + d[1]);
                let dist = this.visDist2(dPoint,this.game.getPlayerPosition());
                if (dist > maxdist) {
                    console.log("new best:", d, dPoint)
                    maxdist = dist;
                    newPoint = dPoint;
                }
            }
        }

        if (!this.game.mapIsPassable(newPoint.x, newPoint.y)) {
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
        if (dist <= 3) {
            if (this.playerVis !== Vis.Seen) {
                let r = RNG.getPercentage();
                if (r <= player.noise) {
                    this.playerVis = Vis.Seen;
                    this.glyph.foregroundColor = "yellow";
                    this.game.messageLog.appendText("the " + this.name + " sees you and flees!");
                }    
            }
        }
        return;
    }

}