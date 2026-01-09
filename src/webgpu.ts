/// <reference types="@webgpu/types" />

export function check_webgpu(): boolean {
    if (!("gpu" in navigator)) {
        console.error("WebGPU is not supported in your browser.");
        return false;
    }
    return true;
}

export type WebGpuRendererController = {
    stop: () => void;
    setMaxFps: (fps: number) => void;
    pause: () => void;
    resume: () => void;
    clear: () => void;
};

export type WebGpuRendererStats = {
    frameSampleCount: number;
    lastFrameTimeMs: number;
    frameTimeSumMs: number;
};

export type WebGpuRendererOptions = {
    maxFps?: number;
    onFrameDone?: (stats: WebGpuRendererStats) => void;
};

export async function startWebGpuRenderer(
    canvas: HTMLCanvasElement,
    opts: WebGpuRendererOptions = {}
): Promise<WebGpuRendererController> {
    const ctx = canvas.getContext('webgpu')!;
    // init

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("Failed to get GPU adapter.");
    }

    const device = await adapter.requestDevice();
    if (!device) {
        throw new Error("Failed to get GPU device.");
    }

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

    function resize_canvas_to_display_size() {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = Math.floor(canvas.clientWidth * dpr);
        const h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        return {width: canvas.width, height: canvas.height};
    }


    // shaders
    const compute = await load_shader_src(new URL("/src/shaders/raytrace.wgsl", import.meta.url).toString());
    const render = await load_shader_src(new URL("/src/shaders/screen.wgsl", import.meta.url).toString());

    const compute_module = device.createShaderModule({code: compute});
    {
        const info = await compute_module.getCompilationInfo();
        for (const msg of info.messages) {
            console.log(
                `[WGSL ${msg.type}] line ${msg.lineNum}:${msg.linePos} - raytrace: ${msg.message}`
            );
        }
    }

    const render_module = device.createShaderModule({code: render});
    {
        const info = await render_module.getCompilationInfo();
        for (const msg of info.messages) {
            console.log(
                `[WGSL ${msg.type}] line ${msg.lineNum}:${msg.linePos} - screen: ${msg.message}`
            );
        }
    }

    // pipelines

    const compute_pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {module: compute_module, entryPoint: 'main'}
    });

    const render_pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {module: render_module, entryPoint: 'vs_main'},
        fragment: {
            module: render_module,
            entryPoint: 'fs_main',
            targets: [{format: presentationFormat}]
        },
        primitive: {topology: 'triangle-list'}
    });


    // sampler
    const sampler = device.createSampler({
        magFilter: 'nearest',
        minFilter: 'nearest',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge'
    });


    const params_buffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    let accum_texture_a: GPUTexture | null = null;
    let accum_texture_b: GPUTexture | null = null;
    let accum_view_a: GPUTextureView | null = null;
    let accum_view_b: GPUTextureView | null = null;

    let compute_bind_groups: [GPUBindGroup, GPUBindGroup] | null = null;
    let render_bind_groups: [GPUBindGroup, GPUBindGroup] | null = null;

    let frame_index = 0;
    let use_a_as_prev = true;
    let last_frame_time = 0;
    let frame_time_sum = 0;

    function rebuild_size_dependent_resources() {
        const {width, height} = resize_canvas_to_display_size();

        ctx.configure({
            device,
            format: presentationFormat,
            alphaMode: 'opaque'
        });

        frame_index = 0;
        last_frame_time = 0;
        frame_time_sum = 0;
        use_a_as_prev = true;
        device.queue.writeBuffer(params_buffer, 0, new Uint32Array([width, height, frame_index, 0]));

        accum_texture_a?.destroy();
        accum_texture_b?.destroy();
        accum_texture_a = device.createTexture({
            size: {width, height},
            format: 'rgba16float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        });
        accum_texture_b = device.createTexture({
            size: {width, height},
            format: 'rgba16float',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        });
        accum_view_a = accum_texture_a.createView();
        accum_view_b = accum_texture_b.createView();

        compute_bind_groups = [
            device.createBindGroup({
                layout: compute_pipeline.getBindGroupLayout(0),
                entries: [
                    {binding: 0, resource: {buffer: params_buffer}},
                    {binding: 1, resource: accum_view_a},
                    {binding: 2, resource: accum_view_b},
                ],
            }),
            device.createBindGroup({
                layout: compute_pipeline.getBindGroupLayout(0),
                entries: [
                    {binding: 0, resource: {buffer: params_buffer}},
                    {binding: 1, resource: accum_view_b},
                    {binding: 2, resource: accum_view_a},
                ],
            }),
        ];

        render_bind_groups = [
            device.createBindGroup({
                layout: render_pipeline.getBindGroupLayout(0),
                entries: [
                    {binding: 0, resource: sampler},
                    {binding: 1, resource: accum_view_b},
                ],
            }),
            device.createBindGroup({
                layout: render_pipeline.getBindGroupLayout(0),
                entries: [
                    {binding: 0, resource: sampler},
                    {binding: 1, resource: accum_view_a},
                ],
            }),
        ];

        return {width, height};
    }

    function reset_accumulation() {
        rebuild_size_dependent_resources();
    }

    let {width, height} = rebuild_size_dependent_resources();

    // draw
    let running = true;
    let paused = false;
    let raf_id = 0;
    let max_fps = opts.maxFps ?? 30;

    function frame(now = performance.now()) {
        if (!running) return;
        if (paused) {
            raf_id = 0;
            return;
        }

        const min_frame_ms = max_fps > 0 ? 1000 / max_fps : 0;
        if (min_frame_ms > 0 && now - last_frame_time < min_frame_ms) {
            raf_id = requestAnimationFrame(frame);
            return;
        }
        last_frame_time = now;

        const start = performance.now();

        const before_w = width, before_h = height;
        ({width, height} = resize_canvas_to_display_size());
        if (before_w !== width || before_h !== height) {
            rebuild_size_dependent_resources();
        }

        const ping_pong_index = use_a_as_prev ? 0 : 1;
        device.queue.writeBuffer(
            params_buffer,
            0,
            new Uint32Array([width, height, frame_index, 0])
        );

        const encoder = device.createCommandEncoder();

        // compute pass
        {
            const pass = encoder.beginComputePass();
            pass.setPipeline(compute_pipeline);
            pass.setBindGroup(0, compute_bind_groups![ping_pong_index]);

            const wx = 8;
            const wy = 8;
            pass.dispatchWorkgroups(
                Math.ceil(width / wx),
                Math.ceil(height / wy)
            );
            pass.end();
        }

        // render pass
        {
            const color_view = ctx.getCurrentTexture().createView();
            const pass = encoder.beginRenderPass({
                colorAttachments: [{
                    view: color_view,
                    loadOp: 'clear',
                    storeOp: 'store',
                    clearValue: {r: 0.0, g: 0.0, b: 0.0, a: 1.0}
                }],
            });

            pass.setPipeline(render_pipeline);
            pass.setBindGroup(0, render_bind_groups![ping_pong_index]);
            pass.draw(3, 1, 0, 0);
            pass.end();
        }

        const frame_sample_count = frame_index + 1;
        device.queue.submit([encoder.finish()]);
        device.queue.onSubmittedWorkDone().then(() => {
            last_frame_time = performance.now() - start;
            frame_time_sum += last_frame_time;
            opts.onFrameDone?.({
                frameSampleCount: frame_sample_count,
                lastFrameTimeMs: last_frame_time,
                frameTimeSumMs: frame_time_sum
            });
        });

        use_a_as_prev = !use_a_as_prev;
        frame_index += 1;
        if (!paused) {
            raf_id = requestAnimationFrame(frame);
        }
    }

    raf_id = requestAnimationFrame(frame);

    return {
        stop: () => {
            running = false;
            paused = false;
            if (raf_id) {
                cancelAnimationFrame(raf_id);
                raf_id = 0;
            }
            accum_texture_a?.destroy();
            accum_texture_b?.destroy();
        },
        setMaxFps: (fps: number) => {
            max_fps = Math.max(1, Math.floor(fps));
        },
        pause: () => {
            if (!running) return;
            paused = true;
            if (raf_id) {
                cancelAnimationFrame(raf_id);
                raf_id = 0;
            }
        },
        resume: () => {
            if (!running || !paused) return;
            paused = false;
            if (!raf_id) {
                raf_id = requestAnimationFrame(frame);
            }
        },
        clear: () => {
            reset_accumulation();
            if (running && !paused && !raf_id) {
                raf_id = requestAnimationFrame(frame);
            }
        },
    };
}


async function load_shader_src(path: string): Promise<string> {
    const result = await fetch(path);
    if (!result.ok) throw new Error(`Failed to load shader source ${path}: ${result.status} ${result.statusText}`);
    return await result.text();
}
