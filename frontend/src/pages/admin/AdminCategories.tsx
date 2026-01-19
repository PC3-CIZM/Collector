import { useAuth0 } from "@auth0/auth0-react";
import {
  Alert,
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { createCategory, deactivateCategory, updateCategory } from "./adminApi";
import type { Category, CategoryDraft } from "./adminTypes";

export default function AdminCategories(props: {
  categories: Category[];
  setCategories: (c: Category[] | ((p: Category[]) => Category[])) => void;
  reload: () => Promise<void>;
}) {
  const { getAccessTokenSilently } = useAuth0();
  const [newName, setNewName] = useState("");

  const [drafts, setDrafts] = useState<Record<number, CategoryDraft>>({});
  const [dirty, setDirty] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const d: Record<number, CategoryDraft> = {};
    const di: Record<number, boolean> = {};
    for (const c of props.categories) {
      d[c.id] = { name: c.name, parent_id: c.parent_id, is_active: c.is_active };
      di[c.id] = false;
    }
    setDrafts(d);
    setDirty(di);
  }, [props.categories]);

  const anyDirty = useMemo(() => Object.values(dirty).some(Boolean), [dirty]);
  const markDirty = (id: number, v = true) => setDirty((p) => ({ ...p, [id]: v }));

  const revertRow = (c: Category) => {
    setDrafts((p) => ({ ...p, [c.id]: { name: c.name, parent_id: c.parent_id, is_active: c.is_active } }));
    markDirty(c.id, false);
  };

  const applyRow = async (c: Category) => {
    const d = drafts[c.id];
    if (!d || !dirty[c.id]) return;

    const patch: Partial<Category> = {};
    const nextName = d.name.trim();

    if (nextName && nextName !== c.name) patch.name = nextName;
    if (d.parent_id !== c.parent_id) patch.parent_id = d.parent_id;
    if (d.is_active !== c.is_active) patch.is_active = d.is_active;

    if (Object.keys(patch).length === 0) {
      markDirty(c.id, false);
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      const updated = await updateCategory(token, c.id, patch);
      props.setCategories((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
      markDirty(c.id, false);
      message.success("Catégorie mise à jour");
    } catch (e: any) {
      message.error(e?.message ?? String(e));
    }
  };

  const applyAll = async () => {
    for (const c of props.categories) {
      if (dirty[c.id]) {
        // eslint-disable-next-line no-await-in-loop
        await applyRow(c);
      }
    }
  };

  const revertAll = () => props.categories.forEach(revertRow);

  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    {
      title: "Nom",
      key: "name",
      render: (_: any, c: Category) => {
        const d = drafts[c.id];
        if (!d) return null;
        return (
          <Input
            value={d.name}
            onChange={(e) => {
              setDrafts((p) => ({ ...p, [c.id]: { ...d, name: e.target.value } }));
              markDirty(c.id, true);
            }}
          />
        );
      },
    },
    {
      title: "Parent",
      key: "parent",
      width: 240,
      render: (_: any, c: Category) => {
        const d = drafts[c.id];
        if (!d) return null;

        return (
          <Select
            style={{ width: "100%" }}
            value={d.parent_id ?? undefined}
            allowClear
            placeholder="Aucun"
            options={props.categories
              .filter((p) => p.id !== c.id)
              .map((p) => ({ value: p.id, label: p.name }))}
            onChange={(val) => {
              setDrafts((p) => ({ ...p, [c.id]: { ...d, parent_id: (val ?? null) as any } }));
              markDirty(c.id, true);
            }}
          />
        );
      },
    },
    {
      title: "Active",
      key: "active",
      width: 110,
      render: (_: any, c: Category) => {
        const d = drafts[c.id];
        if (!d) return null;
        return (
          <Switch
            checked={d.is_active}
            onChange={(val) => {
              setDrafts((p) => ({ ...p, [c.id]: { ...d, is_active: val } }));
              markDirty(c.id, true);
            }}
          />
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 320,
      render: (_: any, c: Category) => {
        const isDirty = !!dirty[c.id];
        return (
          <Space wrap>
            <Button type="primary" disabled={!isDirty} onClick={() => void applyRow(c)}>
              Valider
            </Button>
            <Button disabled={!isDirty} onClick={() => revertRow(c)}>
              Annuler
            </Button>

            <Popconfirm
              title="Désactiver cette catégorie ?"
              okText="Oui"
              cancelText="Non"
              onConfirm={async () => {
                try {
                  const token = await getAccessTokenSilently();
                  const updated = await deactivateCategory(token, c.id);
                  props.setCategories((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
                  message.success("Catégorie désactivée");
                } catch (e: any) {
                  message.error(e?.message ?? String(e));
                }
              }}
            >
              <Button danger>Désactiver</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title="Catégories"
      extra={
        <Space>
          <Button type="primary" disabled={!anyDirty} onClick={() => void applyAll()}>
            Valider tout
          </Button>
          <Button disabled={!anyDirty} onClick={revertAll}>
            Annuler tout
          </Button>
          <Button onClick={() => void props.reload()}>Rafraîchir</Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        message="Astuce"
        description="Les champs sont en brouillon. Clique sur Valider pour envoyer."
        style={{ marginBottom: 12 }}
      />

      <Space style={{ marginBottom: 12 }} wrap>
        <Input
          placeholder="Nom de la catégorie"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ width: 280 }}
        />
        <Button
          type="primary"
          disabled={!newName.trim()}
          onClick={async () => {
            try {
              const token = await getAccessTokenSilently();
              const created = await createCategory(token, newName.trim());
              props.setCategories((prev) => [...prev, created]);
              setNewName("");
              message.success("Catégorie créée");
            } catch (e: any) {
              message.error(e?.message ?? String(e));
            }
          }}
        >
          Ajouter
        </Button>
      </Space>

      <Table
        rowKey="id"
        size="middle"
        columns={columns as any}
        dataSource={props.categories}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}
