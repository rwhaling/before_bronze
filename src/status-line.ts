import { Game } from "./game";
import { Point } from "./point";
import { padRight, padLeft } from "./text-utility";

export class StatusLine {
    turns: number;

    constructor(private game: Game, private position: Point, private maxWidth: number, params?: any) {
        if (!params) {
            params = {};
        }
        this.turns = params.turns || 0;
    }

    reset(): void {
        this.turns = 0;
    }

    draw(): void {
        let noise = this.game.player.noise;
        let hp = this.game.player.hp;
        let maxHp = this.game.player.maxHp;
        let food = this.game.player.food;
        let maxFood = this.game.player.maxFood;
        let arrowPart = ""
        if (this.game.player.archeryLevel >= 1) {
            arrowPart = `arrows: ${this.game.player.arrows}/${this.game.player.maxArrows}`
        }
        arrowPart = padRight(arrowPart,13)

        let statusPart = ""
        if (this.game.player.listening || this.game.player.hidden) {
            statusPart += "%b{white}%c{#084081}STATUS:"
            if (this.game.player.listening) { statusPart += " LISTENING" }
            if (this.game.player.hidden) { statusPart += " HIDDEN" }    
        }
        // let text = `turns: ${padRight(this.turns.toString(), 6)} pineapples: ${padRight(this.pineapples.toString(), 6)} boxes: ${padLeft(this.boxes.toString(), 2)} / ${padLeft(this.maxBoxes.toString(), 2)}`;
        let text = `turn:${padRight(this.turns.toString(), 6)}HP:${padRight(hp.toString()+"/"+maxHp.toString(), 5)} food:${padRight(food.toString()+"/"+maxFood.toString(), 7)} ${arrowPart} ${statusPart}  `;

        this.game.drawText(this.position, text, this.maxWidth);
    }
}