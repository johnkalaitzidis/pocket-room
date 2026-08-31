import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  palettes,
  colorLabels,
  slotOrder,
  toCss,
  toJson,
  toHexBlock,
} from "./palettes.js";

const root = document.documentElement;
const canvas = document.getElementById("view");
const themeDots = document.getElementById("themeDots");
const swatches = document.getElementById("swatches");
const quote = document.getElementById("quote");
const paletteName = document.getElementById("paletteName");
const toastEl = document.getElementById("toast");
const dock = document.getElementById("dock");
const picker = document.getElementById("picker");
const pickHint = document.getElementById("pickHint");
const pickSlot = document.getElementById("pickSlot");
const pickHex = document.getElementById("pickHex");
const pickHexLabel = document.getElementById("pickHexLabel");
const pickR = document.getElementById("pickR");
const pickG = document.getElementById("pickG");
const pickB = document.getElementById("pickB");
const pickRVal = document.getElementById("pickRVal");
const pickGVal = document.getElementById("pickGVal");
const pickBVal = document.getElementById("pickBVal");
const remixBtn = document.getElementById("remix");
const editBtn = document.getElementById("editColor");

let activeId = palettes[0].id;
let format = "hex";
let remixIndex = 0;
let editing = false;
let selectedSlot = null;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const presets = palettes.filter((p) => !p.custom);
const customPalette = palettes.find((p) => p.custom);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.52;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
scene.environment = null;

function fadeHex(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * amount);
  const g = Math.round(((n >> 8) & 255) * amount);
  const b = Math.round((n & 255) * amount);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function paintRadial(innerHex, outerHex) {
  const c = paintRadial.canvas ?? document.createElement("canvas");
  paintRadial.canvas = c;
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext("2d");
  const dim = fadeHex(innerHex, 0.55);
  const g = ctx.createRadialGradient(512, 512, 8, 512, 512, 720);
  g.addColorStop(0, dim);
  g.addColorStop(0.18, dim);
  g.addColorStop(0.55, outerHex);
  g.addColorStop(1, "#080706");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  if (!paintRadial.texture) {
    paintRadial.texture = new THREE.CanvasTexture(c);
    paintRadial.texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    paintRadial.texture.needsUpdate = true;
  }
}
paintRadial("#c4b06a", "#1a1610");
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
camera.position.set(0, 1.15, 4.2);
scene.add(camera);

const radialBg = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    map: paintRadial.texture,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  })
);
radialBg.name = "radialBg";
radialBg.renderOrder = -20;
camera.add(radialBg);
radialBg.position.z = -40;

function fitRadialBg() {
  const dist = 40;
  const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist;
  radialBg.scale.set(height * camera.aspect * 1.35, height * 1.35, 1);
  radialBg.position.z = -dist;
}

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.08, 0.2, 0.92);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const pivot = new THREE.Group();
scene.add(pivot);

const hemi = new THREE.HemisphereLight(0xfff4e8, 0x2a2018, 0.18);
scene.add(hemi);

const pointer = { x: 0, y: 0 };
const targetRot = { x: 0, y: 0 };
let roomRoot = null;
/** @type {{ slot: string, materials: THREE.Material[], emissive: boolean }[]} */
let colorGroups = [];

function activePalette() {
  return palettes.find((p) => p.id === activeId) ?? palettes[0];
}

function hexKey(color) {
  return color.getHexString();
}

function fitCamera(object, gltfCameraNode) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  object.traverse((child) => {
    if (!child.isMesh) return;
    const mat = Array.isArray(child.material) ? child.material[0] : child.material;
    const invisible = mat && (mat.opacity === 0 || (mat.color && mat.color.a === 0));
    if (invisible || child.name === "Cube") {
      child.visible = false;
      return;
    }
    box.expandByObject(child);
  });
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  if (gltfCameraNode) {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    gltfCameraNode.updateWorldMatrix(true, false);
    gltfCameraNode.getWorldPosition(worldPos);
    gltfCameraNode.getWorldQuaternion(worldQuat);
    worldPos.sub(center);
    camera.position.copy(worldPos);
    camera.quaternion.copy(worldQuat);
    camera.fov = gltfCameraNode.fov ?? 42;
    camera.near = 0.08;
    camera.far = 80;
    camera.updateProjectionMatrix();
    camera.position.y += Math.max(size.y * 0.48, 2.0);
    camera.lookAt(0, size.y * 0.06, 0);
    pivot.position.set(0, 0, 0);
    fitRadialBg();
    return;
  }

  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  camera.position.set(dist * 0.55, dist * 0.32, dist * 0.95);
  camera.near = dist / 40;
  camera.far = dist * 20;
  camera.lookAt(0, -size.y * 0.02, 0);
  camera.updateProjectionMatrix();
}

