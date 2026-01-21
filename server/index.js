const bcrypt = require("bcryptjs");
const {
  findUserByEmail,
  createUser,
  isEmailAllowed,
} = require("./auth/authStore");
const jwt = require("jsonwebtoken");
const requireAuth = require("./auth/requireAuth");

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const { BigQuery } = require("@google-cloud/bigquery");

const app = express();
const PORT = process.env.PORT || 8080;

// ===== CORS
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "https://sodeli-dash-pro.vercel.app",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman
      return allowedOrigins.has(origin) ? cb(null, true) : cb(null, false); // bloqueia silencioso
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ===== Resolve credenciais (transforma em caminho absoluto)
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : undefined;

// ===== BigQuery Client
const bigquery = new BigQuery({
  projectId: process.env.BQ_PROJECT_ID,
  ...(credPath ? { keyFilename: credPath } : {}),
});

const DATASET = process.env.BQ_DATASET;

// ===== Utils
function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function requireAuthOrLocal(req, res, next) {
  const bypass =
    String(process.env.ALLOW_LOCAL_BYPASS || "").toLowerCase() === "true";
  if (bypass) return next();
  return requireAuth(req, res, next);
}

// ===== Healthcheck
app.get("/health", (_, res) => {
  res.json({ ok: true });
});

app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!isEmailAllowed(email)) {
      return res.status(403).json({
        error: "E-mail não autorizado para cadastro",
      });
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Usuário já existe" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = {
      id: Date.now(),
      name: name || null,
      email,
      password_hash,
      role: "admin",
      provider: "local",
      created_at: new Date().toISOString(),
    };

    createUser(user);

    return res.status(201).json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({
      error: "Erro ao criar usuário",
      details: err.message,
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// ============================
// OVERVIEW (Dashboard principal)
// ============================
app.get("/api/overview", requireAuthOrLocal, async (req, res) => {
  try {
    const { dateStart, dateEnd, platform } = req.query;

    // defaults (se não vier, pega últimos 30 dias)
    const start = dateStart || daysAgoISO(30);
    const end = dateEnd || todayISO();
    const plat = platform || "all";

    const params = { start, end };
    if (plat !== "all") params.platform = plat;

    // =========================================================
    // 1) TOTAL (Visão Geral) -> Funil RD-like (view mensal) + Marketing do "all"
    // =========================================================

    // 1.0) Marketing TOTAL (spend/clicks/impressions) vem do "all" da dashboard_overview_daily
    const marketingTotalQuery = `
      SELECT
        SUM(spend) AS spend,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impressions
      FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.dashboard_overview_daily\`
      WHERE
        date BETWEEN DATE(@start) AND DATE(@end)
        AND platform = 'all'
    `;

    const [mTotalRows] = await bigquery.query({
      query: marketingTotalQuery,
      params: { start, end },
    });

    const marketingTotal = mTotalRows?.[0] || {
      spend: 0,
      clicks: 0,
      impressions: 0,
    };

    // 1.1) Funil TOTAL (RD-like) vem da v_rd_funnel_monthly
    const funnelTotalQuery = `
      SELECT
        SUM(leads) AS leads,
        SUM(opportunities) AS opportunities,
        SUM(sales) AS sales,
        SUM(revenue) AS revenue
      FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.v_rd_funnel_monthly\`
      WHERE date BETWEEN DATE(@start) AND DATE(@end)
    `;

    const [funnelRows] = await bigquery.query({
      query: funnelTotalQuery,
      params: { start, end },
    });

    const funnelTotal = funnelRows?.[0] || {
      leads: 0,
      opportunities: 0,
      sales: 0,
      revenue: 0,
    };

    const total = {
      // RD-like
      leads: Number(funnelTotal.leads || 0),
      opportunities: Number(funnelTotal.opportunities || 0),
      sales: Number(funnelTotal.sales || 0),

      // Mantido (não temos regra 1:1 aqui)
      qualified_leads: 0,

      // Marketing
      spend: Number(marketingTotal.spend || 0),
      clicks: Number(marketingTotal.clicks || 0),
      impressions: Number(marketingTotal.impressions || 0),
    };

    // =========================================================
    // 2) CRM TOTAL (mantém como estava)
    // =========================================================
    const crmQuery = `
      SELECT
        COUNT(1) AS sales_crm,
        SUM(COALESCE(amount_total, 0)) AS revenue_crm
      FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.rd_station__deals\`
      WHERE
        (win IS TRUE OR LOWER(CAST(win AS STRING)) = 'true')
        AND win_at IS NOT NULL
        AND DATE(win_at) BETWEEN DATE(@start) AND DATE(@end)
    `;

    const [crmRows] = await bigquery.query({
      query: crmQuery,
      params: { start, end },
    });

    const crm = crmRows?.[0] || { sales_crm: 0, revenue_crm: 0 };

    // =========================================================
    // 3) Visitantes (GA4) -> total_users, com clamp (mantém)
    // =========================================================
    const ga4RangeQuery = `
      SELECT
        MIN(date) AS min_date,
        MAX(date) AS max_date
      FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.fact_ga4_daily\`
    `;
    const [ga4RangeRows] = await bigquery.query({ query: ga4RangeQuery });
    const ga4Range = ga4RangeRows?.[0] || { min_date: null, max_date: null };

    let visits = 0;

    if (ga4Range.min_date && ga4Range.max_date) {
      const requestedStart = new Date(start);
      const requestedEnd = new Date(end);

      const minDate = new Date(ga4Range.min_date.value || ga4Range.min_date);
      const maxDate = new Date(ga4Range.max_date.value || ga4Range.max_date);

      const clampedStart = requestedStart < minDate ? minDate : requestedStart;
      const clampedEnd = requestedEnd > maxDate ? maxDate : requestedEnd;

      if (clampedStart <= clampedEnd) {
        const ga4Query = `
          SELECT
            SUM(COALESCE(total_users, 0)) AS visits
          FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.fact_ga4_daily\`
          WHERE date BETWEEN DATE(@start) AND DATE(@end)
        `;

        const [ga4Rows] = await bigquery.query({
          query: ga4Query,
          params: {
            start: clampedStart.toISOString().slice(0, 10),
            end: clampedEnd.toISOString().slice(0, 10),
          },
        });

        visits = Number(ga4Rows?.[0]?.visits || 0);
      }
    }

    // =========================================================
    // 4) CRM por plataforma (mantém como estava)
    // =========================================================
    const crmByPlatformQuery = `
      SELECT
        CASE
          WHEN LOWER(COALESCE(deal_source_name, '')) LIKE '%google%' THEN 'google_ads'
          WHEN LOWER(COALESCE(deal_source_name, '')) LIKE '%meta%'
            OR LOWER(COALESCE(deal_source_name, '')) LIKE '%facebook%'
            OR LOWER(COALESCE(deal_source_name, '')) LIKE '%instagram%' THEN 'meta_ads'
          WHEN LOWER(COALESCE(deal_source_name, '')) LIKE '%linkedin%' THEN 'linkedin_ads'
          ELSE 'other'
        END AS platform,
        COUNT(1) AS sales_crm,
        SUM(COALESCE(amount_total, 0)) AS revenue_crm
      FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.rd_station__deals\`
      WHERE
        (win IS TRUE OR LOWER(CAST(win AS STRING)) = 'true')
        AND win_at IS NOT NULL
        AND DATE(win_at) BETWEEN DATE(@start) AND DATE(@end)
      GROUP BY 1
    `;

    const [crmPlatRows] = await bigquery.query({
      query: crmByPlatformQuery,
      params: { start, end },
    });

    const crm_by_platform = (crmPlatRows || []).reduce((acc, r) => {
      acc[r.platform] = {
        sales_crm: Number(r.sales_crm || 0),
        revenue_crm: Number(r.revenue_crm || 0),
      };
      return acc;
    }, {});

    let sales_crm_total = Number(crm.sales_crm || 0);
    let revenue_crm_total = Number(crm.revenue_crm || 0);

    if (plat !== "all") {
      const crmPlat = crm_by_platform?.[plat];
      if (crmPlat) {
        sales_crm_total = Number(crmPlat.sales_crm || 0);
        revenue_crm_total = Number(crmPlat.revenue_crm || 0);
      } else {
        sales_crm_total = 0;
        revenue_crm_total = 0;
      }
    }

    // =========================================================
    // 5) Desempenho por Plataforma (SÉRIE) -> FUNIL RD-like + Marketing
    // =========================================================

    // 5.1) Funil por plataforma (RD-like) -> view nova
    const funnelPlatWhere = [];
    funnelPlatWhere.push(`date BETWEEN DATE(@start) AND DATE(@end)`);
    if (plat !== "all") funnelPlatWhere.push(`platform = @platform`);
    const funnelPlatWhereClause = `WHERE ${funnelPlatWhere.join(" AND ")}`;

    const funnelByPlatformQuery = `
      SELECT
        date,
        platform,
        SUM(leads) AS leads,
        SUM(opportunities) AS opportunities,
        SUM(sales) AS sales,
        SUM(revenue) AS revenue
      FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.v_rd_funnel_by_platform\`
      ${funnelPlatWhereClause}
      GROUP BY date, platform
    `;

    // 5.2) Marketing por plataforma -> dashboard_overview_daily (sem all)
    const marketingPlatWhere = [];
    marketingPlatWhere.push(`date BETWEEN DATE(@start) AND DATE(@end)`);
    marketingPlatWhere.push(`platform != 'all'`);
    if (plat !== "all") marketingPlatWhere.push(`platform = @platform`);
    const marketingPlatWhereClause = `WHERE ${marketingPlatWhere.join(
      " AND "
    )}`;

    const marketingByPlatformQuery = `
      SELECT
        date,
        platform,
        SUM(spend) AS spend,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impressions
      FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.dashboard_overview_daily\`
      ${marketingPlatWhereClause}
      GROUP BY date, platform
    `;

    // 5.3) Join final em SQL para manter shape do front
    const platformsQuery = `
      WITH f AS (${funnelByPlatformQuery}),
           m AS (${marketingByPlatformQuery}),
           d AS (
             SELECT date, platform FROM f
             UNION DISTINCT
             SELECT date, platform FROM m
           )
      SELECT
        d.date,
        d.platform,

        -- Funil (RD-like)
        COALESCE(f.leads, 0) AS leads,
        0 AS qualified_leads,
        COALESCE(f.opportunities, 0) AS opportunities,
        COALESCE(f.sales, 0) AS sales,

        -- Marketing
        COALESCE(m.spend, 0) AS spend,
        COALESCE(m.clicks, 0) AS clicks,
        COALESCE(m.impressions, 0) AS impressions,

        -- KPIs derivados
        SAFE_DIVIDE(COALESCE(m.spend, 0), NULLIF(COALESCE(f.leads, 0), 0)) AS cpl,
        NULL AS cpq,
        SAFE_DIVIDE(COALESCE(m.spend, 0), NULLIF(COALESCE(f.opportunities, 0), 0)) AS cpo,
        SAFE_DIVIDE(COALESCE(m.spend, 0), NULLIF(COALESCE(f.sales, 0), 0)) AS cpv,

        NULL AS rate_leads_to_qualified,
        NULL AS rate_qualified_to_opportunity,
        SAFE_DIVIDE(COALESCE(f.sales, 0), NULLIF(COALESCE(f.opportunities, 0), 0)) AS rate_opportunity_to_sale
      FROM d
      LEFT JOIN f USING (date, platform)
      LEFT JOIN m USING (date, platform)
      ORDER BY date ASC
    `;

    const [platformRows] = await bigquery.query({
      query: platformsQuery,
      params,
    });

    // ===== resposta única
    return res.json({
      total: {
        ...total,
        visits,
        sales_crm: sales_crm_total,
        revenue_crm: revenue_crm_total,
      },
      platforms: platformRows,
      crm_by_platform,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch overview" });
  }
});

// ============================
// REVENUE FORECAST (Histórico + Cenários por DIA, dentro do período)
// ============================
app.get("/api/revenue-forecast", requireAuthOrLocal, async (req, res) => {
  try {
    const { dateStart, dateEnd, platform } = req.query;
    const plat = platform || "all";

    const start = dateStart || daysAgoISO(90);
    const end = dateEnd || todayISO();

    // parâmetros do modelo (simples, explicável)
    const maWindow = 14; // média móvel (N dias)
    const band = 0.2; // +/-20% (otimista/pessimista)
    const maWindowMinus1 = maWindow - 1;

    const query = `
      -- 1) Receita diária real no período
      WITH revenue_daily AS (
        SELECT
          DATE(win_at) AS date,
          SUM(COALESCE(amount_total, 0)) AS revenue_actual
        FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.rd_station__deals\`
        WHERE
          (win IS TRUE OR LOWER(CAST(win AS STRING)) = 'true')
          AND win_at IS NOT NULL
          AND DATE(win_at) BETWEEN DATE(@start) AND DATE(@end)
          AND (
            @platform = 'all'
            OR CASE
              WHEN LOWER(COALESCE(deal_source_name, '')) LIKE '%google%' THEN 'google_ads'
              WHEN LOWER(COALESCE(deal_source_name, '')) LIKE '%meta%'
                OR LOWER(COALESCE(deal_source_name, '')) LIKE '%facebook%'
                OR LOWER(COALESCE(deal_source_name, '')) LIKE '%instagram%' THEN 'meta_ads'
              WHEN LOWER(COALESCE(deal_source_name, '')) LIKE '%linkedin%' THEN 'linkedin_ads'
              ELSE 'other'
            END = @platform
          )
        GROUP BY 1
      ),

      -- 2) Datas do período: mantém duas colunas
      filled AS (
        SELECT
          d AS date,
          COALESCE(r.revenue_actual, 0) AS revenue_actual_filled,
          r.revenue_actual AS revenue_actual_raw
        FROM UNNEST(GENERATE_DATE_ARRAY(DATE(@start), DATE(@end))) AS d
        LEFT JOIN revenue_daily r
          ON r.date = d
      ),
      
      -- 3) Expected por dia (média móvel IGNORANDO dias sem venda)
      calc AS (
        SELECT
          date,
          revenue_actual_filled AS revenue_actual,
          COALESCE(
            AVG(revenue_actual_raw) OVER (
              ORDER BY date
              ROWS BETWEEN ${maWindowMinus1} PRECEDING AND CURRENT ROW
            ),
            0
          ) AS expected
        FROM filled
      ),

      -- 4) Série final com bandas
      final_series AS (
        SELECT
          date,
          revenue_actual,
          expected,
          expected * (1 - @band) AS pessimistic,
          expected * (1 + @band) AS optimistic,
          TRUE AS is_history
        FROM calc
      ),

      -- 5) Acurácia: últimos N dias do período
      accuracy AS (
        SELECT
          GREATEST(
            0,
            LEAST(
              1,
              1 - AVG(
                SAFE_DIVIDE(ABS(revenue_actual - expected), NULLIF(expected, 0))
              )
            )
          ) AS accuracy_rate
        FROM final_series
        WHERE date BETWEEN DATE_SUB(DATE(@end), INTERVAL ${maWindowMinus1} DAY) AND DATE(@end)
      )

      SELECT
        (SELECT accuracy_rate FROM accuracy) AS accuracy_rate,
        ARRAY_AGG(STRUCT(
          date,
          revenue_actual,
          expected,
          pessimistic,
          optimistic,
          is_history
        ) ORDER BY date) AS series
      FROM final_series
    `;

    const [rows] = await bigquery.query({
      query,
      params: { start, end, maWindow, maWindowMinus1, band, platform: plat },
    });

    const out = rows?.[0] || { accuracy_rate: 0, series: [] };

    return res.json({
      start,
      end,
      horizon: 0,
      maWindow,
      band,
      accuracy_rate: Number(out.accuracy_rate || 0),
      series: out.series || [],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch revenue forecast" });
  }
});

// ============================
// DEALS (CRM)
// ============================
app.get("/api/deals", requireAuthOrLocal, async (req, res) => {
  try {
    const { dateStart, dateEnd, limit } = req.query;

    const start = dateStart || daysAgoISO(30);
    const end = dateEnd || todayISO();

    const lim = Math.min(Number(limit || 5000), 20000);

    const query = `
      SELECT *
      FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.rd_station__deals\`
      WHERE DATE(COALESCE(win_at, created_at)) BETWEEN DATE(@start) AND DATE(@end)
      ORDER BY COALESCE(win_at, created_at) DESC
      LIMIT @lim
    `;

    const [rows] = await bigquery.query({
      query,
      params: { start, end, lim },
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch deals" });
  }
});

// ============================
// CONTACTS (Marketing)
// ============================
app.get("/api/contacts", requireAuthOrLocal, async (req, res) => {
  try {
    const { dateStart, dateEnd, limit } = req.query;

    const start = dateStart || daysAgoISO(30);
    const end = dateEnd || todayISO();
    const lim = Math.min(Number(limit || 5000), 20000);

    const query = `
      SELECT *
      FROM \`${process.env.BQ_PROJECT_ID}.${DATASET}.rd_station__contacts\`
      WHERE DATE(created_at) BETWEEN DATE(@start) AND DATE(@end)
      ORDER BY created_at DESC
      LIMIT @lim
    `;

    const [rows] = await bigquery.query({
      query,
      params: { start, end, lim },
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// ===== Start (Cloud Run friendly)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
