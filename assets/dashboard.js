/* =========================================
   dashboard.js – 1:1 implementation of 1_CP_Dashboard.py
========================================= */

const state = { page: "overview" };
let DATA = null;

async function loadAllData() {
  const [competitors, market, segments, financials] = await Promise.all([
    fetch("data/competitors.json").then(r => r.json()),
    fetch("data/market_data.json").then(r => r.json()),
    fetch("data/customer_segments.json").then(r => r.json()),
    fetch("data/dingdong_financials.json").then(r => r.json())
  ]);
  return { competitors, market, segments, financials };
}

/* -------- Sidebar navigation (radio equivalent) -------- */
document.querySelectorAll(".side-link").forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    state.page = a.dataset.page;
    showPage();
  });
});

function showPage() {
  document.querySelectorAll("[data-page-section]").forEach(sec => {
    sec.style.display = (sec.dataset.pageSection === state.page) ? "block" : "none";
  });

  if (!DATA) return;
  if (state.page === "overview") renderOverview();
  if (state.page === "competitor") renderCompetitor();
  if (state.page === "market") renderMarket();
  if (state.page === "customer") renderCustomer();
  if (state.page === "opportunity") renderOpportunity();
}

/* =========================
   Overview
========================= */
function renderOverview() {
  const { competitors, market, segments } = DATA;

  setText("m_market_size", `¥${(market.market_size_2024 / 1e9).toFixed(1)}B`);
  setText("m_cagr", `+${(market.growth_rate_cagr * 100).toFixed(0)}% CAGR`);
  setText("m_segment", "45%");
  setText("m_tier1", `${(market.instant_retail_penetration.tier1 * 100).toFixed(0)}%`);
  setText("m_comp", "2");

  setText("t_dd_model", competitors.dingdong.model || competitors.dingdong.business_model || "—");
  setText("t_dd_cities", `${(competitors.dingdong.cities?.length || 0)} (YRD focus)`);
  setText("t_dd_sku", (competitors.dingdong.sku_count ?? "—"));

  setText("t_hema_model", competitors.freshippo.model || competitors.freshippo.business_model || "—");
  setText("t_hema_cities", "10+ (Tier 1+2)");
  setText("t_hema_sku", (competitors.freshippo.sku_count ?? "—"));
}

/* =========================
   Competitor Intelligence
========================= */
function renderCompetitor() {
  const sel = document.getElementById("competitorSelect");
  if (!sel.dataset.bound) {
    sel.addEventListener("change", () => renderCompetitorMode(sel.value));
    sel.dataset.bound = "1";
  }
  renderCompetitorMode(sel.value);
}

function renderCompetitorMode(mode) {
  hide("comp_side"); hide("comp_dd"); hide("comp_hema");

  if (mode === "Side-by-Side Comparison") {
    show("comp_side");
    renderSideBySide();
  } else if (mode === "Dingdong") {
    show("comp_dd");
    renderDingdongDetail();
  } else {
    show("comp_hema");
    renderFreshippoDetail();
  }
}

function renderSideBySide() {
  const { competitors, financials } = DATA;

  renderSwotLines("dd_strengths_lines", competitors.dingdong.strengths, true);
  renderSwotLines("dd_weaknesses_lines", competitors.dingdong.weaknesses, false);
  renderSwotLines("hema_strengths_lines", competitors.freshippo.strengths, true);
  renderSwotLines("hema_weaknesses_lines", competitors.freshippo.weaknesses, false);

  // Dingdong financial chart (color markers by profit/loss)
  const df = financials.annual_data.map(d => ({
    period: `${d.year} ${d.quarter}`,
    net_loss_m: d.net_loss / 1e6
  }));
  const colors = df.map(x => x.net_loss_m < 0 ? "red" : "green");

  Plotly.newPlot("ddFinancialChart", [{
    x: df.map(d => d.period),
    y: df.map(d => d.net_loss_m),
    type: "scatter",
    mode: "lines+markers",
    name: "Net Profit/Loss",
    line: { width: 3 },
    marker: { size: 8, color: colors }
  }], {
    title: "Dingdong Profit/Loss Trend (Million CNY)",
    xaxis: { title: "Quarter" },
    yaxis: { title: "Net Profit/Loss (Million CNY)" },
    height: 500,
    hovermode: "x unified",
    shapes: [{ type: "line", x0: 0, x1: 1, xref: "paper", y0: 0, y1: 0, line: { dash: "dash", color: "gray" } }]
  });

  // Category pies
  pieFromDict("ddCategoryPie", competitors.dingdong.product_categories, "Dingdong Product Mix");
  pieFromDict("hemaCategoryPie", competitors.freshippo.product_categories, "Freshippo Product Mix");

  // Tech capability comparison
  const caps = ["AI Integration", "Traceability", "Membership System", "Omnichannel", "Supply Chain Digitization"];
  const dd = [0.75, 0.25, 0.85, 0.00, 0.70];
  const he = [0.60, 0.30, 0.75, 0.95, 0.65];

  Plotly.newPlot("techCapabilityChart", [
    { type: "bar", name: "Dingdong", x: caps, y: dd },
    { type: "bar", name: "Freshippo", x: caps, y: he }
  ], {
    title: "Technology Capability Comparison (0-1 scale)",
    barmode: "group",
    height: 400,
    yaxis: { range: [0, 1] }
  });
}

