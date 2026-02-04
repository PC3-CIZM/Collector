import { useAuth0 } from "@auth0/auth0-react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Radio,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { fetchCollectorQueue, reviewCollectorItem } from "./adminApi";

const { Title, Text } = Typography;

type TrafficLight = "GREEN" | "ORANGE" | "RED";

type CollectorImage = {
  id: number;
  item_id: number;
  url: string;
  position: number;
  is_primary: boolean;
};

type CollectorItem = {
  id: number;
  shop_id: number;
  category_id: number | null;
  title: string;
  description: string | null;
  price: string | number;
  currency: string;
  shipping_cost: string | number;
  status: "PENDING_REVIEW";
  created_at: string;
  updated_at: string;

  shop_name: string;
  seller_name: string | null;
  seller_email: string | null;

  // auto-check
  title_status: TrafficLight;
  description_status: TrafficLight;
  images_status: TrafficLight;
  auto_score: number;

  images: CollectorImage[];
};

function TrafficTag({ v }: { v: TrafficLight }) {
  const colorMap: Record<TrafficLight, string> = {
    GREEN: "success",
    ORANGE: "warning",
    RED: "error",
  };
  const labelMap: Record<TrafficLight, string> = {
    GREEN: "OK",
    ORANGE: "À vérifier",
    RED: "Non conforme",
  };
  return <Tag color={colorMap[v]}>{labelMap[v]}</Tag>;
}

function scoreTag(score: number) {
  if (score >= 0.8) return <Tag color="success">Auto {Math.round(score * 100)}%</Tag>;
  if (score >= 0.5) return <Tag color="warning">Auto {Math.round(score * 100)}%</Tag>;
  return <Tag color="error">Auto {Math.round(score * 100)}%</Tag>;
}

type ReviewForm = {
  decision: "PUBLISHED" | "REJECTED";
  notes?: string;
};

