import { Menu } from "./menu";

export class GameState {
    foundPineapple: boolean;
    pineappleWasDestroyed: boolean;
    playerWasCaught: boolean;
    initialized: boolean;
    currentMenu: Menu | null;

    constructor() {
        this.reset();
    }

    reset(): void {
        this.foundPineapple = false;
        this.pineappleWasDestroyed = false;
        this.playerWasCaught = false;
        this.initialized = false;
        this.currentMenu = null;
    }

    doStartNextRound(): boolean {
        return this.foundPineapple;
    }

    doRestartGame(): boolean {
        return this.pineappleWasDestroyed || this.playerWasCaught;
    }

    isGameOver(): boolean {
        return this.foundPineapple || this.pineappleWasDestroyed || this.playerWasCaught;
    }
}