import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu } from "antd";
import { ShopOutlined, TagsOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import SellerShops from "./SellerShops";
import SellerItems from "./SellerItems";

const { Sider, Content } = Layout;

export default function SellerPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // selected key based on current URL
  const selectedKey = location.pathname.includes("/seller/shops") ? "shops" : "items";

  const items = useMemo(
    () => [
      { key: "items", icon: <TagsOutlined />, label: "Mes annonces" },
      { key: "shops", icon: <ShopOutlined />, label: "Mes boutiques" },
    ],
    []
  );

  return (
    <Layout style={{ minHeight: "calc(100vh - 64px)" }}>
      <Sider width={220} theme="light">
        <div style={{ padding: 16, fontWeight: 700 }}>Espace vendeur</div>

        <Menu
          mode="inline"
          items={items}
          selectedKeys={[selectedKey]}
          onClick={(e) => {
            // important: navigate to the route
            navigate(e.key === "shops" ? "/seller/shops" : "/seller/items");
          }}
        />
      </Sider>

      <Content style={{ padding: 24 }}>
        <Routes>
          <Route path="/" element={<Navigate to="items" replace />} />
          <Route path="items" element={<SellerItems />} />
          <Route path="shops" element={<SellerShops />} />
        </Routes>
      </Content>
    </Layout>
  );
}
