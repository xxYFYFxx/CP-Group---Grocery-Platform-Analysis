/* ===============================
   Consumer App 1:1 logic replica
   (from 2_Consumer_App.py)
================================ */

const LS_KEY = "cp_consumer_state_v1";

const defaultState = {
  user_type: "Auto-detect",     // Auto-detect | Quality Priority | Value Priority
  cart: [],
  chat_history: [],
  behavior_data: {
    quality_clicks: 0,
    price_clicks: 0,
    trace_views: 0,
    discount_views: 0,
    organic_views: 0,
    detected_type: null,
    confidence: 0
  }
};

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    return s ? s : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}
function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

let state = loadState();

/* ==== products (extracted from your Streamlit file) ==== */
const products = [
  {
    name: "Organic Baby Spinach",
    price: 18.9,
    original_price: 22.9,
    quality_score: 0.95,
    stability_score: 0.92,
    origin: "Shandong Province, China",
    certification: "Organic Certification",
    trace_completeness: 0.95,
    category: "Vegetables",
    low_pesticide: true
  },
  {
    name: "Fresh Norwegian Salmon",
    price: 68.0,
    original_price: 78.0,
    quality_score: 0.91,
    stability_score: 0.88,
    origin: "Norway",
    certification: "MSC Certified, Fresh Import",
    trace_completeness: 0.90,
    category: "Seafood",
    low_pesticide: true
  },
  {
    name: "Free-Range Eggs (10pcs)",
    price: 25.9,
    original_price: 28.9,
    quality_score: 0.92,
    stability_score: 0.93,
    origin: "Jiangsu Province, China",
    certification: "Free-range Certified",
    trace_completeness: 0.85,
    category: "Dairy",
    low_pesticide: true
  },
  {
    name: "Premium Organic Strawberries",
    price: 39.9,
    original_price: 49.9,
    quality_score: 0.89,
    stability_score: 0.82,
    origin: "Yunnan Province, China",
    certification: "Organic Certification",
    trace_completeness: 0.92,
    category: "Fruits",
    low_pesticide: true
  },
  {
    name: "Grass-Fed Australian Beef",
    price: 89.9,
    original_price: 98.0,
    quality_score: 0.93,
    stability_score: 0.90,
    origin: "Victoria, Australia",
    certification: "Antibiotic-Free, Quality Certified",
    trace_completeness: 0.88,
    category: "Meat",
    low_pesticide: false
  },
  {
    name: "Fresh Organic Tofu",
    price: 8.9,
    original_price: 10.9,
    quality_score: 0.90,
    stability_score: 0.91,
    origin: "Local Producer",
    certification: "Non-GMO Certified",
    trace_completeness: 0.80,
    category: "Dairy",
    low_pesticide: true
  }
];

/* ==== reviews (demo, like Streamlit dict) ==== */
const reviews = {
  "Organic Baby Spinach": [
    { user: "Sarah M.", rating: 5, comment: "Super fresh and crisp!", date: "2024-12-05", verified: true },
    { user: "David K.", rating: 4, comment: "Great quality. Will buy again.", date: "2024-12-03", verified: true }
  ],
  "Fresh Norwegian Salmon": [
    { user: "Linda T.", rating: 5, comment: "Excellent freshness.", date: "2024-12-06", verified: true }
  ],
  "Free-Range Eggs (10pcs)": [
    { user: "Mike R.", rating: 4, comment: "Clean and reliable quality.", date: "2024-12-02", verified: true }
  ],
  "Premium Organic Strawberries": [
    { user: "Amy W.", rating: 4, comment: "Sweet but a bit delicate.", date: "2024-12-07", verified: true }
  ],
  "Grass-Fed Australian Beef": [
    { user: "Kevin L.", rating: 4, comment: "Good meat, cooks well.", date: "2024-12-08", verified: true }
  ],
  "Fresh Organic Tofu": [
    { user: "Zoe H.", rating: 5, comment: "Very fresh tofu.", date: "2024-12-04", verified: true }
  ]
};