export default function AdminCollector() {
  const { getAccessTokenSilently } = useAuth0();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CollectorItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CollectorItem | null>(null);

  const [form] = Form.useForm<ReviewForm>();

  const load = async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const q = await fetchCollectorQueue(token);
      setItems(q as any);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openItem = (it: CollectorItem) => {
    setSelected(it);
    setOpen(true);
    form.resetFields();
    form.setFieldsValue({ decision: "PUBLISHED", notes: "" });
  };

  const doReview = async () => {
    if (!selected) return;
    const values = await form.validateFields();

    // note obligatoire uniquement si REJECTED
    if (values.decision === "REJECTED" && (!values.notes || values.notes.trim().length < 2)) {
      message.error("Ajoute une note (min 2 caractères) pour rejeter.");
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      await reviewCollectorItem(token, selected.id, {
        decision: values.decision,
        notes: values.decision === "REJECTED" ? (values.notes ?? "").trim() : "",
      });

      message.success(values.decision === "PUBLISHED" ? "Annonce publiée ✅" : "Annonce rejetée ✅");
      setOpen(false);
      setSelected(null);
      await load();
    } catch (e: any) {
      message.error(e?.message ?? String(e));
    }
  };

  const cols = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 80 },
      {
        title: "Annonce",
        render: (_: any, r: CollectorItem) => (
          <Space direction="vertical" size={0}>
            <Text strong>{r.title}</Text>
            <Text type="secondary">
              {r.shop_name} — {r.seller_name ?? "—"} ({r.seller_email ?? "—"})
            </Text>
            <Text type="secondary">
              {Number(r.price)}€ (+{Number(r.shipping_cost)}€ port) — {r.images?.length ?? 0} photo(s)
            </Text>
          </Space>
        ),
      },
      {
        title: "Auto-check",
        width: 260,
        render: (_: any, r: CollectorItem) => (
          <Space wrap>
            <span>Photos</span> <TrafficTag v={r.images_status ?? "ORANGE"} />
            <span>Titre</span> <TrafficTag v={r.title_status ?? "ORANGE"} />
            <span>Desc</span> <TrafficTag v={r.description_status ?? "ORANGE"} />
            {scoreTag(Number(r.auto_score ?? 0))}
          </Space>
        ),
      },
      {
        title: "Actions",
        width: 140,
        render: (_: any, r: CollectorItem) => (
          <Button type="primary" onClick={() => openItem(r)}>
            Examiner
          </Button>
        ),
      },
    ],
    []
  );

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" showIcon message="Erreur" description={error} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={3} style={{ margin: 0 }}>
            The Collector
          </Title>
          <Button onClick={() => void load()} loading={loading}>
            Rafraîchir
          </Button>
        </div>

        <Alert
          type="info"
          showIcon
          message="Rappel"
          description="Tu examines, puis tu décides : publier ou rejeter. Si tu rejettes, tu dois laisser une note."
        />

        <Table
          rowKey="id"
          loading={loading}
          columns={cols as any}
          dataSource={items}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1000 }}
        />

        <Modal
          open={open}
          onCancel={() => setOpen(false)}
          title={selected ? `Contrôle annonce #${selected.id}` : "Contrôle annonce"}
          okText="Valider"
          onOk={() => void doReview()}
          width={980}
        >
          {!selected ? null : (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Card size="small">
                <Descriptions size="small" column={2} bordered>
                  <Descriptions.Item label="Boutique">{selected.shop_name}</Descriptions.Item>
                  <Descriptions.Item label="Vendeur">
                    {selected.seller_name ?? "—"} ({selected.seller_email ?? "—"})
                  </Descriptions.Item>
                  <Descriptions.Item label="Prix">
                    {Number(selected.price)} {selected.currency}
                  </Descriptions.Item>
                  <Descriptions.Item label="Frais de port">
                    {Number(selected.shipping_cost)} {selected.currency}
                  </Descriptions.Item>
                  <Descriptions.Item label="Auto Photos">
                    <TrafficTag v={selected.images_status ?? "ORANGE"} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Auto Titre">
                    <TrafficTag v={selected.title_status ?? "ORANGE"} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Auto Description">
                    <TrafficTag v={selected.description_status ?? "ORANGE"} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Auto Score">
                    {scoreTag(Number(selected.auto_score ?? 0))}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card size="small" title="Contenu">
                <Space direction="vertical" style={{ width: "100%" }}>
                  <div>
                    <Text strong>Titre</Text>
                    <div>{selected.title}</div>
                  </div>
                  <Divider style={{ margin: "12px 0" }} />
                  <div>
                    <Text strong>Description</Text>
                    <div style={{ whiteSpace: "pre-wrap" }}>{selected.description ?? "—"}</div>
                  </div>
                </Space>
              </Card>

              <Card size="small" title={`Photos (${selected.images?.length ?? 0})`}>
                {(selected.images?.length ?? 0) === 0 ? (
                  <Alert type="warning" showIcon message="Aucune photo" />
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {selected.images
                      .slice()
                      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                      .map((img) => (
                        <div key={img.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
                          <img
                            src={img.url}
                            alt="item"
                            style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6 }}
                          />
                          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                            <Text type="secondary">pos {img.position ?? 0}</Text>
                            {img.is_primary ? <Tag color="blue">primary</Tag> : null}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Card>

              <Card size="small" title="Décision">
                <Form layout="vertical" form={form}>
                  <Form.Item name="decision" rules={[{ required: true }]} initialValue="PUBLISHED">
                    <Radio.Group>
                      <Radio value="PUBLISHED">Publier</Radio>
                      <Radio value="REJECTED">Rejeter</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item
                    shouldUpdate={(prev, cur) => prev.decision !== cur.decision}
                    noStyle
                  >
                    {() => {
                      const d = form.getFieldValue("decision");
                      if (d !== "REJECTED") return null;
                      return (
                        <Form.Item
                          name="notes"
                          label="Note pour le vendeur (obligatoire si rejet)"
                          rules={[{ required: true, min: 2, message: "Min 2 caractères" }]}
                        >
                          <Input.TextArea rows={4} placeholder="Explique clairement ce qui ne va pas." />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                </Form>
              </Card>
            </Space>
          )}
        </Modal>
      </Space>
    </div>
  );
}
