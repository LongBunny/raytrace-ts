struct VSOut {
    @builtin(position) pos : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid : u32) -> VSOut {
    var positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0),
    );

    var uvs = array<vec2<f32>, 3>(
        vec2<f32>(0.0, 0.0),
        vec2<f32>(2.0, 0.0),
        vec2<f32>(0.0, 2.0),
    );

    var out: VSOut;
    out.pos = vec4<f32>(positions[vid], 0.0, 1.0);
    out.uv = uvs[vid];
    return out;
}

@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
    let uv = vec2(in.uv.x, 1.0 - in.uv.y);
    var color = textureSample(tex, samp, uv).xyz;

    // tonemap
    color = aces_filmic(color);

    // gamma
    let inverse = 1.0 / 2.2;
    color = vec3<f32>(
        pow(color.x, inverse),
        pow(color.y, inverse),
        pow(color.z, inverse)
    );

    return vec4<f32>(color, 1.0);
}

fn aces_filmic(color: vec3<f32>) -> vec3<f32> {
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    return vec3<f32>(
        filmic(color.x, a, b, c, d, e),
        filmic(color.y, a, b, c, d, e),
        filmic(color.z, a, b, c, d, e)
    );
}

fn filmic(x: f32, a: f32, b: f32, c: f32, d: f32, e: f32) -> f32 {
    return (x * (a * x + b)) / (x * (c * x + d) + e);
}