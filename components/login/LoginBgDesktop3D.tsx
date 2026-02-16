'use client';

import { useEffect, useRef } from 'react';

// === 📐 3D 수학 및 타입 ===
type Point3D = { x: number; y: number; z: number };
type Point2D = { x: number; y: number };

type BlueprintLine = {
  p1: Point3D;
  p2: Point3D;
  startProgress: number; // 시작 타이밍
  duration: number;      // 그려지는 시간
  type: 'pillar' | 'beam' | 'brace'; // 선 종류
};

function rotateY(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.z * sin, y: p.y, z: p.x * sin + p.z * cos };
}

function rotateX(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

function project(p: Point3D, w: number, h: number, fov: number): Point2D {
  const scale = fov / (fov + p.z);
  return { x: p.x * scale + w / 2, y: p.y * scale + h / 2 };
}

export default function LoginBgDesktop3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // === 🎨 디자인 설정 ===
    const COLOR_PILLAR = '0, 180, 255'; // 기둥 (Cyan)
    const COLOR_BEAM = '0, 120, 220';   // 빔 (Blue)
    const COLOR_BRACE = '0, 80, 160';   // 지지대 (Deep Blue)
    const COLOR_SPARK = '#ffffff';      // 스파크
    const FOV = 850; 

    const lines: BlueprintLine[] = [];

    // === 🏗️ 리얼 랙(Real Rack) 생성 로직 ===
    
    // 랙 규격 (단위를 조금 줄여서 더 많이 보이게)
    const rackW = 160; 
    const rackD = 70;  
    const tierH = 80;  
    const tiers = 4;   
    const floorY = 300; // 바닥 높이 (위에서 보니까 조금 올림)

    // 레이아웃 (더 넓게 배치)
    const rows = 5; 
    const cols = 6; 
    const aisleGap = 200; 

    // 선 추가 헬퍼
    const addLine = (p1: Point3D, p2: Point3D, type: BlueprintLine['type'], baseDelay: number) => {
      const randomOffset = Math.random() * 0.15;
      lines.push({
        p1, p2, type,
        startProgress: baseDelay + randomOffset,
        duration: 0.1 + Math.random() * 0.1 // 그리는 속도 다양화
      });
    };

    // 랙 1개 베이(Bay) 생성
    const createRackBay = (bx: number, bz: number, delayOffset: number) => {
        const hTotal = tierH * tiers;
        
        // 1. 기둥 (Uprights)
        const corners = [
            { x: bx, y: floorY, z: bz },              
            { x: bx + rackW, y: floorY, z: bz },      
            { x: bx, y: floorY, z: bz + rackD },      
            { x: bx + rackW, y: floorY, z: bz + rackD } 
        ];

        corners.forEach((p) => {
            addLine(
                { ...p }, 
                { ...p, y: floorY - hTotal }, 
                'pillar', 
                delayOffset 
            );
        });

        // 2. 단(Tier)별 빔 & 지지대
        for (let t = 0; t <= tiers; t++) {
            const y = floorY - t * tierH;
            const nextY = y - tierH;
            
            // 빔 (가로/세로)
            addLine({ x: bx, y, z: bz }, { x: bx + rackW, y, z: bz }, 'beam', delayOffset + 0.1 + t * 0.05);
            addLine({ x: bx, y, z: bz + rackD }, { x: bx + rackW, y, z: bz + rackD }, 'beam', delayOffset + 0.1 + t * 0.05);
            addLine({ x: bx, y, z: bz }, { x: bx, y, z: bz + rackD }, 'beam', delayOffset + 0.15 + t * 0.05);
            addLine({ x: bx + rackW, y, z: bz }, { x: bx + rackW, y, z: bz + rackD }, 'beam', delayOffset + 0.15 + t * 0.05);

            // X자 지지대 (Cross Bracing)
            if (t < tiers) {
                // 왼쪽
                if (t % 2 === 0) {
                    addLine({ x: bx, y, z: bz }, { x: bx, y: nextY, z: bz + rackD }, 'brace', delayOffset + 0.3);
                } else {
                    addLine({ x: bx, y, z: bz + rackD }, { x: bx, y: nextY, z: bz }, 'brace', delayOffset + 0.3);
                }
                // 오른쪽
                if (t % 2 === 0) {
                    addLine({ x: bx + rackW, y, z: bz }, { x: bx + rackW, y: nextY, z: bz + rackD }, 'brace', delayOffset + 0.3);
                } else {
                    addLine({ x: bx + rackW, y, z: bz + rackD }, { x: bx + rackW, y: nextY, z: bz }, 'brace', delayOffset + 0.3);
                }
            }
        }
    };

    // 전체 배치 루프
    for (let r = -rows; r <= rows; r++) {
        if (r !== 0 && r % 2 === 0) continue; // 통로
        for (let c = -cols; c <= cols; c++) {
            if (c === 0) continue; // 중앙 통로

            const x = c * (rackW + 10); 
            const z = r * (rackD + aisleGap); 

            // 🚀 [딜레이 로직 변경] 중앙에서 바깥으로 퍼지는 효과
            // 위에서 내려다보니까 중앙이 먼저 생기고 퍼져나가는게 멋짐
            const dist = Math.sqrt(x*x + z*z);
            const delay = dist / 3000; 

            createRackBay(x, z, delay);
        }
    }

    // === 🎬 애니메이션 상태 ===
    let globalTime = 0;
    const animSpeed = 0.003; 
    let rotY = 0;

    const render = () => {
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      const w = canvas.width;
      const h = canvas.height;

      // 배경
      ctx.fillStyle = '#010204';
      ctx.fillRect(0, 0, w, h);

      globalTime += animSpeed;
      if (globalTime > 2.0) globalTime = 2.0;

      rotY += 0.0001; // 아주 느린 회전

      ctx.lineCap = 'round';

      lines.forEach(line => {
        if (globalTime < line.startProgress) return;

        let progress = (globalTime - line.startProgress) / line.duration;
        if (progress > 1) progress = 1;

        // 3D 변환
        let p1 = { ...line.p1 };
        let p2 = { ...line.p2 };

        // 1. Y축 회전 (전체 씬 회전)
        p1 = rotateY(p1, rotY);
        p2 = rotateY(p2, rotY);
        
        // 2. 🚀 [핵심 변경] X축 회전 (High Angle)
        // 양수 값을 주어 카메라가 위로 올라가 아래를 보는 효과 (0.5 ~ 0.8 추천)
        const tilt = 0.55; 
        p1 = rotateX(p1, tilt);
        p2 = rotateX(p2, tilt);

        // 3. 카메라 거리 및 높이 조정
        // 내려다보는 각도에서는 물체가 화면 아래로 쳐질 수 있으므로 y를 살짝 올림
        p1.y += 100; 
        p2.y += 100;
        
        p1.z += 1500; // 줌 아웃
        p2.z += 1500;

        if (p1.z <= 10 || p2.z <= 10) return;

        const proj1 = project(p1, w, h, FOV);
        const proj2 = project(p2, w, h, FOV);

        // 현재 그려지는 끝점
        const curX = proj1.x + (proj2.x - proj1.x) * progress;
        const curY = proj1.y + (proj2.y - proj1.y) * progress;

        // Fog (멀수록 흐림)
        const depth = (p1.z + p2.z) / 2;
        const fog = Math.max(0, 1 - depth / 4500);

        // 스타일링
        let color = COLOR_BEAM;
        let lineWidth = 1;
        let alpha = fog;

        if (line.type === 'pillar') {
            color = COLOR_PILLAR;
            lineWidth = 1.2;
            alpha = fog * 0.8;
        } else if (line.type === 'brace') {
            color = COLOR_BRACE;
            lineWidth = 0.6;
            alpha = fog * 0.4;
        }

        // 그리기
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color}, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(proj1.x, proj1.y);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        // ✨ 스파크 (Spark)
        if (progress < 1.0) {
            ctx.shadowBlur = 5;
            ctx.shadowColor = COLOR_SPARK;
            ctx.fillStyle = COLOR_SPARK;
            ctx.beginPath();
            ctx.arc(curX, curY, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // 조인트 (완료 시점)
        if (progress >= 1 && line.type === 'pillar') {
             ctx.fillStyle = `rgba(${COLOR_PILLAR}, ${fog * 0.4})`;
             ctx.fillRect(curX - 1, curY - 1, 2, 2);
        }
      });

      requestAnimationFrame(render);
    };

    const raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}