function renderDingdongDetail() {
  const c = DATA.competitors.dingdong;

  setText("dd_title", `${c.name || "Dingdong"} - Detailed Analysis`);
  setText("dd_model", c.model || c.business_model || "—");
  setText("dd_sku", (c.sku_count ?? "—").toLocaleString?.() ?? (c.sku_count ?? "—"));
  setText("dd_city_n", `${c.cities?.length || 0}`);

  setHtml("dd_city_strategy", escapeHtml(c.city_strategy || "—"));
  setText("dd_cities", (c.cities || []).join(", "));

  renderStatusBlocks("dd_strengths_blocks", c.strengths, "success");
  renderStatusBlocks("dd_opps_blocks", c.opportunities, "info");
  renderStatusBlocks("dd_weak_blocks", c.weaknesses, "warning");
  renderStatusBlocks("dd_threat_blocks", c.threats, "error");

  setHtml("dd_ai_features", listHtml(c.ai_features));
  setHtml("dd_member_benefits", listHtml(c.membership_benefits));
}

function renderFreshippoDetail() {
  const c = DATA.competitors.freshippo;

  setText("hema_title", `${c.name || "Freshippo"} - Detailed Analysis`);
  setText("hema_model", c.model || c.business_model || "—");
  setText("hema_sku", (c.sku_count ?? "—").toLocaleString?.() ?? (c.sku_count ?? "—"));

  // formats
  const f = c.formats?.hema_fresh;
  const nb = c.formats?.hema_nb;
  setHtml("hema_fresh_box", `
    <h3>Freshippo Fresh</h3>
    <div>- Target: ${escapeHtml(f?.target || "—")}</div>
    <div>- Positioning: ${escapeHtml(f?.positioning || "—")}</div>
    <div>- Format: ${escapeHtml(f?.store_size || "—")}</div>
  `);
  setHtml("hema_nb_box", `
    <h3>Freshippo NB (Neighborhood)</h3>
    <div>- Target: ${escapeHtml(nb?.target || "—")}</div>
    <div>- Positioning: ${escapeHtml(nb?.positioning || "—")}</div>
    <div>- Format: ${escapeHtml(nb?.store_size || "—")}</div>
  `);

  renderStatusBlocks("hema_strengths_blocks", c.strengths, "success");
  renderStatusBlocks("hema_opps_blocks", c.opportunities, "info");
  renderStatusBlocks("hema_weak_blocks", c.weaknesses, "warning");
  renderStatusBlocks("hema_threat_blocks", c.threats, "error");
}

