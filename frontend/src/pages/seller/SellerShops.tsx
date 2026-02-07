import { useAuth0 } from "@auth0/auth0-react";
import { Button, Card, Form, Input, List, Modal, Space, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { sellerCreateShop, sellerListShops } from "./sellerApi";
import type { Shop } from "./sellerTypes";

const { Title, Text } = Typography;

export default function SellerShops() {
  const { getAccessTokenSilently } = useAuth0();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const data = await sellerListShops(token);
      setShops(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    const values = await form.validateFields();
    const token = await getAccessTokenSilently();
    await sellerCreateShop(token, values);
    message.success("Boutique créée");
    setOpen(false);
    form.resetFields();
    await load();
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Space style={{ justifyContent: "space-between", width: "100%" }}>
        <Title level={3} style={{ margin: 0 }}>
          Mes boutiques
        </Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          Nouvelle boutique
        </Button>
      </Space>

      <List
        loading={loading}
        grid={{ gutter: 16, column: 2 }}
        dataSource={shops}
        renderItem={(s) => (
          <List.Item>
            <Card title={s.name}>
              <Text type="secondary">{s.description ?? "—"}</Text>
            </Card>
          </List.Item>
        )}
      />

      <Modal title="Créer une boutique" open={open} onCancel={() => setOpen(false)} onOk={() => void create()}>
        <Form layout="vertical" form={form}>
          <Form.Item name="name" label="Nom" rules={[{ required: true, min: 3 }]}>
            <Input placeholder="Ex: Sneakers premium" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="logo_url" label="Logo (URL)">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