const originalHex = palettes[0].colors;

function nearestSlot(hex, emissive, used) {
  if (emissive && !used.has("lamp")) return "lamp";
  let best = null;
  let bestDist = Infinity;
  slotOrder.forEach((slot) => {
    if (used.has(slot)) return;
    const dist = hexDistance(hex, originalHex[slot]);
    if (dist < bestDist) {
      bestDist = dist;
      best = slot;
    }
  });
  return best;
}

function hexDistance(a, b) {
  const pa = parseInt(a, 16);
  const pb = parseInt(b.slice(1), 16);
  const dr = ((pa >> 16) & 255) - ((pb >> 16) & 255);
  const dg = ((pa >> 8) & 255) - ((pb >> 8) & 255);
  const db = (pa & 255) - (pb & 255);
  return dr * dr + dg * dg + db * db;
}

function collectGroups(rootObject) {
  const buckets = new Map();
  rootObject.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat || !mat.color) return;
      const named = (mat.name || "").toLowerCase();
      if (named === "texture") return;
      const emissive = mat.emissive && mat.emissive.getHex() > 0;
      const key = `${hexKey(mat.color)}:${emissive ? "e" : "d"}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          hex: hexKey(mat.color),
          materials: [],
          emissive,
        });
      }
      buckets.get(key).materials.push(mat);
    });
  });

  const used = new Set();
  return [...buckets.values()].map((group) => {
    const slot = nearestSlot(group.hex, group.emissive, used) ?? slotOrder.find((s) => !used.has(s));
    used.add(slot);
    return { slot, materials: group.materials, emissive: group.emissive };
  });
}

function applyRoomColors(palette) {
  colorGroups.forEach(({ slot, materials, emissive }) => {
    const hex = palette.colors[slot];
    if (!hex) return;
    materials.forEach((mat) => {
      mat.envMapIntensity = 0;
      mat.color.set(hex);
      if (emissive && mat.emissive) {
        mat.emissive.set(hex);
        mat.emissiveIntensity = 0.28;
      }
    });
  });
}

function applyPalette(palette) {
  activeId = palette.id;
  root.style.setProperty("--bg", palette.page.bg);
  root.style.setProperty("--bgMid", palette.page.bgMid);
  root.style.setProperty("--glow", palette.colors.gold);
  root.style.setProperty("--paper", palette.page.paper);
  root.style.setProperty("--ink", palette.page.ink);
  hemi.color.set(palette.colors.lamp);
  hemi.groundColor.set(palette.colors.wood);
  paintRadial(palette.colors.gold, palette.page.bg);
  quote.textContent = palette.name;
  paletteName.textContent = palette.name;
  applyRoomColors(palette);
  renderDots();
  renderSwatches();
  if (!palette.custom) setEditing(false);
  resize();
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((c) => Number(c).toString(16).padStart(2, "0")).join("")}`;
}

function hidePicker() {
  picker.hidden = true;
}

function placePicker(clientX, clientY) {
  picker.hidden = false;
  const pad = 12;
  const offset = 16;
  const w = picker.offsetWidth;
  const h = picker.offsetHeight;
  let x = clientX + offset;
  let y = clientY + offset;
  if (x + w > window.innerWidth - pad) x = clientX - w - offset;
  if (y + h > window.innerHeight - pad) y = clientY - h - offset;
  x = Math.max(pad, Math.min(x, window.innerWidth - w - pad));
  y = Math.max(pad, Math.min(y, window.innerHeight - h - pad));
  picker.style.left = `${Math.round(x)}px`;
  picker.style.top = `${Math.round(y)}px`;
}

function setEditing(on) {
  editing = on;
  document.body.classList.toggle("editing", on);
  editBtn.setAttribute("aria-pressed", String(on));
  hidePicker();
  if (!on) {
    selectedSlot = null;
    pickSlot.textContent = "";
    pickHint.textContent = "Click a part of the room";
  }
}

