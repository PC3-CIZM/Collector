import { AutoComplete, Button, Card, List, Modal, Space, Tabs, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchPublicItems,
  fetchPublicItemDetail,
  searchSuggest,
  searchAll,
  type PublicItem,
  type PublicItemDetail,
  type ShopSearchResult,
  type SellerSearchResult,
  type ItemSearchResult,
  type SearchAllResult,
} from "./home/publicApi";
import { ItemDetailModal } from "./home/ItemDetailModal";

const { Title, Text } = Typography;

type OptionKind = "item" | "shop" | "seller";
const pack = (kind: OptionKind, id: number) => `${kind}:${id}`;
const unpack = (v: string): { kind: OptionKind; id: number } | null => {
  const [k, raw] = v.split(":");
  const id = Number(raw);
  if (!id) return null;
  if (k === "item" || k === "shop" || k === "seller") return { kind: k, id };
  return null;
};

export default function HomePage() {
  const navigate = useNavigate();

  // feed infinite scroll
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // search input + dropdown suggestions
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggest, setSuggest] = useState<SearchAllResult>({ items: [], shops: [], sellers: [] });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // debounce + cancel
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<number | null>(null);

  // “Rechercher” modal (full results)
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [results, setResults] = useState<SearchAllResult>({ items: [], shops: [], sellers: [] });

  // item detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PublicItemDetail | null>(null);

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

  // search as you type -> dropdown suggestions (items + shops + sellers)
  useEffect(() => {
    const s = q.trim();

    if (!s || s.length < 2) {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
      setSuggest({ items: [], shops: [], sellers: [] });
      setDropdownOpen(false);
      setSearching(false);
      return;
    }

    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = window.setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;

      setSearching(true);
      try {
        const r = await searchSuggest(s, { signal: ctrl.signal });
        setSuggest(r);
        setDropdownOpen(true);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setSuggest({ items: [], shops: [], sellers: [] });
        setDropdownOpen(true);
      } finally {
        if (searchAbortRef.current === ctrl) setSearching(false);
      }
    }, 250);

    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [q]);

  const onNotDev = (title: string) => {
    Modal.info({ title, content: "Pas encore développé.", okText: "OK" });
  };

  const openItemDetail = async (itemId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = (await fetchPublicItemDetail(itemId));
      setDetail(d);
    } catch (e: any) {
      Modal.error({ title: "Erreur", content: e?.message ?? String(e) });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelect = (value: string) => {
    const u = unpack(value);
    if (!u) return;

    setDropdownOpen(false);

    if (u.kind === "item") {
      void openItemDetail(u.id);
      return;
    }
    if (u.kind === "shop") {
      navigate(`/boutique/${u.id}`);
      return;
    }
    if (u.kind === "seller") {
      navigate(`/vendeur/${u.id}`);
      return;
    }
  };

  const doSearchAll = async () => {
    const s = q.trim();
    if (!s) return;

    setResultsOpen(true);
    setResultsLoading(true);

    try {
      const r = await searchAll(s);
      setResults(r);
    } catch (e: any) {
      Modal.error({ title: "Erreur recherche", content: e?.message ?? String(e) });
      setResults({ items: [], shops: [], sellers: [] });
    } finally {
      setResultsLoading(false);
    }
  };

  const options = useMemo(() => {
    const itemOptions = (suggest.items ?? []).slice(0, 6).map((it: ItemSearchResult) => ({
      value: pack("item", it.id),
      label: (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
            {it.cover_url ? (
              <img
                src={it.cover_url}
                alt="cover"
                style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 8 }}
              />
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#f5f5f5",
                  border: "1px solid #eee",
                }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {it.title}
              </div>
              <div style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {Number(it.price)}€ — {it.shop_name}
              </div>
            </div>
          </div>

          <Button
            size="small"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDropdownOpen(false);
              void openItemDetail(it.id);
            }}
          >
            Voir
          </Button>
        </div>
      ),
    }));

    const shopOptions = (suggest.shops ?? []).slice(0, 6).map((r: ShopSearchResult) => ({
      value: pack("shop", r.shop_id),
      label: (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
            {r.shop_logo_url ? (
              <img
                src={r.shop_logo_url}
                alt="logo"
                style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 8 }}
              />
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#f5f5f5",
                  border: "1px solid #eee",
                }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.shop_name}
              </div>
              <div style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Boutique — vendeur : {r.seller_name ?? "—"}
              </div>
            </div>
          </div>

          <Button
            size="small"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDropdownOpen(false);
              navigate(`/boutique/${r.shop_id}`);
            }}
          >
            Boutique
          </Button>
        </div>
      ),
    }));

    const sellerOptions = (suggest.sellers ?? []).slice(0, 6).map((s: SellerSearchResult) => ({
      value: pack("seller", s.seller_id),
      label: (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "#f5f5f5",
                border: "1px solid #eee",
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.seller_name ?? "Vendeur"}
              </div>
              <div style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Vendeur — {s.shops_count ?? 0} boutique(s)
              </div>
            </div>
          </div>

          <Button
            size="small"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDropdownOpen(false);
              navigate(`/vendeur/${s.seller_id}`);
            }}
          >
            Profil
          </Button>
        </div>
      ),
    }));

    const groups = [];
    if (itemOptions.length) groups.push({ label: "Articles", options: itemOptions });
    if (shopOptions.length) groups.push({ label: "Boutiques", options: shopOptions });
    if (sellerOptions.length) groups.push({ label: "Vendeurs", options: sellerOptions });
    return groups;
  }, [suggest, navigate]);

  const header = useMemo(
    () => (
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Title level={2} style={{ margin: 0, color: "#ffffff" }}>
          Accueil
        </Title>

        <Space.Compact style={{ width: "100%" }}>
          <AutoComplete
            value={q}
            options={options as any}
            open={dropdownOpen}
            onOpenChange={(open) => {
              const s = q.trim();
              if (!s || s.length < 2) {
                setDropdownOpen(false);
                return;
              }
              setDropdownOpen(open);
            }}
            onChange={(v) => setQ(v)}
            onSelect={(value) => handleSelect(String(value))}
            onBlur={() => setDropdownOpen(false)}
            style={{ width: "100%" }}
          >
            {/* input simple (plus stable que Input AntD dans Compact selon versions) */}
            <div style={{ width: "100%" }}>
              <input
                style={{
                  width: "100%",
                  height: 32,
                  border: "1px solid #d9d9d9",
                  borderRadius: 6,
                  padding: "4px 11px",
                  outline: "none",
                  color: "#000",
                  background: "#fff",
                }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher vendeurs / boutiques / articles (min. 2 caractères)"
              />
            </div>
          </AutoComplete>

          <Button type="primary" onClick={() => void doSearchAll()}>
            {searching ? "…" : "Rechercher"}
          </Button>
        </Space.Compact>

        {dropdownOpen && !searching && q.trim().length >= 2 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Suggestions : clique sur une ligne (article/boutique/vendeur)
          </Text>
        ) : null}
      </Space>
    ),
    [q, options, dropdownOpen, searching]
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

      <div ref={sentinelRef} />
      {loadingMore ? <Text type="secondary">Chargement…</Text> : null}
      {done ? <Text type="secondary" style={{ textAlign: "center", color: "#888" }}>Fin des résultats.</Text> : null}

      {/* Full search results modal */}
      <Modal
        open={resultsOpen}
        onCancel={() => setResultsOpen(false)}
        footer={null}
        title={`Résultats pour “${q.trim()}”`}
        width={900}
      >
        <Tabs
          defaultActiveKey="items"
          items={[
            {
              key: "items",
              label: `Articles (${results.items.length})`,
              children: resultsLoading ? (
                <Text type="secondary">Chargement…</Text>
              ) : results.items.length === 0 ? (
                <Text type="secondary">Aucun article.</Text>
              ) : (
                <List
                  grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
                  dataSource={results.items}
                  renderItem={(it: ItemSearchResult) => (
                    <List.Item>
                      <Card
                        hoverable
                        onClick={() => void openItemDetail(it.id)}
                        cover={
                          it.cover_url ? (
                            <img
                              src={it.cover_url}
                              alt={it.title}
                              style={{ height: 160, width: "100%", objectFit: "cover" }}
                            />
                          ) : null
                        }
                      >
                        <Space direction="vertical" size={2} style={{ width: "100%" }}>
                          <Text strong>{it.title}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {Number(it.price)}€ — {it.shop_name}
                          </Text>
                        </Space>
                      </Card>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: "shops",
              label: `Boutiques (${results.shops.length})`,
              children: resultsLoading ? (
                <Text type="secondary">Chargement…</Text>
              ) : results.shops.length === 0 ? (
                <Text type="secondary">Aucune boutique.</Text>
              ) : (
                <List
                  dataSource={results.shops}
                  renderItem={(r: ShopSearchResult) => (
                    <List.Item
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setResultsOpen(false);
                        navigate(`/boutique/${r.shop_id}`);
                      }}
                    >
                      <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space>
                          {r.shop_logo_url ? (
                            <img
                              src={r.shop_logo_url}
                              alt="logo"
                              style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 10 }}
                            />
                          ) : null}
                          <div>
                            <Text strong>{r.shop_name}</Text>
                            <div style={{ fontSize: 12 }}>
                              <Text type="secondary">Vendeur : {r.seller_name ?? "—"}</Text>
                            </div>
                          </div>
                        </Space>

                        <Space>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setResultsOpen(false);
                              navigate(`/boutique/${r.shop_id}`);
                            }}
                          >
                            Voir boutique
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setResultsOpen(false);
                              navigate(`/vendeur/${r.seller_id}`);
                            }}
                          >
                            Voir vendeur
                          </Button>
                        </Space>
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: "sellers",
              label: `Vendeurs (${results.sellers.length})`,
              children: resultsLoading ? (
                <Text type="secondary">Chargement…</Text>
              ) : results.sellers.length === 0 ? (
                <Text type="secondary">Aucun vendeur.</Text>
              ) : (
                <List
                  dataSource={results.sellers}
                  renderItem={(s: SellerSearchResult) => (
                    <List.Item
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setResultsOpen(false);
                        navigate(`/vendeur/${s.seller_id}`);
                      }}
                    >
                      <Space style={{ width: "100%", justifyContent: "space-between" }}>
                        <div>
                          <Text strong>{s.seller_name ?? "Vendeur"}</Text>
                          <div style={{ fontSize: 12 }}>
                            <Text type="secondary">{s.shops_count ?? 0} boutique(s)</Text>
                          </div>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResultsOpen(false);
                            navigate(`/vendeur/${s.seller_id}`);
                          }}
                        >
                          Voir profil
                        </Button>
                      </Space>
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      </Modal>

      {/* Item detail modal */}
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
