import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { PackageSearch, CalendarCheck, MapPin, Search } from "lucide-react";

export function DeliveryStatusBadge({ status, provider }: { status?: string, provider?: string }) {
  if (!status) return null;
  
  // 상태 뱃지 매핑
  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: '배차 요청 중', color: 'bg-yellow-100 text-yellow-700', icon: Search },
    assigned: { label: '배차 완료', color: 'bg-blue-100 text-blue-700', icon: CalendarCheck },
    picked_up: { label: '픽업/배송 중', color: 'bg-indigo-100 text-indigo-700', icon: MapPin },
    delivered: { label: '배송 완료', color: 'bg-emerald-100 text-emerald-700', icon: PackageSearch },
    failed: { label: '배차/배송 실패', color: 'bg-rose-100 text-rose-700', icon: PackageSearch },
    cancelled: { label: '배차 취소됨', color: 'bg-gray-100 text-gray-500', icon: Search },
  };

  const conf = statusConfig[status] || { label: status, color: 'bg-gray-100', icon: PackageSearch };
  const Icon = conf.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Badge variant="outline" className={`gap-1.5 border-transparent font-medium ${conf.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {provider === 'kakao_t' ? '카카오T ' : ''}{conf.label}
      </Badge>
    </motion.div>
  );
}