/* ==========================================
   Auto-detect function (1:1 from Python)
========================================== */
function detect_user_preference(behavior_data) {
  const quality_score =
    behavior_data.quality_clicks * 2.0 +
    behavior_data.trace_views * 3.0 +
    behavior_data.organic_views * 2.5;

  const value_score =
    behavior_data.price_clicks * 2.0 +
    behavior_data.discount_views * 3.0;

  const total_score = quality_score + value_score;
  if (total_score === 0) {
    return { type: "Undetermined", confidence: 0, message: "Not enough data. Keep browsing!" };
  }

  let confidence = Math.abs(quality_score - value_score) / total_score * 100;

  // mimic "min_actions = 3" dampening
  const min_actions = 3;
  const total_actions =
    behavior_data.quality_clicks +
    behavior_data.price_clicks +
    behavior_data.trace_views +
    behavior_data.discount_views +
    behavior_data.organic_views;

  if (total_actions < min_actions) confidence = confidence * (total_actions / min_actions);

  const preference_type = quality_score > value_score ? "Quality Priority" : "Value Priority";

  return {
    type: preference_type,
    confidence: Math.min(confidence, 95),
    quality_score,
    value_score
  };
}

/* ==========================================
   Behavior helpers
========================================== */
function bump(key) {
  state.behavior_data[key] = (state.behavior_data[key] || 0) + 1;
  const det = detect_user_preference(state.behavior_data);
  state.behavior_data.detected_type = det.type;
  state.behavior_data.confidence = det.confidence;
  saveState();
  renderAutoDetect();
}

/* ==========================================
   UI bindings
========================================== */
function initProfileRadio() {
  const map = {
    "Auto-detect": "ut_auto",
    "Quality Priority": "ut_quality",
    "Value Priority": "ut_value"
  };
  const id = map[state.user_type] || "ut_auto";
  document.getElementById(id).checked = true;

  document.querySelectorAll("input[name='user_type']").forEach(r => {
    r.addEventListener("change", () => {
      state.user_type = r.value;
      saveState();
      renderRecommendations();
    });
  });
}

/* ==========================================
   TAB 1 – Recommendations (1:1 sort logic)
========================================== */
function getRecommended() {
  const ut = state.user_type;

  if (ut === "Quality Priority") {
    return [...products].sort((a,b) => b.quality_score - a.quality_score).slice(0,4);
  }
  if (ut === "Value Priority") {
    return [...products].sort((a,b) => discountPct(b) - discountPct(a)).slice(0,4);
  }

  // Auto-detect: if detected confidently, use it; else default
  const det = detect_user_preference(state.behavior_data);
  if (det.type === "Quality Priority" && det.confidence >= 50) {
    return [...products].sort((a,b) => b.quality_score - a.quality_score).slice(0,4);
  }
  if (det.type === "Value Priority" && det.confidence >= 50) {
    return [...products].sort((a,b) => discountPct(b) - discountPct(a)).slice(0,4);
  }
  return products.slice(0,4);
}

function discountPct(p) {
  return (p.original_price - p.price) / p.original_price;
}

function renderRecommendations() {
  const grid = document.getElementById("recommendedGrid");
  grid.innerHTML = "";

  const rec = getRecommended();

  rec.forEach(p => {
    const el = document.createElement("div");
    el.className = "card product-card";
    el.innerHTML = `
      <h3 style="margin:0 0 6px;">${p.name}</h3>
      <div class="muted">Origin: ${p.origin}</div>

      <div style="margin-top:10px;">
        <span class="badge green">Quality: ${(p.quality_score*100).toFixed(0)}%</span>
        <span class="badge green">Stability: ${(p.stability_score*100).toFixed(0)}%</span>
      </div>

      <div class="muted" style="margin-top:8px;">${p.certification}</div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <button class="btn secondary btn-small" data-act="quality">Quality Details</button>
        <button class="btn secondary btn-small" data-act="trace">View Traceability</button>
        <button class="btn secondary btn-small" data-act="price">Compare Price</button>
        <button class="btn btn-small" data-act="cart">Add to Cart</button>
      </div>

      <div style="margin-top:10px;font-weight:900;font-size:1.25rem;color:#166534;">
        ¥${p.price}
        <span class="muted" style="font-weight:700;font-size:.95rem;text-decoration:line-through;margin-left:8px;">
          ¥${p.original_price}
        </span>
        <span class="muted" style="font-weight:800;margin-left:8px;">
          Save ${(discountPct(p)*100).toFixed(0)}%
        </span>
      </div>
    `;

    el.querySelectorAll("button[data-act]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.act;
        if (act === "quality") bump("quality_clicks");
        if (act === "price") bump("price_clicks");
        if (act === "trace") {
          bump("trace_views");
          // also jump to Traceability tab + select product
          openTab("tab2");
          document.getElementById("traceSelect").value = p.name;
          renderTraceability(p.name);
        }
        if (act === "cart") addToCart(p);
      });
    });

    grid.appendChild(el);
  });

  // quick replenishment (static demo like python)
  const quick = document.getElementById("quickReplenish");
  quick.innerHTML = "";
  [
    { name:"Organic Milk (1L)", price:16.8 },
    { name:"Lettuce (1pc)", price:8.9 },
    { name:"Fresh Tofu", price:5.8 }
  ].forEach(item => {
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `
      <h3 style="margin:0 0 8px;">${item.name}</h3>
      <div class="price">¥${item.price}</div>
      <button class="btn secondary" style="width:100%;margin-top:10px;" disabled>Reorder</button>
    `;
    quick.appendChild(c);
  });
}

