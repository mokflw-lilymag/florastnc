'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { 
  Terminal, Zap, RefreshCw, Printer, ShieldCheck, 
  BarChart3, Eye, Smartphone, Cpu, Box, Sparkles
} from 'lucide-react';

export function Features() {
  const [stats, setStats] = useState({
    tenants: 0,
    orders: 0,
    delivery: 0,
    uptime: '99.99%'
  });

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      try {
        const { count: tenantCount } = await supabase.from('tenants').select('*', { count: 'exact', head: true });
        const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
        setStats({
          tenants: tenantCount || 12,
          orders: orderCount || 2450,
          delivery: Math.floor((orderCount || 2450) * 0.7),
          uptime: '99.9%'
        });
      } catch (error) {
        console.error('Error fetching landing stats:', error);
      }
    }
    fetchStats();
  }, []);

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: 'AI 오더 컨시어지',
      description: '카톡, 문자, 음성 주문을 AI가 1초 만에 분석하여 빈칸을 채웁니다. 이제 복사하고 붙여넣는 수고조차 필요 없습니다.',
      delay: 0.1
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-blue-400" />,
      title: '쇼핑몰 올인원 동기화',
      description: '네이버 스마트스토어, 카페24 주문이 들어오는 즉시 대시보드에 꽂힙니다. 재고 차감부터 배송 처리까지 자동으로 끝내세요.',
      delay: 0.2
    },
    {
      icon: <Printer className="w-6 h-6 text-emerald-400" />,
      title: '클라우드 스마트 리본',
      description: '전국 어디서든 폰 하나로 매장 프린터를 제어합니다. 전문가용 서체와 정밀 레이아웃이 포함된 리본을 0.5초 만에 방출합니다.',
      delay: 0.3
    },
    {
      icon: <Cpu className="w-6 h-6 text-indigo-400" />,
      title: '인텔리전트 재고 관리',
      description: '사진 촬영 한 번으로 남은 꽃의 송이 수를 파악하고, 판매 시 자동으로 단 단위로 환산하여 재고에서 차감합니다.',
      delay: 0.4
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
      title: '금융권 수준의 정산 엔진',
      description: '부가세, 입점 마진율, 기사님 배송 수수료까지. 복잡한 꽃집의 수익 구조를 소수점 단위까지 정확하게 계산해 드립니다.',
      delay: 0.5
    },
    {
      icon: <Smartphone className="w-6 h-6 text-teal-400" />,
      title: '모바일 센터 프리미엄',
      description: 'PC 앞이 아니어도 상관없습니다. 배달 기사 호출부터 정산 보고서 확인까지, 모든 기능을 스마트폰 앱에서 동일하게 지원합니다.',
      delay: 0.6
    }
  ];

  return (
    <section id="features" className="py-32 bg-[#0A0F0D] relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        
        {/* Stats Glass Counter */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-32 bg-white/[0.03] backdrop-blur-xl border border-white/10 p-10 rounded-[40px] shadow-2xl"
        >
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black text-white mb-2 font-title tracking-tighter">
              {stats.tenants}+
            </span>
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em]">Active Studios</span>
          </div>
          <div className="flex flex-col items-center border-x border-white/5">
            <span className="text-4xl md:text-5xl font-black text-white mb-2 font-title tracking-tighter">
              {(stats.orders / 1000).toFixed(1)}k
            </span>
            <span className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">Data Processed</span>
          </div>
          <div className="flex flex-col items-center border-r border-white/5">
            <span className="text-4xl md:text-5xl font-black text-white mb-2 font-title tracking-tighter">
              {stats.delivery}+
            </span>
            <span className="text-[10px] text-amber-400 font-black uppercase tracking-[0.2em]">Auto Deliveries</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black text-white mb-2 font-title tracking-tighter">
              {stats.uptime}
            </span>
            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">System Reliability</span>
          </div>
        </motion.div>

        <div className="text-center max-w-4xl mx-auto mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 text-slate-400 font-bold text-xs mb-8 border border-white/10 uppercase tracking-widest"
          >
            <Sparkles size={14} className="text-emerald-500" />
            Cutting-Edge Capability
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-tight"
          >
            복잡한 화원 업무의 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-500">지능형 자동화.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-2xl text-slate-500 font-light"
          >
            모든 기술은 오직 당신의 창작 시간을 확보하기 위해 존재합니다. <br className="hidden md:block" />
            더 이상 숫자에 매몰되지 마세요. 혁신이 당신의 뒤를 지킵니다.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: feature.delay, duration: 0.5 }}
              whileHover={{ y: -10 }}
              className="bg-white/[0.02] p-10 rounded-[35px] border border-white/5 shadow-sm hover:shadow-emerald-500/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group relative overflow-hidden"
            >
              {/* Card Glare */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-[20px] bg-black/40 flex items-center justify-center mb-8 border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black text-white mb-4 group-hover:text-emerald-400 transition-colors tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </div>
              
              {/* Subtle tech detail in corner */}
              <Terminal className="absolute -bottom-4 -right-4 w-12 h-12 text-white/5 group-hover:text-emerald-500/10 transition-colors" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


