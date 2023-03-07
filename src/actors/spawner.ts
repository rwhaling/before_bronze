import { Game } from "../game";
import { Actor, ActorType } from "./actor";
import { Point } from "../point";
import { Glyph } from "../glyph";
import { Critter } from "./critter";

export class Spawner implements Actor {
    glyph: Glyph;
    type: ActorType.Spawner;
    position: Point;
    phase: number;
    spawns: Array<Actor>;

    constructor(private game: Game, private count: number, private freq: number) {
        this.glyph = new Glyph(" ", "black", "white");
        this.type = ActorType.Spawner;
        this.position = new Point(0,0);
        this.phase = 0;
        this.spawns = [];
    }

    act(): Promise<any> {
        this.phase += 1;
        if (this.phase >= this.freq) {
            console.log("spawner at phase ",this.phase, "/ this.freq, attempting to spawn");
            if (this.spawns.length < this.count) {
                let r1 = Math.floor(30 - Math.random() * 60);
                let r2 = Math.floor(30 - Math.random() * 60);
                let player_pos = this.game.getPlayerPosition();
                let spawn_pos = new Point(player_pos.x + r1, player_pos.y + r2);
                console.log("spawning new entity", spawn_pos);
                let critter = new Critter(this.game, "bird", spawn_pos, new Glyph("b"));
                this.spawns.push(critter);
                this.game.addActor(critter);
            } else {
                console.log("at maximum spawns:", this.spawns)
            }
            this.phase = 0;
        } else { 
            console.log("spawner at phase ",this.phase, "/ this.freq")
        }
        return Promise.resolve();
    }
}
