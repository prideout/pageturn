// -------------------------------------------------------------------------------------------------
// The Display draws to the main canvas and manages all Filament entities.
//
//   - constructor(canvas: HTMLCanvasElement, vehicle: Vehicle, onFinishedLoading)
//   - readonly camera: Filament.Camera;
//   - render()
//
// Author: Philip Rideout <https://prideout.net>
// -------------------------------------------------------------------------------------------------

import * as Filament from "filament";
import * as urls from "./urls";
import PageMesh from "./pageMesh";
import { mat4 } from "gl-matrix";

export default class Display {
    public readonly camera: Filament.Camera;

    private readonly engine: Filament.Engine;
    private readonly indirectLight: Filament.IndirectLight;
    private readonly skybox: Filament.Skybox;
    private readonly nonlitMaterial: Filament.Material;
    private readonly pbrMaterial: Filament.Material;
    private readonly renderer: Filament.Renderer;
    private readonly scene: Filament.Scene;
    private readonly swapChain: Filament.SwapChain;
    private readonly view: Filament.View;
    private readonly pageMesh: PageMesh = new PageMesh(20, 20);

    constructor(readonly canvas: HTMLCanvasElement) {
        this.engine = Filament.Engine.create(canvas);
        this.swapChain = this.engine.createSwapChain();
        this.renderer = this.engine.createRenderer();
        this.camera = this.engine.createCamera();
        this.scene = this.engine.createScene();
        this.view = this.engine.createView();
        this.view.setCamera(this.camera);
        this.view.setScene(this.scene);

        const eye = [0, 0, 3], center = [0, 0, 0], up = [0, 1, 0];
        this.camera.lookAt(eye, center, up);

        // Create the skybox.
        this.skybox = this.engine.createSkyFromKtx(urls.sky);
        this.scene.setSkybox(this.skybox);

        // Create the IBL.
        this.indirectLight = this.engine.createIblFromKtx(urls.ibl);
        this.indirectLight.setIntensity(10000);
        this.scene.setIndirectLight(this.indirectLight);

        // Create materials.
        this.pbrMaterial = this.engine.createMaterial(urls.pbrMaterial);
        this.nonlitMaterial = this.engine.createMaterial(urls.nonlitMaterial);

        // Create a square mesh and add it to the scene.
        this.pageMesh.init(this.engine, this.pbrMaterial);
        this.scene.addEntity(this.pageMesh.renderable);

        // Create a directional light source and add it to the scene.
        const sunlight = Filament.EntityManager.get().create();
        Filament.LightManager.Builder(Filament.LightManager$Type.SUN)
            .color([0.98, 0.92, 0.89])
            .castShadows(true)
            .intensity(1100.0)
            .direction([0.5, -1, 0])
            .build(this.engine, sunlight);
        this.scene.addEntity(sunlight);

        // Be sure to readjust the view and camera upon resize events.
        this.resize = this.resize.bind(this);
        window.addEventListener("resize", this.resize);
        this.resize();
    }

    public render(animationValue: number) {

        const radians = Math.PI * animationValue;
        const transform = mat4.fromRotation(mat4.create(), radians, [0, -1, 0]);
        const tcm = this.engine.getTransformManager();
        const inst = tcm.getInstance(this.pageMesh.renderable);
        tcm.setTransform(inst, transform);
        inst.delete();

        this.renderer.render(this.swapChain, this.view);
    }

    private resize() {
        const dpr = window.devicePixelRatio;
        const width = this.canvas.width = this.canvas.clientWidth * dpr;
        const height = this.canvas.height = this.canvas.clientHeight * dpr;
        this.view.setViewport([0, 0, width, height]);

        const aspect = width / height;
        const Fov = Filament.Camera$Fov;
        const fov = aspect < 1 ? Fov.HORIZONTAL : Fov.VERTICAL;
        this.camera.setProjectionFov(40, aspect, 1.0, 20000.0, fov);
    }
}
