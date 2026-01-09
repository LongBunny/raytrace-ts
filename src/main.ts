import {createCpuRenderer, CpuRendererStats} from './cpu.js';
import {ToneMap} from "./pathtracer.js";
import {check_webgpu, startWebGpuRenderer, WebGpuRendererController, WebGpuRendererStats} from "./webgpu.js";

const render_canvas = document.getElementById('render_canvas') as HTMLCanvasElement;
const debug_canvas = document.getElementById('debug_canvas') as HTMLCanvasElement;
const webgpu_canvas = document.getElementById('webgpu_canvas') as HTMLCanvasElement;

const cpu_renderer = createCpuRenderer({
    renderCanvas: render_canvas,
    debugCanvas: debug_canvas,
    onFrameDone: (stats) => {
        update_ui(stats);
    }
});

enum Renderer {
    CPU = 'CPU',
    WebGPU = 'WebGPU',
}

const DEFAULT_RENDERER: Renderer = Renderer.CPU;
let active_renderer: Renderer = Renderer.CPU;
let webgpu_controller: WebGpuRendererController | null = null;

const render_settings = cpu_renderer.getSettings();

// ui

const render_btn = document.getElementById('render_btn') as HTMLButtonElement;
const clear_btn = document.getElementById('clear_btn') as HTMLButtonElement;
const renderer_select = document.getElementById('renderer_select') as HTMLSelectElement;
const webgpu_option = document.getElementById('webgpu_option') as HTMLOptionElement;

const bounces_input = document.getElementById('bounces_input') as HTMLInputElement;
const bounces_value = document.getElementById('bounces_value') as HTMLSpanElement;

const samples_input = document.getElementById('samples_input') as HTMLInputElement;
const samples_value = document.getElementById('samples_value') as HTMLSpanElement;

const exposure_input = document.getElementById('exposure_input') as HTMLInputElement;
const exposure_value = document.getElementById('exposure_value') as HTMLSpanElement;

const tone_map_select = document.getElementById('tone_map_select') as HTMLSelectElement;

const gamma_checkbox = document.getElementById('gamma_checkbox') as HTMLInputElement;

const debug_checkbox = document.getElementById('debug_checkbox') as HTMLInputElement;

const webgpu_fps_input = document.getElementById('webgpu_fps_input') as HTMLInputElement;
const webgpu_fps_value = document.getElementById('webgpu_fps_value') as HTMLSpanElement;

const accum_frame_span = document.getElementById('accum_frame_span') as HTMLSpanElement;
const last_render_time_span = document.getElementById('last_render_time_span') as HTMLSpanElement;
const average_render_time_span = document.getElementById('average_render_time_span') as HTMLSpanElement;
const total_render_time_span = document.getElementById('total_render_time_span') as HTMLSpanElement;

let debug_enabled = false;
let webgpu_max_fps = 30;
const webgpu_samples_per_pixel = 20;
const webgpu_bounces = 20;
const webgpu_exposure = 1.0;
const webgpu_tone_map: ToneMap = 'aces';
const webgpu_gamma_correction = true;
let renderer_running = false;

const webgpu_supported = check_webgpu();
if (!webgpu_supported) {
    webgpu_option.disabled = true;
}

renderer_select.addEventListener('change', () => {
    void switch_renderer(renderer_select.value as Renderer);
});

addEventListener('keydown', (evt: KeyboardEvent) => {
    if (evt.key !== 'r' || evt.ctrlKey)
        return;

    re_render();
});

gamma_checkbox.addEventListener('change', () => {
    render_settings.gamma_correction = gamma_checkbox.checked;
    re_render();
});


debug_checkbox.addEventListener('change', () => {
    debug_enabled = debug_checkbox.checked;
    if (active_renderer === 'CPU') {
        cpu_renderer.setDebug(debug_enabled);
    }
});

render_btn.addEventListener('click', () => void toggle_render());
clear_btn.addEventListener('click', () => clear_render());

bounces_input.addEventListener('change', () => {
    render_settings.bounces = parseInt(bounces_input.value);
    re_render();
});
bounces_input.addEventListener('input', () => bounces_value.innerText = bounces_input.value);

