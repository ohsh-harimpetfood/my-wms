'use client';

export default function LoginBgMobile() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050505]">
      {/* 🖼️ 배경 이미지 (드리프트 애니메이션) */}
      <div
        className="absolute inset-[-10%] opacity-20 will-change-transform"
        style={{
          // 이미지가 있으면 url(...) 사용, 없으면 그라디언트
          backgroundImage: "url('/bg/rack-wireframe.png'), radial-gradient(circle at center, #1a202c 0%, #000000 100%)",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'bgDrift 40s ease-in-out infinite alternate',
        }}
      />
      
      {/* ✨ 노이즈 텍스처 (선택 사항) */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" 
           style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} 
      />

      <style jsx>{`
        @keyframes bgDrift {
          0%   { transform: scale(1.0) translate(0, 0); }
          100% { transform: scale(1.1) translate(-2%, -1%); }
        }
      `}</style>
    </div>
  );
}