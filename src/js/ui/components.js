// =========== UI Components ============
// Every function returns an HTML string that reuses the classes already
// present in index.css / index.html so the result matches the design.

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const num = (n, d = 0) => (Number.isFinite(+n) ? +(+n).toFixed(d) : 0);

const NO_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='50%' fill='#9ca3af' font-family='sans-serif' font-size='18' text-anchor='middle'>No image</text></svg>"
  );

// =========== Loading Spinner Design ============
export const loadingSpinner = () => `
  <div class="flex items-center justify-center py-12 col-span-full">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
  </div>`;

// =========== Empty State Design ============
export const emptyState = (title = "No recipes found", sub = "Try searching for something else", icon = "fa-search") => `
  <div class="flex flex-col items-center justify-center py-12 text-center col-span-full">
    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <i class="fa-solid ${icon} text-gray-400 text-2xl"></i>
    </div>
    <p class="text-gray-500 text-lg">${esc(title)}</p>
    ${sub ? `<p class="text-gray-400 text-sm mt-2">${esc(sub)}</p>` : ""}
  </div>`;

// =========== Error State ============
export const errorState = (message = "Something went wrong", retry = "") => `
  <div class="flex flex-col items-center justify-center py-12 text-center col-span-full">
    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
      <i class="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
    </div>
    <p class="text-gray-700 text-lg">${esc(message)}</p>
    ${
      retry
        ? `<button data-retry="${esc(retry)}" class="mt-4 px-5 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all">
             <i class="fa-solid fa-rotate-right mr-2"></i>Try again
           </button>`
        : ""
    }
  </div>`;

/* ================= Meals ================= */
// [icon, card bg, border, icon gradient from, icon gradient to]
const CATEGORY_THEME = {
  Beef: ["fa-drumstick-bite", "#fef2f2", "#fecaca", "#f87171", "#ef4444"],
  Chicken: ["fa-drumstick-bite", "#fffbeb", "#fde68a", "#fbbf24", "#f97316"],
  Dessert: ["fa-cake-candles", "#fdf2f8", "#fbcfe8", "#f472b6", "#ec4899"],
  Lamb: ["fa-drumstick-bite", "#fff7ed", "#fed7aa", "#fb923c", "#f97316"],
  Miscellaneous: ["fa-bowl-food", "#f8fafc", "#e2e8f0", "#94a3b8", "#64748b"],
  Pasta: ["fa-bowl-rice", "#fefce8", "#fde68a", "#fbbf24", "#f59e0b"],
  Pork: ["fa-bacon", "#fef2f2", "#fecaca", "#f87171", "#ef4444"],
  Seafood: ["fa-fish", "#eff6ff", "#bfdbfe", "#38bdf8", "#3b82f6"],
  Side: ["fa-plate-wheat", "#f0fdf4", "#bbf7d0", "#4ade80", "#22c55e"],
  Starter: ["fa-utensils", "#ecfeff", "#a5f3fc", "#2dd4bf", "#06b6d4"],
  Vegan: ["fa-leaf", "#f0fdf4", "#bbf7d0", "#34d399", "#10b981"],
  Vegetarian: ["fa-carrot", "#f7fee7", "#d9f99d", "#a3e635", "#84cc16"],
  Breakfast: ["fa-egg", "#fefce8", "#fef08a", "#facc15", "#eab308"],
  Goat: ["fa-drumstick-bite", "#fafaf9", "#e7e5e4", "#a8a29e", "#78716c"],
};
const DEFAULT_THEME = ["fa-utensils", "#ecfdf5", "#a7f3d0", "#34d399", "#10b981"];

export const categoryCard = (c) => {
  const [icon, bg, border, from, to] = CATEGORY_THEME[c.name] || DEFAULT_THEME;
  return `
  <div class="category-card rounded-xl p-3 border hover:shadow-md cursor-pointer transition-all group"
       style="background:${bg};border-color:${border}" data-category="${esc(c.name)}">
    <div class="flex items-center gap-2.5">
      <div class="text-white w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"
           style="background:linear-gradient(135deg,${from},${to})">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div>
        <h3 class="text-sm font-bold text-gray-900">${esc(c.name)}</h3>
      </div>
    </div>
  </div>`;
};

