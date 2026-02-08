import "@testing-library/jest-dom";

// ✅ Mock matchMedia (Ant Design / responsive)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ✅ Mock IntersectionObserver (HomePage)
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});
Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

// ✅ Donne une valeur à l’URL API pour éviter "undefined/public/items"
process.env.VITE_API_URL = "http://localhost:4000";
process.env.VITE_API = "http://localhost:4000"; // au cas où tu utilises un autre nom