samples_input.addEventListener('change', () => {
    render_settings.samples = parseInt(samples_input.value);
    re_render();
});
samples_input.addEventListener('input', () => samples_value.innerText = samples_input.value);

exposure_input.addEventListener('change', () => {
    render_settings.exposure = parseFloat(exposure_input.value);
    re_render();
});
exposure_input.addEventListener('input', () => exposure_value.innerText = exposure_input.value);

tone_map_select.addEventListener('change', () => {
    render_settings.tone_map = tone_map_select.value as ToneMap;
    re_render();
});

webgpu_fps_input.addEventListener('change', () => {
    webgpu_max_fps = parseInt(webgpu_fps_input.value);
    webgpu_controller?.setMaxFps(webgpu_max_fps);
});
webgpu_fps_input.addEventListener('input', () => webgpu_fps_value.innerText = webgpu_fps_input.value);

reset_ui();
renderer_select.value = DEFAULT_RENDERER;
update_controls();
show_cpu_canvases();
start_default_renderer(DEFAULT_RENDERER);
update_render_button();

function start_default_renderer(renderer: Renderer) {
    if (renderer === Renderer.CPU) {
        cpu_renderer.setDebug(debug_enabled);
        cpu_renderer.start();
        renderer_running = true;
        update_render_button();
        return;
    }
    void switch_renderer(renderer);
}

async function switch_renderer(next: Renderer) {
    if (next === active_renderer) return;

    stop_active_renderer();
    active_renderer = next;
    update_controls();

    if (next === Renderer.CPU) {
        show_cpu_canvases();
        cpu_renderer.setDebug(debug_enabled);
        cpu_renderer.start();
        cpu_renderer.reRender();
        renderer_running = true;
        update_render_button();
        return;
    }

    if (!webgpu_supported) {
        active_renderer = Renderer.CPU;
        renderer_select.value = Renderer.CPU;
        update_controls();
        cpu_renderer.setDebug(debug_enabled);
        cpu_renderer.start();
        renderer_running = true;
        update_render_button();
        return;
    }

    show_webgpu_canvas();
    clear_debug_overlay();
    reset_ui();

    try {
        await start_webgpu_renderer();
        renderer_running = true;
        update_render_button();
    } catch (err) {
        console.error(err);
        renderer_select.value = Renderer.CPU;
        active_renderer = Renderer.CPU;
        update_controls();
        show_cpu_canvases();
        cpu_renderer.setDebug(debug_enabled);
        cpu_renderer.start();
        renderer_running = true;
        update_render_button();
    }
}

function re_render() {
    if (active_renderer !== Renderer.CPU) return;
    reset_ui();
    cpu_renderer.start();
    cpu_renderer.reRender();
    renderer_running = true;
    update_render_button();
}

function stop_active_renderer() {
    if (active_renderer === Renderer.CPU) {
        cpu_renderer.stop();
    } else {
        webgpu_controller?.stop();
        webgpu_controller = null;
    }
    renderer_running = false;
    update_render_button();
}

function update_controls() {
    const cpu_controls_enabled = active_renderer === Renderer.CPU;
    const webgpu_controls_enabled = active_renderer === Renderer.WebGPU;
    render_btn.disabled = false;
    bounces_input.disabled = !cpu_controls_enabled;
    samples_input.disabled = !cpu_controls_enabled;
    exposure_input.disabled = !cpu_controls_enabled;
    tone_map_select.disabled = !cpu_controls_enabled;
    gamma_checkbox.disabled = !cpu_controls_enabled;
    debug_checkbox.disabled = !cpu_controls_enabled;
    webgpu_fps_input.disabled = !webgpu_controls_enabled;

    if (!cpu_controls_enabled) {
        cpu_renderer.setDebug(false);
        reset_ui();
    }

    if (webgpu_controls_enabled) {
        apply_webgpu_ui_defaults();
    }
}

function show_cpu_canvases() {
    render_canvas.style.display = 'block';
    debug_canvas.style.display = 'block';
    webgpu_canvas.style.display = 'none';
}

function show_webgpu_canvas() {
    render_canvas.style.display = 'none';
    debug_canvas.style.display = 'none';
    webgpu_canvas.style.display = 'block';
}

function clear_debug_overlay() {
    const debug_ctx = debug_canvas.getContext('2d');
    debug_ctx?.clearRect(0, 0, debug_canvas.width, debug_canvas.height);
}

