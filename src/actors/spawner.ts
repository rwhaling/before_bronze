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

    public despawn(a:Actor) {
        if (this.spawns.includes(a)) {
            let idx = this.spawns.indexOf(a);
            this.spawns.splice(idx,1);
            this.game.removeActor(a);
            console.log("despawned", a);
        }
    }

    act(): Promise<any> {
        this.phase += 1;
        let tries = 0;
        let maxtries = 10;
        let player_pos = this.game.getPlayerPosition();
        if (this.phase % this.freq === 0) {
            // TODO: despawn by distance/age
            let to_despawn = [];
            for (let spawn of this.spawns) {
                let dist = Math.sqrt(Math.pow(player_pos.x - spawn.position.x,2) + Math.pow(player_pos.y - spawn.position.y,2));
                console.log("checking actor dist,",dist,spawn);
                if (dist > 20) {
                    to_despawn.push(spawn);
                }
            }
            for (let spawn of to_despawn) {
                console.log("despawning actor,", spawn);
                this.despawn(spawn);
            }
            console.log("spawner at phase ",this.phase, "/ this.freq, attempting to spawn");
            while (this.spawns.length < this.count) {
                tries += 1;
                if (tries > maxtries) {
                    break;
                }
                let r1 = Math.floor(30 - Math.random() * 60);
                let r2 = Math.floor(30 - Math.random() * 60);
                let spawn_pos = new Point(player_pos.x + r1, player_pos.y + r2);
                console.log("spawning new entity", spawn_pos);
                let critter = new Critter(this.game, "bird", spawn_pos, new Glyph("b"));
                this.spawns.push(critter);
                this.game.addActor(critter);
            }
            console.log("at maximum spawns:", this.spawns)
            this.phase = 0;
        } else { 
            // console.log("spawner at phase ",this.phase, "/ this.freq")
        }
        return Promise.resolve();
    }
}
