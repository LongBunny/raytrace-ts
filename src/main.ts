import {Vec3} from './vector.js';
import {Sphere} from './shape.js';
import {Scene} from './scene.js';
import {Material} from "./material.js";
import {path_trace} from "./pathtracer.js";

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
ctx.clearRect(0, 0, WIDTH, HEIGHT);

const imageData = ctx.createImageData(WIDTH, HEIGHT);
const pixels = imageData.data;

let bounces = 10;
let samples = 10;


let done = false;3
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
    pixels.fill(0.0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    done = false;
    gen = render_gen();
}

function draw() {

    if (!done) {
        const start = performance.now();
        const budget = 14;

        while (performance.now() - start < budget) {
            if (gen.next().done) break;
        }
        ctx.putImageData(imageData, 0, 0);
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
    console.log(`rendering: bounces = ${bounces}, samples = ${samples}`);
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const i = (y * WIDTH + x) * 4;

            const color = path_trace(x, y, WIDTH, HEIGHT, scene, bounces, samples);

            pixels[i + 0] = color.x * 255;
            pixels[i + 1] = color.y * 255;
            pixels[i + 2] = color.z * 255;
            pixels[i + 3] = 255;

            yield;
        }
    }
    done = true;
}

requestAnimationFrame(draw);


// ui

const render_btn = document.getElementById('render_btn') as HTMLButtonElement;

const bounces_input = document.getElementById('bounces_input') as HTMLInputElement;
const bounces_value = document.getElementById('bounces_value') as HTMLSpanElement;

const samples_input = document.getElementById('samples_input') as HTMLInputElement;
const samples_value = document.getElementById('samples_value') as HTMLSpanElement;

bounces_input.value = '' + bounces;
bounces_value.innerText = bounces_input.value;

samples_input.value = '' + samples;
samples_value.innerText = samples_input.value;


render_btn.addEventListener('click', re_render);

bounces_input.addEventListener('change', () => {
    bounces = parseInt(bounces_input.value);
    re_render();
});
bounces_input.addEventListener('input', () => bounces_value.innerText = bounces_input.value);

samples_input.addEventListener('change', () => {
    samples = parseInt(samples_input.value);
    re_render();
});
samples_input.addEventListener('input', () => samples_value.innerText = samples_input.value);

