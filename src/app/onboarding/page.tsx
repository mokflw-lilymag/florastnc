"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Building, Store } from 'lucide-react';
import Image from 'next/image';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error('매장명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // Execute the RPC function created on Supabase
      const { error } = await supabase.rpc('create_tenant_for_user', {
        shop_name: shopName.trim()
      });

      if (error) throw error;

      toast.success('환영합니다!', {
        description: '매장 등록이 완료되었습니다. 대시보드로 이동합니다.',
      });
      
      // Refresh the router to reload layout.tsx with new tenant info
      router.refresh();
      // Navigate to dashboard
      router.push('/dashboard');
      
    } catch (error: any) {
      console.error('Onboarding Error:', error);
      toast.error('매장 등록 실패', { 
        description: error.message || '매장을 등록하는 중 문제가 발생했습니다. 관리자에게 문의해주세요.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-400/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-md px-4 z-10">
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-slate-200 dark:ring-slate-800">
          <CardHeader className="space-y-4 pb-4 text-center">
            <div className="mx-auto flex h-16 w-full items-center justify-center p-2 mb-2">
              <Image
                src="https://ecimg.cafe24img.com/pg1472b45444056090/lilymagflower/web/upload/category/logo/v2_d13ecd48bab61a0269fab4ecbe56ce07_lZMUZ1lORo_top.jpg"
                alt="Logo"
                width={200}
                height={50}
                className="w-auto h-12 object-contain"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              환영합니다! 🎉
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              안전하고 원활한 서비스 이용을 위해<br/>
              대표님의 <b>화원 상호명</b>을 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="shop">화원 상호명 (매장명)</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="shop"
                    type="text"
                    placeholder="예: 강남플라워"
                    required
                    maxLength={50}
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="pl-10 h-12 text-base bg-white/50 dark:bg-slate-950/50"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <Button type="submit" className="w-full h-12 text-md font-medium" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 설정 중...</>
                  ) : (
                    '플로라싱크 시작하기'
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-center text-slate-400">
                입력하신 상호명은 나중에 <b>환경설정</b>에서 변경하실 수 있습니다.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
