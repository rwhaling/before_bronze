import * as d3 from "d3";
// import * as poisson from "fast-2d-poisson-disk-sampling";
import * as _ from "lodash";
import * as mypoisson from "./poisson";

// const poisson = require('fast-2d-poisson-disk-sampling');

export class Biome {
  name: string;
  baseColor: string;
  cell: number;
  neighbors: Array<number>;

  constructor(name:string, baseColor: string, cell: number, neighbors: Array<number>) {
      this.name = name;
      this.baseColor = baseColor;
      this.cell = cell;
      this.neighbors = neighbors;
  }

  isOcean(): boolean {
      return this.name === "ocean" || this.name === "shallowOcean" || this.name === "deepOcean";
  }

  isForest(): boolean {
      return this.name === "lightForest" || this.name === "darkForest";
  }

  isGrassland(): boolean {
      return this.name === "grassland" || this.name === "scrubland";
  }

  isWetland(): boolean {
      return this.name === "wetland";
  }

  isMountains(): boolean { 
      return this.name === "hills" || this.name === "mountains";
  }
}


export const mkCells = (w,h) => {
    let rng = d3.randomLcg();

    console.log(mypoisson);

    let pnts:Array<Array<number>> = Array.from(mypoisson.samples([0,0,w,h],50,10));

    let voronoi = new d3.Delaunay(pnts.flat()).voronoi([0, 0, w, h]);

    console.log("voronoi:",voronoi);

    // let { corners, triangles } = voronoi.delaunay;
    let triangles = voronoi.delaunay.triangles;
    let n_tri = triangles.length / 3;
    let cell_arr = Array.from(voronoi.cellPolygons());
    let n_cells = cell_arr.length;
    
    return {
      n_tri: n_tri,
      n_cells: n_cells,
      next_seed: rng(),
      points: pnts,
      voronoi: voronoi,
      delaunay: voronoi.delaunay,
    }    
}