export const areaChip = (name, active) => `
  <button data-area="${esc(name)}"
    class="area-chip px-4 py-2 ${
      active ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    } rounded-full font-medium text-sm whitespace-nowrap transition-all">
    ${esc(name)}
  </button>`;

const snippet = (instructions) => {
  const text = Array.isArray(instructions) ? instructions.join(" ") : String(instructions || "");
  const clean = text.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 120) + (clean.length > 120 ? "…" : "") : "Delicious recipe to try!";
};

export const recipeCard = (m) => {
  const icon = (CATEGORY_THEME[m.category] || DEFAULT_THEME)[0];
  return `
  <div class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group"
       data-meal-id="${esc(m.id)}">
    <div class="relative h-48 overflow-hidden">
      <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
           src="${esc(m.thumbnail || NO_IMAGE)}" alt="${esc(m.name)}" loading="lazy" />
      <div class="absolute bottom-3 left-3 flex gap-2">
        ${
          m.category
            ? `<span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-gray-700"><i class="fa-solid ${icon} text-emerald-600 mr-1"></i>${esc(m.category)}</span>`
            : ""
        }
        ${
          m.area
            ? `<span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-gray-700"><i class="fa-solid fa-globe text-blue-500 mr-1"></i>${esc(m.area)}</span>`
            : ""
        }
      </div>
    </div>
    <div class="p-4">
      <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">${esc(m.name)}</h3>
      <p class="text-xs text-gray-600 mb-3 line-clamp-2">${esc(snippet(m.instructions))}</p>
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-gray-900"><i class="fa-solid ${icon} text-emerald-600 mr-1"></i>${esc(m.category || "Meal")}</span>
        <span class="font-semibold text-gray-500"><i class="fa-solid fa-globe text-blue-500 mr-1"></i>${esc(m.area || "International")}</span>
      </div>
    </div>
  </div>`;
};

/* ---- Nutrition normalisation (USDA analyze endpoint) ---- */
export function extractNutrition(raw) {
  if (!raw) return null;
  const d = raw.data || raw.result || raw;
  const pick = (o) => o && typeof o === "object" && Number.isFinite(+(o.calories ?? o.kcal ?? o.energy)) ? o : null;
  const servings = +(d.servings || d.recipe?.servings || 1) || 1;
  let per = pick(d.perServing) || pick(d.per_serving) || pick(d.nutrition?.perServing);
  let total = pick(d.totals) || pick(d.total) || pick(d.nutrition?.totals) || pick(d.nutrition) || pick(d);
  if (!per && !total) return null;
  const src = per || total;
  const k = (o, ...keys) => {
    for (const key of keys) if (o[key] !== undefined && o[key] !== null) return +o[key] || 0;
    return 0;
  };
  const div = per ? 1 : servings;
  const out = {
    servings,
    calories: k(src, "calories", "kcal", "energy") / div,
    protein: k(src, "protein") / div,
    carbs: k(src, "carbs", "carbohydrates") / div,
    fat: k(src, "fat", "totalFat") / div,
    fiber: k(src, "fiber", "fibre") / div,
    sugar: k(src, "sugar", "sugars") / div,
  };
  out.totalCalories = k(total || src, "calories", "kcal", "energy") / (total ? 1 : 1);
  return out;
}

const embedUrl = (url = "") => {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : "";
};

const macroRow = (label, value, unit, color, max) => `
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-${color}-500"></div>
      <span class="text-gray-700">${label}</span>
    </div>
    <span class="font-bold text-gray-900">${num(value, 1)}${unit}</span>
  </div>
  <div class="w-full bg-gray-100 rounded-full h-2">
    <div class="bg-${color}-500 h-2 rounded-full" style="width: ${Math.min(100, (value / max) * 100)}%"></div>
  </div>`;

export const nutritionFacts = (n) =>
  n
    ? `
  <p class="text-sm text-gray-500 mb-4">Per serving</p>
  <div class="text-center py-4 mb-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl">
    <p class="text-sm text-gray-600">Calories per serving</p>
    <p class="text-4xl font-bold text-emerald-600">${num(n.calories)}</p>
    <p class="text-xs text-gray-500 mt-1">Total: ${num(n.calories * n.servings)} cal · ${n.servings} servings</p>
  </div>
  <div class="space-y-4">
    ${macroRow("Protein", n.protein, "g", "emerald", 50)}
    ${macroRow("Carbs", n.carbs, "g", "blue", 300)}
    ${macroRow("Fat", n.fat, "g", "purple", 70)}
    ${macroRow("Fiber", n.fiber, "g", "orange", 30)}
    ${macroRow("Sugar", n.sugar, "g", "pink", 50)}
  </div>`
    : `
  <div class="text-center py-6">
    <i class="fa-solid fa-chart-pie text-4xl mb-3 text-gray-300"></i>
    <p class="text-gray-600 font-medium">Nutrition data not loaded</p>
    <p class="text-sm text-gray-400 mb-4">Analyze the ingredients with the USDA database</p>
    <button id="analyze-nutrition-btn" class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all">
      <i class="fa-solid fa-flask mr-2"></i>Analyze Nutrition
    </button>
  </div>`;

export const mealDetails = (m, { nutrition = null, fav = false } = {}) => {
  const ingredients = m.ingredients || [];
  const steps = (Array.isArray(m.instructions) ? m.instructions : String(m.instructions || "").split(/\r?\n/))
    .map((s) => s.trim())
    .filter(Boolean);
  const video = embedUrl(m.youtube);
  const tag = Array.isArray(m.tags) ? m.tags[0] : (m.tags || "").split(",")[0];

  return `
  <div class="max-w-7xl mx-auto">
    <button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors">
      <i class="fa-solid fa-arrow-left"></i><span>Back to Recipes</span>
    </button>

    <div class="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
      <div class="relative h-80 md:h-96">
        <img src="${esc(m.thumbnail || NO_IMAGE)}" alt="${esc(m.name)}" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-8">
          <div class="flex items-center gap-3 mb-3">
            ${m.category ? `<span class="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">${esc(m.category)}</span>` : ""}
            ${m.area ? `<span class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">${esc(m.area)}</span>` : ""}
            ${tag ? `<span class="px-3 py-1 bg-purple-500 text-white text-sm font-semibold rounded-full">${esc(tag)}</span>` : ""}
          </div>
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">${esc(m.name)}</h1>
          <div class="flex items-center gap-6 text-white/90">
            <span class="flex items-center gap-2"><i class="fa-solid fa-list-check"></i><span>${ingredients.length} ingredients</span></span>
            ${
              nutrition
                ? `<span class="flex items-center gap-2"><i class="fa-solid fa-utensils"></i><span id="hero-servings">${nutrition.servings} servings</span></span>
                   <span class="flex items-center gap-2"><i class="fa-solid fa-fire"></i><span id="hero-calories">${num(nutrition.calories)} cal/serving</span></span>`
                : ""
            }
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-3 mb-8">
      <button id="log-meal-btn" class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all" data-meal-id="${esc(m.id)}">
        <i class="fa-solid fa-clipboard-list"></i><span>Log This Meal</span>
      </button>
      <button id="fav-meal-btn" class="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all" data-meal-id="${esc(m.id)}">
        <i class="${fav ? "fa-solid" : "fa-regular"} fa-heart"></i><span>${fav ? "Saved" : "Save Recipe"}</span>
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-8">
        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-list-check text-emerald-600"></i> Ingredients
            <span class="text-sm font-normal text-gray-500 ml-auto">${ingredients.length} items</span>
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${ingredients
              .map(
                (i) => `
              <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
                <input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300" />
                <span class="text-gray-700"><span class="font-medium text-gray-900">${esc(i.measure || "")}</span> ${esc(i.ingredient || "")}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-lg p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-shoe-prints text-emerald-600"></i> Instructions
          </h2>
          <div class="space-y-4">
            ${steps
              .map(
                (s, i) => `
              <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">${i + 1}</div>
                <p class="text-gray-700 leading-relaxed pt-2">${esc(s)}</p>
              </div>`
              )
              .join("")}
          </div>
        </div>

        ${
          video
            ? `<div class="bg-white rounded-2xl shadow-lg p-6">
                <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i class="fa-solid fa-video text-red-500"></i> Video Tutorial
                </h2>
                <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                  <iframe src="${esc(video)}" class="absolute inset-0 w-full h-full" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
              </div>`
            : ""
        }
      </div>

      <div class="space-y-6">
        <div class="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
          <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-chart-pie text-emerald-600"></i> Nutrition Facts
          </h2>
          <div id="nutrition-facts-container">${nutritionFacts(nutrition)}</div>
        </div>
      </div>
    </div>
  </div>`;
};

/* ================= Products ================= */
const GRADE_BG = { a: "bg-green-500", b: "bg-lime-500", c: "bg-yellow-500", d: "bg-orange-500", e: "bg-red-500" };
const NOVA_BG = { 1: "bg-green-500", 2: "bg-lime-500", 3: "bg-orange-500", 4: "bg-red-500" };
const NOVA_LABEL = { 1: "Unprocessed", 2: "Processed ingredients", 3: "Processed", 4: "Ultra-processed" };

export const gradeBadge = (grade, cls = "absolute top-2 left-2") => {
  const g = String(grade || "").toLowerCase();
  const known = GRADE_BG[g];
  return `<div class="${cls} ${known || "bg-gray-400"} text-white text-xs font-bold px-2 py-1 rounded uppercase">
    Nutri-Score ${known ? g.toUpperCase() : "?"}
  </div>`;
};

export const novaBadge = (nova) =>
  nova
    ? `<div class="absolute top-2 right-2 ${NOVA_BG[nova] || "bg-gray-400"} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
            title="NOVA ${nova} - ${NOVA_LABEL[nova] || ""}">${nova}</div>`
    : "";

export const productCard = (p) => {
  const n = p.nutrients || {};
  return `
  <div class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-barcode="${esc(p.barcode)}">
    <div class="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
      <img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
           src="${esc(p.image || NO_IMAGE)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${NO_IMAGE}'" />
      ${gradeBadge(p.nutritionGrade)}
      ${novaBadge(p.novaGroup)}
    </div>
    <div class="p-4">
      <p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${esc(p.brand || "Unknown brand")}</p>
      <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">${esc(p.name || "Unnamed product")}</h3>
      <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span><i class="fa-solid fa-fire mr-1"></i>${num(n.calories)} kcal/100g</span>
      </div>
      <div class="grid grid-cols-4 gap-1 text-center">
        <div class="bg-emerald-50 rounded p-1.5"><p class="text-xs font-bold text-emerald-700">${num(n.protein, 1)}g</p><p class="text-[10px] text-gray-500">Protein</p></div>
        <div class="bg-blue-50 rounded p-1.5"><p class="text-xs font-bold text-blue-700">${num(n.carbs, 1)}g</p><p class="text-[10px] text-gray-500">Carbs</p></div>
        <div class="bg-purple-50 rounded p-1.5"><p class="text-xs font-bold text-purple-700">${num(n.fat, 1)}g</p><p class="text-[10px] text-gray-500">Fat</p></div>
        <div class="bg-orange-50 rounded p-1.5"><p class="text-xs font-bold text-orange-700">${num(n.sugar, 1)}g</p><p class="text-[10px] text-gray-500">Sugar</p></div>
      </div>
    </div>
  </div>`;
};

// HTML shown inside the SweetAlert2 product modal
export const productModal = (p) => {
  const n = p.nutrients || {};
  const row = (label, v, unit) =>
    `<div class="flex justify-between py-2 border-b border-gray-100 text-sm"><span class="text-gray-600">${label}</span><span class="font-semibold text-gray-900">${num(v, 2)} ${unit}</span></div>`;
  return `
  <div class="text-left">
    <div class="relative h-48 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center mb-4">
      <img class="w-full h-full object-contain" src="${esc(p.image || NO_IMAGE)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src='${NO_IMAGE}'" />
      ${gradeBadge(p.nutritionGrade)}
      ${novaBadge(p.novaGroup)}
    </div>
    <p class="text-xs text-emerald-600 font-semibold mb-1">${esc(p.brand || "Unknown brand")}</p>
    <h3 class="text-lg font-bold text-gray-900 mb-1">${esc(p.name)}</h3>
    <p class="text-xs text-gray-500 mb-4"><i class="fa-solid fa-barcode mr-1"></i>${esc(p.barcode)}</p>
    <h4 class="text-sm font-semibold text-gray-900 mb-2">Nutrition per 100g</h4>
    ${row("Calories", n.calories, "kcal")}${row("Protein", n.protein, "g")}${row("Carbs", n.carbs, "g")}
    ${row("Sugar", n.sugar, "g")}${row("Fat", n.fat, "g")}${row("Fiber", n.fiber, "g")}${row("Sodium", n.sodium, "g")}
  </div>`;
};

// [api id, label, icon, gradient from, gradient to]
export const PRODUCT_CATEGORIES = [
  ["breakfast-cereals", "Breakfast Cereals", "fa-wheat-awn", "#f97316", "#ef4444"],
  ["beverages", "Beverages", "fa-bottle-water", "#06b6d4", "#3b82f6"],
  ["snacks", "Snacks", "fa-cookie-bite", "#ec4899", "#a855f7"],
  ["dairies", "Dairy Products", "fa-cheese", "#3b82f6", "#06b6d4"],
  ["fruits", "Fruits", "fa-apple-whole", "#ef4444", "#ec4899"],
  ["vegetables", "Vegetables", "fa-carrot", "#22c55e", "#10b981"],
  ["breads", "Bread", "fa-bread-slice", "#f59e0b", "#ca8a04"],
  ["meats", "Meat", "fa-drumstick-bite", "#f43f5e", "#dc2626"],
  ["fishes", "Fish & Seafood", "fa-fish", "#06b6d4", "#0ea5e9"],
  ["chocolates", "Chocolates", "fa-candy-cane", "#a16207", "#78350f"],
  ["cheeses", "Cheeses", "fa-cheese", "#eab308", "#f59e0b"],
  ["pastas", "Pasta", "fa-bowl-rice", "#fb923c", "#f59e0b"],
  ["sauces", "Sauces", "fa-jar", "#dc2626", "#b91c1c"],
  ["desserts", "Desserts", "fa-ice-cream", "#d946ef", "#8b5cf6"],
];

export const productCategoryButtons = () =>
  PRODUCT_CATEGORIES.map(
    ([id, label, icon, from, to]) => `
  <button class="product-category-btn px-4 py-2 text-white rounded-xl text-sm font-medium whitespace-nowrap hover:shadow-md transition-all"
          style="background:linear-gradient(90deg,${from},${to})" data-category="${id}">
    <i class="fa-solid ${icon} mr-1.5"></i>${label}
  </button>`
  ).join("");

export const productsEmptyState = () => `
  <div class="flex flex-col items-center justify-center py-16 text-center col-span-full">
    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <i class="fa-solid fa-box-open text-gray-400 text-2xl"></i>
    </div>
    <p class="text-gray-500 text-lg">No products to display</p>
    <p class="text-gray-400 text-sm mt-2">Search for a product or browse by category</p>
  </div>`;

/* ================= Food log ================= */
export const loggedItem = (i) => `
  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
    <div class="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center">
      ${
        i.image
          ? `<img class="w-full h-full object-cover" src="${esc(i.image)}" alt="${esc(i.name)}" onerror="this.style.display='none'" />`
          : `<i class="fa-solid fa-utensils text-gray-300"></i>`
      }
    </div>
    <div class="flex-1 min-w-0">
      <p class="font-semibold text-gray-900 text-sm truncate">${esc(i.name)}</p>
      <p class="text-xs text-gray-500 truncate">${esc(i.detail || i.type || "")} · ${new Date(i.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
    </div>
    <div class="text-right">
      <p class="font-bold text-emerald-600 text-sm">${num(i.calories)} kcal</p>
      <p class="text-xs text-gray-500">P ${num(i.protein, 1)}g · C ${num(i.carbs, 1)}g · F ${num(i.fat, 1)}g</p>
    </div>
    <button class="text-red-500 hover:text-red-600 text-sm ml-2" data-remove-log="${esc(i.id)}" aria-label="Remove item">
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>`;

const progressCard = (label, value, goal, unit, color) => {
  const pct = goal ? (value / goal) * 100 : 0;
  return `
  <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-semibold text-gray-700">${label}</span>
      <span class="text-xs font-semibold" style="color:${color}">${Math.round(pct)}%</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
      <div class="h-2 rounded-full" style="width:${Math.min(100, pct)}%;background:${color}"></div>
    </div>
    <div class="flex items-center justify-between text-xs">
      <span class="font-bold" style="color:${color}">${num(value)} ${unit}</span>
      <span class="text-gray-400">/ ${goal} ${unit}</span>
    </div>
  </div>`;
};

export const foodLogToday = (items, totals, goals) => `
  <h3 class="text-lg font-bold text-gray-900 mb-4">
    <i class="fa-solid fa-fire text-orange-500 mr-2"></i>Today's Nutrition
  </h3>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    ${progressCard("Calories", totals.calories, goals.calories, "kcal", "#059669")}
    ${progressCard("Protein", totals.protein, goals.protein, "g", "#3b82f6")}
    ${progressCard("Carbs", totals.carbs, goals.carbs, "g", "#f59e0b")}
    ${progressCard("Fat", totals.fat, goals.fat, "g", "#a855f7")}
  </div>
  <div class="border-t border-gray-200 pt-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-gray-700">Logged Items (${items.length})</h4>
      <button id="clear-foodlog" class="text-red-500 hover:text-red-600 text-sm font-medium" style="display: ${items.length ? "" : "none"}">
        <i class="fa-solid fa-trash mr-1"></i>Clear All
      </button>
    </div>
    <div id="logged-items-list" class="space-y-2">
      ${
        items.length
          ? items.map(loggedItem).join("")
          : `<div class="flex flex-col items-center justify-center py-10 text-center">
               <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                 <i class="fa-solid fa-utensils text-gray-400 text-2xl"></i>
               </div>
               <p class="text-gray-700 font-medium">No food logged today</p>
               <p class="text-sm text-gray-500" style="margin:4px 0 20px">Start tracking your nutrition by logging meals or scanning products</p>
               <div class="flex gap-3">
                 <button class="quick-log-btn px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all" data-path="/home">
                   <i class="fa-solid fa-plus mr-2"></i>Browse Recipes
                 </button>
                 <button class="quick-log-btn px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all" data-path="/products">
                   <i class="fa-solid fa-barcode mr-2"></i>Scan Product
                 </button>
               </div>
             </div>`
      }
    </div>
  </div>`;

// week = [{ label, date, calories, isToday }]
export const weeklyOverview = (week) => `
  <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px">
    ${week
      .map(
        (d) => `
      <div class="rounded-xl text-center py-3 px-2 ${d.isToday ? "" : "bg-gray-50"}"
           style="${d.isToday ? "background:#dbeafe;" : ""}">
        <p class="text-xs font-medium" style="color:${d.isToday ? "#2563eb" : "#6b7280"}">${d.label}</p>
        <p class="text-lg font-bold" style="color:${d.isToday ? "#1d4ed8" : "#111827"}">${d.date}</p>
        <p class="text-sm font-bold mt-1" style="color:${d.calories ? "#059669" : "#d1d5db"}">${num(d.calories)}</p>
        <p class="text-[10px] text-gray-400">kcal</p>
      </div>`
      )
      .join("")}
  </div>`;

export const foodLogStats = ({ average, items, daysOnGoal }) => {
  const card = (iconBg, iconColor, icon, label, value) => `
    <div class="bg-white rounded-xl p-4 border-2 border-gray-200 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:${iconBg}">
        <i class="fa-solid ${icon} text-xl" style="color:${iconColor}"></i>
      </div>
      <div>
        <p class="text-xs text-gray-500">${label}</p>
        <p class="text-lg font-bold text-gray-900">${value}</p>
      </div>
    </div>`;
  return (
    card("#d1fae5", "#059669", "fa-chart-line", "Weekly Average", `${num(average)} kcal`) +
    card("#dbeafe", "#2563eb", "fa-utensils", "Total Items This Week", `${items} items`) +
    card("#f3e8ff", "#9333ea", "fa-bullseye", "Days On Goal", `${daysOnGoal} / 7`)
  );
};

/* ================= UI services ================= */
/** Thin wrapper around SweetAlert2 so pages never touch `Swal` directly. */
export class Dialogs {
  static GREEN = "#059669";
  static RED = "#dc2626";

  get #swal() {
    return window.Swal;
  }

  toast(icon, title) {
    this.#swal?.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
    });
  }

  async confirm({ title, text, confirmText = "Yes", icon = "warning", color = Dialogs.RED }) {
    const { isConfirmed } = await this.#swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonColor: color,
      confirmButtonText: confirmText,
    });
    return isConfirmed;
  }

  /** @returns {Promise<string|null>} */
  async askUsdaKey() {
    const { value, isConfirmed } = await this.#swal.fire({
      title: "USDA API key",
      text: "Nutrition analysis uses the USDA FoodData Central database. Enter your free API key.",
      input: "text",
      inputPlaceholder: "Your USDA API key",
      showCancelButton: true,
      confirmButtonColor: Dialogs.GREEN,
      inputValidator: (v) => (!v?.trim() ? "A key is required" : undefined),
    });
    return isConfirmed ? value.trim() : null;
  }

  /** @returns {Promise<boolean>} true when the user clicked "Add to Food Log" */
  async showProduct(html) {
    const { isConfirmed } = await this.#swal.fire({
      html,
      width: 560,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-plus mr-2"></i>Add to Food Log',
      cancelButtonText: "Close",
      confirmButtonColor: Dialogs.GREEN,
    });
    return isConfirmed;
  }

  /** @returns {Promise<number|null>} grams */
  async askAmount(productName) {
    const { value, isConfirmed } = await this.#swal.fire({
      title: "Add to Food Log",
      text: productName,
      input: "number",
      inputLabel: "Amount (grams)",
      inputValue: 100,
      inputAttributes: { min: 1, step: 1 },
      showCancelButton: true,
      confirmButtonColor: Dialogs.GREEN,
      inputValidator: (v) => (!(+v > 0) ? "Enter a valid amount" : undefined),
    });
    return isConfirmed ? +value : null;
  }
}

