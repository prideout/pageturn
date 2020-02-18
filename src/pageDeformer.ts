export default class PageDeformer {
    constructor(readonly positions: Float32Array, readonly texcoords: Float32Array) {}

    // Takes an animation value in [0,1] and updates the positions array.
    // Returns a rotation value that should be applied to the entire page.
    public updatePositions(t: number): number {
        const D0 = 0.15, D1 = 1.0 - D0;
        let deformation = 0;
        deformation = D0 + (1.0 + Math.cos(8.0 * Math.PI * t)) * D1 / 2.0;
        if (t > 0.125) {
            deformation = D0;
        }
        if (t > 0.5) {
            const t1 = Math.max(0.0, (t - 0.5) / 0.5 - 0.125);
            deformation = D0 + D1 * Math.pow(t1, 3.0);
        }
        const apex = -15 * deformation;
        const theta = deformation * Math.PI / 2.0;
        this.deformMesh(theta, apex);

        const radians = Math.PI * Math.max(0.0, (t - 0.125) / 0.875);
        return radians;
    }

    // Applies the deformation described in "Deforming Pages of Electronic Books" by Hong et al.
    private deformMesh(theta: number, apex: number) {
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
