struct Params {
  width: u32,
  height: u32,
}

const PI = 3.14159265359;
const F32_MAX = 3.4028235e38;
const EPS = 1.0e-4;

const SAMPLES_COUNT = 200;
const MAX_DEPTH = 20;

const SCENE_SIZE = 6;
var<private> SCENE: array<Sphere, SCENE_SIZE>;

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var out_tex: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let x = gid.x;
    let y = gid.y;

    if (x >= params.width || y >= params.height) { return; }

    let i = x + y * params.width;

    // TODO: set this from cpu
    let camera = get_camera(90.0, f32(params.width) / f32(params.height));
    SCENE = array<Sphere, SCENE_SIZE>(
        Sphere(vec3<f32>(0.0, -201.0, 1.0), 200.0, material_lambertian(vec3<f32>(0.8, 0.8, 0.8))),
        Sphere(vec3<f32>(-30.0, 0.0, 55.0), 25.0, material_lambertian(vec3<f32>(0.3, 0.4, 0.2))),
        Sphere(vec3<f32>(0.0, 0.0, 3.0), 1.0, material_dielectric(1.52)),
        Sphere(vec3<f32>(-2.5, 0.0, 3.0), 1.0, material_metal(vec3<f32>(0.8, 0.8, 0.8), 0.2)),
        Sphere(vec3<f32>(2.5, 0.0, 3.0), 1.0, material_lambertian(vec3<f32>(0.59, 0.19, 0.56))),
        Sphere(vec3<f32>(0.0, 4.0, 3.0), 2.0, material_diffuse_light(vec3<f32>(1.0, 1.0, 1.0))),
    );

    var seed: u32 = gid.x + gid.y * 4096u * 7919u;
    let color = path_trace(x, y, camera, &seed);

    textureStore(out_tex, vec2<i32>(i32(x), i32(y)), color);
}

struct Sphere {
    pos: vec3<f32>,
    radius: f32,
    material: Material,
}

struct Ray {
    origin: vec3<f32>,
    dir: vec3<f32>,
}

struct HitInfo {
    hit: bool,
    distance: f32,
    hit_point: vec3<f32>,
    hit_normal: vec3<f32>,
    front_face: bool,
    material: Material,
}

const MATERIAL_TYPE_LAMBERTIAN = 0;
const MATERIAL_TYPE_DIFFUSE_LIGHT = 1;
const MATERIAL_TYPE_METAL = 2;
const MATERIAL_TYPE_DIELECTRIC = 3;

struct Material {
    material_type: u32,

    // lambertian & metal
    albedo: vec3<f32>,

    // metal
    fuzz: f32,

    // diffuse light
    emission: vec3<f32>,

    // dielectric
    ior: f32,
}

fn material_lambertian(albedo: vec3<f32>) -> Material {
    var material = Material();
    material.material_type = MATERIAL_TYPE_LAMBERTIAN;
    material.albedo = albedo;
    return material;
}

fn material_diffuse_light(emission: vec3<f32>) -> Material {
    var material = Material();
    material.material_type = MATERIAL_TYPE_DIFFUSE_LIGHT;
    material.emission = emission;
    return material;
}

fn material_metal(albedo: vec3<f32>, fuzz: f32) -> Material {
    var material = Material();
    material.material_type = MATERIAL_TYPE_METAL;
    material.albedo = albedo;
    material.fuzz = fuzz;
    return material;
}

fn material_dielectric(ior: f32) -> Material {
    var material = Material();
    material.material_type = MATERIAL_TYPE_DIELECTRIC;
    material.ior = ior;
    return material;
}

struct Scatter {
    hit: bool,
    attenuation: vec3<f32>,
    ray: Ray,
}

struct Camera {
    origin: vec3<f32>,
    horizontal: vec3<f32>,
    vertical: vec3<f32>,
    lower_left_corner: vec3<f32>,
}

