/// <reference types="@webgpu/types" />
export function check_webgpu() {
    if (!("gpu" in navigator)) {
        console.error("WebGPU is not supported in your browser.");
        return false;
    }
    return true;
}
export async function startWebGpuRenderer(canvas) {
    const ctx = canvas.getContext('webgpu');
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
        return { width: canvas.width, height: canvas.height };
    }
    // shaders
    const compute = await load_shader_src(new URL("/src/shaders/raytrace.wgsl", import.meta.url).toString());
    const render = await load_shader_src(new URL("/src/shaders/screen.wgsl", import.meta.url).toString());
    const compute_module = device.createShaderModule({ code: compute });
    {
        const info = await compute_module.getCompilationInfo();
        for (const msg of info.messages) {
            console.log(`[WGSL ${msg.type}] line ${msg.lineNum}:${msg.linePos} - ${msg.message}`);
        }
    }
    const render_module = device.createShaderModule({ code: render });
    {
        const info = await render_module.getCompilationInfo();
        for (const msg of info.messages) {
            console.log(`[WGSL ${msg.type}] line ${msg.lineNum}:${msg.linePos} - ${msg.message}`);
        }
    }
    // pipelines
    const compute_pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: compute_module, entryPoint: 'main' }
    });
    const render_pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: render_module, entryPoint: 'vs_main' },
        fragment: {
            module: render_module,
            entryPoint: 'fs_main',
            targets: [{ format: presentationFormat }]
        },
        primitive: { topology: 'triangle-list' }
    });
    // sampler
    const sampler = device.createSampler({
        magFilter: 'nearest',
        minFilter: 'nearest',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge'
    });
    const params_buffer = device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    let storage_texture = null;
    let storage_texture_view = null;
    let compute_bind_group = null;
    let render_bind_group = null;
    function rebuild_size_dependent_resources() {
        const { width, height } = resize_canvas_to_display_size();
        ctx.configure({
            device,
            format: presentationFormat,
            alphaMode: 'opaque'
        });
        device.queue.writeBuffer(params_buffer, 0, new Uint32Array([width, height]));
        storage_texture?.destroy();
        storage_texture = device.createTexture({
            size: { width, height },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
        });
        storage_texture_view = storage_texture.createView();
        compute_bind_group = device.createBindGroup({
            layout: compute_pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: params_buffer } },
                { binding: 1, resource: storage_texture_view }
            ],
        });
        render_bind_group = device.createBindGroup({
            layout: render_pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: storage_texture_view }
            ]
        });
        return { width, height };
    }
    let { width, height } = rebuild_size_dependent_resources();
    // draw
    let running = true;
    let raf_id = 0;
    function frame() {
        if (!running)
            return;
        const start = performance.now();
        const before_w = width, before_h = height;
        ({ width, height } = resize_canvas_to_display_size());
        if (before_w !== width || before_h !== height) {
            rebuild_size_dependent_resources();
        }
        const encoder = device.createCommandEncoder();
        // compute pass
        {
            const pass = encoder.beginComputePass();
            pass.setPipeline(compute_pipeline);
            pass.setBindGroup(0, compute_bind_group);
            const wx = 8;
            const wy = 8;
            pass.dispatchWorkgroups(Math.ceil(width / wx), Math.ceil(height / wy));
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
                        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }
                    }],
            });
            pass.setPipeline(render_pipeline);
            pass.setBindGroup(0, render_bind_group);
            pass.draw(3, 1, 0, 0);
            pass.end();
        }
        device.queue.submit([encoder.finish()]);
        device.queue.onSubmittedWorkDone().then(() => {
            console.log(`frame took ${performance.now() - start} ms`);
        });
        // only one frame for now
        // raf_id = requestAnimationFrame(frame);
    }
    raf_id = requestAnimationFrame(frame);
    return {
        stop: () => {
            running = false;
            if (raf_id) {
                cancelAnimationFrame(raf_id);
                raf_id = 0;
            }
            storage_texture?.destroy();
        }
    };
}
async function load_shader_src(path) {
    const result = await fetch(path);
    if (!result.ok)
        throw new Error(`Failed to load shader source ${path}: ${result.status} ${result.statusText}`);
    return await result.text();
}
//# sourceMappingURL=webgpu.js.map