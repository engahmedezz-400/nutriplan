/**
 * NutriPlan - Main Entry Point
 *
 * Contains the router, the page classes and the App class that wires them together.
 * (API -> api/mealdb.js, state -> state/appState.js, templates + dialogs -> ui/components.js)
 */
import { api, DEFAULT_USDA_KEY } from "./api/mealdb.js";
import { AppState, appState } from "./state/appState.js";
import * as ui from "./ui/components.js";

/* ============================== helpers ============================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const debounce = (fn, ms = 400) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

/* ============================== Router ============================== */
/**
 * Client-side router built on the History API.
 *
 *   router.add("/home", () => ...);
 *   router.add("/meal/:id", ({ id }) => ...);
 *   router.start();
 *
 * - Clicking any <a href="/path"> that matches a route calls pushState (no page reload).
 * - The browser Back / Forward buttons are handled through `popstate`.
 * - Opening / refreshing a deep link (e.g. /foodlog) needs the web server to answer it with index.html.
 */
class Router {
  #routes = [];
  #depth = 0; // how many in-app pushes happened (lets back() know if it is safe to go back)

  /** @param {string} pattern e.g. "/meal/:id" */
  add(pattern, handler) {
    const keys = [];
    const source = pattern
      .replace(/\/+$/, "")
      .replace(/:([A-Za-z]+)/g, (_, key) => {
        keys.push(key);
        return "([^/]+)";
      });
    this.#routes.push({ regex: new RegExp(`^${source}/?$`), keys, handler });
    return this;
  }

  get currentPath() {
    return location.pathname;
  }

  has(path) {
    return this.#routes.some((r) => r.regex.test(path));
  }

  /** Resolve the current URL (call once, after all routes are registered). */
  start() {
    history.replaceState({ idx: 0 }, "", location.pathname + location.search);

    window.addEventListener("popstate", (e) => {
      this.#depth = e.state?.idx ?? 0;
      this.#resolve(location.pathname);
    });
    document.addEventListener("click", (e) => this.#onLinkClick(e));

    return this.#resolve(location.pathname);
  }

  navigate(path, { replace = false } = {}) {
    if (!replace && path === location.pathname) return Promise.resolve();
    if (replace) {
      history.replaceState({ idx: this.#depth }, "", path);
    } else {
      history.pushState({ idx: ++this.#depth }, "", path);
    }
    return this.#resolve(path);
  }

  /** Go back if the previous entry belongs to this app, otherwise navigate to `fallback`. */
  back(fallback = "/home") {
    if (this.#depth > 0) history.back();
    else this.navigate(fallback);
  }

  #resolve(path) {
    for (const { regex, keys, handler } of this.#routes) {
      const match = regex.exec(path);
      if (!match) continue;
      const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
      return Promise.resolve(handler(params));
    }
    return this.navigate("/home", { replace: true }); // unknown URL -> home
  }

  #onLinkClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.origin !== location.origin) return;
    if (!this.has(link.pathname)) return;
    e.preventDefault();
    this.navigate(link.pathname);
  }
}

/* ============================== Page (abstract base class) ============================== */
/**
 * Abstract base class for every page.
 *
 * Lifecycle (template method pattern):
 *   init()   – called once at start-up, bind DOM events here
 *   enter()  – called by the App on every visit: shows the sections, then runs onEnter()
 *   leave()  – called when the user navigates away
 */
class Page {
  static ALL_SECTIONS = [
    "search-filters-section",
    "meal-categories-section",
    "all-recipes-section",
    "meal-details",
    "products-section",
    "foodlog-section",
  ];

  /**
   * @param {{sections: string[], title: string, subtitle: string, navPath: string}} config
   * @param {{state: object, api: object, dialogs: object, router: object}} services
   */
  constructor({ sections, title, subtitle, navPath }, { state, api, dialogs, router }) {
    if (new.target === Page) throw new TypeError("Page is abstract");
    this.sections = sections;
    this.title = title;
    this.subtitle = subtitle;
    this.navPath = navPath; // which sidebar link is highlighted
    this.state = state;
    this.api = api;
    this.dialogs = dialogs;
    this.router = router;
  }

  init() {}

  async enter(params = {}) {
    this.#showSections();
    window.scrollTo({ top: 0 });
    await this.onEnter(params);
  }

  leave() {}

  /** Override in subclasses. */
  async onEnter() {}

  #showSections() {
    Page.ALL_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = this.sections.includes(id) ? "" : "none";
    });
  }
}

/* ============================== MealsPage  -> /home ============================== */
/** /home — search, cuisines, meal types and the recipes grid */
class MealsPage extends Page {
  #loaded = false;