function copyIntoCustom(from) {
  customPalette.colors = { ...from.colors };
  customPalette.page = { ...from.page };
}

function syncPicker(hex) {
  const [r, g, b] = hexToRgb(hex);
  pickHex.value = hex;
  pickHexLabel.textContent = hex;
  pickR.value = r;
  pickG.value = g;
  pickB.value = b;
  pickRVal.textContent = r;
  pickGVal.textContent = g;
  pickBVal.textContent = b;
}

function selectSlot(slot) {
  selectedSlot = slot;
  const palette = activePalette();
  const hex = palette.colors[slot];
  pickHint.textContent = "RGB";
  pickSlot.textContent = colorLabels[slot] ?? slot;
  syncPicker(hex);
  renderSwatches();
}

function writeSlotColor(hex) {
  if (!selectedSlot || !customPalette) return;
  customPalette.colors[selectedSlot] = hex;
  applyRoomColors(customPalette);
  paintRadial(customPalette.colors.gold, customPalette.page.bg);
  root.style.setProperty("--glow", customPalette.colors.gold);
  syncPicker(hex);
  renderDots();
  renderSwatches();
}

function mixHex(a, b, t) {
  const parse = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const A = parse(a);
  const B = parse(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return (c[0] << 16) + (c[1] << 8) + c[2];
}

function renderDots() {
  const fillHex =
    editing && selectedSlot && customPalette
      ? customPalette.colors[selectedSlot]
      : customPalette?.colors.leaf ?? "#cad100";
  themeDots.innerHTML = palettes
    .map((p) => {
      const current = p.id === activeId;
      const currentAttr = current ? ' aria-current="true"' : "";
      if (p.custom) {
        const used = fillHex;
        return `<button class="theme-dot custom" data-id="${p.id}" title="${p.name}"${currentAttr} style="--dot:${used}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="eclipse-body" cx="12" cy="12" r="10"/>
            <path class="eclipse-shadow" d="M12 2a7 7 0 1 0 10 10"/>
          </svg>
        </button>`;
      }
      return `<button class="theme-dot" data-id="${p.id}" title="${p.name}"${currentAttr} style="--dot:${p.colors.leaf}"></button>`;
    })
    .join("");
}

function renderSwatches() {
  const palette = activePalette();
  swatches.innerHTML = slotOrder
    .map((key) => {
      const current = editing && selectedSlot === key ? ' aria-current="true"' : "";
      return `
      <button class="swatch" data-hex="${palette.colors[key]}" data-slot="${key}" title="${colorLabels[key]} ${palette.colors[key]}"${current}>
        <i style="--c:${palette.colors[key]}"></i>
        <span>${colorLabels[key]}</span>
      </button>`;
    })
    .join("");
}

function payload(palette) {
  if (format === "css") return toCss(palette);
  if (format === "json") return toJson(palette);
  return toHexBlock(palette);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(copyText._t);
  copyText._t = setTimeout(() => toastEl.classList.remove("show"), 1400);
}

function frameBand() {
  const selector = themeDots.getBoundingClientRect();
  const bandBottom = selector.top > 0 ? selector.top : window.innerHeight * 0.58;
  return { top: 0, bottom: bandBottom };
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / Math.max(h, 1);
  const { top, bottom } = frameBand();
  const mid = (top + bottom) / 2;
  const shiftY = (h / 2 - mid) * 0.7 + 150;
  camera.setViewOffset(w, h, 0, shiftY, w, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloomPass.setSize(w, h);
  fitRadialBg();
}

themeDots.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-id]");
  if (!btn) return;
  const next = palettes.find((p) => p.id === btn.dataset.id);
  applyPalette(next);
  if (next?.custom) setEditing(true);
});

swatches.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-hex]");
  if (!btn) return;
  if (editing && btn.dataset.slot) {
    selectSlot(btn.dataset.slot);
    placePicker(e.clientX, e.clientY);
    return;
  }
  copyText(btn.dataset.hex, `Copied ${btn.dataset.hex}`);
});

document.querySelectorAll("[data-format]").forEach((btn) => {
  btn.addEventListener("click", () => {
    format = btn.dataset.format;
    document.querySelectorAll("[data-format]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b === btn));
    });
  });
});

