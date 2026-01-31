import { useAuth0 } from "@auth0/auth0-react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Divider,
  Spin,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  sellerCreateItem,
  sellerListItems,
  sellerListShops,
  sellerReplaceImages,
  sellerSubmitItem,
  sellerUpdateItem,
  fetchSellerItemDetail,
  updateSellerItem,
  submitSellerItem,
  fetchCategories,
} from "./sellerApi";
import type { Item, Shop, Category, ItemReview } from "./sellerTypes";

const { Title, Text } = Typography;

const statusColor: Record<string, string> = {
  DRAFT: "default",
  PENDING_REVIEW: "gold",
  PUBLISHED: "green",
  REJECTED: "red",
  SOLD: "blue",
};

function TrafficTag({ v }: { v: "GREEN" | "ORANGE" | "RED" }) {
  const map: any = { GREEN: "success", ORANGE: "warning", RED: "error" };
  const label: any = { GREEN: "OK", ORANGE: "À vérifier", RED: "Non conforme" };
  return <Tag color={map[v]}>{label[v]}</Tag>;
}

type SellerItemDetail = {
  item: Item;
  images: { id: number; url: string; position: number; is_primary: boolean }[];
  reviews: (ItemReview & { admin_name?: string | null })[];
};

export default function SellerItems() {
  const { getAccessTokenSilently } = useAuth0();

  const [items, setItems] = useState<Item[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);

  // Create/Edit modal
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);
  const [form] = Form.useForm();

  // View/Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SellerItemDetail | null>(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailForm] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const [it, sh, cats] = await Promise.all([
        sellerListItems(token),
        sellerListShops(token),
        fetchCategories(), // public categories actives
      ]);
      setItems(it);
      setShops(sh);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEdit(null);
    setOpen(true);
    form.resetFields();
  };

  const openEdit = (item: Item) => {
    setEdit(item);
    setOpen(true);
    form.setFieldsValue({
      shop_id: item.shop_id,
      category_id: item.category_id ?? undefined,
      title: item.title,
      description: item.description ?? "",
      price: Number(item.price),
      shipping_cost: Number(item.shipping_cost),
      images: (item.images ?? []).map((x) => x.url).join("\n"),
    });
  };

  const save = async () => {
    const values = await form.validateFields();
    const token = await getAccessTokenSilently();

    const images: string[] = String(values.images ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!edit) {
      await sellerCreateItem(token, {
        shop_id: values.shop_id,
        category_id: values.category_id,
        title: values.title,
        description: values.description,
        price: values.price,
        shipping_cost: values.shipping_cost ?? 0,
        images,
      });
      message.success("Annonce créée (DRAFT)");
    } else {
      if (edit.status === "PENDING_REVIEW") {
        message.error("Annonce en review : modification impossible.");
        return;
      }

      await sellerUpdateItem(token, edit.id, {
        category_id: values.category_id,
        title: values.title,
        description: values.description,
        price: values.price,
        shipping_cost: values.shipping_cost ?? 0,
      });

      await sellerReplaceImages(token, edit.id, images);

      message.success(
        edit.status === "PUBLISHED"
          ? "Annonce modifiée : repasse en review automatiquement"
          : "Annonce modifiée"
      );
    }

    setOpen(false);
    await load();
  };

  const submit = async (item: Item) => {
    const token = await getAccessTokenSilently();
    if (item.status !== "DRAFT") {
      message.warning("Seules les annonces DRAFT peuvent être soumises.");
      return;
    }
    if ((item.images?.length ?? 0) < 2) {
      message.error("Minimum 2 photos requises pour soumettre.");
      return;
    }
    await sellerSubmitItem(token, item.id);
    message.success("Annonce envoyée à The Collector (PENDING_REVIEW)");
    await load();
  };

  // ---------- Detail modal ----------
  const openDetail = async (item: Item) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setDetailEditMode(false);

    try {
      const token = await getAccessTokenSilently();
      const d: SellerItemDetail = await fetchSellerItemDetail(token, item.id);
      setDetail(d);

      detailForm.setFieldsValue({
        title: d.item.title,
        description: d.item.description ?? "",
        price: Number(d.item.price),
        shipping_cost: Number(d.item.shipping_cost ?? 0),
        category_id: d.item.category_id ?? undefined,
      });
    } catch (e: any) {
      message.error(e?.message ?? String(e));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetailEdits = async () => {
    if (!detail) return;

    const values = await detailForm.validateFields();
    const token = await getAccessTokenSilently();

    try {
      setDetailLoading(true);
      await updateSellerItem(token, detail.item.id, values);

      // reload detail
      const d: SellerItemDetail = await fetchSellerItemDetail(token, detail.item.id);
      setDetail(d);
      setDetailEditMode(false);
      message.success("Modifications enregistrées");
      await load();
    } catch (e: any) {
      message.error(e?.message ?? String(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const resubmitFromDetail = async () => {
    if (!detail) return;

    try {
      const token = await getAccessTokenSilently();
      await submitSellerItem(token, detail.item.id);
      message.success("Annonce resoumise à The Collector (PENDING_REVIEW)");
      setDetailOpen(false);
      await load();
    } catch (e: any) {
      message.error(e?.message ?? String(e));
    }
  };

  const cols = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 70 },
      {
        title: "Titre",
        render: (_: any, r: Item) => (
          <Space direction="vertical" size={0}>
            <Text strong>{r.title}</Text>
            <Text type="secondary">
              {r.price}€ (+{r.shipping_cost}€ port) — {r.images?.length ?? 0} photo(s)
            </Text>
          </Space>
        ),
        width: 420,
      },
      {
        title: "Catégorie",
        render: (_: any, r: Item) => {
          const name = categories.find((c) => c.id === r.category_id)?.name ?? "—";
          return <Text>{name}</Text>;
        },
        width: 220,
      },
      {
        title: "Statut",
        render: (_: any, r: Item) => <Tag color={statusColor[r.status]}>{r.status}</Tag>,
        width: 160,
      },
      {
        title: "Actions",
        render: (_: any, r: Item) => (
          <Space wrap>
            <Button onClick={() => void openDetail(r)}>Voir</Button>

            <Button onClick={() => openEdit(r)} disabled={r.status === "PENDING_REVIEW"}>
              Éditer
            </Button>

            <Button type="primary" onClick={() => void submit(r)} disabled={r.status !== "DRAFT"}>
              Soumettre
            </Button>
          </Space>
        ),
        width: 300,
      },
    ],
    [categories]
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Space style={{ justifyContent: "space-between", width: "100%" }}>
        <Title level={3} style={{ margin: 0 }}>
          Mes annonces
        </Title>
        <Button type="primary" onClick={openCreate}>
          Nouvelle annonce
        </Button>
      </Space>

      <Alert
        type="info"
        showIcon
        message="Rappel"
        description="Une annonce n’est publiée qu’après validation The Collector. Toute modification d’une annonce publiée la renvoie en review."
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={cols as any}
        dataSource={items}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1100 }}
      />

      {/* Create/Edit modal */}
      <Modal
        title={edit ? `Éditer annonce #${edit.id}` : "Créer une annonce"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void save()}
        okText="Enregistrer"
        width={900}
      >
        <Form layout="vertical" form={form}>
          <Space style={{ width: "100%" }} size="large">
            <Form.Item name="shop_id" label="Boutique" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select
                placeholder="Choisir une boutique"
                options={shops.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Form.Item>

            <Form.Item
              name="category_id"
              label="Catégorie"
              rules={[{ required: true, message: "Catégorie requise" }]}
              style={{ flex: 1 }}
            >
              <Select
                placeholder="Choisir une catégorie"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
          </Space>

          <Form.Item name="title" label="Titre" rules={[{ required: true, min: 3 }]}>
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description" rules={[{ required: true, min: 10 }]}>
            <Input.TextArea rows={5} />
          </Form.Item>

          <Space style={{ width: "100%" }} size="large">
            <Form.Item name="price" label="Prix" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="shipping_cost" label="Frais de port" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          <Form.Item
            name="images"
            label="Photos (URLs) — une URL par ligne (minimum 2 pour soumettre)"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} placeholder={"https://...\nhttps://..."} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail modal (notes + edit if rejected) */}
      <Modal
        title={detail ? `Annonce #${detail.item.id}` : "Annonce"}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={980}
      >
        {detailLoading ? (
          <Spin />
        ) : !detail ? null : (
          <>
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                <div>
                  <Tag color={statusColor[detail.item.status]}>{detail.item.status}</Tag>
                  <Text strong style={{ marginLeft: 8 }}>
                    {detail.item.title}
                  </Text>
                </div>

                <Space>
                  {/* Edit only if DRAFT or REJECTED */}
                  <Button
                    onClick={() => setDetailEditMode((v) => !v)}
                    disabled={!(detail.item.status === "DRAFT" || detail.item.status === "REJECTED")}
                  >
                    {detailEditMode ? "Fermer édition" : "Modifier"}
                  </Button>

                  <Button
                    type="primary"
                    onClick={() => void resubmitFromDetail()}
                    disabled={detail.item.status !== "DRAFT"}
                  >
                    Resoumettre
                  </Button>
                </Space>
              </Space>

              <Text type="secondary">
                Prix: {detail.item.price}€ — Port: {detail.item.shipping_cost}€
              </Text>

              {/* Images */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                {(detail.images ?? []).map((im) => (
                  <img
                    key={im.id}
                    src={im.url}
                    alt="item"
                    style={{
                      width: 140,
                      height: 140,
                      objectFit: "cover",
                      borderRadius: 10,
                      border: "1px solid #eee",
                    }}
                  />
                ))}
              </div>

              <Divider />

              {/* If rejected, show last admin notes */}
              {detail.item.status === "REJECTED" && detail.reviews?.[0] ? (
                <Alert
                  type="error"
                  showIcon
                  message="Annonce rejetée"
                  description={
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Notes admin :</Text> {detail.reviews[0].notes}
                      </div>
                      <Space wrap>
                        <span>
                          Photos: <TrafficTag v={detail.reviews[0].traffic_photo} />
                        </span>
                        <span>
                          Titre: <TrafficTag v={detail.reviews[0].traffic_title} />
                        </span>
                        <span>
                          Description: <TrafficTag v={detail.reviews[0].traffic_description} />
                        </span>
                      </Space>
                    </div>
                  }
                />
              ) : null}

              {/* Edit form inside detail */}
              {detailEditMode ? (
                <>
                  <Divider />
                  <Title level={5} style={{ marginTop: 0 }}>
                    Modifier puis enregistrer (si REJECTED, repasse en DRAFT)
                  </Title>

                  <Form layout="vertical" form={detailForm}>
                    <Form.Item
                      name="category_id"
                      label="Catégorie"
                      rules={[{ required: true, message: "Catégorie requise" }]}
                    >
                      <Select
                        placeholder="Choisir une catégorie"
                        options={categories.map((c) => ({ value: c.id, label: c.name }))}
                      />
                    </Form.Item>

                    <Form.Item name="title" label="Titre" rules={[{ required: true, min: 3 }]}>
                      <Input />
                    </Form.Item>

                    <Form.Item name="description" label="Description" rules={[{ required: true, min: 10 }]}>
                      <Input.TextArea rows={5} />
                    </Form.Item>

                    <Space style={{ width: "100%" }} size="large">
                      <Form.Item name="price" label="Prix" rules={[{ required: true }]} style={{ flex: 1 }}>
                        <InputNumber min={1} style={{ width: "100%" }} />
                      </Form.Item>
                      <Form.Item name="shipping_cost" label="Frais de port" style={{ flex: 1 }}>
                        <InputNumber min={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Space>

                    <Button type="primary" onClick={() => void saveDetailEdits()} loading={detailLoading}>
                      Enregistrer
                    </Button>

                    <Text type="secondary" style={{ marginLeft: 12 }}>
                      Puis resoumettre quand c’est prêt (minimum 2 photos).
                    </Text>
                  </Form>
                </>
              ) : null}

              {/* Review history */}
              {detail.reviews?.length ? (
                <>
                  <Divider />
                  <Title level={5} style={{ marginTop: 0 }}>
                    Historique des notes (The Collector)
                  </Title>

                  <Space direction="vertical" style={{ width: "100%" }} size={10}>
                    {detail.reviews.map((r) => (
                      <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                        <Space style={{ justifyContent: "space-between", width: "100%" }}>
                          <Text strong>
                            {r.decision}{" "}
                            {r.admin_name ? <Text type="secondary">— {r.admin_name}</Text> : null}
                          </Text>
                          <Text type="secondary">{new Date(r.created_at).toLocaleString()}</Text>
                        </Space>
                        <div style={{ marginTop: 6 }}>{r.notes}</div>
                        <Space wrap style={{ marginTop: 8 }}>
                          <span>
                            Photos: <TrafficTag v={r.traffic_photo} />
                          </span>
                          <span>
                            Titre: <TrafficTag v={r.traffic_title} />
                          </span>
                          <span>
                            Description: <TrafficTag v={r.traffic_description} />
                          </span>
                        </Space>
                      </div>
                    ))}
                  </Space>
                </>
              ) : null}
            </Space>
          </>
        )}
      </Modal>
    </Space>
  );
}
