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
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  deleteUser,
  updateUserActive,
  updateUserDisplayName,
  updateUserEmail,
  updateUserPassword,
  updateUserRole,
} from "./adminApi";
import type { User, UserDraft } from "./adminTypes";
import { isDatabaseUser, providerFromAuth0Id } from "./adminTypes";

const { Text } = Typography;

export default function AdminUsers(props: {
  mySub: string | null;
  users: User[];
  setUsers: (u: User[] | ((p: User[]) => User[])) => void;
  reload: () => Promise<void>;
}) {
  const { getAccessTokenSilently } = useAuth0();

  const [drafts, setDrafts] = useState<Record<number, UserDraft>>({});
  const [dirty, setDirty] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const d: Record<number, UserDraft> = {};
    const di: Record<number, boolean> = {};
    for (const u of props.users) {
      const role = (u.roles?.[0] as any) ?? "BUYER";
      d[u.id] = {
        email: u.email ?? "",
        display_name: u.display_name ?? "",
        role,
        is_active: u.is_active,
      };
      di[u.id] = false;
    }
    setDrafts(d);
    setDirty(di);
  }, [props.users]);

  const anyDirty = useMemo(() => Object.values(dirty).some(Boolean), [dirty]);

  const markDirty = (id: number, v = true) => setDirty((p) => ({ ...p, [id]: v }));

  const revertRow = (u: User) => {
    const role = (u.roles?.[0] as any) ?? "BUYER";
    setDrafts((p) => ({
      ...p,
      [u.id]: { email: u.email ?? "", display_name: u.display_name ?? "", role, is_active: u.is_active },
    }));
    markDirty(u.id, false);
  };

  const applyRow = async (u: User) => {
    const d = drafts[u.id];
    if (!d || !dirty[u.id]) return;

    const token = await getAccessTokenSilently();

    const currentRole = (u.roles?.[0] as any) ?? "BUYER";
    const nextEmail = d.email.trim();
    const nextDisplay = d.display_name.trim();

    const canEmail = isDatabaseUser(u.auth0_id);
    const isSelf = props.mySub && u.auth0_id === props.mySub;

    try {
      if (nextDisplay !== (u.display_name ?? "")) {
        await updateUserDisplayName(token, u.id, nextDisplay);
        props.setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, display_name: nextDisplay } : x)));
      }

      if (canEmail && nextEmail !== (u.email ?? "")) {
        await updateUserEmail(token, u.id, nextEmail);
        props.setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, email: nextEmail } : x)));
      }

      if (d.is_active !== u.is_active) {
        await updateUserActive(token, u.id, d.is_active);
        props.setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: d.is_active } : x)));
      }

      if (!isSelf && d.role !== currentRole) {
        await updateUserRole(token, u.id, d.role);
        props.setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, roles: [d.role] } : x)));
      }

      markDirty(u.id, false);
      message.success("Utilisateur mis à jour");
    } catch (e: any) {
      message.error(e?.message ?? String(e));
    }
  };

  const applyAll = async () => {
    for (const u of props.users) {
      if (dirty[u.id]) {
        // eslint-disable-next-line no-await-in-loop
        await applyRow(u);
      }
    }
  };

  const revertAll = () => props.users.forEach(revertRow);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 70,
    },
    {
      title: "Provider",
      key: "provider",
      width: 130,
      render: (_: any, u: User) => {
        const p = providerFromAuth0Id(u.auth0_id);
        return <Tag>{p}</Tag>;
      },
    },
    {
      title: "Email",
      key: "email",
      width: 320,
      ellipsis: true,
      render: (_: any, u: User) => {
        const d = drafts[u.id];
        if (!d) return null;
        const can = isDatabaseUser(u.auth0_id);
        const provider = providerFromAuth0Id(u.auth0_id);
        return (
          <Space direction="vertical" size={0} style={{ width: "100%" }}>
            <Input
              value={d.email}
              disabled={!can}
              style={{ width: "100%" }}
              onChange={(e) => {
                setDrafts((p) => ({ ...p, [u.id]: { ...d, email: e.target.value } }));
                markDirty(u.id, true);
              }}
            />
            {!can ? <Text type="secondary" style={{ whiteSpace: "nowrap" }}>Email géré par {provider}</Text> : null}
          </Space>
        );
      },
    },
    {
      title: "Display name",
      key: "display_name",
      width: 220,
      ellipsis: true,
      render: (_: any, u: User) => {
        const d = drafts[u.id];
        if (!d) return null;
        return (
          <Input
            value={d.display_name}
            style={{ width: "100%" }}
            onChange={(e) => {
              setDrafts((p) => ({ ...p, [u.id]: { ...d, display_name: e.target.value } }));
              markDirty(u.id, true);
            }}
          />
        );
      },
    },
    {
      title: "Role",
      key: "role",
      width: 170,
      render: (_: any, u: User) => {
        const d = drafts[u.id];
        if (!d) return null;
        const isSelf = props.mySub && u.auth0_id === props.mySub;
        return (
          <Space direction="vertical" size={0}>
            <Select
              value={d.role}
              style={{ width: 140 }}
              disabled={!!isSelf}
              options={[
                { value: "BUYER", label: "BUYER" },
                { value: "SELLER", label: "SELLER" },
              ]}
              onChange={(val) => {
                setDrafts((p) => ({ ...p, [u.id]: { ...d, role: val } }));
                markDirty(u.id, true);
              }}
            />
            {isSelf ? <Text type="secondary">Impossible sur vous-même</Text> : null}
          </Space>
        );
      },
    },
    {
      title: "Active",
      key: "active",
      width: 110,
      render: (_: any, u: User) => {
        const d = drafts[u.id];
        if (!d) return null;
        return (
          <Switch
            checked={d.is_active}
            onChange={(val) => {
              setDrafts((p) => ({ ...p, [u.id]: { ...d, is_active: val } }));
              markDirty(u.id, true);
            }}
          />
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 340,
      render: (_: any, u: User) => {
        const isDirty = !!dirty[u.id];
        const provider = providerFromAuth0Id(u.auth0_id);
        const canResetPw = isDatabaseUser(u.auth0_id);

        return (
          <Space wrap>
            <Button type="primary" disabled={!isDirty} onClick={() => void applyRow(u)}>
              Valider
            </Button>
            <Button disabled={!isDirty} onClick={() => revertRow(u)}>
              Annuler
            </Button>

            <Button
              disabled={!canResetPw}
              onClick={async () => {
                const pwd = window.prompt("Nouveau mot de passe");
                if (!pwd) return;
                try {
                  const token = await getAccessTokenSilently();
                  await updateUserPassword(token, u.id, pwd);
                  message.success("Mot de passe mis à jour");
                } catch (e: any) {
                  message.error(e?.message ?? String(e));
                }
              }}
            >
              Reset PW
            </Button>
            {!canResetPw ? <Text type="secondary">Password géré par {provider}</Text> : null}

            <Popconfirm
              title="Supprimer définitivement ?"
              okText="Oui"
              cancelText="Non"
              onConfirm={async () => {
                try {
                  const token = await getAccessTokenSilently();
                  await deleteUser(token, u.id);
                  props.setUsers((prev) => prev.filter((x) => x.id !== u.id));
                  message.success("Utilisateur supprimé");
                } catch (e: any) {
                  message.error(e?.message ?? String(e));
                }
              }}
            >
              <Button danger>Supprimer</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title="Utilisateurs"
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
        description="Les champs sont en brouillon. Rien n’est envoyé tant que tu ne cliques pas sur Valider (ligne) ou Valider tout."
        style={{ marginBottom: 12 }}
      />

      <Table
        rowKey="id"
        size="middle"
        columns={columns as any}
        dataSource={props.users}
        pagination={{ pageSize: 8 }}
        scroll={{ x: 1100 }}
      />
    </Card>
  );
}
