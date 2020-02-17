// -------------------------------------------------------------------------------------------------
// The Display draws to the main canvas and manages all Filament entities.
//
//   - constructor(canvas: HTMLCanvasElement, vehicle: Vehicle, onFinishedLoading)
//   - readonly camera: Filament.Camera;
//   - render()
//
// -------------------------------------------------------------------------------------------------

import * as Filament from "filament";
import * as urls from "./urls";
import Vehicle from "./vehicle";

export default class Display {
    public readonly camera: Filament.Camera;

    private readonly canvas: HTMLCanvasElement;
    private readonly engine: Filament.Engine;
    private readonly indirectLight: Filament.IndirectLight;
    private readonly skybox: Filament.Skybox;
    private readonly nonlitMaterial: Filament.Material;
    private readonly pbrMaterial: Filament.Material;
    private readonly renderer: Filament.Renderer;
    private readonly scene: Filament.Scene;
    private readonly swapChain: Filament.SwapChain;
    private readonly view: Filament.View;

    private ship: Filament.Entity;

    constructor(canvas: HTMLCanvasElement, vehicle: Vehicle, onFinishedLoading: () => void) {
        this.canvas = canvas;
        this.engine = Filament.Engine.create(canvas);
        this.scene = this.engine.createScene();
        this.skybox = this.engine.createSkyFromKtx(urls.sky);
        this.scene.setSkybox(this.skybox);
        this.indirectLight = this.engine.createIblFromKtx(urls.ibl);
        this.indirectLight.setIntensity(100000);
        this.scene.setIndirectLight(this.indirectLight);
        this.swapChain = this.engine.createSwapChain();
        this.renderer = this.engine.createRenderer();
        this.camera = this.engine.createCamera();
        this.view = this.engine.createView();
        this.view.setCamera(this.camera);
        this.view.setScene(this.scene);

        this.pbrMaterial = this.engine.createMaterial(urls.pbrMaterial);
        this.nonlitMaterial = this.engine.createMaterial(urls.nonlitMaterial);

        const sunlight = Filament.EntityManager.get().create();
        Filament.LightManager.Builder(Filament.LightManager$Type.SUN)
            .color([0.98, 0.92, 0.89])
            .castShadows(true)
            .intensity(110000.0)
            .direction([0.5, -1, 0])
            .build(this.engine, sunlight);
        this.scene.addEntity(sunlight);

        this.resize = this.resize.bind(this);
        window.addEventListener("resize", this.resize);
        this.resize();
    }

    public render() {
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
        this.camera.setProjectionFov(45, aspect, 1.0, 20000.0, fov);
    }
}
