import { Vec3 } from './vector.js';
import { Sphere } from './shape.js';
import { Scene } from './scene.js';
import { Lambertian, DiffuseLight, Metal, Dielectric } from "./material.js";
import { path_trace, RenderSettings } from "./pathtracer.js";
import { Camera } from "./camera.js";
export function createCpuRenderer(opts) {
    // console.log(Vec3.from_hex(0xC97AC5).srgb_to_linear());
    const { renderCanvas, debugCanvas, onFrameDone } = opts;
    const ctx = renderCanvas.getContext('2d');
    const debugCtx = debugCanvas.getContext('2d');
    let debug = false;
    let last_render_y = 0.0;
    let last_frame_time = 0.0;
    let frame_time_sum = 0.0;
    let frame_done = true;
    const WIDTH = renderCanvas.width;
    const HEIGHT = renderCanvas.height;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    const pixels = imageData.data;
    let frame_sample_count = 1;
    let accumulate_buffer = new Array(WIDTH * HEIGHT).fill(Vec3.zero());
    reset_buffers();
    const render_settings = RenderSettings.default();
    const camera = new Camera(90, WIDTH / HEIGHT);
    function render_gen() {
        return render();
    }
    let gen = render_gen();
    let running = false;
    let raf_id = 0;
    function reset_buffers() {
        accumulate_buffer = accumulate_buffer.map(() => Vec3.zero());
    }
    function reRender() {
        reset_buffers();
        frame_sample_count = 1;
        last_frame_time = 0.0;
        frame_time_sum = 0.0;
        pixels.fill(0.0);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        gen = render_gen();
        frame_done = true;
    }
    function draw() {
        if (!running)
            return;
        const start = performance.now();
        const budget = 14;
        while (performance.now() - start < budget) {
            if (gen.next().done) {
            }
        }
        ctx.putImageData(imageData, 0, 0);
        if (debug) {
            debugCtx.clearRect(0, 0, WIDTH, HEIGHT);
            debugCtx.fillStyle = `red`;
            debugCtx.strokeStyle = `rgba(255, 0, 0, 0.5)`;
            debugCtx.beginPath();
            debugCtx.moveTo(0, last_render_y);
            debugCtx.lineTo(WIDTH, last_render_y);
            debugCtx.stroke();
        }
        if (frame_done) {
            onFrameDone?.(getStats());
            frame_done = false;
        }
        raf_id = requestAnimationFrame(draw);
    }
    const scene = new Scene([
        new Sphere(new Vec3(0.0, -201.0, 1.0), 200.0, new Lambertian(new Vec3(0.8, 0.8, 0.8))),
        new Sphere(new Vec3(-30.0, 0.0, 55.0), 25.0, new Lambertian(new Vec3(0.3, 0.4, 0.2).srgb_to_linear())),
        new Sphere(new Vec3(0.0, 0.0, 3.0), 1.0, new Dielectric(1.52)),
        new Sphere(new Vec3(-2.5, 0.0, 3.0), 1.0, new Metal(new Vec3(0.8, 0.8, 0.8), 0.2)),
        new Sphere(new Vec3(2.5, 0.0, 3.0), 1.0, new Lambertian(Vec3.from_hex(0xC97AC5).srgb_to_linear())),
        new Sphere(new Vec3(0.0, 4.0, 3.0), 2.0, new DiffuseLight(new Vec3(1.0, 1.0, 1.0))),
    ]);
    function* render() {
        console.log(`rendering: bounces = ${render_settings.bounces}, samples = ${render_settings.samples}`);
        while (true) {
            const start = performance.now();
            for (let y = 0; y < HEIGHT; y++) {
                if (debug) {
                    last_render_y = y;
                }
                for (let x = 0; x < WIDTH; x++) {
                    const i = (y * WIDTH + x);
                    const color = path_trace(x, y, WIDTH, HEIGHT, camera, scene, render_settings);
                    accumulate_buffer[i] = accumulate_buffer[i].add(color);
                    let out_color = accumulate_buffer[i].div(frame_sample_count);
                    if (debug) {
                        // debug middle pixel
                        if (x === Math.floor(WIDTH / 2) && y === Math.floor(HEIGHT / 2))
                            console.log(`sample: ${frame_sample_count}, color: ${out_color}`);
                    }
                    out_color = out_color.mul(render_settings.exposure);
                    out_color = tone_map_color(out_color, render_settings.tone_map);
                    if (render_settings.gamma_correction) {
                        const inverse = 1.0 / 2.2;
                        out_color = new Vec3(Math.pow(out_color.x, inverse), Math.pow(out_color.y, inverse), Math.pow(out_color.z, inverse));
                    }
                    out_color = out_color.clamp01();
                    const pixels_idx = (y * WIDTH + x) * 4;
                    pixels[pixels_idx + 0] = out_color.x * 255;
                    pixels[pixels_idx + 1] = out_color.y * 255;
                    pixels[pixels_idx + 2] = out_color.z * 255;
                    pixels[pixels_idx + 3] = 255;
                    yield;
                }
            }
            frame_done = true;
            frame_sample_count += 1;
            last_frame_time = performance.now() - start;
            frame_time_sum += last_frame_time;
        }
    }
    function tone_map_color(color, tone_map) {
        switch (tone_map) {
            case 'reinhard':
                return new Vec3(color.x / (1.0 + color.x), color.y / (1.0 + color.y), color.z / (1.0 + color.z));
            case 'aces':
                return aces_filmic(color);
            case 'none':
            default:
                return color;
        }
    }
    function aces_filmic(color) {
        const a = 2.51;
        const b = 0.03;
        const c = 2.43;
        const d = 0.59;
        const e = 0.14;
        const filmic = (x) => (x * (a * x + b)) / (x * (c * x + d) + e);
        return new Vec3(filmic(color.x), filmic(color.y), filmic(color.z));
    }
    function start() {
        if (running)
            return;
        running = true;
        raf_id = requestAnimationFrame(draw);
    }
    function stop() {
        if (!running)
            return;
        running = false;
        if (raf_id) {
            cancelAnimationFrame(raf_id);
            raf_id = 0;
        }
    }
    function setDebug(enabled) {
        debug = enabled;
        if (!debug) {
            debugCtx.clearRect(0, 0, WIDTH, HEIGHT);
        }
    }
    function getSettings() {
        return render_settings;
    }
    function getStats() {
        return {
            frameSampleCount: frame_sample_count,
            lastFrameTimeMs: last_frame_time,
            frameTimeSumMs: frame_time_sum
        };
    }
    return {
        start,
        stop,
        reRender,
        setDebug,
        getSettings,
        getStats
    };
}
//# sourceMappingURL=cpu.js.map