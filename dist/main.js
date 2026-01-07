import { Vec3 } from './vector.js';
import { Sphere } from './shape.js';
import { Scene } from './scene.js';
import { Lambertian, Metal, Dielectric } from "./material.js";
import { path_trace, RenderSettings } from "./pathtracer.js";
import { Camera } from "./camera.js";
const render_canvas = document.getElementById('render_canvas');
const debug_canvas = document.getElementById('debug_canvas');
const ctx = render_canvas.getContext('2d');
const debug_ctx = debug_canvas.getContext('2d');
let debug = true;
let last_render_y = 0.0;
let last_frame_time = 0.0;
let frame_time_sum = 0.0;
let frame_done = true;
const WIDTH = render_canvas.width;
const HEIGHT = render_canvas.height;
ctx.clearRect(0, 0, WIDTH, HEIGHT);
const imageData = ctx.createImageData(WIDTH, HEIGHT);
let frame_sample_count = 1;
let accumulate_buffer = new Array(WIDTH * HEIGHT).fill(Vec3.zero());
let out_buffer = new Array(WIDTH * HEIGHT).fill(Vec3.zero());
reset_buffers();
const pixels = imageData.data;
const render_settings = RenderSettings.default();
const camera = new Camera(90, WIDTH / HEIGHT);
function render_gen() {
    return render();
}
let gen = render_gen();
addEventListener('keydown', (evt) => {
    if (evt.key !== 'r' || evt.ctrlKey)
        return;
    re_render();
});
function reset_buffers() {
    accumulate_buffer = accumulate_buffer.map(() => Vec3.zero());
    out_buffer = out_buffer.map(() => Vec3.zero());
}
function re_render() {
    reset_ui();
    reset_buffers();
    frame_sample_count = 1;
    pixels.fill(0.0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    gen = render_gen();
}
function draw() {
    const start = performance.now();
    const budget = 14;
    while (performance.now() - start < budget) {
        if (gen.next().done) {
        }
    }
    ctx.putImageData(imageData, 0, 0);
    if (debug) {
        debug_ctx.clearRect(0, 0, WIDTH, HEIGHT);
        debug_ctx.fillStyle = `red`;
        debug_ctx.strokeStyle = `rgba(255, 0, 0, 0.5)`;
        debug_ctx.beginPath();
        debug_ctx.moveTo(0, last_render_y);
        debug_ctx.lineTo(WIDTH, last_render_y);
        debug_ctx.stroke();
    }
    if (frame_done) {
        update_ui();
        frame_done = false;
    }
    requestAnimationFrame(draw);
}
const scene = new Scene([
    new Sphere(new Vec3(0.0, -202.0, 1.0), 200.0, new Lambertian(new Vec3(1.0, 1.0, 1.0))),
    // new Sphere(new Vec3(0.0, 4.5, 5.0), 2.0, new Lambertian(new Vec3(1.0, 1.0, 1.0))),
    // new Sphere(new Vec3(-2.0, -1.0, 4.0), 1.0, new Metal(Vec3.from_hex(0x61666A), 1)),
    new Sphere(new Vec3(0.0, 0.0, 2.0), 1.0, new Dielectric(1.5)),
    // new Sphere(new Vec3(1.0, 0.0, 4.0), 1.0, new Dielectric(1.52)),
    // new Sphere(new Vec3(-1.0, 0.0, 4.0), 1.0, new Dielectric(1.52)),
    new Sphere(new Vec3(1.0, -1.0, 3.0), 0.8, new Lambertian(new Vec3(1.0, 0.0, 0.0))),
    new Sphere(new Vec3(-1.0, -1.0, 3.0), 1.5, new Metal(Vec3.from_hex(0xCCAC10), 0.2)),
    // new Sphere(new Vec3(2.0, -1.0, 4.0), 1.0, new Metal(Vec3.from_hex(0x61666A), 0.1)),
    // new Sphere(new Vec3(4.0, -1.0, 5.0), 1.0, new Lambertian(new Vec3(1.0, 1.0, 0.0))),
    // new Sphere(new Vec3(0.0, 8.0, 3.0), 2.0, new DiffuseLight(new Vec3(1.0, 1.0, 1.0))),
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
        // for (let y = 1; y < HEIGHT - 1; y++) {
        //     for (let x = 1; x < WIDTH - 1; x++) {
        //
        //         let sum = Vec3.zero();
        //         for (let dy = -1; dy <= 1; dy++) {
        //             for (let dx = -1; dx <= 1; dx++) {
        //                 const di = (y * WIDTH + x) + dx + dy * WIDTH;
        //                 const color = accumulate_buffer[di];
        //                 sum = sum.add(color);
        //             }
        //         }
        //
        //         sum = sum.div(9.0);
        //
        //         const pixels_idx = (y * WIDTH + x) * 4;
        //         pixels[pixels_idx + 0] = sum.x * 255;
        //         pixels[pixels_idx + 1] = sum.y * 255;
        //         pixels[pixels_idx + 2] = sum.z * 255;
        //         pixels[pixels_idx + 3] = 255;
        //     }
        // }
        frame_done = true;
        frame_sample_count += 1;
        last_frame_time = performance.now() - start;
        frame_time_sum += last_frame_time;
    }
}
requestAnimationFrame(draw);
// ui
const render_btn = document.getElementById('render_btn');
const bounces_input = document.getElementById('bounces_input');
const bounces_value = document.getElementById('bounces_value');
const samples_input = document.getElementById('samples_input');
const samples_value = document.getElementById('samples_value');
const gamma_checkbox = document.getElementById('gamma_checkbox');
const debug_checkbox = document.getElementById('debug_checkbox');
const accum_frame_span = document.getElementById('accum_frame_span');
const last_render_time_span = document.getElementById('last_render_time_span');
const average_render_time_span = document.getElementById('average_render_time_span');
const total_render_time_span = document.getElementById('total_render_time_span');
gamma_checkbox.addEventListener('change', () => {
    render_settings.gamma_correction = gamma_checkbox.checked;
    re_render();
});
debug_checkbox.addEventListener('change', () => {
    debug = debug_checkbox.checked;
    debug_ctx.clearRect(0, 0, WIDTH, HEIGHT);
});
render_btn.addEventListener('click', re_render);
bounces_input.addEventListener('change', () => {
    render_settings.bounces = parseInt(bounces_input.value);
    re_render();
});
bounces_input.addEventListener('input', () => bounces_value.innerText = bounces_input.value);
samples_input.addEventListener('change', () => {
    render_settings.samples = parseInt(samples_input.value);
    re_render();
});
samples_input.addEventListener('input', () => samples_value.innerText = samples_input.value);
reset_ui();
function reset_ui() {
    gamma_checkbox.checked = render_settings.gamma_correction;
    debug_checkbox.checked = debug;
    bounces_input.value = '' + render_settings.bounces;
    bounces_value.innerText = bounces_input.value;
    samples_input.value = '' + render_settings.samples;
    samples_value.innerText = samples_input.value;
    frame_time_sum = 0.0;
    accum_frame_span.innerText = `0`;
    last_render_time_span.innerText = `-`;
    average_render_time_span.innerText = `-`;
    total_render_time_span.innerText = `-`;
}
function update_ui() {
    if (frame_sample_count > 1) {
        last_render_time_span.innerText = `${(last_frame_time / 1000).toFixed(3)}s`;
        average_render_time_span.innerText = `${((frame_time_sum / (frame_sample_count - 1)) / 1000).toFixed(3)}s`;
    }
    else {
        last_render_time_span.innerText = `-`;
        average_render_time_span.innerText = `-`;
    }
    total_render_time_span.innerText = `${(frame_time_sum / 1000).toFixed(3)}s`;
    accum_frame_span.innerText = `${frame_sample_count - 1}`;
}
//# sourceMappingURL=main.js.map