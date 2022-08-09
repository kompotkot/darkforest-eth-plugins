/*
 * Help to analyze empires around at map.
 */
import { LocatablePlanet, PlanetType } from "@darkforest_eth/types"
import Voronoi from "./voronoi"

// Null address represents a space object without an owner
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"

class Plugin {
    public enemyFillColor: string
    public allyFillColor: string
    public ownerFillColor: string
    public bordersColor: string
    public showEdges: boolean
    public fillRegions: boolean

    private ownerAddress: string
    private playerAddresses: Set<string>
    private allyAddresses: Set<string>

    private interval: NodeJS.Timer
    private planets: LocatablePlanet[] | undefined

    private voronoi: any

    constructor() {
        this.enemyFillColor = "rgb(248, 92, 80, 0.2)"
        this.allyFillColor = "rgb(81, 234, 255, 0.2)"
        this.ownerFillColor = "rgb(242, 248, 253, 0.1)"
        this.bordersColor = "rgb(242, 248, 253, 0.3)"

        this.showEdges = true
        this.fillRegions = false

        this.ownerAddress = ui.getAccount()
        this.playerAddresses = new Set()
        this.allyAddresses = new Set()

        this.interval = setInterval(() => {
            this.planets = this.getAllPlanets()
            // .filter((p: Planet) => p.planetType === PlanetType.PLANET)
            for (const [k, _] of df.players) {
                if (k !== this.ownerAddress) {
                    this.playerAddresses.add(k)
                }
            }
        }, 1000)

        this.voronoi = new Voronoi()
    }

    /**
     * Called when plugin is launched with the "run" button.
     */
    async render(container: HTMLDivElement) {
        container.style.width = "350px"

        let allyLiElements = ""
        this.allyAddresses.forEach((address: string) => {
            allyLiElements += `<li><p id="df-plugin-he-li-${address}">${address}</p></li>`
        })

        container.innerHTML = `<div class="df-plugin-he-wrapper">
            <div class="df-plugin-he-row">
                <input type="checkbox" name="highlightEmpires" class="df-plugin-he-chb" id="df-plugin-he-chb-highlight-empires">
                <label>Highlight empires</label>
            </div>
            <h2 class="df-plugin-he-row-title">Alliance control panel</h2>
            <div class="df-plugin-he-row">
                <div class="df-plugin-he-row-input-fix">
                    <df-text-input class="df-plugin-he-inp" id="df-plugin-he-inp-ally-address" placeholder="0x ally address">
                </div>
                <df-button id="df-plugin-he-btn-ally-address" style="margin-top: 0;">Add new ally</df-button>
            </div>
            <div class="df-plugin-he-row">
                <ul id="df-plugin-he-ul-allies">
                    ${allyLiElements}
                </ul>
            </div>
        </div>
        <style>
            .df-plugin-he-wrapper * + * {
                margin-top: 0.5em;
            }
            .df-plugin-he-chb {
                margin-right: 8px;
            }
            .df-plugin-he-inp {
                width: 90%;
            }
            .df-plugin-he-row > ul > li {
                margin: 0 .1em;
            }
            .df-plugin-he-row > ul > li:hover {
                margin: 0 .1em;
                text-decoration: line-through;
                cursor: pointer;
            }
            .df-plugin-he-row-title {
                font-size: 14pt;
                text-decoration: underline;
            }
            .df-plugin-he-wrapper {
                display: flex;
                flex-direction: column;
            }
            .df-plugin-he-row {
                display: flex;
                align-items: center;
            }
            .df-plugin-he-row-input-fix {
                display: flex;
                flex: 1;
            }
        </style>`

        // Checkbox "Highlight empires"
        const highlightEmpiresCheckbox = document.getElementById(
            "df-plugin-he-chb-highlight-empires"
        ) as HTMLInputElement | null
        if (highlightEmpiresCheckbox != null) {
            highlightEmpiresCheckbox.checked = this.showEdges
            highlightEmpiresCheckbox.onchange = (e: any) => {
                if (e.target.checked) {
                    this.showEdges = true
                } else {
                    this.showEdges = false
                }
            }
        }
        // Alliance control panel
        // Add new ally
        const allyAddressAddInput = document.getElementById(
            "df-plugin-he-inp-ally-address"
        ) as HTMLInputElement | null
        const allyAddressAddButton = document.getElementById(
            "df-plugin-he-btn-ally-address"
        ) as HTMLButtonElement | null
        if (allyAddressAddButton != null && allyAddressAddInput != null) {
            allyAddressAddButton.onclick = () => {
                const av = allyAddressAddInput.value
                if (
                    av !== "" &&
                    av.startsWith("0x") &&
                    av.length === 42 &&
                    av !== this.ownerAddress
                ) {
                    this.allyAddresses.add(av)
                    this.render(container)
                }
            }
        }
        // Remove ally
        const allyAddressUl = document.getElementById(
            "df-plugin-he-ul-allies"
        ) as HTMLUListElement | null
        const removeAlly = (e: any) => {
            const allyIdList = e.target.id.trim().split("-")
            this.allyAddresses.delete(allyIdList[allyIdList.length - 1])
            this.render(container)
        }
        if (allyAddressUl != null) {
            allyAddressUl.addEventListener("click", removeAlly)
        }
    }