  constructor(services) {
    super(
      {
        sections: ["search-filters-section", "meal-categories-section", "all-recipes-section"],
        title: "Meals & Recipes",
        subtitle: "Discover delicious and nutritious recipes tailored for you",
        navPath: "/home",
      },
      services
    );
  }

  /* ---------- lifecycle ---------- */
  init() {
    // search (debounced)
    $("#search-input").addEventListener(
      "input",
      debounce((e) => {
        this.state.searchQuery = e.target.value.trim();
        this.loadMeals();
      })
    );

    // meal-type cards
    $("#categories-grid").addEventListener("click", (e) => {
      const card = e.target.closest(".category-card");
      if (!card) return;
      const name = card.dataset.category;
      this.state.activeCategory = this.state.activeCategory === name ? "" : name;
      this.#markActiveCategory();
      this.loadMeals();
    });

    // "View All" expands / collapses the category list
    $("#view-all-categories").addEventListener("click", () => {
      this.state.showAllCategories = !this.state.showAllCategories;
      this.#renderCategories();
    });

    // cuisine chips
    $("#search-filters-section .overflow-x-auto").addEventListener("click", (e) => {
      const chip = e.target.closest(".area-chip");
      if (!chip) return;
      this.state.activeArea = chip.dataset.area;
      $$("#search-filters-section .area-chip").forEach((c) => {
        c.className = c.className.replace(
          /bg-emerald-600 text-white hover:bg-emerald-700|bg-gray-100 text-gray-700 hover:bg-gray-200/,
          c === chip ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        );
      });
      this.loadMeals();
    });

    // recipe card -> /meal/:id
    this.#grid.addEventListener("click", (e) => {
      const card = e.target.closest(".recipe-card");
      if (card) this.router.navigate(`/meal/${card.dataset.mealId}`);
    });

    // retry buttons rendered by errorState()
    $("#meal-categories-section").addEventListener("click", (e) => {
      if (e.target.closest('[data-retry="categories"]')) this.loadCategoriesAndAreas();
    });
    $("#all-recipes-section").addEventListener("click", (e) => {
      if (e.target.closest('[data-retry="meals"]')) this.loadMeals();
    });

