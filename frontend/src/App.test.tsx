/// <reference types="vitest" />
// @vitest-environment jsdom

// Outils de test React
import { render } from "@testing-library/react";

// Fonctions de Vitest (test + mocks)
import { test, vi } from "vitest";

// Composant principal de l’application
import App from "./App";

// ─────────────────────────────────────────────
// Mock navigateur requis par Ant Design (responsive)
// jsdom ne fournit pas matchMedia par défaut
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─────────────────────────────────────────────
// Mock IntersectionObserver utilisé pour le lazy loading
// et la détection d’éléments visibles
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = MockIntersectionObserver as any;

// ─────────────────────────────────────────────
// Mock de l’API publique appelée par la HomePage
// Évite les appels réseau réels pendant les tests
vi.mock("./pages/home/publicApi", () => {
  return {
    fetchPublicItems: vi.fn().mockResolvedValue({
      items: [],
      nextCursor: null,
    }),
  };
});


test("App se rend sans crash", () => {
  render(<App />);
});
