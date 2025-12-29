import { Vec3 } from './vector.js';
import { Ray } from './ray.js';
import { Sphere } from './shape.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
ctx.clearRect(0, 0, WIDTH, HEIGHT);

const imageData = ctx.createImageData(WIDTH, HEIGHT);
const pixels = imageData.data;

let done = false;
let gen = render();

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

const sphere = new Sphere(new Vec3(0.0, 0.0, 5.0), 2.0);

function* render() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const idx = (y * WIDTH + x) * 4;

            const nx = x / WIDTH * 2 - 1;
            const ny = y / HEIGHT * 2 - 1;
            const ray = new Ray(new Vec3(0, 0, 0), new Vec3(nx, ny, 1).normalize());
            let [r, g, b] = sphere.intersects(ray);

            pixels[idx + 0] = r * 255;
            pixels[idx + 1] = g * 255;
            pixels[idx + 2] = b * 255;
            pixels[idx + 3] = 255;

            yield;
        }
    }
    done = true;
}


requestAnimationFrame(draw);

