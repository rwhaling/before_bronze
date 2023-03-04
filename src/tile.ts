import { Glyph } from "./glyph";

export const enum TileType {
    Floor,
    Box,
    SearchedBox,
    DestroyedBox
}

export class Tile {
    static readonly floor = new Tile(TileType.Floor, new Glyph(".","#65B172","#32926F",));
    static readonly box = new Tile(TileType.Box, new Glyph("•","#654321","#32926F"));
    static readonly searchedBox = new Tile(TileType.SearchedBox, new Glyph("○", "#666", "#32926F"));
    static readonly destroyedBox = new Tile(TileType.DestroyedBox, new Glyph("○", "#555", "#32926F"));

    constructor(public readonly type: TileType, public readonly glyph: Glyph) { }
}