const samplePayload = {
  title: "沙丘",
  rating: 5,
  comment: "视听震撼，世界观浑厚，二刷也值得。",
  date: "2026-03-30",
};

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Movie Tracker Agent Skill</p>
        <h1>把一句观影感想，变成 Notion 记录和电影卡片。</h1>
        <p className="lede">
          这个服务接收电影标题、评分和短评，自动补全 TMDB 元数据，同步到 Notion，
          然后返回一张由 Vercel OG 动态生成的观影卡片。
        </p>

        <div className="hero-grid">
          <article className="hero-panel">
            <h2>核心接口</h2>
            <ul>
              <li>
                <code>POST /api/mark-movie</code>
              </li>
              <li>
                <code>GET /api/og</code>
              </li>
              <li>
                <code>GET /api/health</code>
              </li>
            </ul>
          </article>

          <article className="hero-panel">
            <h2>请求示例</h2>
            <pre>{JSON.stringify(samplePayload, null, 2)}</pre>
          </article>
        </div>
      </section>
    </main>
  );
}