document.getElementById("copyPalette").addEventListener("click", () => {
  const palette = activePalette();
  const label = format === "hex" ? "hex list" : format.toUpperCase();
  copyText(payload(palette), `Copied ${palette.name} as ${label}`);
});

remixBtn.addEventListener("click", () => {
  remixIndex = (remixIndex + 1) % presets.length;
  applyPalette(presets[remixIndex]);
});

document.getElementById("reset").addEventListener("click", () => {
  remixIndex = 0;
  setEditing(false);
  applyPalette(palettes[0]);
});

editBtn.addEventListener("click", () => {
  const from = activePalette();
  copyIntoCustom(from);
  applyPalette(customPalette);
  setEditing(true);
  toastEl.textContent = "Custom palette ready — click a part to recolor";
  toastEl.classList.add("show");
  clearTimeout(copyText._t);
  copyText._t = setTimeout(() => toastEl.classList.remove("show"), 1600);
});

function onRgbInput() {
  const hex = rgbToHex(pickR.value, pickG.value, pickB.value);
  writeSlotColor(hex);
}

pickR.addEventListener("input", onRgbInput);
pickG.addEventListener("input", onRgbInput);
pickB.addEventListener("input", onRgbInput);
pickHex.addEventListener("input", () => writeSlotColor(pickHex.value));

let pointerDown = null;
canvas.addEventListener("pointerdown", (e) => {
  pointerDown = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointerup", (e) => {
  if (!pointerDown) return;
  const dx = e.clientX - pointerDown.x;
  const dy = e.clientY - pointerDown.y;
  pointerDown = null;
  if (!editing || !roomRoot) return;
  if (Math.hypot(dx, dy) > 6) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ndc.x = (e.clientX / w) * 2 - 1;
  ndc.y = -(e.clientY / h) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(roomRoot, true);
  const hit = hits.find((h) => h.object.isMesh && h.object.visible);
  if (!hit) {
    hidePicker();
    return;
  }
  const mats = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
  const mat = mats[hit.face?.materialIndex ?? 0] ?? mats[0];
  const group = colorGroups.find((g) => g.materials.includes(mat));
  if (!group) {
    hidePicker();
    toastEl.textContent = "That part keeps its texture";
    toastEl.classList.add("show");
    clearTimeout(copyText._t);
    copyText._t = setTimeout(() => toastEl.classList.remove("show"), 1400);
    return;
  }
  selectSlot(group.slot);
  placePicker(e.clientX, e.clientY);
});

picker.addEventListener("pointerdown", (e) => e.stopPropagation());

window.addEventListener("pointermove", (e) => {
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = (e.clientY / window.innerHeight) * 2 - 1;
  pointer.x = nx;
  pointer.y = ny;
  targetRot.y = nx * 0.22;
  targetRot.x = ny * 0.1;
});

window.addEventListener("resize", resize);
new ResizeObserver(resize).observe(dock);

const loader = new GLTFLoader();
loader.load(
  encodeURI("./japanese room.glb"),
  (gltf) => {
    roomRoot = gltf.scene;
    let authoredCam = null;
    roomRoot.traverse((child) => {
      if (child.isLight) {
        const physical = child.intensity / 1800;
        child.intensity = THREE.MathUtils.clamp(physical, 2.5, 12);
        child.decay = 2;
        if ("distance" in child) child.distance = 14;
        if (child.isSpotLight || child.isDirectionalLight || child.isPointLight) {
          child.castShadow = true;
          child.shadow.mapSize.set(1024, 1024);
          child.shadow.bias = -0.0003;
        }
      }
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (!mat) return;
          mat.envMapIntensity = 0;
          mat.needsUpdate = true;
        });
      }
      if (child.isCamera && !authoredCam) authoredCam = child;
    });
    pivot.add(roomRoot);
    fitCamera(roomRoot, authoredCam);
    colorGroups = collectGroups(roomRoot);
    applyPalette(activePalette());
    resize();
  },
  undefined,
  (err) => {
    quote.textContent = "Could not load the room.";
    console.error(err);
  }
);

function tick() {
  pivot.rotation.y += (targetRot.y - pivot.rotation.y) * 0.06;
  pivot.rotation.x += (targetRot.x - pivot.rotation.x) * 0.06;
  composer.render();
  requestAnimationFrame(tick);
}

resize();
tick();
applyPalette(palettes[0]);