/** Mobile sidebar (the stylesheet drives the slide-in through the `.open` / `.active` classes). */
export class Sidebar {
  #sidebar = document.querySelector("#sidebar");
  #overlay = document.querySelector("#sidebar-overlay");

  init() {
    // markup ships with -translate-x-full / hidden; the stylesheet controls the mobile behaviour
    this.#sidebar.classList.remove("-translate-x-full");
    this.#overlay.classList.remove("hidden");
    document.querySelector("#header-menu-btn").addEventListener("click", () => this.open());
    document.querySelector("#sidebar-close-btn").addEventListener("click", () => this.close());
    this.#overlay.addEventListener("click", () => this.close());
  }

  open() {
    this.#sidebar.classList.add("open");
    this.#overlay.classList.add("active");
  }

  close() {
    this.#sidebar.classList.remove("open");
    this.#overlay.classList.remove("active");
  }
}

/** Full-screen loading overlay shown while the first page loads. */
export class LoadingOverlay {
  #el = document.querySelector("#app-loading-overlay");

  show() {
    this.#el.classList.remove("loading"); // style.css hides `.loading`
    this.#el.style.opacity = "";
  }

  hide() {
    this.#el.style.opacity = "0";
    setTimeout(() => {
      this.#el.classList.add("loading");
      this.#el.style.opacity = "";
    }, 500);
  }
}
