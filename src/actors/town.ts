import { Game } from "../game";
import { Actor, ActorType } from "./actor";
import { Point } from "../point";
import { Glyph } from "../glyph";
import { WorldMap } from "../mapgen/world-map";
import { Menu } from "../menu";
import * as _ from "lodash";
import { Biome } from "../mapgen/voronoi";

interface TradeUpgrade {
    quantity: number,
    description: string,
    reward?: string
}

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
              description:`first, catch me some rabbits \nfrom the woods nearby.`, reward:"hide"},
            { target: "deer", quantity: 2,
              description:`take your bow and hunt me \n2 deer from the taiga in the ${biome_dir("darkForest")}`, reward:"bow_1"},
            { target: "boar", quantity: 3, 
            description:`bring me 3 wild boars \nfrom the grasslands in the ${biome_dir("grasslands")}`, reward:"bow_2"},
            { target: "moose", quantity: 1,
              description:`this is your final quest.\nbring me a moose from the dark forest in the ${biome_dir("darkForest")}`, reward:"bow_3"}
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
            let grasslandCamp: Camp = _.find(this.camps, c => c.biome.name === "grasslands");
            let steppeCamp: Camp = _.find(this.camps, c => c.biome.name === "steppe");
            let darkForestCamp: Camp = _.find(this.camps, c => c.biome.name === "darkForest");

            this.missions = [
                { target: forestCamp,
                  description: `find a camp in the woods,\n just ${camp_dir(forestCamp)} of here`,
                  reward: "scout"},
                { target: grasslandCamp,
                  description: `find a camp in the grassland,\n just ${camp_dir(grasslandCamp)} of here`,
                  reward: "stealth"},  
                { target: steppeCamp,
                  description: `find a camp in the central steppe,\n to the ${camp_dir(steppeCamp)} `,
                  reward: "vision"},
                { target: darkForestCamp,
                  description: `find a camp in the distant taiga,\n to the ${camp_dir(darkForestCamp)}`,
                  reward: "listen"}
            ];
            this.currentMission = 0;
        }
    }

    getTownMenu(): Menu {
        return new Menu(60,30, "  TOWN  ", 0, [
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
        let loot_value = this.getTradeValue();

        return new Menu(60,30, "Welcome to the trading post", 0, [
            {text: `TRADE : +${loot_value} food`, result: {}},
            {text: "UPGRADE: - 25 food", result: {}},
            {text: "BACK", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.tradeMenuCallback(m))
    }

    tradeMenuCallback(m: Menu): boolean {
        console.log("trade callback?",m);
        if (m.currentSelection === 0) {
            let loot_value = this.tradeLoot();

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

    getTradeValue(): number {
        let q = this.quests[this.currentQuest];
        let non_quest_loot = _.filter(this.game.player.loot, i => i !== q.target )
        let loot_value = 0;
        for (let k of non_quest_loot) {
            loot_value += this.getItemTradeValue(k)
        }

        return loot_value;
    }
    
    getItemTradeValue(i:string): number {
        // ugh
        if (i === "squirrel" || i === "quail") {
            return 2
        } else if (i === "boar" || i === "deer" || i === "grouse") {
            return 4
        } else if (i === "moose") {
            return 5
        } else {
            return 3
        }
    }

    tradeLoot(): number {
        let q = this.quests[this.currentQuest];
        let non_quest_loot = _.remove(this.game.player.loot, i => i !== q.target )
        let loot_value = 0;
        for (let k of non_quest_loot) {
            loot_value += this.getItemTradeValue(k)
        }

        this.game.player.food += loot_value;
        if (this.game.player.food > this.game.player.maxFood) {
            this.game.player.food = this.game.player.maxFood
        }
        return loot_value;
    }

    getQuestMenu(): Menu {
        let q = this.quests[this.currentQuest];

        let menuText = "  QUEST HUB  \n\n" + q.description;
        return new Menu(60,30, menuText, 0, [
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

            let questReady = false;
            if (this.game.debugMode === true) {
                console.log("handing in quest, debug mode");
                questReady = true;
            }
            if (loot[q.target] >= q.quantity) {
                questReady = true;
            }
            if (questReady) {
                for (let i = 0; i < q.quantity; i++) {
                    let idx = _.findIndex(this.game.player.loot,q.target);
                    this.game.player.loot.splice(idx,1);
                }
                let message = `you hand over ${q.quantity} ${q.target}s`;
                this.game.messageLog.appendText(message);
                this.applyQuestReward(q.reward);
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
        return new Menu(60,30, menuText, 0, [
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

    applyQuestReward(r:string): void {
        console.log("quest reward", r)
        if (r === "bow_1") {
            this.game.messageLog.appendText("you received a bow! use [R] to aim and [F] to fire")
            this.game.player.archeryLevel = 1;
        } else if (r === "bow_2") {
            this.game.messageLog.appendText("your archery skills have improved, and you are more accurate at longer range")
            this.game.player.archeryLevel = 2;
            this.game.player.arrows = 8;
            this.game.player.maxArrows = 8;
        } else if (r === "bow_3") {
            this.game.messageLog.appendText("your have mastered the art of archery, and you are highly accurate at extended range")
            this.game.player.archeryLevel = 3;
            this.game.player.arrows = 12;
            this.game.player.maxArrows = 12;
        } else if (r === "scout") {
            this.game.messageLog.appendText("you are more efficient at scouting, and will consume significantly less time, and food, when doing so")
            this.game.player.scoutCostBonus += 2;
        } else if (r === "stealth") {
            this.game.messageLog.appendText("you are more stealthy, enemies will not detect you from as far away") // todo, clarify
            this.game.player.stealthBonus += 2;
        } else if (r === "hide") {
            this.game.messageLog.appendText("you can move faster while remaining hidden, and will consume less food") // todo, clarify
            this.game.player.hideCostBonus += 1;
            // todo
        } else if (r === "vision") {
            this.game.messageLog.appendText("with your deep understanding of the land, you can detect creatures from further away") // todo, clarify
            this.game.player.visDistBonus += 2;
        } else if (r === "listen") {
            this.game.messageLog.appendText("you can remain deeply attuned with your surroundings, while moving faster, and consuming less food")
            this.game.player.listenBonus += 3;
        }

    }

    getCampMenu(): Menu {
        // TODO: directions to mission target here
        let loot_value = this.getTradeValue();

        let this_camp = this.game.getNearestCamp(this.game.player.position.x, this.game.player.position.y)[0];
        this_camp.discovered = true;
        let currentMission = this.missions[this.currentMission];

        let target_camp = currentMission.target

        let camp_description: string;

        if (target_camp === this_camp) {
            camp_description = "You reached the location you were searching for;\nreturn to the SCOUT in town for a reward"
        } else {
            let target_direction = this.game.getCardinalDirection(this_camp.position.x, this_camp.position.y, target_camp.position.x, target_camp.position.y)
            let target_biome = target_camp.biome.name
            camp_description = `This is a good spot, but not the one you were looking for;\n based on the SCOUT's directions, you should check\n in the ${target_biome} to the ${target_direction}`
        }

        return new Menu(60,30, "  CAMP  \n"+camp_description, 0, [
            {text: `REST: +${loot_value} food`, result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.campMenuCallback(m));        
    }

    campMenuCallback(m:Menu): boolean {
        console.log("camp callback?", m);
        if (m.currentSelection == 0) {
            let loot_value = this.tradeLoot();

            this.game.gameState.currentMenu = this.getCampMenu();
            let message = `you field dress your loot for ${loot_value} food`;
            this.game.messageLog.appendText(message);
        }

        return true
    }

    act(): Promise<any> {
        return Promise.resolve();
    }
}
