import {Scene} from "./scene.js";
import {Ray} from "./ray.js";
import {Vec3} from "./vector.js";
import {Camera} from "./camera.js";
import {Random} from "./random.js";
import {BMath} from "./bmath";

export class RenderSettings {
    bounces: number;
    samples: number;
    gamma_correction: boolean;

    constructor(bounces: number, samples: number, gamma_correction: boolean) {
        this.bounces = bounces;
        this.samples = samples;
        this.gamma_correction = gamma_correction;
    }

    static default(): RenderSettings {
        return new RenderSettings(
            10,
            10,
            true
        );
    }
}


export function path_trace(x: number, y: number, width: number, height: number, camera: Camera, scene: Scene, render_settings: RenderSettings): Vec3 {
    let color = Vec3.zero();

    for (let s = 0; s < render_settings.samples; s++) {
        const u = (x + Random.rand()) / width;
        const v = (y + Random.rand()) / height;
        const ray = camera.get_ray(u, v);
        color = color.add(radiance(scene, ray, render_settings.bounces));
    }
    // color = debug_normal(scene, ray);

    color = color.mul(1 / render_settings.samples);

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
    const d = ray.dir.normalize();
    const sun_dir = new Vec3(0.3, 0.4, 0.6).normalize();

    const sun_amt = Math.max(0, d.dot(sun_dir));
    const sky_amt = Math.max(0, d.y);

    const sky_col = new Vec3(0.2, 0.45, 0.9);
    const horizon_col = new Vec3(0.8, 0.6, 0.4);
    const sun_col = new Vec3(1.0, 0.9, 0.6);

    let col = Vec3.lerp(horizon_col, sky_col, Math.pow(sky_amt, 0.5));
    col = col.add(sun_col.mul(Math.pow(sun_amt, 64)));

    return col;
}