export const mkBiomes = (geometry,width,height) => {
    let rng = d3.randomLcg();
    let voronoi = geometry.voronoi;

    let minty = ["#1B4E3B","#267055","#3EB489","#32926F","#65B172","#84AD5F","#9FA752"]
    // tundra, taiga, open boreal forest, closed boreal forest, steppe, muskeg,
    let chocolate = ["#E4D4C8","#D0B49F","#A47551","#523A28"]
    let dark_minty = ["#1B4E3B","#267055","#3EB489","#32926F"]
    let light_minty = ["#32926F","#65B172","#84AD5F","#9FA752"]
  
    let colors = d3.schemeSpectral[11];
    let scale = d3.scaleSequential()
      .domain([0, 1.0])
      .interpolator(d3.interpolateWarm);
  
    let peaks = [];
    let underwater = [];
    let tri_colors: Array<Biome> = [];
    let on_border = [];
  
    let all_seas = [];
    let north_sea = [];
    let east_sea = [];
    let south_sea = [];
    let west_sea = [];
  
    let all_edge = [];
    let north_edge = [];
    let east_edge = [];
    let south_edge = [];
    let west_edge = [];
  
    let all_corners = [];
    let ne_corner = [];
    let se_corner = [];
    let sw_corner = [];
    let nw_corner = [];
  
    let interior = [];
    
    for (let i = 0; i < geometry.n_cells; i++) {
  
      on_border[i] = false;
      let edges = Array.from(pairwise(geometry.voronoi.cellPolygon(i)));
      for (const edge of edges) {
        if (edge[0][0] === 0.0 && edge[1][0] === 0.0) {
          all_seas.push(i);
          west_sea.push(i);
          on_border[i] = true;
          tri_colors[i] = new Biome("ocean",d3.interpolateBlues(d3.randomUniform.source(rng)(0.5,1.0)()),i,[]);
        } else if (edge[0][1] === 0.0 && edge[1][1] === 0.0) {
          all_seas.push(i);
          north_sea.push(i);
          on_border[i] = true;                
          tri_colors[i] = new Biome("ocean",d3.interpolateBlues(d3.randomUniform.source(rng)(0.5,1.0)()),i,[]);
        } else if (edge[0][0] === width && edge[1][0] === width) {
          all_seas.push(i);
          east_sea.push(i);
          on_border[i] = true;                
          tri_colors[i] = new Biome("ocean",d3.interpolateBlues(d3.randomUniform.source(rng)(0.5,1.0)()),i,[]);
        } else if (edge[0][1] === height && edge[1][1] == height) {
          all_seas.push(i);
          south_sea.push(i);
          on_border[i] = true;        
          tri_colors[i] = new Biome("ocean",d3.interpolateBlues(d3.randomUniform.source(rng)(0.5,1.0)()),i,[]);
        }      
      }
    }
  
    all_seas = _.uniq(all_seas);
    west_sea = _.uniq(west_sea);
    north_sea = _.uniq(north_sea);
    east_sea = _.uniq(east_sea);
    south_sea = _.uniq(south_sea);
  
    let all_coasts = [];
    let west_coast = [];
    let north_coast = [];
    let east_coast = [];
    let south_coast = [];
    let corners = [];
 
    for (let i of all_seas) {
      console.log("checking coasts on sea:",i,Array.from(geometry.voronoi.neighbors(i)));
      for (let j of Array.from(geometry.voronoi.neighbors(i))) {
        if (!all_seas.includes(j)) {
          all_coasts.push(j);
          if (west_sea.includes(i)) {
            console.log("west coast: ",j);
            west_coast.push(j);
            // tri_colors[j] = "red";
          } else if (north_sea.includes(i)) {
            console.log("north coast: ",j);
            north_coast.push(j); 
            // tri_colors[j] = "orange";
          } else if (east_sea.includes(i)) {
            console.log("east coast: ",j);
            east_coast.push(j);
            // tri_colors[j] = "yellow";
          } else if (south_sea.includes(i)) {
            console.log("south coast: ",j);          
            south_coast.push(j);
            // tri_colors[j] = "magenta";
          }
        }
      }
    }
  
    for (let i of all_coasts) {
      if (west_coast.includes(i)) {
        if (north_coast.includes(i)) {
          corners.push(i);
        } else if (south_coast.includes(i)) {
          corners.push(i)
        }
      } else if (east_coast.includes(i)) {
        if (north_coast.includes(i)) {
          corners.push(i);
        } else if (south_coast.includes(i)) {
          corners.push(i)
        }
      }
    }
  
    for (let i of corners) {
      // tri_colors[i] = "violet";
    }
  
    let sea_options = [west_sea, north_sea, east_sea, south_sea];
    console.log("seas:",sea_options);
    console.log("coasts:",all_coasts);
    let coast_options = [west_coast, north_coast, east_coast, south_coast];
    let opposite_options = [east_coast, south_coast, west_coast, north_coast];
    let remaining_coasts = [[north_coast, south_coast], [east_coast, west_coast], [north_coast, south_coast], [east_coast, west_coast]];
  
    let selection = d3.randomInt.source(rng)(0,4)();
  
    let select_sea = sea_options[selection];
    let select_coast = coast_options[selection];
    let select_opposite = opposite_options[selection];
  
    let remaining_selection = d3.randomInt.source(rng)(0,1)();
    let last_selection = remaining_selection == 0 ? 1 : 0;
    let select_remaining = remaining_coasts[selection];
  
    console.log("remaining coasts", remaining_coasts, "remaining_selection", remaining_selection, "last_selection", last_selection,"select_remaining", select_remaining)
  
    let far_coast = select_remaining[remaining_selection];
    let near_coast = select_remaining[last_selection];    
  
    for (let i of select_sea) {
      tri_colors[i] = new Biome("mountains",chocolate[d3.randomInt.source(rng)(0,4)()],i,[]);
    }
  
    for (let i of select_coast) {
      // tri_colors[i] = new Biome("hills",d3.interpolateYlOrBr(d3.randomUniform.source(rng)()()),i,[]);
      tri_colors[i] = new Biome("plains",light_minty[d3.randomInt.source(rng)(0,4)()],i,[]);      
    }
  
    for (let i of select_opposite) {
      // tri_colors[i] = new Biome("wetlands",d3.interpolateGnBu(d3.randomUniform.source(rng)()()),i,[]);
      tri_colors[i] = new Biome("plains",light_minty[d3.randomInt.source(rng)(0,4)()],i,[]);      
    }
  
    for (let i of far_coast) {
      tri_colors[i] = new Biome("darkForest",dark_minty[d3.randomInt.source(rng)(0,4)()],i,[]);
    }
  
    for (let i of near_coast) {
      tri_colors[i] = new Biome("lightForest",light_minty[d3.randomInt.source(rng)(0,4)()],i,[]);    
    }
  
    for (let i = 0; i < geometry.n_cells; i++) {
      if (!all_seas.includes(i) && !all_coasts.includes(i)) {
        interior.push(i);
        tri_colors[i] = new Biome("plains",light_minty[d3.randomInt.source(rng)(0,4)()],i,[]);      
      }
    }
  
    return tri_colors;  
}

function * pairwise (iterable) {
    const iterator = iterable[Symbol.iterator]()
    let current = iterator.next()
    let next = iterator.next()
    while (!next.done) {
        yield [current.value, next.value]
        current = next
        next = iterator.next()
    }
}
