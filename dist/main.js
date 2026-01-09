import { createCpuRenderer } from './cpu.js';
import { check_webgpu, startWebGpuRenderer } from "./webgpu.js";
const render_canvas = document.getElementById('render_canvas');
const debug_canvas = document.getElementById('debug_canvas');
const webgpu_canvas = document.getElementById('webgpu_canvas');
const cpu_renderer = createCpuRenderer({
    renderCanvas: render_canvas,
    debugCanvas: debug_canvas,
    onFrameDone: (stats) => {
        update_ui(stats);
    }
});
var Renderer;
(function (Renderer) {
    Renderer["CPU"] = "CPU";
    Renderer["WebGPU"] = "WebGPU";
})(Renderer || (Renderer = {}));
const DEFAULT_RENDERER = Renderer.WebGPU;
let active_renderer = Renderer.CPU;
let webgpu_controller = null;
const render_settings = cpu_renderer.getSettings();
// ui
const render_btn = document.getElementById('render_btn');
const renderer_select = document.getElementById('renderer_select');
const webgpu_option = document.getElementById('webgpu_option');
const bounces_input = document.getElementById('bounces_input');
const bounces_value = document.getElementById('bounces_value');
const samples_input = document.getElementById('samples_input');
const samples_value = document.getElementById('samples_value');
const exposure_input = document.getElementById('exposure_input');
const exposure_value = document.getElementById('exposure_value');
const tone_map_select = document.getElementById('tone_map_select');
const gamma_checkbox = document.getElementById('gamma_checkbox');
const debug_checkbox = document.getElementById('debug_checkbox');
const webgpu_fps_input = document.getElementById('webgpu_fps_input');
const webgpu_fps_value = document.getElementById('webgpu_fps_value');
const accum_frame_span = document.getElementById('accum_frame_span');
const last_render_time_span = document.getElementById('last_render_time_span');
const average_render_time_span = document.getElementById('average_render_time_span');
const total_render_time_span = document.getElementById('total_render_time_span');
let debug_enabled = false;
let webgpu_max_fps = 30;
const webgpu_supported = check_webgpu();
if (!webgpu_supported) {
    webgpu_option.disabled = true;
}
renderer_select.addEventListener('change', () => {
    void switch_renderer(renderer_select.value);
});
addEventListener('keydown', (evt) => {
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
render_btn.addEventListener('click', re_render);
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
    render_settings.tone_map = tone_map_select.value;
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
function start_default_renderer(renderer) {
    if (renderer === Renderer.CPU) {
        cpu_renderer.setDebug(debug_enabled);
        cpu_renderer.start();
        return;
    }
    void switch_renderer(renderer);
}
async function switch_renderer(next) {
    if (next === active_renderer)
        return;
    stop_active_renderer();
    active_renderer = next;
    update_controls();
    if (next === Renderer.CPU) {
        show_cpu_canvases();
        cpu_renderer.setDebug(debug_enabled);
        cpu_renderer.start();
        cpu_renderer.reRender();
        return;
    }
    if (!webgpu_supported) {
        active_renderer = Renderer.CPU;
        renderer_select.value = Renderer.CPU;
        update_controls();
        cpu_renderer.setDebug(debug_enabled);
        cpu_renderer.start();
        return;
    }
    show_webgpu_canvas();
    clear_debug_overlay();
    try {
        webgpu_controller = await startWebGpuRenderer(webgpu_canvas, { maxFps: webgpu_max_fps });
    }
    catch (err) {
        console.error(err);
        renderer_select.value = Renderer.CPU;
        active_renderer = Renderer.CPU;
        update_controls();
        show_cpu_canvases();
        cpu_renderer.setDebug(debug_enabled);
        cpu_renderer.start();
    }
}
function re_render() {
    if (active_renderer !== Renderer.CPU)
        return;
    reset_ui();
    cpu_renderer.reRender();
}
function stop_active_renderer() {
    if (active_renderer === Renderer.CPU) {
        cpu_renderer.stop();
    }
    else {
        webgpu_controller?.stop();
        webgpu_controller = null;
    }
}
function update_controls() {
    const cpu_controls_enabled = active_renderer === Renderer.CPU;
    const webgpu_controls_enabled = active_renderer === Renderer.WebGPU;
    render_btn.disabled = !cpu_controls_enabled;
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
}
function update_ui(stats) {
    if (stats.frameSampleCount > 1) {
        last_render_time_span.innerText = `${(stats.lastFrameTimeMs / 1000).toFixed(3)}s`;
        average_render_time_span.innerText = `${((stats.frameTimeSumMs / (stats.frameSampleCount - 1)) / 1000).toFixed(3)}s`;
    }
    else {
        last_render_time_span.innerText = `-`;
        average_render_time_span.innerText = `-`;
    }
    total_render_time_span.innerText = `${(stats.frameTimeSumMs / 1000).toFixed(3)}s`;
    accum_frame_span.innerText = `${stats.frameSampleCount - 1}`;
}
//# sourceMappingURL=main.js.map