export function padLeft(text: string, length: number, character?: string): string {
    let char = character || " ";
    while (text.length < length) {
        text = char + text;
    }
    return text;
}

export function padRight(text: string, length: number, character?: string): string {
    let char = character || " ";
    while (text.length < length) {
        text += char;
    }
    return text;
}

export function padCenter(text: string, length: number, character?: string): string {
    let char = character || " ";
    let leftSide = Math.floor((length - text.length) / 2);
    let rightSide = length - (text.length + leftSide);
    console.log(length, leftSide, text.length, rightSide);
    text = padLeft(text, leftSide, character);
    text = padRight(text, length, character);
    return text;
}