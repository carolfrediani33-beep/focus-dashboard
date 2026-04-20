import { useEffect, useRef } from "react";
import * as THREE from "three";

const SCALE = 0.0001;
const R = 1;

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

    // Make canvas fill container and be interactive
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.zIndex = "1";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 100);
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 0, 0);

    // Group for rotation
    const group = new THREE.Group();
    scene.add(group);

    // Earth
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x0a1628, emissive: 0x051020, specular: 0x1a3a5c, shininess: 40 })
    );
    group.add(earth);

    // Grid lines
    const gMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.35 });
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts = [];
      for (let lon = 0; lon <= 361; lon += 5) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;
        pts.push(new THREE.Vector3(
          -(R + .002) * Math.sin(phi) * Math.cos(theta),
          (R + .002) * Math.cos(phi),
          (R + .002) * Math.sin(phi) * Math.sin(theta)
        ));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gMat));
    }
    for (let lon = 0; lon < 360; lon += 20) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;
        pts.push(new THREE.Vector3(
          -(R + .002) * Math.sin(phi) * Math.cos(theta),
          (R + .002) * Math.cos(phi),
          (R + .002) * Math.sin(phi) * Math.sin(theta)
        ));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gMat));
    }

    // Atmosphere
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.04, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x1a4a8a, transparent: true, opacity: 0.05, side: THREE.BackSide })
    ));

    // Lights
    scene.add(new THREE.AmbientLight(0x334466, 2));
    const sun = new THREE.DirectionalLight(0x5599cc, 3);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Stars
    const sp = [];
    for (let i = 0; i < 1500; i++) {
      const r = 20 + Math.random() * 20;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      sp.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8899bb, size: 0.05, transparent: true, opacity: 0.5 })));

    // Satellites & orbits
    const COLORS = [0x3b82f6, 0x34d399, 0xa78bfa, 0xf87171, 0xfbbf24];
    const satObjs = [];
    const toRender = satellites.length > 0 ? satellites : [{ altitude_km: 420, inclination_deg: 51.6 }];

    toRender.forEach((sat, i) => {
      const tle = tleData[sat.norad_id];
      const alt = ((tle?.altitude_km || sat.altitude_km || 420)) * SCALE + R;
      const inc = ((tle?.inclination_deg || sat.inclination_deg || 51.6)) * Math.PI / 180;
      const col = COLORS[i % COLORS.length];

      const ops = [];
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.02) {
        ops.push(new THREE.Vector3(alt * Math.cos(a), alt * Math.sin(a) * Math.sin(inc), alt * Math.sin(a) * Math.cos(inc)));
      }
      group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ops),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: satellites.length > 0 ? 0.35 : 0.12 })
      ));

      if (satellites.length > 0) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 8, 8),
          new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 1.2 })
        );
        scene.add(mesh);
        satObjs.push({ mesh, alt, inc, phase: (i / toRender.length) * Math.PI * 2 });
      }
    });

    // Drag rotation
    let dragging = false;
    let px = 0, py = 0;
    let rotX = 0.2, rotY = 0;
    let vx = 0, vy = 0.0008;

    const onDown = e => {
      dragging = true;
      px = e.clientX; py = e.clientY;
      vx = 0; vy = 0;
      renderer.domElement.style.cursor = "grabbing";
    };
    const onUp = () => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
    };
    const onMove = e => {
      if (!dragging) return;
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      vy = dx * 0.006;
      vx = dy * 0.006;
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

      if (!dragging) {
        rotY += vy;
        vy *= 0.99;
        if (Math.abs(vy) < 0.0008) vy = 0.0008;
      }

      group.rotation.x = rotX;
      group.rotation.y = rotY;

      satObjs.forEach(({ mesh, alt, inc, phase }) => {
        const a = t * 0.22 + phase;
        mesh.position.set(
          alt * Math.cos(a),
          alt * Math.sin(a) * Math.sin(inc),
          alt * Math.sin(a) * Math.cos(inc)
        );
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
  }, [satellites]);

  return (
    <div ref={mountRef} style={{ width: "100%", height: "100%", position: "relative" }} />
  );
}
