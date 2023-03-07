import { Point } from "../point";
import { Glyph } from "../glyph";

export const enum ActorType {
    Player,
    NPC,
    Spawner,
    Critter,
    Enemy
}

export interface Actor {
    position: Point;
    glyph: Glyph;
    type: ActorType;

    act(): Promise<any>;
}