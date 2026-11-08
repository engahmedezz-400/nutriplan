// Central app state + localStorage persistence

/** Safe wrapper around localStorage (never throws). */
export class StorageService {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }
}

export class AppState {
  static KEYS = {
    favorites: "nutriplan_favorites",
    foodlog: "nutriplan_foodlog",
    usdaKey: "nutriplan_usda_key",
  };

  #storage;

  constructor(storage = new StorageService()) {
    this.#storage = storage;

    // meals page
    this.meals = [];
    this.categories = [];
    this.showAllCategories = false;
    this.activeCategory = "";
    this.activeArea = "";
    this.searchQuery = "";
    this.currentMeal = null;
    this.currentNutrition = null;

    // products page
    this.products = [];
    this.productFilter = ""; // "" (all) | a | b | c | d | e

    // persisted
    this.favorites = storage.get(AppState.KEYS.favorites, []);
    // foodlog: { "YYYY-MM-DD": [ {id, name, detail, image, calories, protein, carbs, fat, time} ] }
    this.foodlog = storage.get(AppState.KEYS.foodlog, {});
    this.goals = { calories: 2000, protein: 50, carbs: 250, fat: 65 };
  }

  static dateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /* ---------- Favorites ---------- */
  isFavorite(id) {
    return this.favorites.some((m) => m.id === id);
  }

  toggleFavorite(meal) {
    if (this.isFavorite(meal.id)) {
      this.favorites = this.favorites.filter((m) => m.id !== meal.id);
    } else {
      this.favorites.push({ id: meal.id, name: meal.name, thumbnail: meal.thumbnail });
    }
    this.#storage.set(AppState.KEYS.favorites, this.favorites);
    return this.isFavorite(meal.id);
  }

  /* ---------- Food log ---------- */
  getLogForDate(key = AppState.dateKey()) {
    return this.foodlog[key] || [];
  }

  addLogItem(item) {
    const key = AppState.dateKey();
    const list = this.getLogForDate(key);
    list.push({
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toISOString(),
    });
    this.foodlog[key] = list;
    this.#storage.set(AppState.KEYS.foodlog, this.foodlog);
  }

  removeLogItem(id) {
    const key = AppState.dateKey();
    this.foodlog[key] = this.getLogForDate(key).filter((i) => i.id !== id);
    this.#storage.set(AppState.KEYS.foodlog, this.foodlog);
  }

  clearToday() {
    this.foodlog[AppState.dateKey()] = [];
    this.#storage.set(AppState.KEYS.foodlog, this.foodlog);
  }

  static totals(items) {
    return items.reduce(
      (t, i) => ({
        calories: t.calories + (+i.calories || 0),
        protein: t.protein + (+i.protein || 0),
        carbs: t.carbs + (+i.carbs || 0),
        fat: t.fat + (+i.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  /** Current week, Sunday -> Saturday */
  weekOverview() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const items = this.getLogForDate(AppState.dateKey(d));
      days.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.getDate(),
        calories: Math.round(AppState.totals(items).calories),
        count: items.length,
        isToday: AppState.dateKey(d) === AppState.dateKey(today),
      });
    }
    return days;
  }

  weekStats(week = this.weekOverview()) {
    const logged = week.filter((d) => d.calories > 0);
    const goal = this.goals.calories;
    return {
      average: logged.length ? logged.reduce((t, d) => t + d.calories, 0) / logged.length : 0,
      items: week.reduce((t, d) => t + d.count, 0),
      // a day is "on goal" when intake lands within 10% of the calorie goal
      daysOnGoal: week.filter((d) => d.calories >= goal * 0.9 && d.calories <= goal * 1.1).length,
    };
  }

  /* ---------- USDA key ---------- */
  get usdaKey() {
    return this.#storage.get(AppState.KEYS.usdaKey, "");
  }
  set usdaKey(value) {
    this.#storage.set(AppState.KEYS.usdaKey, value);
  }
}

export const appState = new AppState();
