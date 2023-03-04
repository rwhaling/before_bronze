import * as d3 from "d3";

export const lighten = (color, k = 1) => {
    const {l, c, h} = d3.lch(color);
    return d3.lch(l + 5 * k, c, h);
}

export const darken = (color, k = 1) => {
    const {l, c, h} = d3.lch(color);
    return d3.lch(l - 5 * k, c, h);
}

export const saturate = (color, k = 1) => {
    const {l, c, h} = d3.lch(color);
    return d3.lch(l, c + 9 * k, h);
}