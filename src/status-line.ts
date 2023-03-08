import { Game } from "./game";
import { Point } from "./point";
import { padRight, padLeft } from "./text-utility";

export class StatusLine {
    turns: number;
    food: number;
    water: number;
    hp: number;
    max_hp: number;
    pineapples: number;
    boxes: number;
    maxBoxes: number;

    constructor(private game: Game, private position: Point, private maxWidth: number, params?: any) {
        if (!params) {
            params = {};
        }
        this.turns = params.turns || 0;
        this.food = params.food || 10;
        this.water = params.water || 10;
        this.hp = params.hp || 10;
        this.max_hp = params.max_hp || 10;
        this.pineapples = params.ananas || 0;
        this.boxes = params.boxes || 0;
        this.maxBoxes = params.maxBoxes || 0;
    }

    reset(): void {
        this.turns = 0;
        this.food = 10;
        this.water = 10;
        this.hp = 10;
        this.max_hp = 10;
        this.pineapples = 0;
        this.boxes = 0;
        this.maxBoxes = 0;
    }

    draw(): void {
        let noise = this.game.player.noise;
        // let text = `turns: ${padRight(this.turns.toString(), 6)} pineapples: ${padRight(this.pineapples.toString(), 6)} boxes: ${padLeft(this.boxes.toString(), 2)} / ${padLeft(this.maxBoxes.toString(), 2)}`;
        let text = `turns: ${padRight(this.turns.toString(), 6)}  hp: ${padRight(this.hp.toString(), 2)}/${padRight(this.max_hp.toString(), 2)}  noise: ${padLeft(noise.toString(), 2)}  food: ${padLeft(this.food.toString(), 2)}`;

        this.game.drawText(this.position, text, this.maxWidth);
    }
}