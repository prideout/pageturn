// -------------------------------------------------------------------------------------------------
// The App owns the Display and Simulation.
//
// HexGL by Thibaut 'BKcore' Despoulain <http://bkcore.com>
// Rewritten by Philip Rideout <https://prideout.net>
// -------------------------------------------------------------------------------------------------

import * as Filament from "filament";
import * as urls from "./urls";

import { glMatrix } from "gl-matrix";

import Display from "./display";

// These are only the assets that must be loaded before creating the Filament engine. Note that many
// other assets are fetched later in the initialization process (e.g. mesh data).
const initialAssets = [
    urls.sky,
    urls.ibl,
    urls.pbrMaterial,
    urls.nonlitMaterial
];

Filament.init(initialAssets, () => {
    glMatrix.setMatrixArrayType(Array);

    // The global app instance can be accessed for debugging purposes only.
    window["app"] = new App();
});

class App {
    private readonly display: Display;
    private readonly slider: HTMLInputElement;
    private time: number;

    constructor() {
        this.tick = this.tick.bind(this);
        const canvas = document.getElementsByTagName("canvas")[0];
        this.display = new Display(canvas);
        this.time = Date.now();
        this.slider = document.getElementById("animvalue") as HTMLInputElement;
        window.requestAnimationFrame(this.tick);
    }

    private tick() {
        // Determine the time step.
        const time = Date.now();
        const dt = (time - this.time) * 0.1;
        this.time = time;

        // Render the 3D scene.
        this.display.render(parseFloat(this.slider.value));

        // Request the next frame.
        window.requestAnimationFrame(this.tick);
    }
}
