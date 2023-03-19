import { Game } from "../game";
import { Point } from "../point";
import { Player } from "../actors/player"
import { padRight, padLeft } from "../text-utility";
import { UI } from "./ui";

export class ActionLine {


    constructor(private ui: UI, private position: Point, private maxWidth: number) {
    }

    reset(): void {
    }

    draw(player:Player): void {
        let archeryCommands = "";
        if (player.archeryLevel >= 1) {
            archeryCommands = "[R AIM] [F FIRE]"
        }
        let text = `%c{white}[1 LISTEN] %c{white}[2 HIDE] %c{white}[3 SCOUT] %c{white}${padRight(archeryCommands,16)} %c{white}[8 STATUS] %c{white}[9 INVENTORY] %c{white}[0 HELP] `
        this.ui.drawText(this.position, text, this.maxWidth);
    }
}