import { Game } from "../game";
import { Actor, ActorType } from "./actor";
import { Point } from "../point";
import { Glyph } from "../glyph";

export class Town implements Actor {
    glyph: Glyph;
    type: ActorType;

    constructor(private game: Game, public position: Point) {
        this.glyph = new Glyph("⌂", "yellow", "#32926F");
        this.type = ActorType.NPC;
    }

    act(): Promise<any> {
        return Promise.resolve();
    }
}