    /**
     * Called when plugin modal is closed.
     */
    destroy() {
        clearInterval(this.interval)
    }

    /**
     * Draw canvas frames.
     */
    draw(ctx: any) {
        if (this.showEdges) {
            const viewport = ui.getViewport()

            let xList: number[] = []
            let yList: number[] = []
            let sites: { x: any; y: any; owner: any }[] = []
            if (this.planets) {
                this.planets.forEach((p: any) => {
                    const { x, y } = viewport.worldToCanvasCoords(
                        p.location.coords
                    )
                    xList.push(x)
                    yList.push(y)
                    sites.push({ x: x, y: y, owner: p.owner })
                })
            }

            // Generate boundary box for voronoi diagram
            const xl = Math.min(...xList)
            const xr = Math.max(...xList)
            const yt = Math.max(...yList)
            const yb = Math.min(...yList)
            const bbox = { xl: xl, xr: xr, yt: yb, yb: yt }

            // Iterate
            if (isFinite(bbox.xl) && isFinite(bbox.yt)) {
                if (sites.length > 5) {
                    const diagram = this.voronoi.compute(sites, bbox)

                    // Iterate over each cell based on planets coords
                    diagram.cells.forEach((cell: any) => {
                        if (cell.site.owner !== NULL_ADDRESS) {
                            const halfedges = cell.halfedges
                            const nHalfedges = halfedges.length
                            if (nHalfedges > 2) {
                                // TODO: Is there a way to draw in canvas simultaneously different paths?
                                this.generateBorders(ctx, halfedges, nHalfedges)
                                this.generateRegions(
                                    ctx,
                                    cell,
                                    halfedges,
                                    nHalfedges
                                )
                            }
                        }
                    })
                }
            }
        }
    }

    // Stroke borders of empires
    generateBorders(ctx: any, halfedges: any[], nHalfedges: number) {
        const v = halfedges[0].getStartpoint()
        ctx.beginPath()
        ctx.moveTo(v.x, v.y)
        for (var iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
            const v = halfedges[iHalfedge].getEndpoint()
            if (
                halfedges[iHalfedge].edge.lSite.owner ===
                halfedges[iHalfedge].edge.rSite?.owner
            ) {
                ctx.moveTo(v.x, v.y)
            } else {
                ctx.lineTo(v.x, v.y)
            }
        }
        ctx.lineWidth = 4
        ctx.strokeStyle = this.bordersColor
        ctx.stroke()
    }

    // Fullfil region with offset
    generateRegions(ctx: any, cell: any, halfedges: any[], nHalfedges: number) {
        ctx.fillStyle = this.enemyFillColor
        if (cell.site.owner === this.ownerAddress) {
            ctx.fillStyle = this.ownerFillColor
        } else if (this.allyAddresses.has(cell.site.owner)) {
            ctx.fillStyle = this.allyFillColor
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
        ctx.closePath()
    }

    // Coordinate shift for region offset
    shiftEdgeCoords(cell: any, v: { x: number; y: number }) {
        const shiftVal = 0.1
        let vx = (v.x + cell.site.x * shiftVal) / (1 + shiftVal)
        let vy = (v.y + cell.site.y * shiftVal) / (1 + shiftVal)
        return [vx, vy]
    }

    // Return list of all planets, wormholes and other space objects
    getAllPlanets(levelFrom?: number, levelTo?: number): LocatablePlanet[] {
        let planets: LocatablePlanet[] = Array.from(df.getAllPlanets())
        if (levelFrom) {
            planets = planets.filter((p: any) => p.planetLevel >= levelFrom)
        }
        if (levelTo) {
            planets = planets.filter((p: any) => p.planetLevel <= levelTo)
        }
        return planets
    }

    // Pick random color from the list
    randomColorPicker(colors: string[]): [string, string] {
        const colorOne = colors[Math.floor(Math.random() * colors.length)]
        const colorTwo = colors[Math.floor(Math.random() * colors.length)]
        return [colorOne, colorTwo]
    }
}

export default Plugin
