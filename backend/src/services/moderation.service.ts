import axios from "axios";

export type TrafficLight = "GREEN" | "ORANGE" | "RED";

export type ModerationResult = {
  title_status: TrafficLight;
  description_status: TrafficLight;
  images_status: TrafficLight;
  auto_score: number; // 0..1
  auto_details: any;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function localHeuristic(title: string, description: string, imageUrls: string[]): ModerationResult {
  // Heuristique simple (fallback) : longueur + min 2 images
  const t = title.trim();
  const d = description.trim();
  const has2 = imageUrls.length >= 2;

  const titleOk = t.length >= 8 && t.length <= 120;
  const descOk = d.length >= 40;

  const title_status: TrafficLight = titleOk ? "GREEN" : t.length >= 4 ? "ORANGE" : "RED";
  const description_status: TrafficLight = descOk ? "GREEN" : d.length >= 15 ? "ORANGE" : "RED";
  const images_status: TrafficLight = has2 ? "GREEN" : imageUrls.length === 1 ? "ORANGE" : "RED";

  const rawScore =
    (titleOk ? 0.35 : 0.15) +
    (descOk ? 0.45 : 0.15) +
    (has2 ? 0.20 : 0.0);

  return {
    title_status,
    description_status,
    images_status,
    auto_score: clamp01(rawScore),
    auto_details: { mode: "local_heuristic" },
  };
}

/**
 * Appel “système externe” configurable.
 * Si CONTENT_CHECK_URL non défini ou erreur → fallback heuristique locale.
 *
 * Contrat attendu (si tu branches un vrai service) :
 * POST { title, description, images: string[] }
 * -> { title_status, description_status, images_status, score, details }
 */
export async function runModerationCheck(input: {
  title: string;
  description: string;
  imageUrls: string[];
}): Promise<ModerationResult> {
  const url = process.env.CONTENT_CHECK_URL;
  if (!url) return localHeuristic(input.title, input.description, input.imageUrls);

  try {
    const r = await axios.post(
      url,
      { title: input.title, description: input.description, images: input.imageUrls },
      { timeout: 7000 }
    );

    const data = r.data ?? {};
    const title_status = (data.title_status as TrafficLight) ?? "ORANGE";
    const description_status = (data.description_status as TrafficLight) ?? "ORANGE";
    const images_status = (data.images_status as TrafficLight) ?? "ORANGE";
    const score = clamp01(Number(data.score ?? 0));
    return {
      title_status,
      description_status,
      images_status,
      auto_score: score,
      auto_details: data.details ?? data,
    };
  } catch (e: any) {
    return {
      ...localHeuristic(input.title, input.description, input.imageUrls),
      auto_details: { mode: "fallback_after_error", error: String(e?.message ?? e) },
    };
  }
}
