import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import "./GalaxyBackground.css";

// Classic Three.js "galaxy generator" particle field: a spiral disc of points with a
// color gradient from bright center to dim edge, slowly rotating. Colored a saturated
// amber/gold — a nod to the "Light" in SignOLight — deliberately kept far from white
// (low blue channel) so it never blends into the white page text even under additive
// blending overlap. Purely decorative, behind the page content, pointer-events disabled.
const PARTICLE_COUNT = 9000;
const RADIUS = 5.5;
const BRANCHES = 4;
const SPIN = 1.1;
const RANDOMNESS = 0.35;
const RANDOMNESS_POWER = 2.6;

function buildGalaxyGeometry() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);

  const centerColor = new THREE.Color("#ffb703");
  const edgeColor = new THREE.Color("#2a1602");

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const r = Math.random() * RADIUS;
    const branchAngle = ((i % BRANCHES) / BRANCHES) * Math.PI * 2;
    const spinAngle = r * SPIN;

    const randomX = Math.pow(Math.random(), RANDOMNESS_POWER) * (Math.random() < 0.5 ? 1 : -1) * RANDOMNESS * r;
    const randomY = Math.pow(Math.random(), RANDOMNESS_POWER) * (Math.random() < 0.5 ? 1 : -1) * RANDOMNESS * r * 0.4;
    const randomZ = Math.pow(Math.random(), RANDOMNESS_POWER) * (Math.random() < 0.5 ? 1 : -1) * RANDOMNESS * r;

    positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

    const mixed = centerColor.clone().lerp(edgeColor, r / RADIUS);
    colors[i3] = mixed.r;
    colors[i3 + 1] = mixed.g;
    colors[i3 + 2] = mixed.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export default function GalaxyBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 3.2, 6.5);
    camera.lookAt(0, 0, 0);

    const geometry = buildGalaxyGeometry();
    const material = new THREE.PointsMaterial({
      size: 0.04,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.rotation.x = 0.35;
    scene.add(points);

    let mouseX = 0;
    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    function resize() {
      const { clientWidth, clientHeight } = canvas;
      const width = Math.max(1, clientWidth);
      const height = Math.max(1, clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const clock = new THREE.Clock();
    let frameId = 0;

    function animate() {
      frameId = requestAnimationFrame(animate);
      resize();
      const delta = clock.getDelta();

      points.rotation.y += delta * 0.045;
      camera.position.x += (mouseX * 1.2 - camera.position.x) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="galaxy-bg" aria-hidden="true" />;
}
