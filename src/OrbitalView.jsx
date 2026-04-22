import { useEffect, useRef } from "react";
import * as THREE from "three";

const SCALE = 0.0001;
const R = 1;
const API_URL = "https://focus-api-vg34.onrender.com";
const API_KEY = "focus-dev-key-2026";

function latLonToXYZ(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export default function OrbitalView({ satellites, tleData = {} }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

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

    // Groupe principal — NE TOURNE PAS (Terre fixe)
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Groupe satellites — tourne avec le drag
    const satGroup = new THREE.Group();
    scene.add(satGroup);

    // Terre avec texture NASA
    const loader = new THREE.TextureLoader();
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0xffffff, specular: 0x222222, shininess: 12
    });
    loader.load("/earth.jpg", tex => { earthMat.map = tex; earthMat.needsUpdate = true; });
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), earthMat));

    // Atmosphère
    earthGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.02, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x3a7bd5, transparent: true, opacity: 0.08, side: THREE.FrontSide })
    ));
    earthGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.05, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x1a4a8a, transparent: true, opacity: 0.04, side: THREE.BackSide })
    ));

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Effet nuit côté ombre
    const nightLight = new THREE.DirectionalLight(0x001133, 0.8);
    nightLight.position.set(-5, -2, -5);
    scene.add(nightLight);

    // Étoiles
    const sp = [];
    for (let i = 0; i < 2000; i++) {
      const r = 20 + Math.random() * 20;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      sp.push(r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t));
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xaabbcc, size: 0.035, transparent: true, opacity: 0.6 })));

    const COLORS = [0x3b82f6, 0x34d399, 0xa78bfa, 0xf87171, 0xfbbf24];
    const satObjs = [];
    const toRender = satellites.length > 0 ? satellites : [{ altitude_km: 420, inclination_deg: 51.6 }];

    toRender.forEach((sat, i) => {
      const tle = tleData[sat.norad_id];
      const alt = ((tle?.altitude_km || sat.altitude_km || 420)) * SCALE + R;
      const inc = ((tle?.inclination_deg || sat.inclination_deg || 51.6)) * Math.PI / 180;
      const col = COLORS[i % COLORS.length];
      const raan = (i / toRender.length) * Math.PI * 2;

      // Orbite fine
      const ops = [];
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.015) {
        const x = alt * Math.cos(a);
        const y = alt * Math.sin(a) * Math.sin(inc);
        const z = alt * Math.sin(a) * Math.cos(inc);
        ops.push(new THREE.Vector3(
          x * Math.cos(raan) - z * Math.sin(raan), y,
          x * Math.sin(raan) + z * Math.cos(raan)
        ));
      }
      satGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ops),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.18 })
      ));

      if (satellites.length > 0) {
        // Point satellite avec halo
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 10, 10),
          new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 2 })
        );
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(0.038, 10, 10),
          new THREE.MeshPhongMaterial({ color: col, transparent: true, opacity: 0.15, emissive: col, emissiveIntensity: 1 })
        );
        satGroup.add(mesh);
        satGroup.add(halo);
        satObjs.push({ mesh, halo, alt, inc, raan, phase: (i / toRender.length) * Math.PI * 2 });

        // Trajectoire SGP4 depuis API
        if (sat.norad_id) {
          fetch(API_URL + "/v1/predict/" + sat.norad_id + "?hours=6", {
            headers: { "X-API-Key": API_KEY }
          })
          .then(r => r.json())
          .then(data => {
            if (!data.risk_timeline) return;
            const pts = data.risk_timeline
              .filter((_, idx) => idx % 2 === 0)
              .map(p => latLonToXYZ(p.latitude_deg, p.longitude_deg, alt + 0.001));
            if (pts.length > 1) {
              earthGroup.add(new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(pts),
                new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.4 })
              ));
            }
          }).catch(() => {});
        }
      }
    });

    // Drag — tourne satGroup ET earthGroup ensemble
    let dragging = false, px = 0, py = 0;
    let rotX = 0.2, rotY = 0, vx = 0, vy = 0.0008;

    const onDown = e => { dragging = true; px = e.clientX; py = e.clientY; vx = 0; vy = 0; renderer.domElement.style.cursor = "grabbing"; };
    const onUp = () => { dragging = false; renderer.domElement.style.cursor = "grab"; };
    const onMove = e => {
      if (!dragging) return;
      vy = (e.clientX - px) * 0.006;
      vx = (e.clientY - py) * 0.006;
      rotY += vy; rotX = Math.max(-1.3, Math.min(1.3, rotX + vx));
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
        rotY += vy; vy *= 0.99;
        if (Math.abs(vy) < 0.0008) vy = 0.0008;
      }

      // Les deux groupes tournent ensemble — trajectoires restent alignées
      earthGroup.rotation.x = rotX; earthGroup.rotation.y = rotY;
      satGroup.rotation.x = rotX; satGroup.rotation.y = rotY;

      // Satellites animés
      satObjs.forEach(({ mesh, halo, alt, inc, raan, phase }) => {
        const a = t * 0.22 + phase;
        const x = alt * Math.cos(a);
        const y = alt * Math.sin(a) * Math.sin(inc);
        const z = alt * Math.sin(a) * Math.cos(inc);
        const pos = new THREE.Vector3(
          x * Math.cos(raan) - z * Math.sin(raan), y,
          x * Math.sin(raan) + z * Math.cos(raan)
        );
        mesh.position.copy(pos);
        halo.position.copy(pos);
        // Halo pulsant
        const pulse = 0.8 + 0.2 * Math.sin(t * 3 + phase);
        halo.material.opacity = 0.15 * pulse;
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
