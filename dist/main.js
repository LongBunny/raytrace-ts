import { Vec3 } from './vector.js';
import { Ray } from './ray.js';
import { Sphere } from './shape.js';
import { Scene } from './scene.js';
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
ctx.clearRect(0, 0, WIDTH, HEIGHT);
const imageData = ctx.createImageData(WIDTH, HEIGHT);
const pixels = imageData.data;
const N = 10;
let done = false;
function render_gen() {
    return render();
}
let gen = render_gen();
addEventListener('keydown', (evt) => {
    if (evt.key !== 'r')
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
    new Sphere(new Vec3(-1.0, 0.0, 10.0), 4.0, new Vec3(1.0, 0.0, 0.0)),
    new Sphere(new Vec3(1.0, .0, 5.0), 2.0, new Vec3(0.0, 1.0, 0.0)),
]);
function* render() {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const idx = (y * WIDTH + x) * 4;
            const nx = x / WIDTH * 2 - 1;
            const ny = y / HEIGHT * 2 - 1;
            const ray = new Ray(new Vec3(0, 0, 0), new Vec3(nx, ny, 1).normalize());
            let color = ray.trace(scene, N);
            color = color.div(N - 1);
            pixels[idx + 0] = color.x * 255;
            pixels[idx + 1] = color.y * 255;
            pixels[idx + 2] = color.z * 255;
            pixels[idx + 3] = 255;
            yield;
        }
    }
    done = true;
}
requestAnimationFrame(draw);
