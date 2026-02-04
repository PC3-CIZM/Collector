import { Alert, Button, Card, List, Space, Typography, Modal } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchShopDetail, fetchPublicItemDetail, type PublicShopDetail } from "./home/publicApi";
import { ItemDetailModal, type PublicItemDetail } from "./home/ItemDetailModal";

const { Title, Text } = Typography;

export default function BoutiquePage() {
  const { id } = useParams();
  const shopId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<PublicShopDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PublicItemDetail | null>(null);

  useEffect(() => {
    if (!shopId) return;
    const run = async () => {
      setLoading(true);
      try {
        const d = await fetchShopDetail(shopId);
        setData(d);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [shopId]);

  const onNotDev = (title: string) => {
    Modal.info({
      title,
      content: "Pas encore développé (MVP CESI).",
      okText: "OK",
    });
  };

  const openItemDetail = async (itemId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = (await fetchPublicItemDetail(itemId)) as PublicItemDetail;
      setDetail(d);
    } catch (e: any) {
      Modal.error({ title: "Erreur", content: e?.message ?? String(e) });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!shopId) return <div style={{ padding: 24 }}>Boutique invalide.</div>;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", padding: 24 }}>
      <Button onClick={() => navigate("/accueil")}>← Retour</Button>

      {loading ? (
        <Text type="secondary">Chargement…</Text>
      ) : !data ? (
        <Alert type="error" showIcon message="Boutique introuvable" />
      ) : (
        <>
          <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
            <Space>
              {data.shop.logo_url ? (
                <img
                  src={data.shop.logo_url}
                  alt="logo"
                  style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 12 }}
                />
              ) : null}
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {data.shop.name}
                </Title>
                <Text type="secondary">{data.shop.description ?? "—"}</Text>
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">Vendeur : {data.shop.seller_name ?? "—"}</Text>
                </div>
              </div>
            </Space>

            <Button type="primary" onClick={() => navigate(`/vendeur/${data.shop.owner_id}`)}>
              Voir profil vendeur
            </Button>
          </Space>

          <Alert
            type="info"
            showIcon
            message="Annonces"
            description="Ici on affiche les annonces publiées (PUBLISHED) de cette boutique."
          />

          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3 }}
            dataSource={data.items}
            renderItem={(it) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => void openItemDetail(it.id)}
                  title={it.title}
                  cover={
                    it.cover_url ? (
                      <img
                        src={it.cover_url}
                        alt={it.title}
                        style={{ height: 170, width: "100%", objectFit: "cover" }}
                      />
                    ) : null
                  }
                >
                  <Space direction="vertical" size={4} style={{ width: "100%" }}>
                    <Text type="secondary">{it.description ? it.description.slice(0, 120) : "—"}</Text>
                    <Text strong>
                      {Number(it.price)}€ (+{Number(it.shipping_cost)}€)
                    </Text>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        </>
      )}

      <ItemDetailModal
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        onClose={() => setDetailOpen(false)}
        onContact={() => onNotDev("Contacter le vendeur")}
        onBuy={() => onNotDev("Acheter")}
      />
    </Space>
  );
}
