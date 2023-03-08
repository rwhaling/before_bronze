import { Game } from "./game";
import { Point } from "./point";
import { padRight, padLeft } from "./text-utility";

export class StatusLine {
    turns: number;
    hp: number;
    max_hp: number;

    constructor(private game: Game, private position: Point, private maxWidth: number, params?: any) {
        if (!params) {
            params = {};
        }
        this.turns = params.turns || 0;
        this.hp = params.hp || 10;
        this.max_hp = params.max_hp || 10;
    }

    reset(): void {
        this.turns = 0;
        this.hp = 10;
        this.max_hp = 10;
    }

    draw(): void {
        let noise = this.game.player.noise;
        let food = this.game.player.food;
        let maxFood = this.game.player.maxFood;
        // let text = `turns: ${padRight(this.turns.toString(), 6)} pineapples: ${padRight(this.pineapples.toString(), 6)} boxes: ${padLeft(this.boxes.toString(), 2)} / ${padLeft(this.maxBoxes.toString(), 2)}`;
        let text = `turns: ${padRight(this.turns.toString(), 6)}HP: ${padRight(this.hp.toString()+"/"+this.max_hp.toString(), 7)}food: ${padRight(food.toString()+"/"+maxFood.toString(), 7)} noise: ${padRight(noise.toString(), 3)}  `;

        this.game.drawText(this.position, text, this.maxWidth);
    }
}