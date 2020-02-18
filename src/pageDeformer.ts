// -------------------------------------------------------------------------------------------------
// The PageDeformer holds weak references to a list of UV's and positions.
//
//   - constructor(positions: Float32Array, texcoords: Float32Array)
//   - updatePositions(t: number)
//   - updatePositions(theta: number, apex: number)
//
// Author: Philip Rideout <https://prideout.net>
// -------------------------------------------------------------------------------------------------

import { vec2, vec3 } from "gl-matrix";

export default class PageDeformer {
    constructor(readonly positions: Float32Array, readonly texcoords: Float32Array) {}

    updatePositions(t: number) {
        const apex = -15 * t;
        const theta = t * Math.PI / 2.0;
        this.deform(theta, apex);
    }

    private deform(theta: number, apex: number) {
        const count = this.positions.length / 3;
        for (let i = 0; i < count; i++) {
            const u = this.texcoords[i*2+0];
            const v = this.texcoords[i*2+1];

            const r = Math.sqrt(u * u + (v - apex) * (v - apex));
            const d = r * Math.sin(theta);
            const alpha = Math.asin(u / r);
            const beta = alpha / Math.sin(theta);

            const x = d * Math.sin(beta);
            const y = r + apex - d * (1 - Math.cos(beta)) * Math.sin(theta);
            const z = d * (1 - Math.cos(beta)) * Math.cos(theta);

            this.positions[i*3+0] = x;
            this.positions[i*3+1] = y - 0.5;
            this.positions[i*3+2] = z;
        }
    }
}
