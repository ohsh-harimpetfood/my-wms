"use client";

import React, { useState, useEffect } from "react";
import { LocationData } from "./types";
import { ShuttleRackViewPC } from "./ShuttleRackViewPC";
import { ShuttleRackViewMobile } from "./ShuttleRackViewMobile";

interface Props {
  rackName: string;
  locations: LocationData[];
  onInventoryClick: (locId: string) => void;
  onEmptyClick: (rackNo: string, lvl: number, side: string) => void;
}

export const ShuttleRackView = (props: Props) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!mounted) return null; // 하이드레이션 오류 방지

  // 모바일이면 전용 컴포넌트, PC면 PC 전용 컴포넌트 렌더링
  return isMobile ? <ShuttleRackViewMobile {...props} /> : <ShuttleRackViewPC {...props} />;
};