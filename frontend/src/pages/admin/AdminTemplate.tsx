import { Layout, Tabs, Typography } from "antd";
import { TeamOutlined, AppstoreOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export type AdminTabKey = "users" | "categories" | "collector";

export default function AdminTemplate(props: {
  activeKey: AdminTabKey;
  onChange: (k: AdminTabKey) => void;
  users: ReactNode;
  categories: ReactNode;
  collector: ReactNode;
}) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ background: "transparent", padding: "24px 24px 0 24px" }}>
        <Title level={2} style={{ margin: 0 }}>
          Admin
        </Title>
        <Text type="secondary">Gestion des utilisateurs & catégories</Text>
      </Header>

      <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <Tabs
          size="large"
          activeKey={props.activeKey}
          onChange={(k) => props.onChange(k as AdminTabKey)}
          items={[
            {
              key: "users",
              label: (
                <span>
                  <TeamOutlined /> Utilisateurs
                </span>
              ),
              children: props.users,
            },
            {
              key: "categories",
              label: (
                <span>
                  <AppstoreOutlined /> Catégories
                </span>
              ),
              children: props.categories,
            },
            {
              key: "collector",
              label: (
                <span>
                  <AppstoreOutlined /> TheCollector
                </span>
              ),
              children: props.collector,
            },
          ]}
        />
      </Content>
    </Layout>
  );
}