/* =========================
   Market Analysis
========================= */
function renderMarket() {
  const { market } = DATA;

  // Market size bar
  const years = [2023, 2024, 2025];
  const sizes = [
    market.market_size_2023 / 1e9,
    market.market_size_2024 / 1e9,
    market.market_size_2025_projected / 1e9
  ];
  Plotly.newPlot("marketSizeChart", [{
    type: "bar",
    x: years,
    y: sizes,
    text: sizes.map(s => `¥${s.toFixed(1)}B`),
    textposition: "outside"
  }], {
    title: `Chinese Fresh E-commerce Market Size (CAGR: ${(market.growth_rate_cagr * 100).toFixed(0)}%)`,
    xaxis: { title: "Year" },
    yaxis: { title: "Market Size (Billion CNY)" },
    height: 400
  });

  // Penetration bar
  const pen = market.instant_retail_penetration;
  Plotly.newPlot("penetrationChart", [{
    type: "bar",
    x: Object.keys(pen),
    y: Object.values(pen).map(v => v * 100),
    text: Object.values(pen).map(v => `${(v * 100).toFixed(0)}%`),
    textposition: "outside"
  }], {
    title: "Instant Retail Market Penetration",
    xaxis: { title: "City Tier" },
    yaxis: { title: "Penetration Rate (%)", range: [0, 50] },
    height: 400
  });

  // Consumer segments pie
  pieFromDict("consumerSegmentPie", market.consumer_segments, "Consumer Segment Distribution", true);

  // Pain points severity hbar + descriptions
  const pains = market.key_pain_points;
  const rows = Object.entries(pains).map(([k, v]) => ({
    name: k.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
    severity: v.severity,
    desc: v.description
  })).sort((a, b) => a.severity - b.severity);

  Plotly.newPlot("painPointsChart", [{
    type: "bar",
    orientation: "h",
    x: rows.map(r => r.severity),
    y: rows.map(r => r.name),
    text: rows.map(r => `${(r.severity * 100).toFixed(0)}%`),
    textposition: "outside"
  }], {
    title: "Industry Pain Points by Severity",
    xaxis: { title: "Severity Score", range: [0, 1] },
    height: 500
  });

  setHtml("painPointDescriptions", rows.map(r =>
    `<div style="margin:8px 0;"><strong>${escapeHtml(r.name)}</strong>: ${escapeHtml(r.desc)}</div>`
  ).join(""));

  // Technology adoption cards (static like Python)
  setHtml("tech_ai_card", `
    <h4>AI Adoption</h4>
    <p><strong>Current:</strong> 35%</p>
    <p><strong>2026 Projection:</strong> 62%</p>
    <p style="color:#2E7D32;font-weight:900;">+77% Growth</p>
  `);
  setHtml("tech_sc_card", `
    <h4>Supply Chain Digitization</h4>
    <p><strong>Current:</strong> 48%</p>
    <p><strong>2026 Projection:</strong> 75%</p>
    <p style="color:#2E7D32;font-weight:900;">+56% Growth</p>
  `);
  setHtml("tech_sus_card", `
    <h4>Sustainability Focus</h4>
    <p><strong>Importance:</strong> 68%</p>
    <p><strong>Premium Willingness:</strong> 23%</p>
    <p style="color:#F57C00;font-weight:900;">Growing concern</p>
  `);

  // Industry health radar (static like Python)
  const health = {
    "Market Growth": 0.85,
    "Profitability": 0.45,
    "Technology Adoption": 0.65,
    "Supply Chain Maturity": 0.58,
    "Customer Satisfaction": 0.62,
    "Competitive Intensity": 0.75
  };

  Plotly.newPlot("industryHealthRadar", [{
    type: "scatterpolar",
    r: Object.values(health),
    theta: Object.keys(health),
    fill: "toself"
  }], {
    title: "Industry Health Assessment (0-1 scale)",
    polar: { radialaxis: { visible: true, range: [0, 1] } },
    height: 500
  });
}

