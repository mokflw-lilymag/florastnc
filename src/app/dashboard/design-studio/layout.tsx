import { studioFontClassName } from "@/lib/studio-fonts";

export default function DesignStudioLayout({ children }: { children: React.ReactNode }) {
  return <div className={studioFontClassName}>{children}</div>;
}
