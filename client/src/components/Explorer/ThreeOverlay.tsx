import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CommuteDestination } from './cesium-types';

// Colour per transport mode
const MODE_COLORS: Record<string, number> = {
  transit: 0x00D9FF,
  drive: 0xFF4444,
  walk: 0x00E676,
  cycle: 0xFFD700,
};

interface Props {
  cesiumContainer: HTMLDivElement | null;
  propertyLat: number;
  propertyLng: number;
  destinations: CommuteDestination[];
  showArcs: boolean;
  showRings: boolean;
  // Cesium projects geo → screen; we receive the callback
  projectToScreen: (lat: number, lng: number) => { x: number; y: number } | null;
  width: number;
  height: number;
}

function bezierArc(
  start: THREE.Vector2,
  end: THREE.Vector2,
  curve = 0.35,
): THREE.QuadraticBezierCurve {
  const mid = new THREE.Vector2().addVectors(start, end).multiplyScalar(0.5);
  const dir = new THREE.Vector2().subVectors(end, start);
  const perp = new THREE.Vector2(-dir.y, dir.x).normalize().multiplyScalar(dir.length() * curve);
  const control = mid.clone().add(perp);
  return new THREE.QuadraticBezierCurve(start, control, end);
}

export function ThreeOverlay({
  cesiumContainer,
  propertyLat,
  propertyLng,
  destinations,
  showArcs,
  showRings,
  projectToScreen,
  width,
  height,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cesiumContainer) return;

    // Set up Three.js with transparent renderer
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(0, width, 0, height, -100, 100);
    cameraRef.current = camera;

    // Animate
    const animate = (time: number) => {
      timeRef.current = time;
      animFrameRef.current = requestAnimationFrame(animate);

      scene.clear();

      const propScreen = projectToScreen(propertyLat, propertyLng);
      if (!propScreen) { renderer.render(scene, camera); return; }

      const propVec = new THREE.Vector2(propScreen.x, propScreen.y);

      // Distance rings (500m, 1km, 2km in screen space)
      if (showRings) {
        // Estimate screen pixels per metre using another nearby point
        const nearPoint = projectToScreen(propertyLat + 0.009, propertyLng);
        if (nearPoint) {
          const pixelsPer1km = Math.abs(propScreen.y - nearPoint.y);
          [0.5, 1, 2].forEach((km, i) => {
            const radius = pixelsPer1km * km;
            const opacity = 0.25 - i * 0.06;
            const curve = new THREE.EllipseCurve(propVec.x, propVec.y, radius, radius * 0.65, 0, Math.PI * 2, false, 0);
            const points = curve.getPoints(64).map(p => new THREE.Vector3(p.x, p.y, 0));
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color: 0xFFD700, opacity, transparent: true });
            scene.add(new THREE.Line(geo, mat));

            // km label
            const label = document.createElement('canvas');
            label.width = 60; label.height = 24;
            const ctx = label.getContext('2d')!;
            ctx.fillStyle = 'rgba(255,215,0,0.7)';
            ctx.font = '11px Inter, sans-serif';
            ctx.fillText(`${km < 1 ? '500m' : `${km}km`}`, 2, 16);
            const tex = new THREE.CanvasTexture(label);
            const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(propVec.x, propVec.y - radius * 0.65 - 12, 1);
            sprite.scale.set(60, 24, 1);
            scene.add(sprite);
          });
        }
      }

      // Commute arcs
      if (showArcs) {
        destinations.forEach((dest) => {
          const destScreen = projectToScreen(dest.lat, dest.lng);
          if (!destScreen) return;

          const destVec = new THREE.Vector2(destScreen.x, destScreen.y);
          const arc = bezierArc(propVec, destVec);
          const totalPoints = 80;
          const allPoints = arc.getPoints(totalPoints);

          // Animated flow: draw a moving segment of the arc
          const progress = ((timeRef.current * 0.0005) % 1);
          const segLen = 20;
          const start = Math.floor(progress * totalPoints);

          const color = MODE_COLORS[dest.mode] ?? 0x00D9FF;

          // Draw full arc (dim)
          const fullGeo = new THREE.BufferGeometry().setFromPoints(allPoints.map(p => new THREE.Vector3(p.x, p.y, 0)));
          const fullMat = new THREE.LineBasicMaterial({ color, opacity: 0.25, transparent: true });
          scene.add(new THREE.Line(fullGeo, fullMat));

          // Draw animated segment (bright)
          const segPoints = allPoints.slice(start, Math.min(start + segLen, totalPoints)).map(p => new THREE.Vector3(p.x, p.y, 0.5));
          if (segPoints.length >= 2) {
            const segGeo = new THREE.BufferGeometry().setFromPoints(segPoints);
            const segMat = new THREE.LineBasicMaterial({ color, opacity: 0.85, transparent: true, linewidth: 2 });
            scene.add(new THREE.Line(segGeo, segMat));
          }

          // Destination label
          const label = document.createElement('canvas');
          label.width = 140; label.height = 28;
          const ctx = label.getContext('2d')!;
          ctx.fillStyle = `rgba(${hexToRgb(color)},0.85)`;
          ctx.roundRect(0, 0, 140, 28, 4);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText(`${dest.label} · ${dest.durationMins}min`, 6, 18);
          const tex = new THREE.CanvasTexture(label);
          const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.set(destScreen.x, destScreen.y - 24, 2);
          sprite.scale.set(140, 28, 1);
          scene.add(sprite);
        });
      }

      // Property spotlight pulse ring
      const pulse = 0.5 + 0.5 * Math.sin(timeRef.current * 0.003);
      const ringRadius = 12 + pulse * 6;
      const ringCurve = new THREE.EllipseCurve(propVec.x, propVec.y, ringRadius, ringRadius, 0, Math.PI * 2, false, 0);
      const ringPoints = ringCurve.getPoints(32).map(p => new THREE.Vector3(p.x, p.y, 1));
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringMat = new THREE.LineBasicMaterial({ color: 0x00D9FF, opacity: 0.6 * pulse, transparent: true });
      scene.add(new THREE.Line(ringGeo, ringMat));

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
    };
  }, [width, height, propertyLat, propertyLng, destinations, showArcs, showRings, projectToScreen]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
}

function hexToRgb(hex: number): string {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `${r},${g},${b}`;
}