/* =========================
   Customer Insights (fixed pragmatic_middle_class)
========================= */
function renderCustomer() {
  const seg = DATA.segments.pragmatic_middle_class;

  setText("seg_title", seg.segment_name || "Pragmatic Middle-Class");
  setText("seg_share", `${Math.round((seg.percentage ?? 0.45) * 100)}%`);
  setText("seg_income", `¥${seg.income_range_cny || "—"}`);
  setText("seg_age", seg.age_range || "—");
  setText("seg_household", seg.household_size || "—");

  setHtml("seg_jtbd", escapeHtml(seg.jobs_to_be_done || "—"));
  setHtml("seg_jobs_func", listHtml(seg.functional_jobs));
  setHtml("seg_jobs_emo", listHtml(seg.emotional_jobs));
  setHtml("seg_jobs_soc", listHtml(seg.social_jobs));

  // priorities hbar
  const p = seg.priorities || {};
  Plotly.newPlot("priorityChart", [{
    type: "bar",
    orientation: "h",
    x: Object.values(p),
    y: Object.keys(p),
    text: Object.values(p).map(v => `${(v * 100).toFixed(0)}%`),
    textposition: "outside"
  }], {
    title: "Priority Rankings",
    xaxis: { title: "Importance Score", range: [0, 1] },
    height: 400
  });

  // pain tabs lists
  renderPainList("pain_func_list", seg.pain_points?.functional || []);
  renderPainList("pain_emo_list", seg.pain_points?.emotional || []);
  renderPainList("pain_soc_list", seg.pain_points?.social || []);

  // gains
  setHtml("gain_func", pillsHtml(seg.gains?.functional));
  setHtml("gain_emo", pillsHtml(seg.gains?.emotional));
  setHtml("gain_soc", pillsHtml(seg.gains?.social));

  // behavior metrics
  const b = seg.shopping_behavior || {};
  setText("bh_freq", b.frequency || "—");
  setText("bh_basket", b.avg_basket_size_cny || "—");
  setText("bh_time", b.preferred_time || "—");
  setText("bh_decision", b.decision_time || "—");
  setText("bh_device", b.device_preference || "—");

  // product preference pie
  pieFromDict("productPrefPie", seg.product_preferences, "Product Category Preferences", true);
}