fn get_camera(fov: f32, aspect: f32) -> Camera {
    let theta = (fov * PI) / 180.0;
    let h = tan(theta / 2.0);
    let viewport_height = 2.0 * h;
    let viewport_width = aspect * viewport_height;

    let origin = vec3<f32>(0.0);
    let horizontal = vec3<f32>(viewport_width, 0.0, 0.0);
    let vertical = vec3<f32>(0.0, -viewport_height, 0.0);
    let lower_left_corner = origin - (horizontal * 0.5) - (vertical * 0.5) + vec3<f32>(0.0, 0.0, 1.0);

    return Camera(origin, horizontal, vertical, lower_left_corner);
}

fn get_ray(camera: Camera, u: f32, v: f32) -> Ray {
    let dir = camera.lower_left_corner
        + (camera.horizontal * u)
        + (camera.vertical * v)
        - camera.origin;
    return Ray(camera.origin, dir);
}

fn intersects(ray: Ray, sphere: Sphere) -> HitInfo {
    var hit_info = HitInfo();
    hit_info.hit = false;

    let oc = ray.origin - sphere.pos;

    let a = dot(ray.dir, ray.dir);
    let b = 2.0 * dot(oc, ray.dir);
    let c = dot(oc, oc) - sphere.radius * sphere.radius;

    let discriminant = b * b - 4 * a * c;

    if discriminant < 0.0 {
        return hit_info;
    }

    let sqr_dist = sqrt(discriminant);
    let t1 = (-b - sqr_dist) / (2.0 * a);
    let t2 = (-b + sqr_dist) / (2.0 * a);

    var t = F32_MAX;
    if t1 > EPS { t = t1; }
    else if t2 > EPS { t = t2; }
    else {
        return hit_info;
    }

    let hit_point = ray.origin + (ray.dir * t);
    let hit_normal = normalize((hit_point - sphere.pos) / sphere.radius);

    let front_face = dot(ray.dir, hit_normal) < 0.0;
    var normal = vec3<f32>();
    if front_face {
        normal = hit_normal;
    } else {
        normal = hit_normal * -1.0;
    }

    hit_info.hit = true;
    hit_info.distance = t;
    hit_info.hit_point = hit_point;
    hit_info.hit_normal = normal;
    hit_info.front_face = front_face;
    hit_info.material = sphere.material;
    return hit_info;
}

fn scene_hit(ray: Ray) -> HitInfo {
    var closest = F32_MAX;
    var best = HitInfo();
    for (var i = 0; i < SCENE_SIZE; i++) {
        let hit = intersects(ray, SCENE[i]);
        if !hit.hit { continue; }

        if hit.distance > EPS && hit.distance < closest {
            closest = hit.distance;
            best = hit;
        }
    }

    return best;
}


fn path_trace(x: u32, y: u32, camera: Camera, seed: ptr<function, u32>) -> vec4<f32> {
    var color = vec3<f32>(0.0);

    for (var s = 0; s < SAMPLES_COUNT; s++) {
        let u = (f32(x) + rng_next_f32(seed)) / f32(params.width);
        let v = (f32(y) + rng_next_f32(seed)) / f32(params.height);

        var throughput = vec3<f32>(1.0);
        var accum = vec3<f32>(0.0);
        var ray = get_ray(camera, u, v);

        for (var d = MAX_DEPTH; d > 0; d--) {
            let r = radiance(ray, seed);

            if !r.hit {
                accum += throughput * r.attenuation;
                break;
            }

            if r.emitted_hit {
                accum += throughput * r.emitted;
                break;
            } else {
                throughput *= r.attenuation;
            }

            ray = r.ray;
        }
        color += accum;
    }

    color *= 1.0 / SAMPLES_COUNT;

    return vec4<f32>(color, 1.0);
}

struct RadianceResult {
    hit: bool,
    emitted_hit: bool,
    attenuation: vec3<f32>,
    emitted: vec3<f32>,
    ray: Ray,
}

