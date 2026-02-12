"use client";

import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIProvider";
import { useState } from "react"; 
import { 
  Package, Truck, LogOut, Map, 
  FileText, Loader2, Lock, User, LogIn, QrCode // QrCode 아이콘
} from "lucide-react";
import QRScannerModal from "@/components/QRScannerModal"; 

export default function DashboardPage() {
  const { profile, loading, signOut, checkPermission } = useAuth();
  const router = useRouter();
  const { alert, toast } = useUI();

  const [showQRModal, setShowQRModal] = useState(false); 

  const ADMIN_CONTACT = "관리자 오승훈 (010-9059-6660)";

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      window.location.href = "/login";
    }
  };

  // 🛡️ 메뉴 클릭 핸들러 (QR 스캔 예외 처리 추가)
  const handleMenuClick = async (menu: any) => {
    // 🚀 QR 스캔 버튼인 경우 모달만 띄우고 종료
    if (menu.key === "qr_scan") {
        setShowQRModal(true);
        return;
    }

    if (!profile) return;

    // 권한 체크
    const hasPermission = checkPermission(menu.key);

    if (!hasPermission) {
      if (profile.role === 'GUEST') {
        await alert(
          `[권한 승인 대기]\n'${menu.title}' 기능은 아직 사용할 수 없습니다.\n관리자 승인 후 이용해 주세요.\n\n문의: ${ADMIN_CONTACT}`,
          "warning"
        );
      } else {
        await alert(
          `[접근 제한]\n'${menu.title}' 기능을 사용할 권한이 없습니다.\n관리자에게 권한 부여를 요청하세요.`,
          "error"
        );
      }
      return;
    }

    router.push(menu.href);
  };

  const handleQRScan = (code: string) => {
      setShowQRModal(false);
      if (!code) return;
      toast.success(`위치 코드 인식: ${code}`);
      router.push(`/inventory?loc=${code}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  // 🚀 메뉴 구성 (QR 스캔 추가)
  const menus = [
    { 
      title: "재고 현황", 
      desc: "실시간 재고 조회", 
      icon: <Package className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/inventory", 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      key: "inventory_view" 
    },
    { 
      title: "창고 맵", 
      desc: "창고 레이아웃 및 위치 조회", 
      icon: <Map className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/location", 
      color: "text-purple-500", 
      bg: "bg-purple-500/10",
      key: "inventory_view" 
    },
    { 
      title: "입고 관리", 
      desc: "입고 예정 및 확정", 
      icon: <Truck className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/inbound", 
      color: "text-green-500", 
      bg: "bg-green-500/10",
      key: "inbound_work" 
    },
    { 
      title: "출고 관리", 
      desc: "출고 지시 및 확정", 
      icon: <LogOut className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/outbound", 
      color: "text-red-500", 
      bg: "bg-red-500/10",
      key: "outbound_work" 
    },
    { 
      title: "수불 이력", 
      desc: "입출고 내역 조회", 
      icon: <FileText className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/history", 
      color: "text-yellow-500", 
      bg: "bg-yellow-500/10",
      key: "inventory_view"
    },
    // 🚀 [추가] QR 스캔 메뉴 버튼
    { 
      title: "QR 스캔", 
      desc: "위치 바코드 인식", 
      icon: <QrCode className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "#", // href는 의미 없음 (위에서 예외 처리)
      color: "text-cyan-400", 
      bg: "bg-cyan-500/10",
      key: "qr_scan" // 특별 키 부여
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 animate-fade-in pb-32">
      
      {/* 👋 환영 배너 (QR 버튼 제거됨 - 메뉴로 이동) */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-10">
        <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-2xl p-5 md:p-8 flex items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>

          <div className="flex items-center gap-3 md:gap-5 w-full md:w-auto">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-900/20 flex items-center justify-center border border-blue-500/30 shrink-0">
              <User className="text-blue-400 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div className="flex-1">
              
              {/* 🔴 [수정] 텍스트 레이아웃 최종판 */}
              <h1 className="text-lg md:text-3xl font-bold text-white mb-2 md:mb-1 leading-tight">
                {/* 🖥️ PC 뷰 */}
                <span className="hidden md:inline">
                  My WMS입니다. 안녕하세요! <span className="text-blue-400">{profile?.user_name || "사용자"}</span>님
                </span>
                
                {/* 📱 Mobile 뷰 (줄바꿈 없이 한 줄에 이름+인사, 다음 줄에 앱 이름) */}
                <div className="md:hidden flex flex-col items-start">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span className="text-blue-400">{profile?.user_name || "사용자"}</span>님 안녕하세요!
                  </div>
                  <div className="mt-0.5 whitespace-nowrap">
                    My WMS입니다.
                  </div>
                </div>
              </h1>

              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 border border-gray-700 truncate max-w-[80px] md:max-w-none">
                  {profile?.department || "소속 미정"}
                </span>
                <span className={`px-1.5 py-0.5 rounded border font-bold ${
                  profile?.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' :
                  profile?.role === 'GUEST' ? 'bg-red-900/30 text-red-400 border-red-500/30' :
                  'bg-blue-900/30 text-blue-400 border-blue-500/30'
                }`}>
                  {profile?.role || "GUEST"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-auto justify-end shrink-0">
            {/* 🔴 [수정] 모바일 로그아웃 버튼 (아이콘만 있는 형태) */}
            <button 
                onClick={handleSignOut}
                className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-5 md:py-3 bg-gray-800 hover:bg-red-900/30 hover:text-red-400 border border-gray-700 rounded-xl transition-all font-bold text-gray-300 shrink-0"
            >
                <LogIn className="w-5 h-5 rotate-180" />
                <span className="hidden md:inline ml-2">로그아웃</span>
            </button>
          </div>

        </div>
      </div>

      {/* 📦 메인 기능 메뉴 그리드 (QR 버튼 포함됨) */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {menus.map((menu) => {
          // QR 스캔 버튼은 권한 체크 예외 (항상 활성화) 또는 'inventory_view' 권한 사용
          // 여기서는 'qr_scan' 키일 때 권한 체크 패스 (누구나 스캔 가능하도록) 
          // 만약 권한 필요하면 checkPermission('inventory_view') 등으로 변경 가능
          const hasPermission = menu.key === 'qr_scan' ? true : checkPermission(menu.key);
          const isLocked = !hasPermission;

          return (
            <div 
              key={menu.title} 
              onClick={() => handleMenuClick(menu)} // 전체 객체 전달
              className="group cursor-pointer relative"
            >
              <div className={`
                h-full bg-gray-900 border border-gray-800 rounded-xl md:rounded-2xl 
                p-4 md:p-6 
                hover:border-gray-600 hover:bg-gray-800/80 transition-all duration-300 shadow-lg
                flex flex-col items-center md:items-start text-center md:text-left justify-center md:justify-between
                ${isLocked ? 'opacity-60 grayscale-[0.5]' : ''}
                ${menu.key === 'qr_scan' ? 'border-cyan-500/30 shadow-cyan-900/10' : ''} 
              `}>
                <div className={`
                  w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl 
                  flex items-center justify-center 
                  mb-2 md:mb-4 
                  ${menu.bg} ${menu.color} 
                  group-hover:scale-110 transition-transform duration-300
                `}>
                  {menu.icon}
                </div>
                
                <div className="w-full">
                    <h3 className="text-sm md:text-xl font-bold text-white mb-0 md:mb-1 group-hover:text-blue-400 transition-colors flex items-center justify-center md:justify-start gap-1 md:gap-2">
                        {menu.title}
                        {isLocked && <Lock className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />}
                    </h3>
                    <p className="hidden md:block text-gray-500 text-sm">{menu.desc}</p>
                </div>
                
                <div className={`hidden md:flex mt-6 items-center text-sm font-bold transition-colors ${isLocked ? 'text-gray-600' : 'text-gray-400 group-hover:text-white'}`}>
                  {isLocked ? "접근 제한됨" : "기능 실행"} 
                  {!isLocked && <span className="ml-1 text-lg transform group-hover:translate-x-1 transition-transform">→</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showQRModal && (
          <QRScannerModal 
            onClose={() => setShowQRModal(false)}
            onScan={handleQRScan}
          />
      )}

    </div>
  );
}