/* =========================
   Opportunity Engine (static opportunities + expander + radar + city + simulator)
========================= */
function renderOpportunity() {
  // opportunities defined in Python (static)
  const opportunities = [
    { Opportunity:"Full Supply Chain Traceability", MarketNeed:0.95, CompetitorGap:0.75, CPCapability:0.85, MarketSize:0.80 },
    { Opportunity:"Organic & Low-Pesticide Products", MarketNeed:0.85, CompetitorGap:0.90, CPCapability:0.80, MarketSize:0.65 },
    { Opportunity:"Price-Quality Optimization Platform", MarketNeed:0.90, CompetitorGap:0.85, CPCapability:0.75, MarketSize:0.90 },
    { Opportunity:"AI-Powered Personalization", MarketNeed:0.75, CompetitorGap:0.60, CPCapability:0.70, MarketSize:0.85 },
    { Opportunity:"Community-Based Distribution", MarketNeed:0.70, CompetitorGap:0.50, CPCapability:0.90, MarketSize:0.70 }
  ].map(o => ({
    ...o,
    Score: o.MarketNeed*0.3 + o.CompetitorGap*0.25 + o.CPCapability*0.25 + o.MarketSize*0.2
  })).sort((a,b) => b.Score - a.Score);

  // expanders
  const host = document.getElementById("opportunityExpanders");
  host.innerHTML = "";
  opportunities.forEach((opp, idx) => {
    const det = document.createElement("details");
    det.className = "card";
    det.style.marginTop = "10px";
    det.innerHTML = `
      <summary style="font-weight:900; cursor:pointer;">
        #${idx+1} ${escapeHtml(opp.Opportunity)} - Score: ${(opp.Score*100).toFixed(1)}/100
      </summary>
      <div style="margin-top:10px;">
        <div class="metrics" style="grid-template-columns: repeat(4,1fr);">
          ${miniMetric("Market Need", `${(opp.MarketNeed*100).toFixed(0)}%`)}
          ${miniMetric("Competitor Gap", `${(opp.CompetitorGap*100).toFixed(0)}%`)}
          ${miniMetric("CP Capability", `${(opp.CPCapability*100).toFixed(0)}%`)}
          ${miniMetric("Market Size", `${(opp.MarketSize*100).toFixed(0)}%`)}
        </div>
        <div id="radar_${idx}" class="plot" style="height:300px;margin-top:12px;"></div>
      </div>
    `;
    host.appendChild(det);

    Plotly.newPlot(`radar_${idx}`, [{
      type: "scatterpolar",
      r: [opp.MarketNeed, opp.CompetitorGap, opp.CPCapability, opp.MarketSize],
      theta: ["Market Need","Competitor Gap","CP Capability","Market Size"],
      fill: "toself"
    }], {
      polar: { radialaxis: { visible: true, range: [0,1] } },
      height: 300,
      margin: { l:80, r:80, t:20, b:20 }
    });
  });

  // top 3 recommendations (static text like Python)
  setHtml("top3RecoBox", `
    <h4>Top 3 Entry Strategies</h4>

    <h5>1. Full Supply Chain Traceability (Score: 84/100)</h5>
    <ul>
      <li><strong>Why:</strong> Highest customer need (95%) and significant competitor gap (75%)</li>
      <li><strong>How:</strong> Leverage CP Group's integrated supply chain</li>
      <li><strong>Advantage:</strong> From farm to table visibility</li>
      <li><strong>Target:</strong> Pragmatic middle-class (45% of market)</li>
    </ul>

    <h5>2. Price-Quality Optimization Platform (Score: 83/100)</h5>
    <ul>
      <li><strong>Why:</strong> Addresses core pain point of balancing price and quality</li>
      <li><strong>How:</strong> AI-powered quality-price balance scores</li>
      <li><strong>Advantage:</strong> Serves quality- and price-sensitive segments</li>
      <li><strong>Market:</strong> 580B market with 22% CAGR</li>
    </ul>

    <h5>3. Organic & Low-Pesticide Product Line (Score: 80/100)</h5>
    <ul>
      <li><strong>Why:</strong> Large competitor gap (90%)</li>
      <li><strong>How:</strong> Dedicated organic supply chain leveraging CP network</li>
      <li><strong>Advantage:</strong> First-mover in dedicated organic grocery e-commerce</li>
      <li><strong>Premium:</strong> 23% willing to pay premium</li>
    </ul>
  `);

  // City entry priority chart (static like Python)
  const cities = [
    { City:"Shanghai", MarketSize:0.95, Competition:0.90, Infrastructure:0.95, TargetSegment:0.90 },
    { City:"Beijing", MarketSize:0.90, Competition:0.85, Infrastructure:0.90, TargetSegment:0.85 },
    { City:"Hangzhou", MarketSize:0.75, Competition:0.70, Infrastructure:0.85, TargetSegment:0.80 },
    { City:"Guangzhou", MarketSize:0.85, Competition:0.80, Infrastructure:0.85, TargetSegment:0.75 },
    { City:"Shenzhen", MarketSize:0.80, Competition:0.80, Infrastructure:0.85, TargetSegment:0.75 },
    { City:"Suzhou", MarketSize:0.65, Competition:0.60, Infrastructure:0.80, TargetSegment:0.85 },
    { City:"Nanjing", MarketSize:0.70, Competition:0.65, Infrastructure:0.75, TargetSegment:0.80 },
    { City:"Chengdu", MarketSize:0.75, Competition:0.70, Infrastructure:0.70, TargetSegment:0.65 }
  ].map(c => ({
    ...c,
    Priority: c.MarketSize*0.3 + (1 - c.Competition)*0.2 + c.Infrastructure*0.25 + c.TargetSegment*0.25
  })).sort((a,b) => b.Priority - a.Priority);

  Plotly.newPlot("cityPriorityChart", [{
    type: "bar",
    orientation: "h",
    x: cities.map(c => c.Priority),
    y: cities.map(c => c.City),
    text: cities.map(c => (c.Priority*100).toFixed(1)),
    textposition: "outside"
  }], {
    title: "City Entry Priority Scores",
    xaxis: { range: [0,1], title: "Priority Score" },
    height: 400
  });

  // Simulator bindings (button + same scoring rules)
  bindSimulator();
}

