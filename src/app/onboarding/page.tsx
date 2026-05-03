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
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { toBaseLocale } from '@/i18n/config';
import { pickUiText } from '@/i18n/pick-ui-text';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error(
        tr('매장명을 입력해주세요.', 'Please enter the shop name.', 'Vui lòng nhập tên cửa hàng.')
      );
      return;
    }

    setLoading(true);
    try {
      // Execute the RPC function created on Supabase
      const { error } = await supabase.rpc('create_tenant_for_user', {
        shop_name: shopName.trim()
      });

      if (error) throw error;

      toast.success(tr('환영합니다!', 'Welcome!', 'Chào mừng!'), {
        description: tr(
          '매장 등록이 완료되었습니다. 대시보드로 이동합니다.',
          'Shop registration is complete. Redirecting to dashboard.',
          'Đăng ký cửa hàng hoàn tất. Đang chuyển đến bảng điều khiển.'
        ),
      });
      
      // Refresh the router to reload layout.tsx with new tenant info
      router.refresh();
      // Navigate to dashboard
      router.push('/dashboard');
      
    } catch (error: any) {
      console.error('Onboarding Error:', error);
      toast.error(tr('매장 등록 실패', 'Shop registration failed', 'Đăng ký cửa hàng thất bại'), {
        description:
          error.message ||
          tr(
            '매장을 등록하는 중 문제가 발생했습니다. 관리자에게 문의해주세요.',
            'A problem occurred while creating the shop. Please contact admin.',
            'Đã xảy ra lỗi khi tạo cửa hàng. Vui lòng liên hệ quản trị viên.'
          ),
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
                alt={tr("로고", "Logo", "Logo")}
                width={200}
                height={50}
                className="w-auto h-12 object-contain"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {tr("환영합니다! 🎉", "Welcome! 🎉", "Chào mừng! 🎉")}
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              {tr(
                "안전하고 원활한 서비스 이용을 위해",
                "To use the service smoothly and securely,",
                "Để sử dụng dịch vụ an toàn và thuận tiện,"
              )}
              <br />
              {tr("대표님의 ", "enter your ", "vui lòng nhập ")}
              <b>{tr("화원 상호명", "flower shop name", "tên cửa hàng hoa")}</b>
              {tr("을 입력해주세요.", ".", " của bạn.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="shop">
                  {tr(
                    "화원 상호명 (매장명)",
                    "Flower shop name (store name)",
                    "Tên cửa hàng hoa (tên hiển thị)"
                  )}
                </Label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="shop"
                    type="text"
                    placeholder={tr("예: 강남플라워", "e.g. Gangnam Flower", "VD: Gangnam Flower")}
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
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                      {tr('설정 중...', 'Setting up...', 'Đang thiết lập...')}
                    </>
                  ) : (
                    tr('플록싱크 시작하기', 'Start Floxync', 'Bắt đầu với Floxync')
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-center text-slate-400">
                {tr(
                  "입력하신 상호명은 나중에 ",
                  "You can change this later in ",
                  "Bạn có thể đổi tên này sau trong "
                )}
                <b>{tr('환경설정', 'Settings', 'Cài đặt')}</b>
                {tr('에서 변경하실 수 있습니다.', '.', '.')}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
