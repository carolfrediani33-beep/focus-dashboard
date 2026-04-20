import { useEffect, useRef } from "react";
import * as THREE from "three";
import axios from "axios";

const SCALE = 0.0001;
const R = 1;
const API_URL = "https://focus-api-vg34.onrender.com";
const API_KEY = "focus-dev-key-2026";
const H = { "X-API-Key": API_KEY };

function latLonToXYZ(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  ];
}

export default function OrbitalView({ satellites, tleData = {} }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth;
    const H2 = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H2);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: "absolute", top: "0", left: "0",
      width: "100%", height: "100%", cursor: "grab", zIndex: "1"
    });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H2, 0.01, 100);
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 0, 0);
    const group = new THREE.Group();
    scene.add(group);

    // Terre
    const loader = new THREE.TextureLoader();
    const earthMat = new THREE.MeshPhongMaterial({ color: 0x0a1628, emissive: 0x051020, specular: 0x1a3a5c, shininess: 40 });
    loader.load("/earth.jpg",
      (tex) => { earthMat.map = tex; earthMat.needsUpdate = true; }
    );
    group.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), earthMat));

    // Grille
    const gMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.2 });
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts = [];
      for (let lon = 0; lon <= 361; lon += 5) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;
        pts.push(new THREE.Vector3(-(R+.002)*Math.sin(phi)*Math.cos(theta), (R+.002)*Math.cos(phi), (R+.002)*Math.sin(phi)*Math.sin(theta)));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gMat));
    }
    for (let lon = 0; lon < 360; lon += 20) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;
        pts.push(new THREE.Vector3(-(R+.002)*Math.sin(phi)*Math.cos(theta), (R+.002)*Math.cos(phi), (R+.002)*Math.sin(phi)*Math.sin(theta)));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gMat));
    }

    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.04, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x1a4a8a, transparent: true, opacity: 0.06, side: THREE.BackSide })
    ));

    scene.add(new THREE.AmbientLight(0x223355, 2));
    const sun = new THREE.DirectionalLight(0x4488cc, 2.5);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    const sp = [];
    for (let i = 0; i < 1500; i++) {
      const r = 20 + Math.random() * 20;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      sp.push(r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t));
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x88aacc, size: 0.04, transparent: true, opacity: 0.5 })));

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
        ops.push(new THREE.Vector3(alt*Math.cos(a), alt*Math.sin(a)*Math.sin(inc), alt*Math.sin(a)*Math.cos(inc)));
      }
      group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ops),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.25 })
      ));

      if (satellites.length > 0) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.028, 12, 12),
          new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 1 })
        );
        group.add(mesh);
        satObjs.push({ mesh, alt, inc, phase: (i / toRender.length) * Math.PI * 2 });

        // Trajectoire prédite depuis /v1/predict
        axios.get(API_URL + "/v1/predict/" + sat.norad_id + "?hours=6", { headers: H })
          .then(res => {
            const pts = res.data.risk_timeline.map(p => {
              const xyz = latLonToXYZ(p.latitude_deg, p.longitude_deg, alt);
              return new THREE.Vector3(...xyz);
            });
            if (pts.length > 1) {
              const trackLine = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7, linewidth: 2 })
              );
              group.add(trackLine);
            }
          }).catch(() => {});
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
      satObjs.forEach(({ mesh, alt, inc, phase }) => {
        const a = t * 0.22 + phase;
        mesh.position.set(alt*Math.cos(a), alt*Math.sin(a)*Math.sin(inc), alt*Math.sin(a)*Math.cos(inc));
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
