import { Game } from "../game";
import { Actor, ActorType } from "./actor";
import { Point } from "../point";
import { Glyph } from "../glyph";
import { WorldMap } from "../mapgen/world-map";
import { Menu } from "../menu";
import * as _ from "lodash";

export class Town implements Actor {
    glyph: Glyph;
    type: ActorType;

    constructor(private game: Game, private map: WorldMap, public position: Point) {
        this.glyph = new Glyph("⌂", "yellow", "#32926F");
        this.type = ActorType.NPC;
    }

    getTownMenu(): Menu {
        return new Menu(40,30, "Welcome to town\n\n", 0, [
            {text: "TRADE", result: {}},
            {text: "QUESTS", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.townMenuCallback(m));        
    }

    townMenuCallback(m:Menu): boolean {
        console.log("town callback?",m);
        if (m.selections[m.currentSelection].text === "TRADE") {
            this.game.gameState.currentMenu = this.getTradeMenu();
        } else if (m.selections[m.currentSelection].text === "QUESTS") {
            this.game.gameState.currentMenu = this.getQuestMenu();
        }
        return true;
    }

    getTradeMenu(): Menu {
        console.log("loot:", _.countBy( this.game.player.loot));
        let loot_value = this.game.player.loot.length;

        return new Menu(40,30, "Welcome to the trading post", 0, [
            {text: `TRADE : +${loot_value} food`, result: {}},
            {text: "UPGRADE: - 25 food", result: {}},
            {text: "BACK", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.tradeMenuCallback(m))
    }

    tradeMenuCallback(m: Menu): boolean {
        console.log("trade callback?",m);
        if (m.currentSelection === 0) {
            let loot_value = this.game.player.loot.length;
            console.log(`selling ${loot_value} loot`);
            this.game.player.food += loot_value;
            this.game.player.loot = [];
            this.game.gameState.currentMenu = this.getTradeMenu();
            return true;
        } else if (m.selections[m.currentSelection].text === "BACK") {
            this.game.gameState.currentMenu = this.getTownMenu();
            return true;
        }
        return true;
    }

    getQuestMenu(): Menu {
        return new Menu(40,30, "Welcome to the quest hub", 0, [
            {text: `TURN IN : 2 rabbits`, result: {}},
            {text: "BACK", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.questMenuCallback(m))
    }

    questMenuCallback(m: Menu): boolean {
        console.log("trade callback?",m);
        if (m.currentSelection === 0) {
            let loot =  _.countBy( this.game.player.loot);
            if (loot["rabbit"] >= 2) {
                for (let i = 0; i < 2; i++) {
                    let idx = _.findIndex(this.game.player.loot,"rabbit");
                    this.game.player.loot.splice(idx,1);
                }
                console.log("you sell two rabbits?");
                console.log(this.game.player.loot);
                return true;
            } else {
                console.log("you need more rabbits?")
                this.game.gameState.currentMenu = this.getQuestMenu();
                return true;
            }
        } else if (m.selections[m.currentSelection].text === "BACK") {
            this.game.gameState.currentMenu = this.getTownMenu();
            return true;
        }
        return true;
    }

    act(): Promise<any> {
        return Promise.resolve();
    }
}
