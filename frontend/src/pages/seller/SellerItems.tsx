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
  Popconfirm,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  sellerCreateItem,
  sellerListItems,
  sellerListShops,
  sellerReplaceImages,
  sellerSubmitItem,
  sellerUpdateItem,
  sellerGetItemDetail,
  sellerMarkSold,
  sellerDeleteItem,
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

type SellerItemDetail = {
  item: Item;
  images: { id: number; url: string; position: number; is_primary: boolean }[];
  reviews: (ItemReview & { admin_name?: string | null })[];
};

function toUrls(multiline: string): string[] {
  return String(multiline ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function SellerItems() {
  const { getAccessTokenSilently } = useAuth0();

  const [items, setItems] = useState<Item[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // create/edit
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);
  const [form] = Form.useForm();

  // preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<any>(null);

  // view
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [detail, setDetail] = useState<SellerItemDetail | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const [it, sh, cats] = await Promise.all([
        sellerListItems(token),
        sellerListShops(token),
        fetchCategories(),
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
    setEditOpen(true);
    setPreviewOpen(false);
    setPreviewValues(null);
    form.resetFields();
  };

  const openEdit = (item: Item) => {
    if (item.status !== "DRAFT") {
      message.warning("Seules les annonces en DRAFT sont modifiables.");
      return;
    }
    setEdit(item);
    setEditOpen(true);
    setPreviewOpen(false);
    setPreviewValues(null);

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

  const openPreviewFromForm = async () => {
    const values = await form.validateFields();
    const images = toUrls(values.images);
    const catName = categories.find((c) => c.id === values.category_id)?.name ?? "—";
    const shopName = shops.find((s) => s.id === values.shop_id)?.name ?? "—";

    setPreviewValues({
      ...values,
      images,
      category_name: catName,
      shop_name: shopName,
    });
    setPreviewOpen(true);
  };

  const saveDraft = async () => {
    const values = await form.validateFields();
    const token = await getAccessTokenSilently();

    const images = toUrls(values.images);

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
      await sellerUpdateItem(token, edit.id, {
        category_id: values.category_id,
        title: values.title,
        description: values.description,
        price: values.price,
        shipping_cost: values.shipping_cost ?? 0,
      });
      await sellerReplaceImages(token, edit.id, images);
      message.success("Annonce mise à jour (DRAFT)");
    }

    setEditOpen(false);
    setPreviewOpen(false);
    setPreviewValues(null);
    await load();
  };

  const submit = async (itemId: number, imagesCount: number) => {
    const token = await getAccessTokenSilently();

    if (imagesCount < 2) {
      message.error("Minimum 2 photos requises pour soumettre.");
      return;
    }

    await sellerSubmitItem(token, itemId);
    message.success("Annonce envoyée à The Collector (PENDING_REVIEW)");
    setEditOpen(false);
    setPreviewOpen(false);
    setPreviewValues(null);
    await load();
  };

  const openView = async (item: Item) => {
    setViewOpen(true);
    setViewLoading(true);
    setDetail(null);

    try {
      const token = await getAccessTokenSilently();
      const d: SellerItemDetail = await sellerGetItemDetail(token, item.id);
      setDetail(d);
    } catch (e: any) {
      message.error(e?.message ?? String(e));
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const markSold = async (item: Item) => {
    const token = await getAccessTokenSilently();
    await sellerMarkSold(token, item.id);
    message.success("Annonce archivée (SOLD)");
    await load();
  };

  const deleteItem = async (item: Item) => {
    const token = await getAccessTokenSilently();
    await sellerDeleteItem(token, item.id);
    message.success("Annonce supprimée");
    setViewOpen(false);
    await load();
  };

  const cols = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 70 },
      {
        title: "Annonce",
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
        render: (_: any, r: Item) => {
          const canEdit = r.status === "DRAFT";
          const canSubmit = r.status === "DRAFT";
          const canMarkSold = r.status === "PUBLISHED";
          const canDelete = r.status !== "PENDING_REVIEW";

          return (
            <Space wrap>
              <Button onClick={() => void openView(r)}>Voir</Button>

              <Button onClick={() => openEdit(r)} disabled={!canEdit}>
                Modifier
              </Button>

              <Button
                type="primary"
                onClick={() => void submit(r.id, r.images?.length ?? 0)}
                disabled={!canSubmit}
              >
                Soumettre
              </Button>

              <Button onClick={() => void markSold(r)} disabled={!canMarkSold}>
                Marquer vendu
              </Button>

              <Popconfirm
                title="Supprimer l'annonce ?"
                okText="Supprimer"
                cancelText="Annuler"
                onConfirm={() => void deleteItem(r)}
                disabled={!canDelete}
              >
                <Button danger disabled={!canDelete}>
                  Supprimer
                </Button>
              </Popconfirm>
            </Space>
          );
        },
        width: 420,
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
        description="Crée ton annonce en DRAFT, fais une preview, puis soumets (minimum 2 photos). Après rejet : crée une nouvelle annonce."
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={cols as any}
        dataSource={items}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1250 }}
      />

      {/* Create/Edit modal */}
      <Modal
        title={edit ? `Modifier DRAFT #${edit.id}` : "Créer une annonce (DRAFT)"}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        okText="Preview"
        onOk={() => void openPreviewFromForm()}
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
            label="Photos (URLs) — une URL par ligne (min 2 pour soumettre)"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} placeholder={"https://...\nhttps://..."} />
          </Form.Item>

          <Divider />
          <Space>
            <Button onClick={() => void saveDraft()}>Enregistrer DRAFT</Button>
            <Text type="secondary">Tu pourras prévisualiser avant de soumettre.</Text>
          </Space>
        </Form>
      </Modal>

      {/* Preview modal */}
      <Modal
        title="Preview annonce (read-only)"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={980}
      >
        {!previewValues ? null : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Space style={{ justifyContent: "space-between", width: "100%" }}>
              <div>
                <Tag color={statusColor.DRAFT}>DRAFT</Tag>{" "}
                <Text strong>{previewValues.title}</Text>
              </div>
              <Space>
                <Button onClick={() => setPreviewOpen(false)}>Modifier</Button>
                <Button onClick={() => void saveDraft()}>Enregistrer DRAFT</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    const imgCount = (previewValues.images?.length ?? 0) as number;
                    // si edit existe on submit l'ID existant, sinon on doit d'abord créer → on impose save draft
                    if (!edit) {
                      message.info("Enregistre d'abord le DRAFT, puis soumets.");
                      return;
                    }
                    void submit(edit.id, imgCount);
                  }}
                >
                  Soumettre
                </Button>
              </Space>
            </Space>

            <Alert
              type="info"
              showIcon
              message="Preview"
              description="Lecture seule. Tu peux revenir modifier, enregistrer en DRAFT, puis soumettre."
            />

            <div>
              <Text type="secondary">Boutique</Text>
              <div><Text strong>{previewValues.shop_name}</Text></div>
            </div>

            <div>
              <Text type="secondary">Catégorie</Text>
              <div><Text strong>{previewValues.category_name}</Text></div>
            </div>

            <Text type="secondary">
              Prix: {previewValues.price}€ — Port: {previewValues.shipping_cost ?? 0}€
            </Text>

            <Divider />

            <div>
              <Text strong>Description</Text>
              <div style={{ whiteSpace: "pre-wrap" }}>{previewValues.description}</div>
            </div>

            <Divider />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(previewValues.images ?? []).map((u: string) => (
                <img
                  key={u}
                  src={u}
                  alt="item"
                  style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 10, border: "1px solid #eee" }}
                />
              ))}
            </div>
          </Space>
        )}
      </Modal>

      {/* View modal */}
      <Modal
        title={detail ? `Annonce #${detail.item.id}` : "Annonce"}
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={null}
        width={980}
      >
        {viewLoading ? (
          <Spin />
        ) : !detail ? null : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Space style={{ justifyContent: "space-between", width: "100%" }}>
              <div>
                <Tag color={statusColor[detail.item.status]}>{detail.item.status}</Tag>{" "}
                <Text strong>{detail.item.title}</Text>
              </div>

              <Space>
                {detail.item.status === "DRAFT" ? (
                  <Button onClick={() => openEdit(detail.item)}>Modifier</Button>
                ) : null}

                {detail.item.status === "PUBLISHED" ? (
                  <Button onClick={() => void markSold(detail.item)}>Marquer vendu</Button>
                ) : null}

                {detail.item.status !== "PENDING_REVIEW" ? (
                  <Popconfirm
                    title="Supprimer l'annonce ?"
                    okText="Supprimer"
                    cancelText="Annuler"
                    onConfirm={() => void deleteItem(detail.item)}
                  >
                    <Button danger>Supprimer</Button>
                  </Popconfirm>
                ) : null}
              </Space>
            </Space>

            <Text type="secondary">
              Prix: {detail.item.price}€ — Port: {detail.item.shipping_cost}€
            </Text>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(detail.images ?? []).map((im) => (
                <img
                  key={im.id}
                  src={im.url}
                  alt="item"
                  style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 10, border: "1px solid #eee" }}
                />
              ))}
            </div>

            <Divider />

            {detail.item.status === "REJECTED" ? (
              <Alert
                type="error"
                showIcon
                message="Annonce rejetée"
                description={
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>Note admin :</Text>{" "}
                      {detail.reviews?.[0]?.notes ?? "—"}
                    </div>
                    <Text type="secondary">
                      Pour corriger : crée une nouvelle annonce.
                    </Text>
                  </div>
                }
              />
            ) : null}

            <div>
              <Text strong>Description</Text>
              <div style={{ whiteSpace: "pre-wrap" }}>{detail.item.description ?? "—"}</div>
            </div>
          </Space>
        )}
      </Modal>
    </Space>
  );
}
