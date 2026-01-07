import {Vec3} from './vector.js';
import {Sphere} from './shape.js';
import {Scene} from './scene.js';
import {Material} from "./material.js";
import {path_trace, RenderSettings} from "./pathtracer.js";
import {Camera} from "./camera.js";

const render_canvas = document.getElementById('render_canvas') as HTMLCanvasElement;
const debug_canvas = document.getElementById('debug_canvas') as HTMLCanvasElement;
const ctx = render_canvas.getContext('2d') as CanvasRenderingContext2D;
const debug_ctx = debug_canvas.getContext('2d') as CanvasRenderingContext2D;

let debug = false;
let last_render_y = 0.0;

let last_frame_time = 0.0;
let frame_time_sum = 0.0;
let frame_done = true;

const WIDTH = render_canvas.width;
const HEIGHT = render_canvas.height;
ctx.clearRect(0, 0, WIDTH, HEIGHT);

const imageData = ctx.createImageData(WIDTH, HEIGHT);

let frame_sample_count = 1;
const accumulate_buffer = new Array<Vec3>(WIDTH * HEIGHT);
reset_accumulate_buffer();
const pixels = imageData.data;

const render_settings = RenderSettings.default();

const camera = new Camera(90, WIDTH / HEIGHT);

function render_gen() {
    return render();
}

let gen = render_gen();

addEventListener('keydown', (evt: KeyboardEvent) => {
    if (evt.key !== 'r' || evt.ctrlKey)
        return;

    re_render();
});

function re_render() {
    reset_ui();
    reset_accumulate_buffer();
    frame_sample_count = 1;
    pixels.fill(0.0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    gen = render_gen();
}

function reset_accumulate_buffer() {
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        accumulate_buffer[i] = new Vec3(0.0, 0.0, 0.0);
    }
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

const scene = new Scene(
    [
        // new Sphere(new Vec3(0.0, 201.0, 5.0), 200.0, new Material(new Vec3(1.0, 1.0, 1.0), Vec3.zero())), // "ground"

        new Sphere(new Vec3(-4.0, 0.0, 3.0), 1.0, new Material(new Vec3(1.0, 0.0, 0.0))),
        new Sphere(new Vec3(-2.0, 0.0, 3.0), 1.0, new Material(new Vec3(0.0, 1.0, 0.0))),
        new Sphere(new Vec3(0.0, 0.0, 3.0), 1.0, new Material(new Vec3(0.0, 0.0, 1.0))),
        new Sphere(new Vec3(2.0, 0.0, 3.0), 1.0, new Material(new Vec3(1.0, 1.0, 0.0))),
        new Sphere(new Vec3(4.0, 0.0, 3.0), 1.0, new Material(new Vec3(0.0, 1.0, 1.0))),


        // new Sphere(new Vec3(100.0, -150.0, 300.0), 75.0, new Material(Vec3.zero())), // "sun"
    ]
);

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
                    if (x === Math.floor(x / WIDTH) && y === Math.floor(y / HEIGHT))
                        console.log(`sample: ${frame_sample_count}, color: ${out_color}`)
                }

                if (render_settings.gamma_correction) {
                    const inverse = 1.0 / 2.2;
                    out_color = new Vec3(
                        Math.pow(out_color.x, inverse),
                        Math.pow(out_color.y, inverse),
                        Math.pow(out_color.z, inverse)
                    );
                }

                out_color = out_color.clamp01();

                const pixels_idx = i * 4;
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

requestAnimationFrame(draw);


// ui

const render_btn = document.getElementById('render_btn') as HTMLButtonElement;

const bounces_input = document.getElementById('bounces_input') as HTMLInputElement;
const bounces_value = document.getElementById('bounces_value') as HTMLSpanElement;

const samples_input = document.getElementById('samples_input') as HTMLInputElement;
const samples_value = document.getElementById('samples_value') as HTMLSpanElement;

const gamma_checkbox = document.getElementById('gamma_checkbox') as HTMLInputElement;

const debug_checkbox = document.getElementById('debug_checkbox') as HTMLInputElement;

const accum_frame_span = document.getElementById('accum_frame_span') as HTMLSpanElement;
const last_render_time_span = document.getElementById('last_render_time_span') as HTMLSpanElement;
const average_render_time_span = document.getElementById('average_render_time_span') as HTMLSpanElement;
const total_render_time_span = document.getElementById('total_render_time_span') as HTMLSpanElement;

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
    } else {
        last_render_time_span.innerText = `-`;
        average_render_time_span.innerText = `-`;
    }
    total_render_time_span.innerText = `${(frame_time_sum / 1000).toFixed(3)}s`;
    accum_frame_span.innerText = `${frame_sample_count - 1}`;
}