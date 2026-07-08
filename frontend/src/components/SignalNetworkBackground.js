import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import "./SignalNetworkBackground.css";

// A network of glowing nodes connected by thin lines, with small bright "signal" pulses
// traveling along the edges — nodes = points of connection/meaning ("Sign"), pulses of
// light = information passing between them ("Light"). Amber/gold, kept far from white so
// it never blends into the page's white text. Purely decorative, pointer-events disabled.
const NODE_COUNT = 70;
const BOUNDS = { x: 7, y: 4, z: 4 };
const MAX_LINK_DIST = 2.4;
const MAX_LINKS_PER_NODE = 3;
const PULSE_COUNT = 14;
const AMBER = "#ffb703";
const AMBER_DIM = "#5a3a06";

function randRange(n) {
  return (Math.random() * 2 - 1) * n;
}

function buildNodes() {
  const nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      pos: new THREE.Vector3(randRange(BOUNDS.x), randRange(BOUNDS.y), -1.5 + randRange(BOUNDS.z)),
      drift: new THREE.Vector3(randRange(0.08), randRange(0.08), randRange(0.05)),
      phase: Math.random() * Math.PI * 2,
    });
  }
  return nodes;
}

function buildLinks(nodes) {
  const links = [];
  nodes.forEach((node, i) => {
    const distances = nodes
      .map((other, j) => ({ j, d: i === j ? Infinity : node.pos.distanceTo(other.pos) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX_LINKS_PER_NODE);
    distances.forEach(({ j, d }) => {
      if (d < MAX_LINK_DIST && !links.some((l) => (l.a === j && l.b === i) || (l.a === i && l.b === j))) {
        links.push({ a: i, b: j });
      }
    });
  });
  return links;
}

export default function SignalNetworkBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 7);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    const nodes = buildNodes();
    const links = buildLinks(nodes);

    // Node points (glowing dots)
    const nodePositions = new Float32Array(NODE_COUNT * 3);
    nodes.forEach((n, i) => {
      nodePositions[i * 3] = n.pos.x;
      nodePositions[i * 3 + 1] = n.pos.y;
      nodePositions[i * 3 + 2] = n.pos.z;
    });
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    const nodeMaterial = new THREE.PointsMaterial({
      color: AMBER,
      size: 0.09,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
    group.add(nodePoints);

    // Link lines (dim, static geometry rebuilt each frame from node positions)
    const linePositions = new Float32Array(links.length * 2 * 3);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: AMBER_DIM,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lineSegments);

    // Traveling signal pulses along random edges
    const pulses = Array.from({ length: PULSE_COUNT }, () => ({
      link: links[Math.floor(Math.random() * links.length)],
      t: Math.random(),
      speed: 0.15 + Math.random() * 0.25,
    }));
    const pulsePositions = new Float32Array(PULSE_COUNT * 3);
    const pulseGeometry = new THREE.BufferGeometry();
    pulseGeometry.setAttribute("position", new THREE.BufferAttribute(pulsePositions, 3));
    const pulseMaterial = new THREE.PointsMaterial({
      color: AMBER,
      size: 0.14,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pulsePoints = new THREE.Points(pulseGeometry, pulseMaterial);
    group.add(pulsePoints);

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
      const t = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Gentle drift per node
      const posAttr = nodeGeometry.attributes.position;
      nodes.forEach((n, i) => {
        const bx = n.pos.x + Math.sin(t * 0.3 + n.phase) * n.drift.x;
        const by = n.pos.y + Math.cos(t * 0.25 + n.phase) * n.drift.y;
        const bz = n.pos.z + Math.sin(t * 0.2 + n.phase) * n.drift.z;
        posAttr.setXYZ(i, bx, by, bz);
      });
      posAttr.needsUpdate = true;

      // Rebuild link line endpoints from the drifted node positions
      const lineAttr = lineGeometry.attributes.position;
      links.forEach((link, i) => {
        const ai = posAttr.array;
        const a3 = link.a * 3;
        const b3 = link.b * 3;
        lineAttr.setXYZ(i * 2, ai[a3], ai[a3 + 1], ai[a3 + 2]);
        lineAttr.setXYZ(i * 2 + 1, ai[b3], ai[b3 + 1], ai[b3 + 2]);
      });
      lineAttr.needsUpdate = true;

      // Advance signal pulses along their edges
      const pulseAttr = pulseGeometry.attributes.position;
      pulses.forEach((p, i) => {
        p.t += delta * p.speed;
        if (p.t > 1) {
          p.t = 0;
          p.link = links[Math.floor(Math.random() * links.length)];
        }
        const ai = posAttr.array;
        const a3 = p.link.a * 3;
        const b3 = p.link.b * 3;
        const x = ai[a3] + (ai[b3] - ai[a3]) * p.t;
        const y = ai[a3 + 1] + (ai[b3 + 1] - ai[a3 + 1]) * p.t;
        const z = ai[a3 + 2] + (ai[b3 + 2] - ai[a3 + 2]) * p.t;
        pulseAttr.setXYZ(i, x, y, z);
      });
      pulseAttr.needsUpdate = true;

      group.rotation.y = Math.sin(t * 0.05) * 0.12;
      camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      pulseGeometry.dispose();
      pulseMaterial.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="signal-network-bg" aria-hidden="true" />;
}
