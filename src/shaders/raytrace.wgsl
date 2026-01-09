struct Params {
  width: u32,
  height: u32,
}

const PI = 3.14159265359;
const F32_MAX = 3.4028235e38;
const EPS = 1.0e-4;

const SAMPLES_COUNT = 2000;
const MAX_DEPTH = 20;

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

    var seed: u32 = gid.x + gid.y * 4096u * 7919u;
    let color = path_trace(x, y, camera, &seed);

    textureStore(out_tex, vec2<i32>(i32(x), i32(y)), color);
}

struct Sphere {
    pos: vec3<f32>,
    radius: f32,
    material: Material,
}

const SCENE_SIZE = 6;
const SCENE = array<Sphere, SCENE_SIZE> (
    Sphere(vec3<f32>(0.0, -201.0, 1.0), 200.0, Material(vec3<f32>(0.8, 0.8, 0.8))),
    Sphere(vec3<f32>(-30.0, 0.0, 55.0), 25.0, Material(vec3<f32>(0.3, 0.4, 0.2))),
    Sphere(vec3<f32>(0.0, 0.0, 3.0), 1.0, Material(vec3<f32>(1.0))),
    Sphere(vec3<f32>(-2.5, 0.0, 3.0), 1.0, Material(vec3<f32>(0.8, 0.8, 0.8))),
    Sphere(vec3<f32>(2.5, 0.0, 3.0), 1.0, Material(vec3<f32>(0.59, 0.19, 0.56))),
    Sphere(vec3<f32>(0.0, 8.0, 3.0), 2.0, Material(vec3<f32>(1.0, 1.0, 1.0))),
);

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

struct Material {
    albedo: vec3<f32>
}

struct Scatter {
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
            throughput *= r.attenuation;
            ray = r.ray;
        }
        color += accum;

//        var result = RadianceResult(true, vec3<f32>(0.0), ray);
//        var attenuation = vec3<f32>(0.0);
//        for (var d = MAX_DEPTH; d > 0; d--) {
//
//            result = radiance(result.ray, seed);
//            attenuation *= result.attenuation;
//
//            if result.hit == false {
//                attenuation += result.attenuation;
//                break;
//            }
//        }
//        color += attenuation;
    }

    color *= 1.0 / SAMPLES_COUNT;

    return vec4<f32>(color, 1.0);
}

struct RadianceResult {
    hit: bool,
    attenuation: vec3<f32>,
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

    let s = scatter(ray, hit, seed);
    result.hit = true;
    result.attenuation = s.attenuation;
    result.ray = s.ray;
    return result;
    // let result = s.attenuation * radiance(s.ray, depth - 1, seed);
}

fn scatter(ray: Ray, hit: HitInfo, seed: ptr<function, u32>) -> Scatter {
    var dir = random_in_hemisphere_cosine(hit.hit_normal, seed);
    if near_zero(dir) { dir = hit.hit_normal; }
    let origin = hit.hit_point + (hit.hit_normal * EPS);
    return Scatter(hit.material.albedo, Ray(origin, normalize(dir)));
}

fn background(ray: Ray) -> vec3<f32> {
//    return vec3(f32(0xD1) / 255.0, f32(0xDD) / 255.0, f32(0xFC) / 255.0);
//    return hex_to_vec3(0xbcccf4);

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