function reset_ui() {
    gamma_checkbox.checked = render_settings.gamma_correction;
    debug_checkbox.checked = debug_enabled;

    bounces_input.value = '' + render_settings.bounces;
    bounces_value.innerText = bounces_input.value;

    samples_input.value = '' + render_settings.samples;
    samples_value.innerText = samples_input.value;

    exposure_input.value = '' + render_settings.exposure;
    exposure_value.innerText = exposure_input.value;

    tone_map_select.value = render_settings.tone_map;

    renderer_select.value = active_renderer;

    webgpu_fps_input.value = '' + webgpu_max_fps;
    webgpu_fps_value.innerText = webgpu_fps_input.value;

    accum_frame_span.innerText = `0`;
    last_render_time_span.innerText = `-`;
    average_render_time_span.innerText = `-`;
    total_render_time_span.innerText = `-`;

    if (active_renderer === Renderer.WebGPU) {
        apply_webgpu_ui_defaults();
    }
}

function reset_stats_ui() {
    accum_frame_span.innerText = `0`;
    last_render_time_span.innerText = `-`;
    average_render_time_span.innerText = `-`;
    total_render_time_span.innerText = `-`;
}

function update_ui(stats: CpuRendererStats) {
    if (stats.frameSampleCount > 1) {
        last_render_time_span.innerText = `${(stats.lastFrameTimeMs / 1000).toFixed(3)}s`;
        average_render_time_span.innerText = `${((stats.frameTimeSumMs / (stats.frameSampleCount - 1)) / 1000).toFixed(3)}s`;
    } else {
        last_render_time_span.innerText = `-`;
        average_render_time_span.innerText = `-`;
    }
    total_render_time_span.innerText = `${(stats.frameTimeSumMs / 1000).toFixed(3)}s`;
    accum_frame_span.innerText = `${stats.frameSampleCount - 1}`;
}

function update_webgpu_ui(stats: WebGpuRendererStats) {
    update_ui(stats);
}

function apply_webgpu_ui_defaults() {
    bounces_input.value = '' + webgpu_bounces;
    bounces_value.innerText = bounces_input.value;
    samples_input.value = '' + webgpu_samples_per_pixel;
    samples_value.innerText = samples_input.value;
    exposure_input.value = '' + webgpu_exposure;
    exposure_value.innerText = exposure_input.value;
    tone_map_select.value = webgpu_tone_map;
    gamma_checkbox.checked = webgpu_gamma_correction;
}

async function toggle_render() {
    if (renderer_running) {
        pause_active_renderer();
        return;
    }
    await resume_active_renderer();
}

async function resume_active_renderer() {
    if (active_renderer === Renderer.CPU) {
        cpu_renderer.start();
        renderer_running = true;
        update_render_button();
        return;
    }
    if (!webgpu_supported) {
        active_renderer = Renderer.CPU;
        renderer_select.value = Renderer.CPU;
        update_controls();
        cpu_renderer.setDebug(debug_enabled);
        cpu_renderer.start();
        renderer_running = true;
        update_render_button();
        return;
    }
    show_webgpu_canvas();
    clear_debug_overlay();
    try {
        if (webgpu_controller) {
            webgpu_controller.resume();
        } else {
            await start_webgpu_renderer();
        }
        renderer_running = true;
        update_render_button();
    } catch (err) {
        console.error(err);
    }
}

async function start_webgpu_renderer() {
    webgpu_controller = await startWebGpuRenderer(webgpu_canvas, {
        maxFps: webgpu_max_fps,
        onFrameDone: (stats) => update_webgpu_ui(stats)
    });
}

function update_render_button() {
    render_btn.innerText = renderer_running ? 'stop' : 'start';
}

function clear_render() {
    if (active_renderer === Renderer.CPU) {
        cpu_renderer.reRender();
        if (renderer_running) {
            cpu_renderer.start();
        }
        reset_stats_ui();
        return;
    }
    webgpu_controller?.clear();
    reset_stats_ui();
}

function pause_active_renderer() {
    if (active_renderer === Renderer.CPU) {
        cpu_renderer.stop();
    } else {
        webgpu_controller?.pause();
    }
    renderer_running = false;
    update_render_button();
}
