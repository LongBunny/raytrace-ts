import {Scene} from "./scene.js";
import {Ray} from "./ray.js";
import {Vec3} from "./vector.js";

export function path_trace(x: number, y: number, width: number, height: number, scene: Scene, bounces: number = 10, samples: number = 10): Vec3 {
    let color = Vec3.zero();

    for (let s = 0; s < samples; s++) {
        const u = (x + 0.5) / width;
        const v = (y + 0.5) / height;

        const aspect = width / height;
        const px = (2 * u - 1) * aspect;
        const py = 1 - 2 * v;

        const ray = new Ray(new Vec3(0, 0, 0), new Vec3(px, py, 1).normalize());
        color = color.add(radiance(scene, ray, bounces));
    }
    // color = debug_normal(scene, ray);

    color = color.mul(1 / samples);
    color = color.clamp01();
    return color;
}

function debug_normal(scene: Scene, ray: Ray): Vec3 {
    const hit = scene.hit(ray);
    if (hit) {
        return hit.normal.add(Vec3.one()).mul(0.5);
    } else {
        return background(ray);
    }
}

function radiance(scene: Scene, ray: Ray, depth: number): Vec3 {
    if (depth <= 0) return Vec3.zero();

    const hit = scene.hit(ray);
    if (hit) {
        const scatter = hit.material.scatter(ray, hit);
        return scatter.attenuation.mul_vec(radiance(scene, scatter.ray, depth - 1));
    }

    return background(ray);
}

function background(ray: Ray): Vec3 {
    const unit = ray.dir.normalize();
    const t = 0.5 * (unit.y + 1.0);
    return Vec3.lerp(Vec3.one(), new Vec3(0.5, 0.7, 1.0), t);
}