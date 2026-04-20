import { useEffect, useRef } from "react";
import * as THREE from "three";

const EARTH_RADIUS = 1;
const SCALE = 0.0001;

export default function OrbitalView({ satellites }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    camera.position.set(0, 1.5, 3.5);
    camera.lookAt(0, 0, 0);

    // Earth
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({
        color: 0x0a1628, emissive: 0x0a1628,
        specular: 0x1a3a5c, shininess: 30,
      })
    );
    scene.add(earth);

    // Grid
    const gridMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.4 });
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts = [];
      for (let lon = 0; lon <= 360; lon += 5) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;
        pts.push(new THREE.Vector3(
          -(EARTH_RADIUS + 0.002) * Math.sin(phi) * Math.cos(theta),
          (EARTH_RADIUS + 0.002) * Math.cos(phi),
          (EARTH_RADIUS + 0.002) * Math.sin(phi) * Math.sin(theta),
        ));
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon = 0; lon < 360; lon += 20) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;
        pts.push(new THREE.Vector3(
          -(EARTH_RADIUS + 0.002) * Math.sin(phi) * Math.cos(theta),
          (EARTH_RADIUS + 0.002) * Math.cos(phi),
          (EARTH_RADIUS + 0.002) * Math.sin(phi) * Math.sin(theta),
        ));
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Atmosphere
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.04, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x1a4a8a, transparent: true, opacity: 0.06, side: THREE.BackSide })
    ));

    // Lights
    scene.add(new THREE.AmbientLight(0x223355, 2));
    const sun = new THREE.DirectionalLight(0x4488cc, 2.5);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Stars
    const starPos = [];
    for (let i = 0; i < 2000; i++) {
      const r = 20 + Math.random() * 30;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x88aacc, size: 0.04, transparent: true, opacity: 0.6 })));

    // Satellites
    const colors = [0x3b82f6, 0x34d399, 0xa78bfa, 0xf87171, 0xfbbf24];
    const satObjects = [];

    const satsToRender = satellites.length > 0 ? satellites : [{ altitude_km: 420, inclination_deg: 51.6 }];

    satsToRender.forEach((sat, idx) => {
      const alt = (sat.altitude_km || 420) * SCALE + EARTH_RADIUS;
      const inc = (sat.inclination_deg || 51.6) * Math.PI / 180;
      const color = colors[idx % colors.length];

      const orbitPts = [];
      for (let a = 0; a <= Math.PI * 2; a += 0.02) {
        orbitPts.push(new THREE.Vector3(
          alt * Math.cos(a),
          alt * Math.sin(a) * Math.sin(inc),
          alt * Math.sin(a) * Math.cos(inc),
        ));
      }
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: satellites.length > 0 ? 0.3 : 0.15 })
      ));

      if (satellites.length > 0) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.028, 12, 12),
          new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 1 })
        );
        scene.add(mesh);
        satObjects.push({ mesh, alt, inc, phase: (idx / satsToRender.length) * Math.PI * 2 });
      }
    });

    // Rotation state
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let rotX = 0.3, rotY = 0;
    let velX = 0, velY = 0.001;

    const onMouseDown = e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; velX = 0; velY = 0; };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = e => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      velY = dx * 0.005;
      velX = dy * 0.005;
      rotY += velY;
      rotX += velX;
      rotX = Math.max(-1.2, Math.min(1.2, rotX));
      prevX = e.clientX;
      prevY = e.clientY;
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    // Animation
    let frame;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!isDragging) {
        rotY += velY;
        velY *= 0.98;
        velY = Math.max(velY, 0.001);
      }

      earth.rotation.set(rotX, rotY, 0);

      satObjects.forEach(({ mesh, alt, inc, phase }) => {
        const angle = t * 0.25 + phase;
        mesh.position.set(
          alt * Math.cos(angle),
          alt * Math.sin(angle) * Math.sin(inc),
          alt * Math.sin(angle) * Math.cos(inc),
        );
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      mount.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [satellites]);

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height: "100%", cursor: "grab" }}
    />
  );
}