    this.#initViewToggle();
  }

  async onEnter() {
    if (this.#loaded) return; // keep filters / results when coming back
    this.#loaded = true;
    await Promise.allSettled([this.loadCategoriesAndAreas(), this.loadMeals()]);
  }

  /* ---------- data ---------- */
  async loadMeals() {
    const { searchQuery: q, activeCategory: category, activeArea: area } = this.state;
    this.#grid.innerHTML = ui.loadingSpinner();
    this.#setCount("Loading recipes...");

    try {
      let meals;
      if (q) {
        const res = await this.api.searchMeals(q, 1, 25);
        meals = (res.results || []).filter((m) => (!category || m.category === category) && (!area || m.area === area));
      } else if (category || area) {
        meals = (await this.api.filterMeals({ category, area, limit: 25 })).results || [];
      } else {
        meals = (await this.api.searchMeals("", 1, 25)).results || [];
        if (!meals.length) meals = (await this.api.getRandomMeals(12)).results || [];
      }
      this.#renderRecipes(meals);
    } catch (err) {
      console.error(err);
      this.#grid.innerHTML = ui.errorState("Couldn't load recipes. Check your connection.", "meals");
      this.#setCount("Failed to load recipes");
    }
  }

  async loadCategoriesAndAreas() {
    const box = $("#categories-grid");
    box.innerHTML = ui.loadingSpinner();
    try {
      const [cats, areas] = await Promise.all([
        this.api.getCategories(),
        this.api.getAreas().catch(() => ({ results: [] })),
      ]);
      this.state.categories = cats.results || [];
      this.#renderCategories();
      this.#renderAreas(areas.results || []);
    } catch (err) {
      console.error(err);
      box.innerHTML = ui.errorState("Couldn't load categories", "categories");
    }
  }

  /* ---------- rendering ---------- */
  get #grid() {
    return $("#recipes-grid");
  }

  #setCount(text) {
    $("#recipes-count").textContent = text;
  }

  #renderRecipes(meals) {
    this.state.meals = meals;
    if (!meals.length) {
      this.#grid.innerHTML = ui.emptyState("No recipes found", "Try searching for something else");
      this.#setCount("Showing 0 recipes");
      return;
    }
    this.#grid.innerHTML = meals.map((m) => ui.recipeCard(m)).join("");
    this.#setCount(`Showing ${meals.length} recipe${meals.length === 1 ? "" : "s"}`);
  }

  #renderCategories() {
    const { categories, showAllCategories } = this.state;
    const list = showAllCategories ? categories : categories.slice(0, 12);
    $("#categories-grid").innerHTML = list.map(ui.categoryCard).join("");
    this.#markActiveCategory();

    const btn = $("#view-all-categories");
    btn.style.display = categories.length > 12 ? "" : "none";
    btn.innerHTML = showAllCategories
      ? 'Show Less <i class="fa-solid fa-chevron-up text-xs"></i>'
      : 'View All <i class="fa-solid fa-chevron-right text-xs"></i>';
  }

  #renderAreas(areas) {
    const bar = $("#search-filters-section .overflow-x-auto");
    const all = ui.areaChip("All Cuisines", !this.state.activeArea).replace('data-area="All Cuisines"', 'data-area=""');
    bar.innerHTML = all + areas.map((a) => ui.areaChip(a.name || a, this.state.activeArea === (a.name || a))).join("");
  }

  #markActiveCategory() {
    $$(".category-card").forEach((c) =>
      c.classList.toggle("active", c.dataset.category === this.state.activeCategory)
    );
  }

  #initViewToggle() {
    const gridBtn = $("#grid-view-btn");
    const listBtn = $("#list-view-btn");
    const setView = (list) => {
      this.#grid.classList.toggle("list-view", list);
      this.#grid.classList.toggle("grid-cols-4", !list);
      gridBtn.className = list ? "px-3 py-1.5" : "px-3 py-1.5 bg-white rounded-md shadow-sm";
      listBtn.className = list ? "px-3 py-1.5 bg-white rounded-md shadow-sm" : "px-3 py-1.5";
      $("i", gridBtn).className = `fa-solid fa-table-cells ${list ? "text-gray-500" : "text-gray-700"}`;
      $("i", listBtn).className = `fa-solid fa-list ${list ? "text-gray-700" : "text-gray-500"}`;
    };
    gridBtn.addEventListener("click", () => setView(false));
    listBtn.addEventListener("click", () => setView(true));
  }
}

/* ============================== MealDetailsPage  -> /meal/:id ============================== */
/** /meal/:id — a single recipe with ingredients, steps, video and nutrition */
class MealDetailsPage extends Page {
  constructor(services) {
    super(
      {
        sections: ["meal-details"],
        title: "Meals & Recipes",
        subtitle: "Discover delicious and nutritious recipes tailored for you",
        navPath: "/home",
      },
      services
    );
  }

