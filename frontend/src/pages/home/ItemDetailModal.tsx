import { Alert, Button, Divider, Image, Modal, Space, Typography } from "antd";

const { Title, Text, Paragraph } = Typography;

export type PublicItemDetail = {
  item: {
    id: number;
    shop_id: number;
    category_id: number | null;
    title: string;
    description: string | null;
    price: string | number;
    currency: string;
    shipping_cost: string | number;
    status: "PUBLISHED";
    created_at: string;
    updated_at: string;
  };
  shop: {
    id: number;
    owner_id: number;
    name: string;
    description: string | null;
    logo_url: string | null;
    seller_name: string | null;
  };
  images: { id: number; url: string; position: number; is_primary: boolean }[];
};

export function ItemDetailModal({
  open,
  loading,
  detail,
  onClose,
  onContact,
  onBuy,
}: {
  open: boolean;
  loading: boolean;
  detail: PublicItemDetail | null;
  onClose: () => void;
  onContact: () => void;
  onBuy: () => void;
}) {
  const images = (detail?.images ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      title={detail ? `Annonce #${detail.item.id}` : "Annonce"}
    >
      {loading ? (
        <Text type="secondary">Chargement…</Text>
      ) : !detail ? (
        <Alert type="warning" showIcon message="Annonce introuvable" />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {/* Header */}
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <Title level={4} style={{ margin: 0 }}>
              {detail.item.title}
            </Title>

            <Text type="secondary">
              Boutique : <Text strong>{detail.shop.name}</Text>
              {" — "}
              Vendeur : <Text strong>{detail.shop.seller_name ?? "—"}</Text>
            </Text>

            <Text strong>
              {Number(detail.item.price)} {detail.item.currency} (+{Number(detail.item.shipping_cost)}{" "}
              {detail.item.currency} port)
            </Text>
          </Space>

          <Divider style={{ margin: "8px 0" }} />

          {/* Images + zoom */}
          {images.length === 0 ? (
            <Alert type="warning" showIcon message="Aucune photo" />
          ) : (
            <Image.PreviewGroup>
              {/* grande image (cliquable -> zoom) */}
              <Image
                src={images[0].url}
                alt="cover"
                style={{
                  width: "100%",
                  height: 360,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid #eee",
                }}
              />

              {/* thumbs */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {images.map((im) => (
                  <Image
                    key={im.id}
                    src={im.url}
                    alt="thumb"
                    width={120}
                    height={120}
                    style={{
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "1px solid #eee",
                    }}
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          )}

          <Divider style={{ margin: "8px 0" }} />

          {/* Description */}
          <div>
            <Text strong>Description</Text>
            <Paragraph style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
              {detail.item.description ?? "—"}
            </Paragraph>
          </div>

          {/* Actions MVP */}
          <Space wrap>
            <Button onClick={onContact}>Contacter le vendeur</Button>
            <Button type="primary" onClick={onBuy}>
              Acheter
            </Button>
          </Space>
        </Space>
      )}
    </Modal>
  );
}
