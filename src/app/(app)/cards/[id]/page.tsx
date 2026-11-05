import { CardDetail } from "./_components/card-detail";

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CardDetail id={id} />;
}
