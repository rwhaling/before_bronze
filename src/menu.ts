interface MenuResult {
    newSelection: number;
    closeMenu: boolean;
    newMenu: Menu;
    initializeGame: boolean;
    endGame: boolean;
}

interface MenuItem {
    text: string;
    result: MenuResult;
}

export class Menu {
    width: number;
    height: number;
    text: string;
    escapable: boolean;
    currentSelection: number;
    selections: [MenuItem];

    constructor(width: number, height: number, text: string, escapable: boolean, currentSelection: number, selections: [MenuItem]) {
        this.width = width;
        this.height = height;
        this.text = text;
        this.escapable = escapable;
        this.currentSelection = currentSelection;
        this.selections = selections;
    }

    draw(): void {

    }

    handleInput(ev): void {

    }
}