import { useEffect, useRef } from "react";
import * as THREE from "three";

const EARTH_RADIUS = 1;
const SCALE = 0.0001;

function latLonToXYZ(lat, lon, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  };
}

export default function OrbitalView({ satellites }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    camera.position.set(0, 1.5, 3.5);
    camera.lookAt(0, 0, 0);

    // Earth
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      emissive: 0x0a1628,
      specular: 0x1a3a5c,
      shininess: 30,
      transparent: true,
      opacity: 0.95,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Grid lines on earth (lat/lon)
    const gridMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.4 });
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts = [];
      for (let lon = 0; lon <= 360; lon += 5) {
        const p = latLonToXYZ(lat, lon, EARTH_RADIUS + 0.001);
        pts.push(new THREE.Vector3(p.x, p.y, p.z));
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon = 0; lon < 360; lon += 20) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        const p = latLonToXYZ(lat, lon, EARTH_RADIUS + 0.001);
        pts.push(new THREE.Vector3(p.x, p.y, p.z));
      }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.03, 64, 64);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x1a4a8a,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Lights
    scene.add(new THREE.AmbientLight(0x223355, 1.5));
    const sun = new THREE.DirectionalLight(0x4488cc, 2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for (let i = 0; i < 2000; i++) {
      const r = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x88aacc, size: 0.04, transparent: true, opacity: 0.6 })));

    // Satellites — orbits at 420km altitude
    const satObjects = [];
    const colors = [0x3b82f6, 0x34d399, 0xa78bfa, 0xf87171, 0xfbbf24];

    satellites.forEach((sat, idx) => {
      const alt = (sat.altitude_km || 420) * SCALE + EARTH_RADIUS;
      const inc = (sat.inclination_deg || 51.6) * (Math.PI / 180);
      const color = colors[idx % colors.length];

      // Orbit ring
      const orbitPts = [];
      for (let a = 0; a <= Math.PI * 2; a += 0.02) {
        orbitPts.push(new THREE.Vector3(
          alt * Math.cos(a),
          alt * Math.sin(a) * Math.sin(inc),
          alt * Math.sin(a) * Math.cos(inc),
        ));
      }
      const orbitLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 })
      );
      scene.add(orbitLine);

      // Satellite dot
      const satMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 12, 12),
        new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.8 })
      );
      scene.add(satMesh);

      satObjects.push({ mesh: satMesh, alt, inc, phase: (idx / satellites.length) * Math.PI * 2 });
    });

    // Default satellite if none
    if (satellites.length === 0) {
      const alt = 420 * SCALE + EARTH_RADIUS;
      const inc = 51.6 * Math.PI / 180;
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
        new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.2 })
      ));
    }

    // Mouse rotation
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let rotX = 0, rotY = 0;
    const onDown = e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { isDragging = false; };
    const onMove = e => {
      if (!isDragging) return;
      rotY += (e.clientX - prevMouse.x) * 0.005;
      rotX += (e.clientY - prevMouse.y) * 0.005;
      rotX = Math.max(-1.2, Math.min(1.2, rotX));
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    renderer.domElement.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);

    // Animation
    let frame;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      earth.rotation.y = t * 0.05 + rotY;
      earth.rotation.x = rotX;

      satObjects.forEach(({ mesh, alt, inc, phase }) => {
        const angle = t * 0.3 + phase;
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
      renderer.domElement.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      renderer.dispose();
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [satellites]);

  return (
    <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />
  );
}
