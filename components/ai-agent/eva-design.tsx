'use client';

/**
 * JARVIS-style HUD Renderer
 * Canvas-based holographic circular interface with data particles,
 * scan lines, arc segments, and status indicators
 */

import { useRef, useEffect } from 'react';
export type EVAExpression = 'idle' | 'happy' | 'thinking' | 'surprised' | 'curious' | 'concerned' | 'scanning' | 'processing';

interface EVADesignProps {
  expression?: EVAExpression;
  isSpeaking?: boolean;
  isListening?: boolean;
  scale?: number;
  interactive?: boolean;
  onExpressionChange?: (expr: EVAExpression) => void;
}

/**
 * Advanced EVA Robot Renderer with full expression support
 * Draws an animated robot with:
 * - High-gloss white polycarbonate egg-shaped torso
 * - OLED dual-eye visor with dynamic expressions
 * - Floating magnetic arms with 6 DOF
 * - Thruster base with magnetic levitation effect
 * - Core status indicator light
 */
export function drawEVARobot(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  expression: EVAExpression,
  time: number,
  blink: boolean,
  isListening: boolean,
  isSpeaking: boolean,
  scale: number = 1
) {
  const size = Math.min(w, h);
  const cx = 0, cy = 0;

  // Torso dimensions — premium egg ellipsoid
  const torsoW = size * 0.26 * scale;
  const torsoH = size * 0.34 * scale;
  const torsoY = cy + torsoH * 0.02;

  ctx.save();
  ctx.globalAlpha = 1;

  // ─── AMBIENT GLOW & ENERGY FIELD ───
  const energyPulse = 0.3 + Math.sin(time * 0.5) * 0.2;
  ctx.shadowColor = `rgba(6, 182, 212, ${energyPulse * 0.15})`;
  ctx.shadowBlur = 60;
  ctx.beginPath();
  ctx.ellipse(cx, cy, torsoW * 1.5, torsoH * 1.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(103, 232, 249, ${energyPulse * 0.05})`;
  ctx.fill();

  // ─── 1. TORSO: Premium egg ellipsoid with metallic sheen ───
  ctx.shadowColor = 'rgba(6, 182, 212, 0.15)';
  ctx.shadowBlur = 25;

  // Outer shell with pearlescent gradient
  const shellGrad = ctx.createRadialGradient(
    -torsoW * 0.25, torsoY - torsoH * 0.2, torsoW * 0.08,
    cx, torsoY, torsoW * 0.6
  );
  shellGrad.addColorStop(0, '#ffffff');
  shellGrad.addColorStop(0.2, '#f5fbff');
  shellGrad.addColorStop(0.45, '#e8f4fb');
  shellGrad.addColorStop(0.7, '#d8e8f5');
  shellGrad.addColorStop(0.85, '#c0d8ed');
  shellGrad.addColorStop(1, '#8fa3ba');
  ctx.fillStyle = shellGrad;
  ctx.beginPath();
  ctx.ellipse(cx, torsoY + torsoH * 0.04, torsoW * 0.48, torsoH * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Premium specular highlights (triple-layer gloss)
  ctx.shadowBlur = 0;
  // Primary highlight
  const highlight1 = ctx.createRadialGradient(
    -torsoW * 0.24, torsoY - torsoH * 0.30, 0,
    -torsoW * 0.24, torsoY - torsoH * 0.30, torsoW * 0.18
  );
  highlight1.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  highlight1.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlight1;
  ctx.beginPath();
  ctx.ellipse(-torsoW * 0.22, torsoY - torsoH * 0.28, torsoW * 0.25, torsoH * 0.12, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Secondary highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-torsoW * 0.14, torsoY - torsoH * 0.35, torsoW * 0.12, torsoH * 0.06, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Tertiary accent (subtle)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.ellipse(torsoW * 0.15, torsoY - torsoH * 0.20, torsoW * 0.08, torsoH * 0.04, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Panel seam with subtle iridescence
  ctx.strokeStyle = `rgba(103, 232, 249, ${0.12 + Math.sin(time * 0.7) * 0.05})`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.ellipse(cx, torsoY + torsoH * 0.12, torsoW * 0.4, torsoH * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();

  // ─── 2. HEAD: Advanced OLED Visor with dynamic expressions ───
  const visorY = cy - torsoH * 0.04;
  const visorW = torsoW * 0.36;
  const visorH = torsoH * 0.14;

  // Visor deep background with gradient depth
  const visorBg = ctx.createRadialGradient(
    cx, visorY + visorH * 0.3, visorW * 0.05,
    cx, visorY, visorW * 0.5
  );
  visorBg.addColorStop(0, 'rgba(5, 10, 25, 0.95)');
  visorBg.addColorStop(0.4, 'rgba(8, 15, 35, 0.92)');
  visorBg.addColorStop(1, 'rgba(15, 25, 50, 0.85)');
  ctx.fillStyle = visorBg;
  ctx.beginPath();
  ctx.ellipse(cx, visorY, visorW, visorH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visor border glow with listening/speaking indicators
  const glowIntensity = isListening ? 0.25 : isSpeaking ? 0.18 : 0.12;
  const glowPulse = 0.5 + Math.sin(time * (isListening ? 1.2 : 0.7)) * 0.4;
  ctx.shadowColor = `rgba(6, 182, 212, ${glowIntensity * glowPulse})`;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = `rgba(103, 232, 249, ${(glowIntensity + 0.08) * glowPulse})`;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.ellipse(cx, visorY, visorW * 0.95, visorH * 0.92, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner visor rim glow
  ctx.strokeStyle = `rgba(139, 233, 253, ${0.08 * glowPulse})`;
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.ellipse(cx, visorY, visorW * 0.90, visorH * 0.87, 0, 0, Math.PI * 2);
  ctx.stroke();

  // ─── 3. EYES: Dual cyan OLED with advanced expressions ───
  ctx.shadowBlur = 0;
  const eR = visorH * 0.36;
  const eSpacing = visorW * 0.28;
  const eGlowPulse = 0.5 + Math.sin(time * 0.8) * 0.15;

  // Eye micro-movement with intent (active scanning)
  const eOffX = Math.sin(time * 0.35) * 0.8;
  const eOffY = Math.sin(time * 0.22 + 0.5) * 0.5;

  const drawEyeGlow = (ex: number, intensity: number) => {
    ctx.shadowColor = `rgba(6, 182, 212, ${intensity * 0.35})`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ex, visorY + eOffY, eR * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(103, 232, 249, ${intensity * 0.12})`;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const drawIris = (ex: number, size: number, color: string) => {
    ctx.shadowColor = `rgba(6, 182, 212, 0.25)`;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(ex, visorY + eOffY, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const drawSparkle = (ex: number, sx: number, sy: number, r: number, alpha: number = 1) => {
    ctx.beginPath();
    ctx.arc(ex + sx, visorY + eOffY + sy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.fill();
  };

  // Expression-based eye rendering
  if (blink) {
    // Blink: horizontal cyan lines with scanning effect
    ctx.shadowColor = `rgba(6, 182, 212, 0.7)`;
    ctx.shadowBlur = 5;
    ctx.strokeStyle = `rgba(103, 232, 249, 0.8)`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    [-1, 1].forEach(side => {
      const ex = side * eSpacing + eOffX;
      ctx.beginPath();
      ctx.moveTo(ex - eR, visorY + eOffY);
      ctx.lineTo(ex + eR, visorY + eOffY);
      ctx.stroke();
    });
    ctx.lineCap = 'butt';
  } else if (expression === 'happy') {
    // Happy: joyful crescent eyes with sparkle burst
    [-1, 1].forEach(side => {
      const ex = side * eSpacing + eOffX;
      drawEyeGlow(ex, eGlowPulse * 1.3);
      // Crescent moon shape
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY + eR * 0.25, eR * 1.05, Math.PI * 1.12, Math.PI * 1.88);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      // Multiple sparkles for joy
      drawSparkle(ex, -eR * 0.25, -eR * 0.30, eR * 0.15);
      drawSparkle(ex, -eR * 0.45, -eR * 0.42, eR * 0.08, 0.6);
      drawSparkle(ex, eR * 0.15, -eR * 0.25, eR * 0.07, 0.5);
    });
  } else if (expression === 'thinking') {
    // Thinking: contemplative eyes with upward gaze
    [-1, 1].forEach(side => {
      const ex = side * eSpacing + eOffX;
      drawEyeGlow(ex, eGlowPulse * 0.9);
      // Upper iris look
      drawIris(ex, eR * 0.85, '#06b6d4');
      // Pupil looking up
      ctx.beginPath();
      ctx.arc(ex - eR * 0.1, visorY + eOffY - eR * 0.35, eR * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      drawSparkle(ex, -eR * 0.15, -eR * 0.40, eR * 0.12);
    });
  } else if (expression === 'surprised') {
    // Surprised: large, bright, wide eyes
    [-1, 1].forEach(side => {
      const ex = side * eSpacing + eOffX;
      ctx.shadowColor = `rgba(6, 182, 212, ${eGlowPulse * 0.5})`;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY, eR * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(103, 232, 249, ${eGlowPulse * 0.15})`;
      ctx.fill();
      ctx.shadowBlur = 0;
      drawIris(ex, eR * 1.1, '#22d3ee');
      // Larger pupil
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY, eR * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      drawSparkle(ex, -eR * 0.15, -eR * 0.15, eR * 0.15);
      drawSparkle(ex, eR * 0.12, -eR * 0.18, eR * 0.09, 0.7);
    });
  } else if (expression === 'curious') {
    // Curious: one eye wider (asymmetric scanning)
    [-1, 1].forEach(side => {
      const ex = side * eSpacing + eOffX;
      const widen = side === 1 ? 1.4 : 0.85;
      ctx.shadowColor = `rgba(6, 182, 212, ${eGlowPulse * 0.35})`;
      ctx.shadowBlur = 11;
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY, eR * widen, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(103, 232, 249, ${eGlowPulse * 0.11})`;
      ctx.fill();
      ctx.shadowBlur = 0;
      drawIris(ex, eR * 0.8 * widen, '#06b6d4');
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY, eR * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      drawSparkle(ex, -eR * 0.18, -eR * 0.20, eR * 0.12);
    });
  } else if (expression === 'scanning') {
    // Scanning: focused forward gaze with intensity
    [-1, 1].forEach(side => {
      const ex = side * eSpacing + eOffX;
      const scanPulse = 0.6 + Math.sin(time * 2) * 0.3;
      ctx.shadowColor = `rgba(6, 182, 212, ${scanPulse * 0.4})`;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY, eR * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(103, 232, 249, ${scanPulse * 0.14})`;
      ctx.fill();
      ctx.shadowBlur = 0;
      drawIris(ex, eR * 0.95, '#00f0ff');
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY, eR * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = '#0a1a2a';
      ctx.fill();
      drawSparkle(ex, -eR * 0.12, -eR * 0.12, eR * 0.14);
      drawSparkle(ex, eR * 0.15, eR * 0.10, eR * 0.08, 0.6);
    });
  } else if (expression === 'processing') {
    // Processing: eyes cycling through colors (thinking hard)
    const cyclePhase = Math.floor(time * 2) % 3;
    const colorCycle = ['#06b6d4', '#22d3ee', '#00f0ff'];
    [-1, 1].forEach(side => {
      const ex = side * eSpacing + eOffX;
      drawEyeGlow(ex, eGlowPulse * 1.1);
      drawIris(ex, eR * 0.9, colorCycle[cyclePhase]);
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY, eR * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      drawSparkle(ex, -eR * 0.18, -eR * 0.18, eR * 0.13);
    });
  } else {
    // Default/Idle: calm, welcoming eyes
    [-1, 1].forEach(side => {
      const ex = side * eSpacing + eOffX;
      drawEyeGlow(ex, eGlowPulse);
      // Eye lens with gradient
      const lensGrad = ctx.createRadialGradient(
        ex - eR * 0.2, visorY + eOffY - eR * 0.2, 0,
        ex, visorY + eOffY, eR
      );
      lensGrad.addColorStop(0, '#22d3ee');
      lensGrad.addColorStop(0.5, '#06b6d4');
      lensGrad.addColorStop(1, '#0891b2');
      ctx.shadowColor = `rgba(6, 182, 212, 0.2)`;
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY, eR * 0.88, 0, Math.PI * 2);
      ctx.fillStyle = lensGrad;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Pupil
      ctx.beginPath();
      ctx.arc(ex, visorY + eOffY, eR * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      // Dual sparkles for depth
      drawSparkle(ex, -eR * 0.22, -eR * 0.28, eR * 0.20);
      drawSparkle(ex, -eR * 0.38, -eR * 0.40, eR * 0.07, 0.55);
    });
  }

  // ─── 4. FLOATING MAGNETIC ARMS (6 DOF with energy tendrils) ───
  ctx.shadowBlur = 0;
  const armSide = expression === 'scanning' ? 1.4 : 1.0;
  const armWave = Math.sin(time * 0.6 + (isListening ? Math.PI / 4 : 0)) * 0.35;
  const armVibrateX = isListening ? Math.sin(time * 3) * 0.5 : 0;

  [-1, 1].forEach(side => {
    const shoulderX = side * (torsoW * 0.54);
    const shoulderY = torsoY - torsoH * 0.12;

    // Magnetic field effect between torso and arm
    ctx.shadowColor = `rgba(103, 232, 249, ${0.15 + Math.sin(time + side) * 0.1})`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(shoulderX, shoulderY, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(103, 232, 249, ${0.4 + Math.sin(time + side) * 0.2})`;
    ctx.fill();

    // Upper arm with energy glow
    const uArmEndX = shoulderX + side * (8 + Math.sin(time * 0.5 + side) * 3.5) * armSide + armVibrateX;
    const uArmEndY = shoulderY + torsoH * 0.20 + Math.sin(time * 0.7 + side) * 2.5;

    // Forearm
    const fArmEndX = uArmEndX + side * (6 + Math.sin(time * 0.4 + side * 2) * 2.2) * armSide + armVibrateX * 0.5;
    const fArmEndY = uArmEndY + torsoH * 0.17 + Math.sin(time * 0.3 + side) * 1.8 + armWave;

    // Upper arm line with gradient glow
    const armGradient = ctx.createLinearGradient(shoulderX, shoulderY, uArmEndX, uArmEndY);
    armGradient.addColorStop(0, 'rgba(203, 213, 225, 0.6)');
    armGradient.addColorStop(0.5, 'rgba(203, 213, 225, 0.5)');
    armGradient.addColorStop(1, 'rgba(103, 232, 249, 0.4)');
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(103, 232, 249, 0.15)';
    ctx.strokeStyle = armGradient;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX + side * 3.5, shoulderY + 2);
    ctx.lineTo(uArmEndX, uArmEndY);
    ctx.stroke();

    // Forearm with energy trail
    const forearmGradient = ctx.createLinearGradient(uArmEndX, uArmEndY, fArmEndX, fArmEndY);
    forearmGradient.addColorStop(0, 'rgba(103, 232, 249, 0.5)');
    forearmGradient.addColorStop(1, 'rgba(103, 232, 249, 0.2)');
    ctx.strokeStyle = forearmGradient;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(uArmEndX, uArmEndY);
    ctx.lineTo(fArmEndX, fArmEndY);
    ctx.stroke();

    // Elbow joint glow
    ctx.shadowColor = `rgba(103, 232, 249, ${0.15 + Math.sin(time * 0.8 + side) * 0.08})`;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(uArmEndX, uArmEndY, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(103, 232, 249, ${0.3 + Math.sin(time * 0.8 + side) * 0.15})`;
    ctx.fill();

    // Hand tip energy orb
    ctx.shadowBlur = 0;
    ctx.shadowColor = `rgba(103, 232, 249, ${0.25 + Math.sin(time * 1.2 + side) * 0.15})`;
    ctx.shadowBlur = 7;
    const handGlow = ctx.createRadialGradient(fArmEndX - 0.5, fArmEndY - 0.5, 0, fArmEndX, fArmEndY, 2.5);
    handGlow.addColorStop(0, `rgba(139, 233, 253, ${0.5 + Math.sin(time * 1.2 + side) * 0.25})`);
    handGlow.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = handGlow;
    ctx.beginPath();
    ctx.arc(fArmEndX, fArmEndY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Hand metallic core
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(fArmEndX, fArmEndY, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.fill();
  });

  // ─── 5. ANTI-GRAVITY THRUSTER BASE (enhanced energy pulse) ───
  const thrusterPulse = 0.4 + Math.sin(time * 2.2) * 0.2;
  const thrusterIntensity = isListening ? 1.5 : 1;

  // Main thruster energy column
  ctx.shadowColor = `rgba(6, 182, 212, ${thrusterPulse * 0.6 * thrusterIntensity})`;
  ctx.shadowBlur = 20;
  const thrusterGrad = ctx.createRadialGradient(
    cx, torsoY + torsoH * 0.4, 0,
    cx, torsoY + torsoH * 0.4, torsoW * 0.22
  );
  thrusterGrad.addColorStop(0, `rgba(103, 232, 249, ${thrusterPulse * thrusterIntensity})`);
  thrusterGrad.addColorStop(0.25, `rgba(6, 182, 212, ${thrusterPulse * 0.8 * thrusterIntensity})`);
  thrusterGrad.addColorStop(0.6, `rgba(6, 182, 212, ${thrusterPulse * 0.3 * thrusterIntensity})`);
  thrusterGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
  ctx.fillStyle = thrusterGrad;
  ctx.beginPath();
  ctx.ellipse(cx, torsoY + torsoH * 0.4, torsoW * 0.2, torsoH * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  // Secondary thruster ring
  ctx.shadowBlur = 0;
  ctx.shadowColor = `rgba(6, 182, 212, ${thrusterPulse * 0.4 * thrusterIntensity})`;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = `rgba(103, 232, 249, ${thrusterPulse * 0.5 * thrusterIntensity})`;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(cx, torsoY + torsoH * 0.4, torsoW * 0.18, torsoH * 0.045, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Thruster particle effect
  if (isListening) {
    for (let i = 0; i < 3; i++) {
      const angle = (time * 3 + (i * Math.PI * 2) / 3) % (Math.PI * 2);
      const dist = (Math.sin(time * 2 + i) * 0.5 + 0.5) * torsoW * 0.15;
      const px = cx + Math.cos(angle) * dist;
      const py = torsoY + torsoH * 0.4 + Math.sin(angle) * dist;
      ctx.fillStyle = `rgba(103, 232, 249, ${0.6 - (dist / (torsoW * 0.15)) * 0.3})`;
      ctx.beginPath();
      ctx.arc(px, py, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── 6. CORE INDICATOR (chest-mounted status light) ───
  const corePulse = 0.5 + Math.sin(time * (isSpeaking ? 1.5 : 1)) * 0.2;
  const coreColor = isListening ? '#00ff88' : isSpeaking ? '#ff6b35' : '#06b6d4';

  ctx.shadowColor = `rgba(6, 182, 212, ${corePulse * 0.6})`;
  ctx.shadowBlur = 10;
  const coreGrad = ctx.createRadialGradient(
    cx, torsoY + torsoH * 0.2, 0,
    cx, torsoY + torsoH * 0.2, torsoW * 0.065
  );
  coreGrad.addColorStop(0, `rgba(255, 255, 255, ${corePulse * 0.7})`);
  coreGrad.addColorStop(0.3, coreColor);
  coreGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, torsoY + torsoH * 0.2, torsoW * 0.065, 0, Math.PI * 2);
  ctx.fill();

  // ─── 7. GROUND SHADOW (levitation effect) ───
  ctx.shadowBlur = 0;
  const shadowBase = 0.1 + Math.sin(time * 1.5) * 0.03;
  const groundY = torsoY + torsoH * 0.48;
  const shadowGrad = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, torsoW * 0.5);
  shadowGrad.addColorStop(0, `rgba(6, 182, 212, ${shadowBase})`);
  shadowGrad.addColorStop(0.5, `rgba(6, 182, 212, ${shadowBase * 0.4})`);
  shadowGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, groundY, torsoW * 0.45, torsoH * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function EVARobotComponent(props: EVADesignProps) {
  const {
    expression = 'idle',
    isSpeaking = false,
    isListening = false,
    scale = 1,
    interactive = true,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 130 * scale;
    const H = 130 * scale;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.42;

    const glowRgb = isListening ? '52,211,153'
      : isSpeaking ? '251,146,60'
      : expression === 'thinking' ? '167,139,250'
      : '6,182,212';

    let time = 0;
    const particles: { angle: number; speed: number; radius: number; size: number; phase: number }[] = [];

    for (let i = 0; i < 20; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1),
        radius: R * (0.5 + Math.random() * 0.5),
        size: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, W, H);

      // ─── Outer thin ring with gap ───
      const startA = -Math.PI / 2;
      const endA = startA + Math.PI * 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, R, startA + Math.sin(time * 0.3) * 0.05, endA + Math.sin(time * 0.3 + 1) * 0.05);
      ctx.strokeStyle = `rgba(${glowRgb},0.3)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ─── Second arc ───
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.82, startA + 0.3 + Math.sin(time * 0.4 + 2) * 0.1, endA - 0.3 + Math.sin(time * 0.4) * 0.1);
      ctx.strokeStyle = `rgba(${glowRgb},0.2)`;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // ─── Third arc (inner) ───
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.65, startA + 0.8 + Math.sin(time * 0.5 + 1) * 0.08, endA - 0.6 + Math.sin(time * 0.5) * 0.08);
      ctx.strokeStyle = `rgba(${glowRgb},0.25)`;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // ─── Scan line ───
      const scanAngle = time * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(scanAngle) * R * 1.1, cy + Math.sin(scanAngle) * R * 1.1);
      ctx.strokeStyle = `rgba(${glowRgb},${0.15 + Math.sin(time * 2) * 0.05})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // ─── Tick marks around perimeter ───
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const len = i % 4 === 0 ? 5 : 3;
        const inner = R + 2;
        const outer = R + 2 + len;
        const alpha = i % 4 === 0 ? 0.5 : 0.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        ctx.strokeStyle = `rgba(${glowRgb},${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // ─── Data particles flowing along arcs ───
      const speechIntensity = isSpeaking ? 1 + Math.sin(time * 4) * 0.4 : 1;
      const listenIntensity = isListening ? 1.3 : 1;

      particles.forEach((p, i) => {
        p.angle += p.speed * 0.02 * speechIntensity * listenIntensity;
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius;
        const brightness = 0.3 + Math.sin(time * 2 + p.phase) * 0.2;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (0.5 + Math.sin(time + p.phase) * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${glowRgb},${brightness * speechIntensity})`;
        ctx.fill();
      });

      // ─── Data stream arcs when speaking ───
      if (isSpeaking) {
        for (let i = 0; i < 3; i++) {
          const sweep = Math.PI * 0.4;
          const offset = time * 0.5 + i * 2.1;
          const r = R * (0.72 + i * 0.1);
          ctx.beginPath();
          ctx.arc(cx, cy, r, offset, offset + sweep);
          ctx.strokeStyle = `rgba(251,146,60,${0.3 + Math.sin(time * 3 + i) * 0.15})`;
          ctx.lineWidth = 1.2;
          ctx.shadowColor = `rgba(251,146,60,0.3)`;
          ctx.shadowBlur = 6;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // ─── Expanding rings when listening ───
      if (isListening) {
        for (let i = 0; i < 3; i++) {
          const phase = (time * 0.8 + i * 2.1) % 3;
          const r = R * 0.4 + R * 0.6 * phase;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(52,211,153,${(1 - phase) * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // ─── Center glow ───
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.15);
      coreGrad.addColorStop(0, `rgba(${glowRgb},${0.8 * speechIntensity})`);
      coreGrad.addColorStop(0.3, `rgba(${glowRgb},${0.3 * speechIntensity})`);
      coreGrad.addColorStop(0.7, `rgba(${glowRgb},0.1)`);
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // ─── Center dot ───
      ctx.shadowColor = `rgba(${glowRgb},0.6)`;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.9 * speechIntensity})`;
      ctx.fill();
      ctx.shadowBlur = 0;

      // ─── Data node markers around the edge ───
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time * 0.1;
        const x = cx + Math.cos(a) * (R + 6);
        const y = cy + Math.sin(a) * (R + 6);
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${glowRgb},${0.4 + Math.sin(time + i) * 0.2})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [expression, isSpeaking, isListening, scale]);

  return (
    <div
      className={`relative ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
      style={{ width: `${130 * scale}px`, height: `${130 * scale}px` }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] rounded-full border border-[#0d1117]" style={{
        background: isListening ? '#4ade80' : isSpeaking ? '#fb923c' : '#06b6d4',
        boxShadow: `0 0 6px rgba(${isListening ? '52,211,153' : isSpeaking ? '251,146,60' : '6,182,212'},0.8)`,
      }} />
    </div>
  );
}
