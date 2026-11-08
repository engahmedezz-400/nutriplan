// API layer — talks to the NutriPlan proxy API (TheMealDB + USDA + OpenFoodFacts)

// Optional: put a USDA API key here to analyze recipe nutrition without being asked.
// (Get one free at https://fdc.nal.usda.gov/api-key-signup.html)
export const DEFAULT_USDA_KEY = "";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class NutriPlanApi {
  #baseUrl;

  constructor(baseUrl = "https://nutriplan-api.vercel.app/api") {
    this.#baseUrl = baseUrl;
  }

  async #request(path, options = {}) {
    const res = await fetch(`${this.#baseUrl}${path}`, options);
    if (!res.ok) throw new ApiError(`Request failed (${res.status}) for ${path}`, res.status);
    return res.json();
  }

  #qs(params) {
    return new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
  }

  /* ---------------- Meals ---------------- */
  getCategories() {
    return this.#request("/meals/categories");
  }
  getAreas() {
    return this.#request("/meals/areas");
  }
  searchMeals(q, page = 1, limit = 25) {
    return this.#request(`/meals/search?${this.#qs({ q, page, limit })}`);
  }
  filterMeals({ category, area, ingredient, page = 1, limit = 25 }) {
    return this.#request(`/meals/filter?${this.#qs({ category, area, ingredient, page, limit })}`);
  }
  getMealById(id) {
    return this.#request(`/meals/${encodeURIComponent(id)}`);
  }
  getRandomMeals(count = 3) {
    return this.#request(`/meals/random?count=${count}`);
  }

  /* ---------------- Nutrition (USDA) ---------------- */
  analyzeNutrition(recipeName, ingredients, apiKey) {
    return this.#request("/nutrition/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ recipeName, ingredients }),
    });
  }

  /* ---------------- Products (OpenFoodFacts) ---------------- */
  searchProducts(q, page = 1, limit = 24) {
    return this.#request(`/products/search?${this.#qs({ q, page, limit })}`);
  }
  getProductByBarcode(barcode) {
    return this.#request(`/products/barcode/${encodeURIComponent(barcode)}`);
  }
  getProductCategories() {
    return this.#request("/products/categories");
  }
  getProductsByCategory(category, page = 1, limit = 24) {
    return this.#request(`/products/category/${encodeURIComponent(category)}?${this.#qs({ page, limit })}`);
  }
}

export const api = new NutriPlanApi();