  get #section() {
    return $("#meal-details");
  }

  get #usdaKey() {
    return this.state.usdaKey || DEFAULT_USDA_KEY;
  }

  /* ---------- lifecycle ---------- */
  init() {
    // the section is re-rendered, so listen on the container
    this.#section.addEventListener("click", (e) => {
      if (e.target.closest("#back-to-meals-btn")) return this.router.back("/home");
      if (e.target.closest("#log-meal-btn")) return this.#logMeal();
      if (e.target.closest("#fav-meal-btn")) return this.#toggleFavorite();
      if (e.target.closest("#analyze-nutrition-btn")) return this.#analyze();
      const retry = e.target.closest("[data-retry]");
      if (retry) this.#load(retry.dataset.retry.replace("meal:", ""));
    });
  }

  async onEnter({ id }) {
    await this.#load(id);
  }

  /* ---------- data ---------- */
  async #load(id) {
    this.state.currentNutrition = null;
    this.#section.innerHTML = `<div class="max-w-7xl mx-auto">${ui.loadingSpinner()}</div>`;
    try {
      const res = await this.api.getMealById(id);
      this.state.currentMeal = res.result || res.results?.[0] || res.meal || res;
      this.#render();
      if (this.#usdaKey) this.#analyze({ silent: true });
    } catch (err) {
      console.error(err);
      this.#section.innerHTML = `
        <div class="max-w-7xl mx-auto">
          <button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6">
            <i class="fa-solid fa-arrow-left"></i><span>Back to Recipes</span>
          </button>
          ${ui.errorState("Couldn't load this recipe", `meal:${id}`)}
        </div>`;
    }
  }

  #render() {
    const meal = this.state.currentMeal;
    this.#section.innerHTML = ui.mealDetails(meal, {
      nutrition: this.state.currentNutrition,
      fav: this.state.isFavorite(meal.id),
    });
  }

  /* ---------- actions ---------- */
  async #ensureKey() {
    if (this.#usdaKey) return this.#usdaKey;
    const key = await this.dialogs.askUsdaKey();
    if (key) this.state.usdaKey = key;
    return key;
  }

  async #analyze({ silent = false } = {}) {
    const meal = this.state.currentMeal;
    if (!meal) return null;
    const key = silent ? this.#usdaKey : await this.#ensureKey();
    if (!key) return null;

    const box = $("#nutrition-facts-container");
    if (box) box.innerHTML = ui.loadingSpinner();
    try {
      const ingredients = (meal.ingredients || []).map((i) => `${i.measure || ""} ${i.ingredient || ""}`.trim());
      const raw = await this.api.analyzeNutrition(meal.name, ingredients, key);
      this.state.currentNutrition = ui.extractNutrition(raw);
      if (!this.state.currentNutrition) throw new Error("No nutrition data returned");
      if (this.state.currentMeal?.id === meal.id) this.#render();
      return this.state.currentNutrition;
    } catch (err) {
      console.error(err);
      if (box) box.innerHTML = ui.nutritionFacts(null);
      if (!silent) this.dialogs.toast("error", "Couldn't analyze nutrition (check your USDA key)");
      return null;
    }
  }

  async #logMeal() {
    const meal = this.state.currentMeal;
    if (!meal) return;
    // never prompts for a key while logging
    const n = this.state.currentNutrition || (await this.#analyze({ silent: true }));
    this.state.addLogItem({
      type: "meal",
      name: meal.name,
      detail: `${meal.category || "Meal"} · 1 serving`,
      image: meal.thumbnail,
      calories: n?.calories || 0,
      protein: n?.protein || 0,
      carbs: n?.carbs || 0,
      fat: n?.fat || 0,
    });
    this.dialogs.toast(n ? "success" : "info", n ? "Meal added to today's log" : "Logged without nutrition data");
  }

  #toggleFavorite() {
    const saved = this.state.toggleFavorite(this.state.currentMeal);
    const btn = $("#fav-meal-btn");
    $("i", btn).className = `${saved ? "fa-solid" : "fa-regular"} fa-heart`;
    $("span", btn).textContent = saved ? "Saved" : "Save Recipe";
    this.dialogs.toast("success", saved ? "Saved to favorites" : "Removed from favorites");
  }
}

/* ============================== ProductsPage  -> /products ============================== */
/** /products — search by name, barcode lookup, Nutri-Score filter, categories */
class ProductsPage extends Page {
  constructor(services) {
    super(
      {
        sections: ["products-section"],
        title: "Product Scanner",
        subtitle: "Search packaged food by name or barcode",
        navPath: "/products",
      },
      services
    );
  }

  /* ---------- lifecycle ---------- */
  init() {
    $("#product-categories").innerHTML = ui.productCategoryButtons();
    this.#grid.innerHTML = ui.productsEmptyState();

    $("#search-product-btn").addEventListener("click", () => this.search());
    $("#product-search-input").addEventListener("keydown", (e) => e.key === "Enter" && this.search());
    $("#lookup-barcode-btn").addEventListener("click", () => this.lookupBarcode());
    $("#barcode-input").addEventListener("keydown", (e) => e.key === "Enter" && this.lookupBarcode());

    $$(".nutri-score-filter").forEach((btn) =>
      btn.addEventListener("click", () => {
        this.state.productFilter = btn.dataset.grade || "";
        this.#markGradeButtons();
        this.#render();
      })
    );

    $("#product-categories").addEventListener("click", (e) => {
      const btn = e.target.closest(".product-category-btn");
      if (!btn) return;
      $$(".product-category-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      $("#product-search-input").value = "";
      this.#request(() => this.api.getProductsByCategory(btn.dataset.category, 1, 24));
    });

    this.#grid.addEventListener("click", (e) => {
      const card = e.target.closest(".product-card");
      if (card) this.#openProduct(card.dataset.barcode);
    });

    this.#markGradeButtons();
  }

  /* ---------- actions ---------- */
  search() {
    const q = $("#product-search-input").value.trim();
    if (!q) return this.dialogs.toast("warning", "Enter a product name to search");
    $$(".product-category-btn").forEach((b) => b.classList.remove("active"));
    this.#request(() => this.api.searchProducts(q, 1, 24));
  }

  lookupBarcode() {
    const code = $("#barcode-input").value.replace(/\s+/g, "");
    if (!/^\d{8,14}$/.test(code)) return this.dialogs.toast("warning", "Enter a valid barcode (8–14 digits)");
    this.#request(() => this.api.getProductByBarcode(code), "Product not found");
  }

  async #request(fetcher, emptyTitle = "No products found") {
    this.#grid.innerHTML = ui.loadingSpinner();
    this.#count.textContent = "Searching...";
    try {
      const res = await fetcher();
      const list = res.results || (res.result ? [res.result] : res.product ? [res.product] : []);
      this.state.products = list;
      if (!list.length) {
        this.#grid.innerHTML = ui.emptyState(emptyTitle, "Try a different search term", "fa-box-open");
        this.#count.textContent = "No products found";
        return;
      }
      this.#render();
    } catch (err) {
      console.error(err);
      this.state.products = [];
      if (err.status === 404) {
        this.#grid.innerHTML = ui.emptyState("Product not found", "Check the barcode and try again", "fa-barcode");
        this.#count.textContent = "No products found";
      } else {
        this.#grid.innerHTML = ui.errorState("Couldn't load products. Please try again.");
        this.#count.textContent = "Failed to load products";
      }
    }
  }

  async #openProduct(barcode) {
    const product = this.state.products.find((p) => p.barcode === barcode);
    if (!product) return;
    if (await this.dialogs.showProduct(ui.productModal(product))) this.#logProduct(product);
  }

  async #logProduct(product) {
    const grams = await this.dialogs.askAmount(product.name);
    if (!grams) return;
    const factor = grams / 100;
    const n = product.nutrients || {};
    this.state.addLogItem({
      type: "product",
      name: product.name,
      detail: `${product.brand || "Product"} · ${grams}g`,
      image: product.image,
      calories: (n.calories || 0) * factor,
      protein: (n.protein || 0) * factor,
      carbs: (n.carbs || 0) * factor,
      fat: (n.fat || 0) * factor,
    });
    this.dialogs.toast("success", "Added to today's food log");
  }

  /* ---------- rendering ---------- */
  get #grid() {
    return $("#products-grid");
  }
  get #count() {
    return $("#products-count");
  }

  #visibleProducts() {
    const { products, productFilter } = this.state;
    return productFilter ? products.filter((p) => String(p.nutritionGrade).toLowerCase() === productFilter) : products;
  }

  #render() {
    const all = this.state.products;
    const list = this.#visibleProducts();
    if (!all.length) return;

    if (!list.length) {
      this.#grid.innerHTML = ui.emptyState(
        `No products with Nutri-Score ${this.state.productFilter.toUpperCase()}`,
        "Try another grade or search again",
        "fa-filter"
      );
      this.#count.textContent = `Showing 0 of ${all.length} products`;
      return;
    }
    this.#grid.innerHTML = list.map(ui.productCard).join("");
    this.#count.textContent = this.state.productFilter
      ? `Showing ${list.length} of ${all.length} products`
      : `Showing ${list.length} product${list.length === 1 ? "" : "s"}`;
  }

  #markGradeButtons() {
    $$(".nutri-score-filter").forEach((b) => {
      const grade = b.dataset.grade || "";
      b.classList.toggle("active", !!grade && grade === this.state.productFilter);
    });
  }
}

/* ============================== FoodLogPage  -> /foodlog ============================== */
/** /foodlog — today's nutrition, logged items, weekly overview */
class FoodLogPage extends Page {
  constructor(services) {
    super(
      {
        sections: ["foodlog-section"],
        title: "Food Log",
        subtitle: "Track and monitor your daily nutrition intake",
        navPath: "/foodlog",
      },
      services
    );
  }

  init() {
    $("#foodlog-section").addEventListener("click", async (e) => {
      const remove = e.target.closest("[data-remove-log]");
      if (remove) {
        this.state.removeLogItem(remove.dataset.removeLog);
        return this.render();
      }

      if (e.target.closest("#clear-foodlog")) return this.#clearToday();

      const shortcut = e.target.closest("[data-path]");
      if (shortcut) this.router.navigate(shortcut.dataset.path);
    });
  }

  async onEnter() {
    this.render(); // always fresh: items may have been logged on other pages
  }

  render() {
    $("#foodlog-date").textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const items = this.state.getLogForDate();
    $("#foodlog-today-section").innerHTML = ui.foodLogToday(items, AppState.totals(items), this.state.goals);

    const week = this.state.weekOverview();
    $("#weekly-chart").innerHTML = ui.weeklyOverview(week);
    $("#foodlog-stats").innerHTML = ui.foodLogStats(this.state.weekStats(week));
  }

  async #clearToday() {
    const ok = await this.dialogs.confirm({
      title: "Clear today's log?",
      text: "This removes all items logged today.",
      confirmText: "Yes, clear all",
    });
    if (!ok) return;
    this.state.clearToday();
    this.render();
  }
}

/* ============================== App ============================== */
/** Wires the router, the shared services and the pages together. */
class App {
  #current = null;

  constructor() {
    this.router = new Router();
    this.sidebar = new ui.Sidebar();
    this.overlay = new ui.LoadingOverlay();

    const services = { state: appState, api, dialogs: new ui.Dialogs(), router: this.router };
    this.pages = {
      meals: new MealsPage(services),
      mealDetails: new MealDetailsPage(services),
      products: new ProductsPage(services),
      foodlog: new FoodLogPage(services),
    };
  }

  async start() {
    this.overlay.show();
    this.sidebar.init();
    Object.values(this.pages).forEach((page) => page.init());

    this.router
      .add("/", () => this.router.navigate("/home", { replace: true }))
      .add("/index.html", () => this.router.navigate("/home", { replace: true }))
      .add("/home", () => this.#show(this.pages.meals))
      .add("/meal/:id", (params) => this.#show(this.pages.mealDetails, params))
      .add("/products", () => this.#show(this.pages.products))
      .add("/foodlog", () => this.#show(this.pages.foodlog));

    await this.router.start();
    this.overlay.hide();
  }

  async #show(page, params) {
    this.#current?.leave();
    this.#current = page;

    this.#renderHeader(page);
    this.#highlightNav(page.navPath);
    this.sidebar.close();

    await page.enter(params);
  }

  #renderHeader(page) {
    $("#header h1").textContent = page.title;
    $("#header p").textContent = page.subtitle;
    document.title = `${page.title} - NutriPlan`;
  }

  #highlightNav(path) {
    $$(".nav-link").forEach((link) => {
      const active = new URL(link.href).pathname === path;
      link.classList.toggle("bg-emerald-50", active);
      link.classList.toggle("text-emerald-700", active);
      link.classList.toggle("text-gray-600", !active);
      link.classList.toggle("hover:bg-gray-50", !active);
      const label = $("span", link);
      label.classList.toggle("font-semibold", active);
      label.classList.toggle("font-medium", !active);
    });
  }
}

/* ============================== bootstrap ============================== */
new App().start();
