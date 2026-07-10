"use client";

import { useEffect, useState } from "react";
import { Lock, WifiOff } from "lucide-react";
import { isElectron } from "@/utils/is-electron";

export function OfflineLockGuard() {
  const [locked, setLocked] = useState(false);
  const [hoursOffline, setHoursOffline] = useState(0);

  useEffect(() => {
    if (!isElectron()) return;

    const checkLock = async () => {
      try {
        const api = (window as any).electronAPI;
        if (api?.checkOfflineLock) {
          const res = await api.checkOfflineLock();
          if (res?.locked) {
            setLocked(true);
            setHoursOffline(Math.floor(res.hoursOffline));
          } else {
            setLocked(false);
          }
        }
      } catch (err) {
        console.error("Failed to check offline lock:", err);
      }
    };

    // Check immediately, then every 1 minute
    checkLock();
    const interval = setInterval(checkLock, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-300">
      <WifiOff className="w-24 h-24 text-red-500 mb-8 animate-pulse" />
      <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
        <Lock className="w-10 h-10" /> 앱 사용이 일시적으로 제한되었습니다
      </h1>
      <p className="text-xl text-zinc-300 text-center max-w-2xl leading-relaxed mb-6">
        인터넷이 연결되지 않은 상태로 <strong>72시간</strong>이 초과되어 보안상 앱이 잠겼습니다.<br/>
        (현재 오프라인 시간: {hoursOffline}시간 경과)
      </p>
      <div className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700 max-w-xl text-center shadow-xl">
        <p className="text-lg text-zinc-200">
          <strong>안내:</strong> 현재까지 입력하신 오프라인 데이터는 <strong>안전하게 보존</strong>되어 있습니다.<br/><br/>
          PC에 <strong>인터넷(랜선 또는 와이파이)을 연결</strong>하시면<br/>즉시 데이터가 클라우드로 동기화되며 잠금이 자동으로 해제됩니다.
        </p>
      </div>
    </div>
  );
}
