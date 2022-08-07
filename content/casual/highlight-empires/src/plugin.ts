/*
 * Help to analyze empires around at map.
 */
import {
    Planet,
    PlanetType,
} from "@darkforest_eth/types";
import Voronoi from "./voronoi";

class Plugin {
    public container: HTMLDivElement | undefined

    public colors: string[]
    public enemyFillColor: string
    public ownerFillColor: string
    public bordersColor: string
    public showEdges: boolean
    public fillRegions: boolean

    public nullAddress = "0x0000000000000000000000000000000000000000"
    private playerAddress: string

    private interval: NodeJS.Timer;
    private planets: Planet[] | undefined;

    private voronoi: any

    constructor() {
        this.colors = ["#f4a261"]
        this.enemyFillColor = "rgb(248, 92, 80, 0.1)"
        this.ownerFillColor = "rgb(81, 234, 255, 0.1)"
        this.bordersColor = "rgb(242, 248, 253, 0.3)"

        this.showEdges = true
        this.fillRegions = false

        this.playerAddress = "0xe7f5cce56814f2155f05ef6311a6de55e4189ea5"

        this.interval = setInterval(() => {
            this.planets = this.getAllPlanets()
            // .filter((p: Planet) => p.planetType === PlanetType.PLANET)
        }, 1000);

        this.voronoi = new Voronoi();
    }

    /**
     * Called when plugin is launched with the "run" button.
     */
    async render(container: HTMLDivElement) {
        this.container = container;

        // Checkbox "Show empire edges"
        let checkboxDiv = document.createElement('div');
        let checkboxInput = document.createElement('input');
        checkboxInput.style.width = '10%';
        checkboxInput.type = "checkbox";
        checkboxInput.checked = this.showEdges;
        checkboxInput.onchange = (event: any) => {
            if (event.target.checked) {
                this.showEdges = true
            } else {
                this.showEdges = false
            }
        }
        let checkboxLabel = document.createElement('label');
        checkboxLabel.style.width = '80%';
        checkboxLabel.innerHTML = "Show empire edges";
        checkboxDiv.appendChild(checkboxInput);
        checkboxDiv.appendChild(checkboxLabel);
        this.container.appendChild(checkboxDiv);
    }

    /**
     * Called when plugin modal is closed.
     */
    destroy() {
        clearInterval(this.interval);
    }

    /**
     * Draw canvas frames.
     */
    draw(ctx: any) {
        if (this.showEdges) {
            const viewport = ui.getViewport();
            const scale = viewport.scale

            let xList: number[] = []
            let yList: number[] = []
            let sites: { x: any; y: any; owner: any; }[] = []

            if (this.planets) {
                this.planets.forEach((p: any) => {
                    const { x, y } = viewport.worldToCanvasCoords(p.location.coords);
                    xList.push(x)
                    yList.push(y)
                    sites.push({ x: x, y: y, owner: p.owner })

                    // // Circles around all planets
                    // ctx.beginPath();
                    // ctx.arc(x, y, 20 * scale, 0, 2 * Math.PI);
                    // ctx.lineWidth = 1 * scale;
                    // ctx.strokeStyle = this.ownerColor;
                    // ctx.stroke();
                    // ctx.closePath();
                })
            }

            // Strange, but yt max y value at voronoi boundary box
            const xl = Math.min(...xList)
            const xr = Math.max(...xList)
            const yt = Math.max(...yList)
            const yb = Math.min(...yList)
            const bbox = { xl: xl, xr: xr, yt: yb, yb: yt };
            if (isFinite(bbox.xl) && isFinite(bbox.yt)) {
                // // Borders of voronoi diagram
                // ctx.beginPath();
                // ctx.rect(xl, yb, xr-xl, yt-yb);
                // ctx.lineWidth = 4 * scale;
                // ctx.strokeStyle = this.ownerColor;
                // ctx.stroke();
                // ctx.closePath();

                if (sites.length > 5) {
                    const diagram = this.voronoi.compute(sites, bbox);
                    diagram.cells.forEach((cell: any) => {
                        if (cell.site.owner !== this.nullAddress) {
                            const halfedges = cell.halfedges;
                            const nHalfedges = halfedges.length;
                            if (nHalfedges > 2) {
                                // TODO: Is there a way to draw in canvas simultaneously different paths?
                                this.generateBorders(ctx, halfedges, nHalfedges)
                                this.generateRegions(ctx, cell, halfedges, nHalfedges)
                            }
                        }
                    })
                }
            }
        }
    }

    // Stroke borders of empires
    generateBorders(ctx: any, halfedges: any[], nHalfedges: number) {
        const v = halfedges[0].getStartpoint();
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        for (var iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
            const v = halfedges[iHalfedge].getEndpoint();
            if (
                halfedges[iHalfedge].edge.lSite.owner ===
                halfedges[iHalfedge].edge.rSite?.owner
            ) {
                ctx.moveTo(v.x, v.y);
            } else {
                ctx.lineTo(v.x, v.y);
            }
        }
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.bordersColor;
        ctx.stroke();

    }

    // Fullfil region with offset
    generateRegions(ctx: any, cell: any, halfedges: any[], nHalfedges: number) {
        ctx.fillStyle = this.enemyFillColor
        if (cell.site.owner === this.playerAddress) {
            ctx.fillStyle = this.ownerFillColor
        }

        const v = halfedges[0].getStartpoint()
        ctx.beginPath()
        const [vx, vy] = this.shiftEdgeCoords(cell, v)
        ctx.moveTo(vx, vy)
        for (let iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
            const v = halfedges[iHalfedge].getStartpoint()
            const [vx, vy] = this.shiftEdgeCoords(cell, v)
            ctx.lineTo(vx, vy)
        }
        ctx.fill()
        ctx.closePath();
    }

    // Coordinate shift for region offset
    shiftEdgeCoords(cell: any, v: { x: number; y: number; }) {
        const shiftVal = 0.1
        let vx = (v.x + cell.site.x * shiftVal) / (1 + shiftVal);
        let vy = (v.y + cell.site.y * shiftVal) / (1 + shiftVal);
        return [vx, vy];
    };

    getAllPlanets(levelFrom?: number, levelTo?: number): any[] {
        let planets = Array.from(df.getAllPlanets());
        if (levelFrom) {
            planets = planets.filter((p: any) => p.planetLevel >= levelFrom);
        }
        if (levelTo) {
            planets = planets.filter((p: any) => p.planetLevel <= levelTo);
        }
        return planets;
    }

    randomColorPicker(): [string, string] {
        const colorOne = this.colors[Math.floor(Math.random() * this.colors.length)];
        const colorTwo = this.colors[Math.floor(Math.random() * this.colors.length)];
        return [colorOne, colorTwo]
    }
}

export default Plugin;
