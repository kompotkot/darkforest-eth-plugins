import { Planet } from "@darkforest_eth/types";

export class Utils {
	public static getAllPlanets(levelFrom?: number, levelTo?: number): Planet[] {
		let planets = Array.from(df.getAllPlanets());
		if (levelFrom) {
			planets = planets.filter((p: Planet) => p.planetLevel >= levelFrom);
		}
		if (levelTo) {
			planets = planets.filter((p: Planet) => p.planetLevel <= levelTo);
		}
		return planets;
	}
}

const colors = ["#f4a261"];

export function randomColorPicker(): [string, string] {
	const colorOne = colors[Math.floor(Math.random() * colors.length)];
	const colorTwo = colors[Math.floor(Math.random() * colors.length)];
	return [colorOne, colorTwo]
}
