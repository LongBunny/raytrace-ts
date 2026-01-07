import { Vec3 } from './vector.js';
import { Ray } from './ray.js';
import { Sphere } from './shape.js';
import { Scene } from './scene.js';
import { Material } from "./material.js";
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
ctx.clearRect(0, 0, WIDTH, HEIGHT);
const imageData = ctx.createImageData(WIDTH, HEIGHT);
const pixels = imageData.data;
const NUM_BOUNCES = 2;
let done = false;
function render_gen() {
    return render();
}
let gen = render_gen();
addEventListener('keydown', (evt) => {
    if (evt.key !== 'r' || evt.ctrlKey)
        return;
    console.log('reload');
    pixels.fill(0.0);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    done = false;
    gen = render_gen();
});
function draw() {
    if (!done) {
        const start = performance.now();
        const budget = 14;
        while (performance.now() - start < budget) {
            if (gen.next().done)
                break;
        }
        ctx.putImageData(imageData, 0, 0);
    }
    requestAnimationFrame(draw);
}
const scene = new Scene([
    // new Sphere(new Vec3(0.0, 201.0, 5.0), 200.0, new Material(new Vec3(1.0, 1.0, 1.0), Vec3.zero())), // "ground"
    new Sphere(new Vec3(-4.0, 0.0, 5.0), 1.0, new Material(new Vec3(1.0, 0.0, 0.0))),
    new Sphere(new Vec3(-2.0, 0.0, 5.0), 1.0, new Material(new Vec3(0.0, 1.0, 0.0))),
    new Sphere(new Vec3(0.0, 0.0, 5.0), 1.0, new Material(new Vec3(0.0, 0.0, 1.0))),
    new Sphere(new Vec3(2.0, 0.0, 5.0), 1.0, new Material(new Vec3(1.0, 1.0, 0.0))),
    new Sphere(new Vec3(4.0, 0.0, 5.0), 1.0, new Material(new Vec3(0.0, 1.0, 1.0))),
    // new Sphere(new Vec3(100.0, -150.0, 300.0), 75.0, new Material(Vec3.zero())), // "sun"
]);
function* render() {
    const aspect = WIDTH / HEIGHT;
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const i = (y * WIDTH + x) * 4;
            const u = (x + 0.5) / WIDTH;
            const v = (y + 0.5) / HEIGHT;
            const px = (2 * u - 1) * aspect;
            const py = 1 - 2 * v;
            const ray = new Ray(new Vec3(0, 0, 0), new Vec3(px, py, 1).normalize());
            let hit = scene.hit(ray);
            let color = Vec3.zero();
            if (hit !== null) {
                color = hit.material.albedo;
            }
            pixels[i + 0] = color.x * 255;
            pixels[i + 1] = color.y * 255;
            pixels[i + 2] = color.z * 255;
            pixels[i + 3] = 255;
            yield;
        }
    }
    done = true;
}
function download() {
    const link = document.createElement('a');
    link.download = 'render.png';
    link.href = canvas.toDataURL();
    link.click();
}
requestAnimationFrame(draw);
