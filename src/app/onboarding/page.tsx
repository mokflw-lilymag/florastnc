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
  const tr = (
    ko: string,
    en: string,
    vi?: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error(
        tr(
          "매장명을 입력해주세요.",
          "Please enter the shop name.",
          "Vui lòng nhập tên cửa hàng.",
          "店舗名を入力してください。",
          "请输入门店名称。",
          "Introduzca el nombre de la tienda.",
          "Digite o nome da loja.",
          "Saisissez le nom du magasin.",
          "Bitte geben Sie den Namen des Shops ein.",
          "Введите название магазина.",
        ),
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

      toast.success(
        tr(
          "환영합니다!",
          "Welcome!",
          "Chào mừng!",
          "ようこそ！",
          "欢迎！",
          "¡Bienvenido!",
          "Bem-vindo!",
          "Bienvenue !",
          "Willkommen!",
          "Добро пожаловать!",
        ),
        {
          description: tr(
            "매장 등록이 완료되었습니다. 대시보드로 이동합니다.",
            "Shop registration is complete. Redirecting to dashboard.",
            "Đăng ký cửa hàng hoàn tất. Đang chuyển đến bảng điều khiển.",
            "店舗の登録が完了しました。ダッシュボードへ移動します。",
            "门店注册已完成，正在跳转到控制台。",
            "Registro completado. Redirigiendo al panel.",
            "Cadastro concluído. Redirecionando ao painel.",
            "Inscription terminée. Redirection vers le tableau de bord.",
            "Registrierung abgeschlossen. Weiterleitung zum Dashboard.",
            "Регистрация завершена. Переход в панель.",
          ),
        },
      );
      
      // Refresh the router to reload layout.tsx with new tenant info
      router.refresh();
      // Navigate to dashboard
      router.push('/dashboard');
      
    } catch (error: any) {
      console.error('Onboarding Error:', error);
      toast.error(
        tr(
          "매장 등록 실패",
          "Shop registration failed",
          "Đăng ký cửa hàng thất bại",
          "店舗登録に失敗しました",
          "门店注册失败",
          "Error al registrar la tienda",
          "Falha no cadastro da loja",
          "Échec de l’enregistrement du magasin",
          "Shop-Registrierung fehlgeschlagen",
          "Ошибка регистрации магазина",
        ),
        {
          description:
            error.message ||
            tr(
              "매장을 등록하는 중 문제가 발생했습니다. 관리자에게 문의해주세요.",
              "A problem occurred while creating the shop. Please contact admin.",
              "Đã xảy ra lỗi khi tạo cửa hàng. Vui lòng liên hệ quản trị viên.",
              "店舗の作成中に問題が発生しました。管理者にお問い合わせください。",
              "创建门店时出现问题，请联系管理员。",
              "Ocurrió un problema al crear la tienda. Contacte al administrador.",
              "Ocorreu um problema ao criar a loja. Contate o administrador.",
              "Un problème est survenu lors de la création du magasin. Contactez l’administrateur.",
              "Beim Erstellen des Shops ist ein Fehler aufgetreten. Bitte kontaktieren Sie den Administrator.",
              "При создании магазина возникла ошибка. Обратитесь к администратору.",
            ),
        },
      );
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
                alt={tr("로고", "Logo", "Logo", "ロゴ", "标志", "Logotipo", "Logotipo", "Logo", "Logo", "Логотип")}
                width={200}
                height={50}
                className="w-auto h-12 object-contain"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {tr(
                "환영합니다! 🎉",
                "Welcome! 🎉",
                "Chào mừng! 🎉",
                "ようこそ！🎉",
                "欢迎！🎉",
                "¡Bienvenido! 🎉",
                "Bem-vindo! 🎉",
                "Bienvenue ! 🎉",
                "Willkommen! 🎉",
                "Добро пожаловать! 🎉",
              )}
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              {tr(
                "안전하고 원활한 서비스 이용을 위해",
                "To use the service smoothly and securely,",
                "Để sử dụng dịch vụ an toàn và thuận tiện,",
                "安全でスムーズにサービスをご利用いただくため、",
                "为安全顺畅地使用本服务，",
                "Para usar el servicio de forma segura y fluida,",
                "Para usar o serviço com segurança e fluidez,",
                "Pour utiliser le service en toute sécurité et en douceur,",
                "Für einen sicheren und reibungslosen Service,",
                "Чтобы безопасно и удобно пользоваться сервисом,",
              )}
              <br />
              {tr(
                "대표님의 ",
                "enter your ",
                "vui lòng nhập ",
                "",
                "请输入您的",
                "introduzca el ",
                "informe o ",
                "saisissez le ",
                "Geben Sie Ihren ",
                "укажите ",
              )}
              <b>
                {tr(
                  "화원 상호명",
                  "flower shop name",
                  "tên cửa hàng hoa",
                  "花屋の店名",
                  "花店名称",
                  "nombre de la floristería",
                  "nome da floricultura",
                  "nom de la fleuristerie",
                  "Blumenladen-Namen",
                  "название цветочного магазина",
                )}
              </b>
              {tr(
                "을 입력해주세요.",
                ".",
                " của bạn.",
                "を入力してください。",
                "。",
                ".",
                ".",
                ".",
                ".",
                ".",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="shop">
                  {tr(
                    "화원 상호명 (매장명)",
                    "Flower shop name (store name)",
                    "Tên cửa hàng hoa (tên hiển thị)",
                    "花屋の店名（表示名）",
                    "花店名称（门店名）",
                    "Nombre de la floristería (tienda)",
                    "Nome da floricultura (loja)",
                    "Nom de la fleuristerie (magasin)",
                    "Blumenladen-Name (Anzeigename)",
                    "Название цветочного магазина (отображаемое имя)",
                  )}
                </Label>
                <div className="relative">
                  <Store className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="shop"
                    type="text"
                    placeholder={tr(
                      "예: 강남플라워",
                      "e.g. Gangnam Flower",
                      "VD: Gangnam Flower",
                      "例：渋谷フラワー",
                      "例如：华强花店",
                      "p. ej. Flores Centro",
                      "ex.: Floricultura Centro",
                      "ex. : Fleurs du Centre",
                      "z. B. Blumen Mitte",
                      "напр.: Цветы Центр",
                    )}
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
                      {tr(
                        "설정 중...",
                        "Setting up...",
                        "Đang thiết lập...",
                        "設定中…",
                        "正在设置…",
                        "Configurando…",
                        "Configurando…",
                        "Configuration…",
                        "Wird eingerichtet…",
                        "Настройка…",
                      )}
                    </>
                  ) : (
                    tr(
                      "플록싱크 시작하기",
                      "Start Floxync",
                      "Bắt đầu với Floxync",
                      "Floxync を始める",
                      "开始使用 Floxync",
                      "Empezar con Floxync",
                      "Começar com Floxync",
                      "Démarrer avec Floxync",
                      "Mit Floxync starten",
                      "Начать с Floxync",
                    )
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-center text-slate-400">
                {tr(
                  "입력하신 상호명은 나중에 ",
                  "You can change this later in ",
                  "Bạn có thể đổi tên này sau trong ",
                  "入力した店名は後から",
                  "您输入的名称可稍后在",
                  "Podrá cambiar este nombre más tarde en ",
                  "Você pode alterar este nome depois em ",
                  "Vous pourrez modifier ce nom plus tard dans ",
                  "Den Namen können Sie später unter ",
                  "Название можно позже изменить в ",
                )}
                <b>
                  {tr(
                    "환경설정",
                    "Settings",
                    "Cài đặt",
                    "設定",
                    "设置",
                    "Ajustes",
                    "Configurações",
                    "Paramètres",
                    "Einstellungen",
                    "Настройки",
                  )}
                </b>
                {tr(
                  "에서 변경하실 수 있습니다.",
                  ".",
                  ".",
                  "で変更できます。",
                  "中更改。",
                  ".",
                  ".",
                  ".",
                  ".",
                  ".",
                )}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
