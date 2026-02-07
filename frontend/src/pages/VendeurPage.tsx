import { Alert, Button, Card, List, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchSellerDetail, type PublicSellerDetail } from "./home/publicApi";

const { Title, Text } = Typography;

export default function VendeurPage() {
  const { id } = useParams();
  const sellerId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<PublicSellerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    const run = async () => {
      setLoading(true);
      try {
        const d = await fetchSellerDetail(sellerId);
        setData(d);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [sellerId]);

  if (!sellerId) return <div style={{ padding: 24 }}>Vendeur invalide.</div>;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", padding: 24 }}>
      <Button onClick={() => navigate(-1)}>← Retour</Button>

      {loading ? (
        <Text type="secondary">Chargement…</Text>
      ) : !data ? (
        <Alert type="error" showIcon message="Vendeur introuvable" />
      ) : (
        <>
          <Title level={3} style={{ margin: 0, color: "#fff" }}>
            Profil vendeur
          </Title>
          <Text type="secondary" style={{ color: "#888" }}>
            {data.seller.display_name ?? `Vendeur #${data.seller.id}`}
          </Text>

          <Alert
            type="info"
            showIcon
            message="Boutiques"
            description="Liste des boutiques liées à ce vendeur."
          />

          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
            dataSource={data.shops}
            renderItem={(s) => (
              <List.Item>
                <Card
                  title={s.name}
                  extra={<Button onClick={() => navigate(`/boutique/${s.id}`)}>Voir</Button>}
                >
                  <Text type="secondary">{s.description ?? "—"}</Text>
                </Card>
              </List.Item>
            )}
          />
        </>
      )}
    </Space>
  );
}