fn radiance(ray: Ray, seed: ptr<function, u32>) -> RadianceResult {
    var result = RadianceResult();
    result.hit = false;

    let hit = scene_hit(ray);

    if !hit.hit {
        result.attenuation = background(ray);
        return result;
    }

    let material_type = hit.material.material_type;
    switch material_type {
        case MATERIAL_TYPE_LAMBERTIAN: {
            let s = scatter_lambertian(ray, hit, seed);
            result.hit = true;
            result.attenuation = s.attenuation;
            result.ray = s.ray;
            return result;
        }
        case MATERIAL_TYPE_DIFFUSE_LIGHT: {
            let e = emitted(hit);
            result.hit = true;
            result.emitted_hit = true;
            result.emitted = e;
            return result;
        }
        case MATERIAL_TYPE_METAL: {
            let s = scatter_metal(ray, hit, seed);
            result.hit = true;
            result.attenuation = s.attenuation;
            result.ray = s.ray;
            return result;
        }
        case MATERIAL_TYPE_DIELECTRIC: {
            let s = scatter_dielectric(ray, hit, seed);
            result.hit = true;
            result.attenuation = s.attenuation;
            result.ray = s.ray;
            return result;
        }
        default: {
            return result;
        }
    }

    // unreachable
    return result;
    // no recursion :)
    // let result = s.attenuation * radiance(s.ray, depth - 1, seed);
}

fn scatter_lambertian(ray: Ray, hit: HitInfo, seed: ptr<function, u32>) -> Scatter {
    var dir = random_in_hemisphere_cosine(hit.hit_normal, seed);
    if near_zero(dir) { dir = hit.hit_normal; }
    let origin = hit.hit_point + (hit.hit_normal * EPS);
    return Scatter(true, hit.material.albedo, Ray(origin, normalize(dir)));
}

fn scatter_metal(ray: Ray, hit: HitInfo, seed: ptr<function, u32>) -> Scatter {
    var result = Scatter();
    result.hit = false;

    let reflected = reflect(normalize(ray.dir), hit.hit_normal);
    let dir = reflected + random_in_unit_sphere(seed) * hit.material.fuzz;

    if dot(dir, hit.hit_normal) <= 0 { return result; }

    let origin = hit.hit_point + (hit.hit_normal * EPS);
    result.hit = true;
    result.attenuation = hit.material.albedo;
    result.ray = Ray(origin, normalize(dir));
    return result;
}

fn scatter_dielectric(ray: Ray, hit: HitInfo, seed: ptr<function, u32>) -> Scatter {
    var result = Scatter();
    result.hit = false;

    let attenuation = vec3<f32>(1.0);

    var refraction_ratio: f32;
    if hit.front_face { refraction_ratio = 1.0 / hit.material.ior; }
    else { refraction_ratio = hit.material.ior; };

    let unit_dir = normalize(ray.dir);
    let cos_theta = min(dot(unit_dir * -1.0, hit.hit_normal), 1.0);
    let sin_theta = sqrt(1.0 - cos_theta * cos_theta);

    let cannot_refract = refraction_ratio * sin_theta > 1.0;
    let reflect_probability = reflectance(cos_theta, refraction_ratio);

    var dir: vec3<f32>;
    if cannot_refract || rng_next_f32(seed) < reflect_probability {
        dir = reflect(unit_dir, hit.hit_normal);
    } else {
        dir = refract(unit_dir, hit.hit_normal, refraction_ratio);
    }

    var offset: vec3<f32>;
    if dot(dir, hit.hit_normal) > 0 { offset = hit.hit_normal; } else { offset = hit.hit_normal * -1.0; }
    let origin = hit.hit_point + (offset * EPS);

    result.hit = true;
    result.attenuation = attenuation;
    result.ray = Ray(origin, normalize(dir));
    return result;
}

fn reflectance(cosine: f32, ref_index: f32) -> f32 {
    var r0 = (1.0 - ref_index) / (1.0 + ref_index);
    r0 = r0 * r0;
    return r0 + (1.0 - r0) * pow((1.0 - cosine), 5);
}

fn emitted(hit: HitInfo) -> vec3<f32> {
    if hit.front_face { return hit.material.emission; }
    else { return vec3<f32>(0.0); }
}



