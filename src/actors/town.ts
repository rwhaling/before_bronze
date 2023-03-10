import { Game } from "../game";
import { Actor, ActorType } from "./actor";
import { Point } from "../point";
import { Glyph } from "../glyph";
import { WorldMap } from "../mapgen/world-map";
import { Menu } from "../menu";
import * as _ from "lodash";
import { Biome } from "../mapgen/voronoi";

interface ScoutMission {
    target: Camp,
    description: string,
    reward?: string,
    begun?: boolean,
    completed?: boolean
}

interface Quest {
    target: string,
    quantity: number,
    description: string,
    reward?: string,
    begun?: boolean,
    completed?: boolean
}

export interface Camp {
    biome: Biome,
    position: Point,
    discovered: boolean
}

export class Town implements Actor {
    glyph: Glyph;
    campGlyph: Glyph;
    type: ActorType;
    missions: Array<ScoutMission>;
    currentMission?: number;
    quests: Array<Quest>;
    currentQuest?: number;
    camps: Array<Camp>;

    constructor(private game: Game, private map: WorldMap, public startingBiome: Biome, public position: Point) {
        this.glyph = new Glyph("⌂", "yellow", "#32926F");
        this.campGlyph = new Glyph("△","yellow","#32926F")
        this.type = ActorType.Town;
        let biome_dir = b => this.game.getBiomeDirection(this.position.x, this.position.y,b);
        let camp_dir = (c:Camp) => this.game.getCardinalDirection(this.position.x, this.position.y, c.position.x, c.position.y)

        this.quests = [
            { target: "rabbit", quantity: 2, 
              description:`first, catch me some rabbits \nfrom the woods nearby.`, reward:"stealth"},
            { target: "boar", quantity: 3, 
              description:`bring me 3 wild boars \nfrom the grasslands in the ${biome_dir("grasslands")}`, reward:"bow"},
            { target: "deer", quantity: 2,
              description:`take your bow and hunt me \n2 deer from the taiga in the ${biome_dir("darkForest")}`, reward:"bow upgrade"},
            { target: "moose", quantity: 1,
              description:`this is your final quest.\nbring me a moose from the dark forest in the ${biome_dir("darkForest")}`, reward:"ending"}
        ]
        this.currentQuest = 0;

        this.camps = [];
        for (let b of this.map.biomes) {
            if (b.isOcean() || b.isMountains()) {
                continue;
            }
            // this.camps.push(b.center);
            if (b === startingBiome) {
                continue;
            }
            this.camps.push({
                biome: b,
                position: b.randPoint,
                discovered: false                
            });
        }

        {
            let forestCamp: Camp = _.find(this.camps, c => c.biome.name === "lightForest" && c.biome != this.startingBiome);
            let steppeCamp: Camp = _.find(this.camps, c => c.biome.name === "steppe");

            this.missions = [
                { target: forestCamp,
                description: `find a camp in the woods,\n just ${camp_dir(forestCamp)} of here`},
                { target: steppeCamp,
                description: `find a camp in the central steppe,\n to the ${camp_dir(steppeCamp)} - but beware`}
            ];
            this.currentMission = 0;
        }
    }

    getTownMenu(): Menu {
        return new Menu(40,30, "  TOWN  ", 0, [
            {text: "TRADE", result: {}},
            {text: "QUESTS", result: {}},
            {text: "SCOUT", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.townMenuCallback(m));        
    }

    townMenuCallback(m:Menu): boolean {
        console.log("town callback?",m);
        if (m.selections[m.currentSelection].text === "TRADE") {
            this.game.gameState.currentMenu = this.getTradeMenu();
        } else if (m.selections[m.currentSelection].text === "QUESTS") {
            this.game.gameState.currentMenu = this.getQuestMenu();
        } else if (m.selections[m.currentSelection].text === "SCOUT") {
            this.game.gameState.currentMenu = this.getScoutMenu();
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
            let message = `you hand over your loot and receive ${loot_value} food`;
            this.game.messageLog.appendText(message);

            return true;
        } else if (m.selections[m.currentSelection].text === "BACK") {
            this.game.gameState.currentMenu = this.getTownMenu();
            return true;
        }
        return true;
    }

    getQuestMenu(): Menu {
        let q = this.quests[this.currentQuest];

        let menuText = "  QUEST HUB  \n\n" + q.description;
        return new Menu(40,30, menuText, 0, [
            {text: `TURN IN : ${q.quantity} ${q.target}`, result: {}},
            {text: "BACK", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.questMenuCallback(m))
    }

    questMenuCallback(m: Menu): boolean {
        console.log("quest callback?",m);
        let q = this.quests[this.currentQuest];

        if (m.currentSelection === 0) {
            let loot =  _.countBy( this.game.player.loot);
            if (loot[q.target] >= q.quantity) {
                for (let i = 0; i < q.quantity; i++) {
                    let idx = _.findIndex(this.game.player.loot,q.target);
                    this.game.player.loot.splice(idx,1);
                }
                let message = `you hand over ${q.quantity} ${q.target}s`;
                this.game.messageLog.appendText(message);
                if (q.reward === "stealth") {
                    this.game.player.stealthBonus += 2;
                }
                this.currentQuest += 1;
                if (this.currentQuest >= this.quests.length) {
                    this.currentQuest -= 1;
                    this.game.messageLog.appendText("congratulations, you have finished DAWN OF BRONZE")
                    return true;
                }
                return true;
            } else {
                let message = `you don't have ${q.quantity} ${q.target}s`;
                this.game.messageLog.appendText(message);

                this.game.gameState.currentMenu = this.getQuestMenu();
                return true;
            }
        } else if (m.selections[m.currentSelection].text === "BACK") {
            this.game.gameState.currentMenu = this.getTownMenu();
            return true;
        }
        return true;
    }

    getScoutMenu(): Menu {
        let currentMission = this.missions[this.currentMission];

        let menuText = "  SCOUT  \n\n" + currentMission.description;
        console.log("current mission target:",currentMission);
        return new Menu(40,30, menuText, 0, [
            {text: `TURN IN`, result: {}},
            {text: "BACK", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.scoutMenuCallback(m))
    }

    scoutMenuCallback(m:Menu): boolean {
        let currentMission = this.missions[this.currentMission];
        if (m.currentSelection === 0) {
            if (currentMission.target.discovered) {
                let message = `you describe the location to the scout`;
                this.game.messageLog.appendText(message);
                // TODO: check
                this.currentMission += 1;
                if (this.currentMission >= this.missions.length) {
                    this.currentQuest -= 1;
                    this.game.messageLog.appendText("(there are no more missions)")
                    return true;
                }
                return true;
            } else {
                let message = `you haven't found the location yet (there may be other campsites in the region)`;
                this.game.messageLog.appendText(message);
                return true;
            }
        }

        return true;
    }

    getCampMenu(): Menu {
        // TODO: directions to mission target here
        return new Menu(40,30, "  CAMP  ", 0, [
            {text: "REST", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => {return true;});        
    }

    campMenuCallback(m:Menu): boolean {
        console.log("camp callback?", m);
        return true
    }

    act(): Promise<any> {
        return Promise.resolve();
    }
}