function bindSimulator() {
  const ids = ["sim_cities","sim_trace","sim_org","sim_tech"];
  const labelMap = {
    sim_cities: "sim_cities_val",
    sim_trace: "sim_trace_val",
    sim_org: "sim_org_val",
    sim_tech: "sim_tech_val"
  };

  ids.forEach(id => {
    const el = document.getElementById(id);
    el.oninput = () => setText(labelMap[id], el.value);
  });

  document.getElementById("sim_calc").onclick = () => {
    const entry_model = document.getElementById("sim_model").value;
    const initial_cities = Number(document.getElementById("sim_cities").value);
    const traceability_level = Number(document.getElementById("sim_trace").value);
    const organic_focus = Number(document.getElementById("sim_org").value);
    const tech_investment = Number(document.getElementById("sim_tech").value);
    const price_positioning = document.getElementById("sim_price").value;

    let base_score = 50;

    if (entry_model === "Hybrid Model") base_score += 15;
    else if (entry_model === "Store-Warehouse Integration") base_score += 10;
    else base_score += 5;

    base_score += initial_cities * 3;
    base_score += traceability_level * 0.2;
    base_score += organic_focus * 0.15;
    base_score += tech_investment * 0.1;

    if (price_positioning === "Mid-range") base_score += 10;

    const success_probability = Math.min(base_score, 95);
    const est_market_share = success_probability * 0.08;
    const est_revenue = est_market_share * (DATA.market.market_size_2025_projected) / 100;

    show("sim_results");
    setText("sim_success", `${success_probability.toFixed(1)}%`);
    setText("sim_share", `${est_market_share.toFixed(1)}%`);
    setText("sim_rev", `¥${(est_revenue / 1e9).toFixed(2)}B`);

    setHtml("sim_reco", `
      <strong>Recommendation:</strong> This configuration shows ${success_probability.toFixed(1)}% success probability.
      <ul style="margin-top:8px;">
        <li>${escapeHtml(entry_model)} model provides operational flexibility</li>
        <li>${traceability_level}% traceability coverage addresses major pain point</li>
        <li>${organic_focus}% organic focus taps into underserved market</li>
        <li>${initial_cities} cities allows manageable scaling</li>
      </ul>
    `);
  };
}

/* =========================
   Helpers
========================= */
function setText(id, txt){ const el=document.getElementById(id); if(el) el.textContent = txt; }
function setHtml(id, html){ const el=document.getElementById(id); if(el) el.innerHTML = html; }
function show(id){ document.getElementById(id).style.display="block"; }
function hide(id){ document.getElementById(id).style.display="none"; }

function escapeHtml(s){
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

function listHtml(arr){
  if (!arr || !arr.length) return "<div class='muted'>—</div>";
  return `<ul style="margin:0 0 0 18px;">${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
}

function pillsHtml(arr){
  if (!arr || !arr.length) return "<div class='muted'>—</div>";
  return arr.map(x => `<div class="pill">${escapeHtml(x)}</div>`).join("");
}

function miniMetric(label, value){
  return `
    <div class="metric metric-card" style="min-height:auto;">
      ${escapeHtml(label)}
      <strong style="font-size:1.35rem;">${escapeHtml(value)}</strong>
    </div>`;
}

function renderSwotLines(id, items, positive){
  const host = document.getElementById(id);
  host.innerHTML = (items || []).map(t => (
    `<div class="${positive ? "swot-positive":"swot-negative"}">${positive ? "✓":"✗"} ${escapeHtml(t)}</div>`
  )).join("") || `<div class="muted">—</div>`;
}

function renderStatusBlocks(id, items, type){
  // mimic st.success/info/warning/error
  const cls = {
    success: "box-success",
    info: "box-info",
    warning: "box-warning",
    error: "box-error"
  }[type] || "card";

  const host = document.getElementById(id);
  host.innerHTML = (items || []).map(t => `<div class="${cls}" style="margin:8px 0;">${escapeHtml(t)}</div>`).join("")
    || `<div class="muted">—</div>`;
}

function renderPainList(id, pains){
  const host = document.getElementById(id);
  host.innerHTML = (pains || []).map(p => {
    const sev = p.severity ?? 0;
    const color = sev > 0.8 ? "#C62828" : "#F57C00";
    return `
      <div class="card" style="margin:10px 0;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
          <strong>${escapeHtml(p.pain)}</strong>
          <span style="color:${color};font-weight:900;">${(sev*100).toFixed(0)}% severity</span>
        </div>
        <div class="muted" style="margin-top:6px;">Frequency: ${escapeHtml(p.frequency)}</div>
      </div>
    `;
  }).join("") || `<div class="muted">—</div>`;
}

function pieFromDict(divId, dictObj, title, percentLabels=false){
  const obj = dictObj || {};
  const labels = Object.keys(obj);
  const values = Object.values(obj);
  Plotly.newPlot(divId, [{
    type: "pie",
    labels,
    values,
    hole: 0.3,
    textinfo: percentLabels ? "label+percent" : "label"
  }], { title, height: 400 });
}

/* =========================
   Boot
========================= */
loadAllData().then(d => {
  DATA = d;
  showPage();
});
