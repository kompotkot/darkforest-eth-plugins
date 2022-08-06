/*
 * Help to analyze empires around at map.
 */
import {
    Planet,
    PlanetLevel,
    PlanetType,
} from "@darkforest_eth/types";
import Voronoi from "voronoi";
import { Utils, randomColorPicker } from "./utils";

class Plugin {
    public container: HTMLDivElement | undefined
    public ownerColor: string;
    public ownerBorderColor: string;
    public showRegions: boolean

    private interval: NodeJS.Timer;
    private planets: Planet[] | undefined;
    private voronoi: any

    constructor() {
        this.showRegions = true

        this.interval = setInterval(() => {
            this.planets = Utils.getAllPlanets()
                .filter((p: Planet) => p.planetType === PlanetType.PLANET)
        }, 1000);
        [this.ownerColor, this.ownerBorderColor] = randomColorPicker()

        this.voronoi = new Voronoi();
    }

    /**
     * Called when plugin is launched with the "run" button.
     */
    async render(container: HTMLDivElement) {
        this.container = container;

        // Checkbox "Show empire regions"
        let checkboxDiv = document.createElement('div');
        let checkboxInput = document.createElement('input');
        checkboxInput.style.width = '10%';
        checkboxInput.type = "checkbox";
        checkboxInput.checked = this.showRegions;
        checkboxInput.onchange = (event: any) => {
            if (event.target.checked) {
                this.showRegions = true
            } else {
                this.showRegions = false
            }
        }
        let checkboxLabel = document.createElement('label');
        checkboxLabel.style.width = '80%';
        checkboxLabel.innerHTML = "Show empire regions";
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
        if (this.showRegions) {
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

                const diagram = this.voronoi.compute(sites, bbox);
                this.generateRegions(ctx, diagram)
            }
        }
    }

    generateRegions(ctx: any, diagram: any) {
        // Regions
        ctx.beginPath();
        ctx.lineWidth = 4
        ctx.strokeStyle = this.ownerBorderColor;

        const edges = diagram.edges
        edges.forEach((edge: any) => {
            // Unite regions if they have one owner
            if (edge.lSite?.owner === edge.rSite?.owner) {
                return
            }
            if (!edge.rSite) {
                return
            }
            ctx.moveTo(edge.va.x, edge.va.y)
            ctx.lineTo(edge.vb.x, edge.vb.y)

        })
        ctx.stroke();
        ctx.closePath();
    }
}

export default Plugin;
