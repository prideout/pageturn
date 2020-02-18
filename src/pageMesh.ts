// -------------------------------------------------------------------------------------------------
// The PageMesh owns a dynamic grid of vertex positions, as well as static UV / index buffers.
//
//   - constructor(numColumns: number, numRows: number)
//   - init(engine: Filament.Engine, material: Filament.Material)
//   - update(engine: Filament.Engine)
//
// Author: Philip Rideout <https://prideout.net>
// -------------------------------------------------------------------------------------------------

import * as Filament from "filament";
import { vec3 } from "gl-matrix";

export default class PageMesh {
    private readonly numCells = this.numColumns * this.numRows;
    private readonly numIndices = this.numCells * 6;
    private readonly numVertices = (this.numColumns + 1) * (this.numRows + 1);
    private readonly faceNormals = new Float32Array(this.numCells * 2 * 3);
    private readonly smoothNormals = new Float32Array(this.numVertices * 3);
    private readonly valences = new Uint8Array(this.numVertices);
    private readonly tangents = new Int16Array(this.numVertices * 4);
    private readonly indices = new Uint16Array(this.numIndices);
    private vertexBuffer: Filament.VertexBuffer;
    private indexBuffer: Filament.IndexBuffer;
    private entity: Filament.Entity;

    readonly positions = new Float32Array(this.numVertices * 3);
    readonly texcoords = new Float32Array(this.numVertices * 2);
    get renderable() { return this.entity; }

    constructor(readonly numColumns: number, readonly numRows: number) {
        console.info(`Created page mesh with ${this.numVertices} verts.`)
    }

    // Recomputes tangents, then uploads positions and tangents to the GPU.
    update(engine: Filament.Engine) {
        this.generateFaceNormals();
        this.generateSmoothNormals();
        this.generateTangents();
        this.vertexBuffer.setBufferAt(engine, 0, this.positions);
        this.vertexBuffer.setBufferAt(engine, 2, this.tangents);
    }