fn background(ray: Ray) -> vec3<f32> {
//    return vec3<f32>(0.0);
    let d = normalize(ray.dir);
    let sun_dir = normalize(vec3<f32>(0.3, 0.8, 0.6));

    let sun_amt = max(0.0, dot(d, sun_dir));
    let sky_amt = max(0.0, d.y);

    let sky_col = vec3<f32>(0.2, 0.45, 0.9);
    let horizon_col = vec3<f32>(0.8, 0.6, 0.4);
    let sun_col = vec3<f32>(1.0, 0.9, 0.6);

    var col = lerp_v3(horizon_col, sky_col, pow(sky_amt, 0.5));
    col *= 0.7 + 0.3 * sky_amt;
    col += sun_col * pow(sun_amt, 64);
    return col;
}


// helpers
fn hash_u32(seed: u32) -> u32 {
    var v = seed;
    v ^= v >> 16u;
    v *= 0x7feb352du;
    v ^= v >> 15u;
    v *= 0x846ca68bu;
    v ^= v >> 16u;
    return v;
}

fn rng_next_u32(seed: ptr<function, u32>) -> u32 {
    (*seed) = (*seed) + 0x9e3779b9u;
    return hash_u32(*seed);
}

fn rng_next_f32(seed: ptr<function, u32>) -> f32 {
  return f32(rng_next_u32(seed)) / 4294967296.0;
}

fn rng_next_v3(min: f32, max: f32, seed: ptr<function, u32>) -> vec3<f32> {
    let x = min + (max - min) * rng_next_f32(seed);
    let y = min + (max - min) * rng_next_f32(seed);
    let z = min + (max - min) * rng_next_f32(seed);
    return vec3<f32>(x, y, z);
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    return (1.0 - t) * a + b * t;
}

fn lerp_v3(a: vec3<f32>, b: vec3<f32>, t: f32) -> vec3<f32> {
    return vec3<f32>(
        lerp(a.x, b.x, t),
        lerp(a.y, b.y, t),
        lerp(a.z, b.z, t)
    );
}

fn random_in_unit_sphere(seed: ptr<function, u32>) -> vec3<f32> {
    loop {
        let p = rng_next_v3(-1.0, 1.0, seed);
        let mag2 = dot(p, p);
        if mag2 == 0 || mag2 >= 1.0 { continue; }
        return p;
    }
    return vec3<f32>(1.0, 0.0, 0.0);
}

fn random_cosine_direction(seed: ptr<function, u32>) -> vec3<f32> {
    let r1 = rng_next_f32(seed);
    let r2 = rng_next_f32(seed);
    let z = sqrt(1.0 - r2);
    let phi = 2.0 * PI * r1;
    let r2sqrt = sqrt(r2);
    let x = cos(phi) * r2sqrt;
    let y = sin(phi) * r2sqrt;
    return vec3<f32>(x, y, z);
}

fn random_in_hemisphere_cosine(n: vec3<f32>, seed: ptr<function, u32>) -> vec3<f32> {
    let w = normalize(n);
    var a = vec3<f32>();
    if abs(w.x) > 0.9 { a = vec3<f32>(0.0, 1.0, 0.0); } else { a = vec3<f32>(1.0, 0.0, 0.0); }
    let v = normalize(cross(w, a));
    let u = cross(v, w);
    let d = random_cosine_direction(seed);
    return (u * d.x) + (v * d.y) + (w * d.z);
}

fn near_zero(v: vec3<f32>) -> bool {
    return abs(v.x) < EPS && abs(v.y) < EPS && abs(v.z) < EPS;
}

fn hex_to_vec3(hex: u32) -> vec3<f32> {
    let r = f32((hex >> 8 * 2) & 0xFF) / 255.0;
    let g = f32((hex >> 8 * 1) & 0xFF) / 255.0;
    let b = f32((hex >> 8 * 0) & 0xFF) / 255.0;
    return vec3<f32>(r, g, b);
}
