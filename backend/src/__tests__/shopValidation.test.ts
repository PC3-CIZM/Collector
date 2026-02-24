import { validateShopName } from "../utils/shopValidation";

describe("validateShopName (unit test)", () => {
  it("retourne true si le nom est une string >= 3 caractères (trim inclus)", () => {
    expect(validateShopName("Shop")).toBe(true);
    expect(validateShopName("  abc  ")).toBe(true);
  });

  it("retourne false si le nom est invalide", () => {
    expect(validateShopName("ab")).toBe(false);
    expect(validateShopName("   ")).toBe(false);
    expect(validateShopName("")).toBe(false);
    expect(validateShopName(null)).toBe(false);
    expect(validateShopName(undefined)).toBe(false);
    expect(validateShopName(123)).toBe(false);
  });
});