    // Contructs a VertexBuffer, IndexBuffer, and Renderable.
    init(engine: Filament.Engine, material: Filament.Material) {
        const VertexAttribute = Filament.VertexAttribute;
        const AttributeType = Filament.VertexBuffer$AttributeType;
        const PrimitiveType = Filament.RenderableManager$PrimitiveType;

        this.vertexBuffer = Filament.VertexBuffer.Builder()
            .bufferCount(3)
            .vertexCount(this.numVertices)
            .attribute(VertexAttribute.POSITION, 0, AttributeType.FLOAT3, 0, 0)
            .attribute(VertexAttribute.UV0, 1, AttributeType.FLOAT2, 0, 0)
            .attribute(VertexAttribute.TANGENTS, 2, AttributeType.SHORT4, 0, 0)
            .normalized(VertexAttribute.TANGENTS)
            .build(engine);

        this.indexBuffer = Filament.IndexBuffer.Builder()
            .indexCount(this.numIndices)
            .bufferType(Filament.IndexBuffer$IndexType.USHORT)
            .build(engine);

        let tindex = 0;
        const addTriangle = (i: number, j: number, k: number) => {
            this.indices.set([i, j, k], tindex * 3);
            tindex++;
        };

        const w = this.numColumns, h = this.numRows, vpr = w + 1;
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const a = (col + 0) + (row + 0) * vpr;
                const b = (col + 1) + (row + 0) * vpr;
                const c = (col + 0) + (row + 1) * vpr;
                const d = (col + 1) + (row + 1) * vpr;
                addTriangle(a, b, d);
                addTriangle(d, c, a);
            }
        }

        this.indexBuffer.setBuffer(engine, this.indices);

        let vindex = 0;
        const addVertex = (x: number, y: number, z: number, u: number, v: number) => {
            this.positions.set([x, y, z], vindex * 3);
            this.texcoords.set([u, v], vindex * 2);
            vindex++;
        };

        for (let row = 0; row <= h; row++) {
            for (let col = 0; col <= w; col++) {
                const u = col / w;
                const v = row / h;
                const x = u;
                const y = -0.5 + v;
                addVertex(x, y, 0, u, v);
            }
        }

        this.vertexBuffer.setBufferAt(engine, 1, this.texcoords);
        this.update(engine);

        this.entity = Filament.EntityManager.get().create();

        const matinstance = material.createInstance();
        matinstance.setFloat4Parameter("baseColor", [1, 1, 1, 1]);

        Filament.RenderableManager.Builder(1)
            .boundingBox({ center: [0.5, 0.0, 0.0], halfExtent: [0.5, 0.5, 0.5] })
            .material(0, matinstance)
            .geometry(0, PrimitiveType.TRIANGLES, this.vertexBuffer, this.indexBuffer)
            .build(engine, this.entity);

        const tcm = engine.getTransformManager();
        tcm.create(this.entity);
    }

    private generateFaceNormals() {
        const pos = this.positions;
        const nrm = this.faceNormals;

        let tindex = 0;
        const u = vec3.create(), v = vec3.create(), n = vec3.create();
        const p0 = vec3.create(), p1 = vec3.create(), p2 = vec3.create();
        const computeFaceNormal = (a: number, b: number, c: number) => {
            vec3.set(p0, pos[a], pos[a+1], pos[a+2]);
            vec3.set(p1, pos[b], pos[b+1], pos[b+2]);
            vec3.set(p2, pos[c], pos[c+1], pos[c+2]);
            vec3.sub(u, p0, p1);
            vec3.sub(v, p0, p2);
            vec3.cross(n, u, v);
            vec3.normalize(n, n);
            nrm.set(n, tindex * 3);
            tindex++;
        };

        const w = this.numColumns, h = this.numRows, vpr = w + 1;
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const a = (col + 0) + (row + 0) * vpr;
                const b = (col + 1) + (row + 0) * vpr;
                const c = (col + 0) + (row + 1) * vpr;
                const d = (col + 1) + (row + 1) * vpr;
                computeFaceNormal(a*3, b*3, d*3);
                computeFaceNormal(d*3, c*3, a*3);
            }
        }
    }

    private generateSmoothNormals() {
        const f = this.faceNormals;
        const s = this.smoothNormals;
        const v = this.valences;

        v.fill(0);
        s.fill(0);

        const accumulateFaceNormal = (a: number, b: number, c: number, i: number) => {
            s[a] += f[i]; s[a+1] += f[i+1]; s[a+2] += f[i+2];
            s[b] += f[i]; s[b+1] += f[i+1]; s[b+2] += f[i+2];
            s[c] += f[i]; s[c+1] += f[i+1]; s[c+2] += f[i+2];
            this.valences[a/3]++; this.valences[b/3]++; this.valences[c/3]++;
        };

        let tindex = 0;
        const w = this.numColumns, h = this.numRows, vpr = w + 1;
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const a = (col + 0) + (row + 0) * vpr;
                const b = (col + 1) + (row + 0) * vpr;
                const c = (col + 0) + (row + 1) * vpr;
                const d = (col + 1) + (row + 1) * vpr;
                accumulateFaceNormal(a*3, b*3, d*3, 3 * tindex++);
                accumulateFaceNormal(d*3, c*3, a*3, 3 * tindex++);
            }
        }

        for (let i = 0; i < this.numVertices; i++) {
            s[i*3+0] /= v[i];
            s[i*3+1] /= v[i];
            s[i*3+2] /= v[i];
        }
    }

    private generateTangents() {
        const nverts = this.numVertices;

        // Allocate room for normals in the heap, and copy normals into it.
        const normals = Filament._malloc(this.smoothNormals.length * this.smoothNormals.BYTES_PER_ELEMENT);
        Filament.HEAPU8.set(new Uint8Array(this.smoothNormals.buffer), normals);

        // Perform computations, then free up the normals.
        const sob = new Filament.SurfaceOrientation$Builder();
        sob.vertexCount(nverts);
        sob.normals(normals, 0)
        const orientation = sob.build();
        Filament._free(normals);

        // Allocate room for quaternions then populate it.
        const quatsBufferSize = 8 * nverts;
        const quatsBuffer = Filament._malloc(quatsBufferSize);
        orientation.getQuats(quatsBuffer, nverts, Filament.VertexBuffer$AttributeType.SHORT4);

        // Create a JavaScript typed array and copy the quat data into it.
        const tangentsMemory = Filament.HEAPU8.subarray(quatsBuffer, quatsBuffer + quatsBufferSize).slice().buffer;
        this.tangents.set(new Int16Array(tangentsMemory));
        Filament._free(quatsBuffer);

        // Free up the surface orientation helper now that we're done with it.
        orientation.delete();
    }
}
