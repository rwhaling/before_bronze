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
    currentUpgrade: number;
    upgrades: Array<TradeUpgrade>;
    tradeTotal: number;

    constructor(private game: Game, private map: WorldMap, public startingBiome: Biome, public position: Point) {
        this.glyph = new Glyph("⌂", "yellow", "#32926F");
        this.campGlyph = new Glyph("△","yellow","#32926F")
        this.type = ActorType.Town;
        let biome_dir = b => this.game.getBiomeDirection(this.position.x, this.position.y,b);
        let camp_dir = (c:Camp) => this.game.getCardinalDirection(this.position.x, this.position.y, c.position.x, c.position.y)

        this.quests = [
            { target: "rabbit", quantity: 2, 
              description:`She asks you to first bring 2 rabbits, which will\n develop your ability to move quickly while hidden.`, reward:"hide"},
            { target: "deer", quantity: 2,
              description:`Next, use all your skills of stealth to bring 2 deer\n from the nearby woods, show that you have mastered your spear,\n and prove your readiness for the art of archery`, reward:"bow_1"},
            { target: "boar", quantity: 3, 
            description:`Now she asks you to demonstrate your aptitude with the bow,\n and retrieve 3 boar pelts from the grasslands in the ${biome_dir("grasslands")}\nBeware - boar are dangerous, and may charge you if cornered`, reward:"bow_2"},
            { target: "moose", quantity: 1,
              description:`You have nearly mastered the hunter's arts.\n\nFar to ${biome_dir("taiga")}, search the deep taiga for a moose, and retrieve its pelt.\nMoose are secretive, but extremely aggressive and dangerous when startled.\n\nThis is your final quest.`, reward:"bow_3"}
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
            let forestCamp: Camp = _.find(this.camps, c => c.biome.name === "forest" && c.biome != this.startingBiome);
            let grasslandCamp: Camp = _.find(this.camps, c => c.biome.name === "grasslands");
            let steppeCamp: Camp = _.find(this.camps, c => c.biome.name === "steppe");
            let darkForestCamp: Camp = _.find(this.camps, c => c.biome.name === "taiga");

            this.missions = [
                { target: forestCamp,
                  description: `He tells you of a clearing in the woods, just ${camp_dir(forestCamp)} of here\nSearch it out by SCOUTing the nearby area until you find it,\nand you will improve the efficiency of your abilities.`,
                  reward: "scout"},
                { target: grasslandCamp,
                  description: `Further to the ${camp_dir(grasslandCamp)}, in the grasslands, is another good site for a camp,\n which will improve your access to the rich game nearby\nScouting without the shelter of the forest presents challenges,\nbut if you succeed your stealth skills will be greatly enhanced.`,
                  reward: "stealth"},  
                { target: steppeCamp,
                  description: `The central steppes, to the ${camp_dir(steppeCamp)}, are rich in game, but \ndangerous as well; Finding a suitably sheltered spot will hone your vision, \nand provide access to the many surrounding areas.\n`,
                  reward: "vision"},
                { target: darkForestCamp,
                  description: `The distant taiga, in the ${camp_dir(darkForestCamp)}, is a harsh world unto itself,\nbut if you learn to survive it, your attunement with surroundings\nwill be unchallengeable.\n`,
                  reward: "listen"}
            ];
            this.currentMission = 0;
        }

        this.upgrades = [
            { quantity: 15,
              description: "food satchel upgrade (max 35)",
              reward: "food_1"},
            { quantity: 25,
              description: "food satchel upgrade (max 60)",
              reward: "food_2"},
            { quantity: 30,
              description: "food satchel upgrade (max 100)",
              reward: "food_3"},
            { quantity: 40,
              description: "max hp upgrade",
              reward: "hp"},
                    
        ];

        this.currentUpgrade = 0;
        this.tradeTotal = 0;


    }

    getTownMenu(): Menu {
        let message = "TOWN\n\nThis is your people's settlement, nestled into a meadow at the forest's edge.\n"
        message += "A few dozen people are going about their ordinary routines, but a handful have \n"
        message += "special significance for you:\n\n"
        message += "First, the TRADER will exchange your loot and pelts for FOOD, earning you satchel upgrades\n"
        message += "The local animist offers difficult QUESTS to challenge and expand your abilities as a hunter.\n"
        message += "Finally, the SCOUT can point you toward HUNTING CAMPS, and will reward you with skill upgrades.\n"
        return new Menu(100,30, message, 0, [
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

        let current_upgrade = this.upgrades[this.currentUpgrade]
        let upgrade_description = current_upgrade.description;

        let upgrade_remaining = current_upgrade.quantity - this.tradeTotal;
        let upgrade_ready = upgrade_remaining <= 0 || this.game.debugMode;
        if (!upgrade_ready) { 
            upgrade_description += ` (trade ${upgrade_remaining} more food)`
        } else {
            upgrade_description += ` (READY)`
        }

        let message = "TRADE  \n\nHere, you can TRADE the various animal pelts you have collected\n"
        message += "in exchange for FOOD.  Each one you exchange will count toward UPGRADES.\n"
        message += "(loot that you field-dress at a CAMP does not count toward upgrades here)"

        return new Menu(80,30, message, 0, [
            {text: `TRADE : +${loot_value} food`, result: {}},
            {text: `UPGRADE: ${upgrade_description}`, result: {}},
            {text: "BACK", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.tradeMenuCallback(m))
    }

    tradeMenuCallback(m: Menu): boolean {
        console.log("trade callback?",m);
        if (m.currentSelection === 0) {
            let loot_value = this.tradeLoot();
            let message = `You hand over your loot and receive ${loot_value} food,`;
            this.game.messageLog.appendText(message);
            this.tradeTotal += loot_value;

            this.game.gameState.currentMenu = this.getTradeMenu();

            return true;
        } else if (m.currentSelection === 1) {
            let current_upgrade = this.upgrades[this.currentUpgrade]
            let upgrade_description = current_upgrade.description;    
            let upgrade_remaining = current_upgrade.quantity - this.tradeTotal;
            let upgrade_ready = upgrade_remaining <= 0 || this.game.debugMode;
            if (upgrade_ready) {
                this.applyQuestReward(current_upgrade.reward);
                this.tradeTotal -= current_upgrade.quantity;
                this.currentUpgrade += 1;
                if (this.currentUpgrade >= this.upgrades.length) {
                    this.currentUpgrade = this.upgrades.length - 1;
                }
                return true;
            } else {
                let message = `Bring ${upgrade_remaining} more food first.`;
                this.game.messageLog.appendText(message);
                this.game.gameState.currentMenu = this.getTradeMenu();
                return true;

            }
    
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

        // let menuText = "  QUEST HUB  \n\n" + q.description;
        let menuText = "QUEST\n\n"
        menuText += "Your local animist is your people's advisor on many matters\n",
        menuText += "both spiritual and practical. As a hunter, you particulary value\n"
        menuText += "the depth of her connection with nature and her knowledge \nof the land around you.\n"
        menuText += "-----------------------\n"
        menuText += q.description;

        let loot =  _.countBy( this.game.player.loot);
        let questReady = false;
        if (this.game.debugMode === true) {
            console.log("handing in quest, debug mode");
            questReady = true;
        }
        if (loot[q.target] >= q.quantity) {
            questReady = true;
        }
        let isQuestReady = ""
        if (questReady) { isQuestReady = "(READY)"}

        return new Menu(80,30, menuText, 0, [
            {text: `TURN IN : ${q.quantity} ${q.target} ${isQuestReady}`, result: {}},
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
                let message = `You hand over [${q.quantity} ${q.target}].`;
                this.game.messageLog.appendText(message);
                this.applyQuestReward(q.reward);
                this.currentQuest += 1;
                if (this.currentQuest >= this.quests.length) {
                    this.currentQuest -= 1;
                    this.game.messageLog.appendText("CONGRATULATIONS, you have finished DAWN OF BRONZE")
                    return true;
                }
                return true;
            } else {
                let message = `You don't have [${q.quantity} ${q.target}].`;
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
        let menuText = "SCOUT\n\n"
        menuText += "The SCOUT is your people's most senior hunter and woodsman,\n"
        menuText += "a living encyclopedia of the rocks, streams, trees and hills,\n"
        menuText += "of the regions surrounding your village.\n\n"
        menuText += "Under his tutelage, you can learn how to survive efficiently\n"
        menuText += "in the surrounding wilderness.\n"
        menuText += "------------------------------\n"
        menuText += currentMission.description;
        // let menuText = "  SCOUT  \n\n" + currentMission.description;
        console.log("current mission target:",currentMission);
        let missionReady = currentMission.target.discovered || this.game.debugMode;
        let isMissionReady = ""
        if (missionReady) { isMissionReady = "(READY)"}
        return new Menu(80,30, menuText, 0, [
            {text: `TURN IN ${isMissionReady}`, result: {}},
            {text: "BACK", result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.scoutMenuCallback(m))
    }

    scoutMenuCallback(m:Menu): boolean {
        let currentMission = this.missions[this.currentMission];
        if (m.currentSelection === 0) {
            let missionReady = currentMission.target.discovered || this.game.debugMode;
            if (missionReady) {
                let message = `You describe the location to the scout.`;
                this.game.messageLog.appendText(message);
                this.applyQuestReward(currentMission.reward);
                // TODO: check
                this.currentMission += 1;
                if (this.currentMission >= this.missions.length) {
                    this.currentMission -= 1;
                    this.game.messageLog.appendText("(there are no more missions)")
                    return true;
                }
                return true;
            } else {
                let message = `You haven't found the location yet (there may be other campsites in the region).`;
                this.game.messageLog.appendText(message);
                return true;
            }
        }

        return true;
    }

    applyQuestReward(r:string): void {
        console.log("quest reward", r)
        if (r === "bow_1") {
            this.game.messageLog.appendText("You received a bow! use [R] to aim and [F] to fire.")
            this.game.player.archeryLevel = 1;
        } else if (r === "bow_2") {
            this.game.messageLog.appendText("Your archery skills have improved, and you are more accurate at longer range.")
            this.game.player.archeryLevel = 2;
            this.game.player.arrows = 8;
            this.game.player.maxArrows = 8;
        } else if (r === "bow_3") {
            this.game.messageLog.appendText("You have mastered the art of archery, and you are highly accurate at extended range.")
            this.game.player.archeryLevel = 3;
            this.game.player.arrows = 12;
            this.game.player.maxArrows = 12;
        } else if (r === "scout") {
            this.game.messageLog.appendText("You are more efficient at scouting, and will consume significantly less time, and food, when doing so.")
            this.game.player.scoutCostBonus += 2;
        } else if (r === "stealth") {
            this.game.messageLog.appendText("You are more stealthy, and listening to your surrounding will consume less food.") // todo, clarify
            this.game.player.stealthBonus += 2;
            this.game.player.listenCostBonus += 1;
        } else if (r === "hide") {
            this.game.messageLog.appendText("You can move faster while remaining hidden, and will consume less food.") // todo, clarify
            this.game.player.hideCostBonus += 1;
            // todo
        } else if (r === "vision") {
            this.game.messageLog.appendText("With your deep understanding of the land, you can detect creatures from further away.") // todo, clarify
            this.game.player.visDistBonus += 2;
        } else if (r === "listen") {
            this.game.messageLog.appendText("You can remain deeply attuned with your surroundings, while moving faster, and consuming less food.")
            this.game.player.listenBonus += 3;
        } else if (r === "food_1") {
            this.game.messageLog.appendText("You exchange your satchel for a larger one, you can now hold 35 food.")
            this.game.messageLog.appendText("(The trader tops you up as a token of gratitude)")
            this.game.player.maxFood = 35;
            this.game.player.food = 35;
        } else if (r === "food_2") {
            this.game.messageLog.appendText("You exchange your satchel for an even larger one, you can now hold 60 food.")
            this.game.messageLog.appendText("(The trader tops you up as a token of gratitude)")
            this.game.player.maxFood = 60;
            this.game.player.food = 60;
        } else if (r === "food_3") {
            this.game.messageLog.appendText("You exchange your satchel for a huge one, you can now hold 100 food.")
            this.game.messageLog.appendText("(The trader tops you up as a token of gratitude)")
            this.game.player.maxFood = 100;
            this.game.player.food = 100;
        } else if (r === "hp") {
            this.game.messageLog.appendText("You grow stronger as you and your community become ever more well-fed, your hp increases.")
            this.game.player.maxHp = 2;
            this.game.player.hp = 2;
        }
    }

    getCampMenu(): Menu {
        // TODO: directions to mission target here
        let loot_value = this.getTradeValue();

        let this_camp = this.game.getNearestCamp(this.game.player.position.x, this.game.player.position.y)[0];
        this_camp.discovered = true;
        let currentMission = this.missions[this.currentMission];

        let target_camp = currentMission.target

        if (this.game.player.hp < this.game.player.maxHp) {
            this.game.messageLog.appendText("your HP is replenished")
        }

        let camp_description = `This is a good hunting camp, sheltered from the surrounding ${this_camp.biome.name}.\n`;
        camp_description += "You can field-dress your loot here in exchange for meat, if you wish\n (it will not count toward upgrades in town)\n\n"
        if (target_camp === this_camp) {
            camp_description += "You have reached the location you were searching for;\nreturn to the SCOUT in town for a reward"
        } else {
            let target_direction = this.game.getCardinalDirection(this_camp.position.x, this_camp.position.y, target_camp.position.x, target_camp.position.y)
            let target_biome = target_camp.biome.name
            camp_description += `This is a good spot, but not the one you were looking for;\n based on the SCOUT's directions, you should check\n in the ${target_biome} to the ${target_direction}`
        }

        return new Menu(80,30, "  CAMP  \n"+camp_description, 0, [
            {text: `REST: +${loot_value} food`, result: {}},
            {text: "LEAVE", result: {}},
        ], (m) => this.campMenuCallback(m));        
    }

    campMenuCallback(m:Menu): boolean {
        console.log("camp callback?", m);
        if (m.currentSelection == 0) {
            let loot_value = this.tradeLoot();

            this.game.gameState.currentMenu = this.getCampMenu();
            let message = `You field dress your loot for ${loot_value} food`;
            this.game.messageLog.appendText(message);
        }

        return true
    }

    act(): Promise<any> {
        return Promise.resolve();
    }
}
