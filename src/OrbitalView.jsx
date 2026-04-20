import { useEffect, useRef } from "react";
import * as THREE from "three";

const SCALE = 0.0001;
const R = 1;

function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const ocean = ctx.createLinearGradient(0, 0, 0, 512);
  ocean.addColorStop(0, "#0a1628");
  ocean.addColorStop(0.5, "#0d2040");
  ocean.addColorStop(1, "#0a1628");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = "#1a3a2a";
  [[120,80,140,120],[150,200,80,130],[430,70,70,80],[440,160,90,150],
   [520,60,220,130],[640,260,100,80],[0,440,1024,70],[200,40,60,50]
  ].forEach(([x,y,w,h]) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 20);
    ctx.fill();
  });
  ctx.strokeStyle = "rgba(59,130,246,0.08)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < 1024; x += 128) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  for (let y = 0; y < 512; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

export default function OrbitalView({ satellites, tleData = {} }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth;
    const H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: "absolute", top: "0", left: "0",
      width: "100%", height: "100%", cursor: "grab", zIndex: "1"
    });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 100);
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    scene.add(group);
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({ map: createEarthTexture(), specular: new THREE.Color(0x1a3a5c), shininess: 20 })
    ));
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.05, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x1a4a8a, transparent: true, opacity: 0.08, side: THREE.BackSide })
    ));
    scene.add(new THREE.AmbientLight(0x334466, 2));
    const sun = new THREE.DirectionalLight(0x6699cc, 3);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const sp = [];
    for (let i = 0; i < 2000; i++) {
      const r = 20 + Math.random() * 20;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      sp.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8899bb, size: 0.05, transparent: true, opacity: 0.6 })));
    const COLORS = [0x3b82f6, 0x34d399, 0xa78bfa, 0xf87171, 0xfbbf24];
    const satObjs = [];
    const toRender = satellites.length > 0 ? satellites : [{ altitude_km: 420, inclination_deg: 51.6 }];
    toRender.forEach((sat, i) => {
      const tle = tleData[sat.norad_id];
      const alt = ((tle ? tle.altitude_km : null) || sat.altitude_km || 420) * SCALE + R;
      const inc = ((tle ? tle.inclination_deg : null) || sat.inclination_deg || 51.6) * Math.PI / 180;
      const col = COLORS[i % COLORS.length];
      const ops = [];
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.02) {
        ops.push(new THREE.Vector3(alt * Math.cos(a), alt * Math.sin(a) * Math.sin(inc), alt * Math.sin(a) * Math.cos(inc)));
      }
      group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ops),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: satellites.length > 0 ? 0.4 : 0.12 })
      ));
      if (satellites.length > 0) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 8, 8),
          new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 1.5 })
        );
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 8, 8),
          new THREE.MeshPhongMaterial({ color: col, transparent: true, opacity: 0.2, emissive: col, emissiveIntensity: 0.5 })
        );
        scene.add(mesh);
        scene.add(halo);
        satObjs.push({ mesh, halo, alt, inc, phase: (i / toRender.length) * Math.PI * 2 });
      }
    });
    let dragging = false, px = 0, py = 0, rotX = 0.2, rotY = 0, vx = 0, vy = 0.0008;
    const onDown = e => { dragging = true; px = e.clientX; py = e.clientY; vx = 0; vy = 0; renderer.domElement.style.cursor = "grabbing"; };
    const onUp = () => { dragging = false; renderer.domElement.style.cursor = "grab"; };
    const onMove = e => {
      if (!dragging) return;
      vy = (e.clientX - px) * 0.006;
      vx = (e.clientY - py) * 0.006;
      rotY += vy;
      rotX = Math.max(-1.3, Math.min(1.3, rotX + vx));
      px = e.clientX; py = e.clientY;
    };
    renderer.domElement.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    let frame;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (!dragging) { rotY += vy; vy *= 0.99; if (Math.abs(vy) < 0.0008) vy = 0.0008; }
      group.rotation.x = rotX;
      group.rotation.y = rotY;
      satObjs.forEach(({ mesh, halo, alt, inc, phase }) => {
        const a = t * 0.22 + phase;
        const pos = new THREE.Vector3(alt * Math.cos(a), alt * Math.sin(a) * Math.sin(inc), alt * Math.sin(a) * Math.cos(inc));
        mesh.position.copy(pos);
        halo.position.copy(pos);
      });
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [satellites, tleData]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", position: "relative" }} />;
}
