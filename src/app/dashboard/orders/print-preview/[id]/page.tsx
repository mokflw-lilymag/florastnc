import { PrintPreviewClient } from './components/print-preview-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintPreviewPage({ params }: PageProps) {
  const { id } = await params;
  return <PrintPreviewClient orderId={id} />;
}
