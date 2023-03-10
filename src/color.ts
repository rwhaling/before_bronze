import * as d3 from "d3";

export const lighten = (color, n = 5, k = 1) => {
    const {l, c, h} = d3.lch(color);
    return d3.lch(l + n * k, c, h);
}

export const darken = (color, n = 5, k = 1) => {
    const {l, c, h} = d3.lch(color);
    return d3.lch(l - n * k, c, h);
}

export const saturate = (color, n = 9, k = 1) => {
    const {l, c, h} = d3.lch(color);
    return d3.lch(l, c + n * k, h);
}