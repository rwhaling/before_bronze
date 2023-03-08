interface MenuResult {
    // newSelection: number;
    // closeMenu: boolean;
    // newMenu: Menu;
    // initializeGame: boolean;
    // endGame: boolean;
}

interface MenuItem {
    text: string;
    result: MenuResult;
}

type MenuCallback = (Menu) => boolean;

export class Menu {
    constructor(private width: number, private height: number, public text: string, public currentSelection: number, public selections: Array<MenuItem>, private callback?: MenuCallback) {

    }

    invokeCallback(): boolean {
        if (this.callback) {
            return this.callback(this);
        }
    }

    draw(): void {

    }

    handleInput(ev): void {

    }
}