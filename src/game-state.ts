import { Menu } from "./menu";

export class GameState {
    initialized: boolean;
    cheatCount: number;
    currentMenu: Menu | null;

    constructor() {
        this.reset();
    }

    reset(): void {
        this.initialized = false;
        this.cheatCount = 0;
        this.currentMenu = null;
    }

    doRestartGame(): boolean {
        return;
    }
}