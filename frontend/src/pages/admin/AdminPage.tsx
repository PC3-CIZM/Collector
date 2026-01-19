import { useAuth0 } from "@auth0/auth0-react";
import { Alert, Spin } from "antd";
import { useEffect, useState } from "react";
import AdminTemplate, { type AdminTabKey } from "./AdminTemplate";
import AdminUsers from "./AdminUsers";
import AdminCategories from "./AdminCategories";
import { fetchCategories, fetchUsers } from "./adminApi";
import type { Category, User } from "./adminTypes";

export default function AdminPage() {
  const { getAccessTokenSilently, user } = useAuth0();
  const mySub = user?.sub ?? null;

  const [activeTab, setActiveTab] = useState<AdminTabKey>("users");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const reload = async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const [u, c] = await Promise.all([fetchUsers(token), fetchCategories(token)]);
      setUsers(u);
      setCategories(c);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAccessTokenSilently]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="Erreur" description={error} showIcon />
      </div>
    );
  }

  return (
    <AdminTemplate
      activeKey={activeTab}
      onChange={setActiveTab}
      users={
        <AdminUsers
          mySub={mySub}
          users={users}
          setUsers={setUsers}
          reload={reload}
        />
      }
      categories={
        <AdminCategories
          categories={categories}
          setCategories={setCategories}
          reload={reload}
        />
      }
    />
  );
}
