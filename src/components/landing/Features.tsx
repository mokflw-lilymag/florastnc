'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { Terminal, Sparkles } from 'lucide-react';
import { LANDING_FEATURES } from '@/data/landing-features';
import { FeatureCardIcon, featureAccentIconClass } from '@/components/landing/feature-visual';

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
          {LANDING_FEATURES.map((feature, idx) => (
            <Link key={feature.slug} href={`/features/${feature.slug}`} className="block h-full group/card">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * (idx + 1), duration: 0.5 }}
                whileHover={{ y: -10 }}
                className="h-full bg-white/[0.02] p-10 rounded-[35px] border border-white/5 shadow-sm hover:shadow-emerald-500/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 rounded-[20px] bg-black/40 flex items-center justify-center mb-8 border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                    <FeatureCardIcon
                      slug={feature.slug}
                      className={`w-6 h-6 ${featureAccentIconClass[feature.accent]}`}
                    />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4 group-hover:text-emerald-400 transition-colors tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 leading-relaxed font-medium flex-1">{feature.description}</p>
                  <p className="mt-8 text-sm font-black text-emerald-500/90 uppercase tracking-widest opacity-0 group-hover/card:opacity-100 transition-opacity">
                    자세히 보기 →
                  </p>
                </div>

                <Terminal className="absolute -bottom-4 -right-4 w-12 h-12 text-white/5 group-hover:text-emerald-500/10 transition-colors pointer-events-none" />
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