/* ==========================================
   Cart (1:1 session_state.cart idea)
========================================== */
function addToCart(p) {
  state.cart.push(p);
  saveState();
  renderCart();
}

function removeFromCart(idx) {
  state.cart.splice(idx, 1);
  saveState();
  renderCart();
}

function renderCart() {
  const empty = document.getElementById("cartEmpty");
  const list = document.getElementById("cartList");
  const totalEl = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");

  list.innerHTML = "";

  if (state.cart.length === 0) {
    empty.style.display = "block";
    checkoutBtn.disabled = true;
    totalEl.textContent = "¥0.0";
    return;
  }

  empty.style.display = "none";
  checkoutBtn.disabled = false;

  let total = 0;
  state.cart.forEach((p, idx) => {
    total += p.price;
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:800;">${p.name}</div>
        <div class="muted">¥${p.price}</div>
      </div>
      <button class="xbtn" title="Remove">✕</button>
    `;
    row.querySelector(".xbtn").addEventListener("click", () => removeFromCart(idx));
    list.appendChild(row);
  });

  totalEl.textContent = `¥${total.toFixed(1)}`;
}

/* ==========================================
   TAB 2 – Traceability (select + timeline + reviews)
========================================== */
function initTraceSelect() {
  const sel = document.getElementById("traceSelect");
  sel.innerHTML = "";
  products.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.name;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });

  sel.addEventListener("change", () => {
    bump("trace_views");
    renderTraceability(sel.value);
  });

  // default
  sel.value = products[0].name;
  renderTraceability(sel.value);
}

function renderTraceability(productName) {
  const p = products.find(x => x.name === productName) || products[0];
  document.getElementById("traceScore").textContent = `${Math.round(p.trace_completeness*100)}%`;

  const timeline = [
    { stage:"Origin", location:"Certified Farm", date:"2024-12-01", status:"Verified", details:"Harvested under certified standard" },
    { stage:"Processing", location:"Central Processing Facility", date:"2024-12-02", status:"Verified", details:"QC & packaging completed" },
    { stage:"Cold Chain Transport", location:"Regional Distribution Center", date:"2024-12-03", status:"Verified", details:"Temperature 2–4°C maintained" },
    { stage:"Final Mile Delivery", location:"Local Warehouse", date:"2024-12-04", status:"Verified", details:"Delivered within freshness window" }
  ];

  const box = document.getElementById("traceTimeline");
  box.innerHTML = "";
  timeline.forEach(t => {
    const item = document.createElement("div");
    item.className = "step";
    item.innerHTML = `
      <strong>${t.stage}</strong>
      <div class="muted">${t.location} · ${t.date}</div>
      <div>${t.details}</div>
    `;
    box.appendChild(item);
  });

  const rev = (reviews[p.name] || []);
  const rb = document.getElementById("reviewBox");
  if (rev.length === 0) {
    rb.innerHTML = `<div class="muted">No reviews.</div>`;
  } else {
    rb.innerHTML = rev.map(r => `
      <div class="review">
        <div><strong>${r.user}</strong> <span class="muted">(${r.date})</span></div>
        <div class="muted">Rating: ${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)} ${r.verified ? " · Verified" : ""}</div>
        <div style="margin-top:6px;">${r.comment}</div>
      </div>
    `).join("<hr class='sep'/>");
  }
}

/* ==========================================
   TAB 3 – Price-Quality tool (2 sliders + plotly)
========================================== */
function initPriceQuality() {
  const maxPrice = document.getElementById("maxPrice");
  const minQuality = document.getElementById("minQuality");
  const maxPriceVal = document.getElementById("maxPriceVal");
  const minQualityVal = document.getElementById("minQualityVal");

  function update() {
    maxPriceVal.textContent = maxPrice.value;
    minQualityVal.textContent = minQuality.value;

    const mp = Number(maxPrice.value);
    const mq = Number(minQuality.value);

    const filtered = products.filter(p => p.price <= mp && (p.quality_score*100) >= mq);

    Plotly.newPlot("priceQualityChart", filtered.map(p => ({
      x: [p.price],
      y: [p.quality_score*100],
      type: "scatter",
      mode: "markers",
      marker: { size: 16 },
      hovertemplate:
        `<b>${p.name}</b><br>` +
        `Price: ¥${p.price}<br>` +
        `Quality: ${(p.quality_score*100).toFixed(0)}%<br>` +
        `Value Score: ${((p.quality_score*100)/p.price).toFixed(1)}<extra></extra>`
    })), {
      title: "Price vs Quality Balance",
      xaxis: { title: "Price (CNY)" },
      yaxis: { title: "Quality Score (%)", range: [Math.max(mq-5, 0), 100] },
      showlegend: false,
      height: 520,
      margin: { t: 60, l: 60, r: 20, b: 60 }
    });
  }

  maxPrice.addEventListener("input", () => { bump("price_clicks"); update(); });
  minQuality.addEventListener("input", () => { bump("quality_clicks"); update(); });

  update();
}

/* ==========================================
   TAB 4 – AI assistant (chat_history)
========================================== */
function initChat() {
  const history = document.getElementById("chatHistory");
  const input = document.getElementById("chatText");
  const send = document.getElementById("chatSend");

  function renderChat() {
    history.innerHTML = "";
    state.chat_history.forEach(m => {
      const div = document.createElement("div");
      div.className = m.role === "user" ? "chat-user" : "chat-ai";
      div.innerHTML = `<strong>${m.role === "user" ? "User" : "AI"}:</strong> ${escapeHtml(m.text)}`;
      history.appendChild(div);
    });
    history.scrollTop = history.scrollHeight;
  }

  function reply(userText) {
    // demo logic close to python-style demo
    let ans = "I can help you compare quality, traceability and best value. Try asking about safety, nutrition, or best deals.";
    const t = userText.toLowerCase();

    if (t.includes("winter") || t.includes("nutrition")) {
      ans = "For winter nutrition: spinach, salmon, eggs, and beef are strong options. Check traceability and quality stability for each.";
    } else if (t.includes("safe") || t.includes("safety")) {
      ans = "Safety signals include certification, high traceability completeness, and stable cold-chain delivery (demo).";
    } else if (t.includes("value") || t.includes("cheap") || t.includes("discount")) {
      const best = [...products].sort((a,b) => discountPct(b) - discountPct(a))[0];
      ans = `Best discount right now looks like: ${best.name} (Save ${(discountPct(best)*100).toFixed(0)}%).`;
      bump("discount_views");
    }

    state.chat_history.push({ role: "ai", text: ans });
    saveState();
    renderChat();
  }

  function onSend() {
    const text = input.value.trim();
    if (!text) return;
    state.chat_history.push({ role: "user", text });
    saveState();
    renderChat();
    input.value = "";
    reply(text);
  }

  send.addEventListener("click", onSend);
  input.addEventListener("keydown", e => { if (e.key === "Enter") onSend(); });

  renderChat();
}

/* ==========================================
   TAB 5 – Auto-detect demo panel
========================================== */
function renderAutoDetect() {
  document.getElementById("b_quality").textContent = state.behavior_data.quality_clicks;
  document.getElementById("b_price").textContent = state.behavior_data.price_clicks;
  document.getElementById("b_trace").textContent = state.behavior_data.trace_views;
  document.getElementById("b_discount").textContent = state.behavior_data.discount_views;
  document.getElementById("b_organic").textContent = state.behavior_data.organic_views;

  const det = detect_user_preference(state.behavior_data);
  document.getElementById("detType").textContent = det.type;
  document.getElementById("detConf").textContent = `${det.confidence.toFixed(0)}%`;
  document.getElementById("detMsg").textContent = det.message || "";
}

function initAutoDetectButtons() {
  document.getElementById("resetBehavior").addEventListener("click", () => {
    state.behavior_data = structuredClone(defaultState.behavior_data);
    saveState();
    renderAutoDetect();
    renderRecommendations();
  });
}

/* ==========================================
   Small helpers
========================================== */
function openTab(tabId) {
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tabpanel").forEach(p => p.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add("active");
  document.getElementById(tabId).classList.add("active");
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

/* ==========================================
   Boot
========================================== */
function boot() {
  initProfileRadio();
  renderRecommendations();
  renderCart();
  initTraceSelect();
  initPriceQuality();
  initChat();
  renderAutoDetect();
  initAutoDetectButtons();
}
boot();
