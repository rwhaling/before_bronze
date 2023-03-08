import { Game } from "../game";
import { Point } from "../point";
import { Player } from "../actors/player"
import { padRight, padLeft } from "../text-utility";

export class ActionLine {


    constructor(private game: Game, private position: Point, private maxWidth: number) {
    }

    reset(): void {
    }

    draw(): void {
        let text = `%c{white}[1 LISTEN] %c{white}[2 HIDE] %c{grey}[3 TRACK]    %c{white}[0 HELP] `
        this.game.drawText(this.position, text, this.maxWidth);
    }
}