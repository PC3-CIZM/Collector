import { Alert, Button, Card, Input, List, Modal, Space, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchPublicItems,
  searchShops,
  fetchPublicItemDetail,
  type PublicItem,
  type ShopSearchResult,
} from "./home/publicApi";
import { ItemDetailModal, type PublicItemDetail } from "./home/ItemDetailModal";

const { Title, Text } = Typography;

export default function HomePage() {
  const navigate = useNavigate();

  // items infinite scroll
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // search shops/sellers
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ShopSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PublicItemDetail | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadFirst = async () => {
    setLoading(true);
    try {
      const page = await fetchPublicItems({ limit: 12, cursor: null });
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setDone(page.nextCursor === null);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || done || !nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchPublicItems({ limit: 12, cursor: nextCursor });
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
      setDone(page.nextCursor === null);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver (infinite scroll)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) void loadMore();
      },
      { root: null, rootMargin: "500px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelRef.current, nextCursor, done, loadingMore]);

  const doSearch = async () => {
    const s = q.trim();
    if (!s) return;
    setSearching(true);
    try {
      const r = await searchShops(s);
      setResults(r);
      setSearchOpen(true);
    } finally {
      setSearching(false);
    }
  };

  const onNotDev = (title: string) => {
    Modal.info({
      title,
      content: "Pas encore développé (MVP CESI).",
      okText: "OK",
    });
  };

  const openItemDetail = async (itemId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = (await fetchPublicItemDetail(itemId)) as PublicItemDetail;
      setDetail(d);
    } catch (e: any) {
      Modal.error({ title: "Erreur", content: e?.message ?? String(e) });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const header = useMemo(
    () => (
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Title level={2} style={{ margin: 0 }}>
          Accueil
        </Title>

        <Alert
          type="info"
          showIcon
          message="MVP"
          description="Recherche boutique + feed d'annonces (infinite scroll). Achat / messagerie arriveront plus tard."
        />

        <Space.Compact style={{ width: "100%" }}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une boutique ou un vendeur (ex: 'Sneakers', 'Math', ...)"
            onPressEnter={() => void doSearch()}
          />
          <Button type="primary" loading={searching} onClick={() => void doSearch()}>
            Rechercher
          </Button>
        </Space.Compact>
      </Space>
    ),
    [q, searching]
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", padding: 24 }}>
      {header}

      <List
        loading={loading}
        grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3, xl: 4, xxl: 4 }}
        dataSource={items}
        renderItem={(it) => (
          <List.Item>
            <Card
              hoverable
              onClick={() => void openItemDetail(it.id)}
              cover={
                it.cover_url ? (
                  <img
                    src={it.cover_url}
                    alt={it.title}
                    style={{ height: 180, width: "100%", objectFit: "cover" }}
                  />
                ) : null
              }
              actions={[
                <Button
                  key="contact"
                  type="link"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNotDev("Contacter le vendeur");
                  }}
                >
                  Contacter
                </Button>,
                <Button
                  key="buy"
                  type="link"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNotDev("Acheter");
                  }}
                >
                  Acheter
                </Button>,
              ]}
            >
              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                <Text strong>{it.title}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {Number(it.price)}€ (+{Number(it.shipping_cost)}€) — {it.shop_name}
                </Text>

                <Space size={6} wrap>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/boutique/${it.shop_id}`);
                    }}
                  >
                    Voir boutique
                  </Button>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/vendeur/${it.seller_id}`);
                    }}
                  >
                    Voir vendeur
                  </Button>
                </Space>
              </Space>
            </Card>
          </List.Item>
        )}
      />

      {/* sentinel */}
      <div ref={sentinelRef} />

      {loadingMore ? <Text type="secondary">Chargement…</Text> : null}
      {done ? <Text type="secondary">Fin des résultats.</Text> : null}

      <Modal
        open={searchOpen}
        onCancel={() => setSearchOpen(false)}
        footer={null}
        title="Résultats de recherche"
        width={720}
      >
        {(results?.length ?? 0) === 0 ? (
          <Text type="secondary">Aucun résultat.</Text>
        ) : (
          <List
            dataSource={results}
            renderItem={(r) => (
              <List.Item>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Space style={{ justifyContent: "space-between", width: "100%" }}>
                    <Space>
                      {r.shop_logo_url ? (
                        <img
                          src={r.shop_logo_url}
                          alt="logo"
                          style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 8 }}
                        />
                      ) : null}
                      <div>
                        <Text strong>{r.shop_name}</Text>
                        <div style={{ fontSize: 12 }}>
                          <Text type="secondary">Vendeur: {r.seller_name ?? "—"}</Text>
                        </div>
                      </div>
                    </Space>

                    <Space>
                      <Button onClick={() => navigate(`/boutique/${r.shop_id}`)}>Voir boutique</Button>
                      <Button onClick={() => navigate(`/vendeur/${r.seller_id}`)}>Voir vendeur</Button>
                    </Space>
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Modal>

      {/* detail modal */}
      <ItemDetailModal
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        onClose={() => setDetailOpen(false)}
        onContact={() => onNotDev("Contacter le vendeur")}
        onBuy={() => onNotDev("Acheter")}
      />
    </Space>
  );
}
