import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/i18n/config";

type Props = { params: Promise<{ slug: string }> };

export default async function FeatureRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/${DEFAULT_LOCALE}/features/${slug}`);
}
