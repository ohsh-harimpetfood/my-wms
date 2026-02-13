// utils/format.ts

export const formatToKST = (dateString: string | null | undefined) => {
  if (!dateString) return "-";

  const date = new Date(dateString);

  // Intl.DateTimeFormat을 사용하여 강제로 'Asia/Seoul' 타임존 적용
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // 24시간제 (오전/오후 필요하면 true)
  }).format(date);
};