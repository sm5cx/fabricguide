import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const siteBase = "https://www.fabriccare.guide";
const projectRoot = process.cwd();
const stainsDir = path.join(projectRoot, "stains");

const formatDate = (date) => date.toISOString().slice(0, 10);
const today = formatDate(new Date());
const formatDisplayDate = (date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const getLastMod = (filePath) => {
  try {
    const output = execSync(`git log -1 --format=%cs -- "${filePath}"`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return output || today;
  } catch (error) {
    return today;
  }
};

const humanize = (filename) => {
  const base = filename.replace(/\.html$/i, "");
  return base
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const build = async () => {
  const entries = await fs.readdir(stainsDir, { withFileTypes: true });
  const stainFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const staticPages = [
    { loc: `${siteBase}/`, filePath: path.join(projectRoot, "index.html") },
    { loc: `${siteBase}/about.html`, filePath: path.join(projectRoot, "about.html") },
    {
      loc: `${siteBase}/methodology.html`,
      filePath: path.join(projectRoot, "methodology.html"),
    },
  ];

  const stainPages = stainFiles.map((file) => ({
    loc: `${siteBase}/stains/${file}`,
    filePath: path.join(stainsDir, file),
  }));

  const sitemapEntries = [...staticPages, ...stainPages];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries
    .map(({ loc, filePath }) => {
      const lastmod = getLastMod(filePath);
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
    })
    .join("\n")}\n</urlset>\n`;

  await fs.writeFile(path.join(projectRoot, "sitemap.xml"), sitemapXml, "utf8");

  const listItems = stainFiles
    .filter((file) => file !== "index.html")
    .map((file) => {
      const label = humanize(file);
      return `        <li><a href="/stains/${file}">${label}</a></li>`;
    })
    .join("\n");

  const stainsIndexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Stain Removal Guides — Fabric Care Guide</title>
  <meta name="description" content="Stain removal guides by stain type and fabric: answer-first, step-by-step, with what to avoid." />
  <link rel="stylesheet" href="/assets/style.css" />
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <div class="brand"><a href="/" style="text-decoration:none;">Fabric Care Guide</a></div>
      <nav class="nav" aria-label="Primary">
        <a href="/stains/">Stains</a>
        <a href="/methodology.html">Methodology</a>
        <a href="/about.html">About</a>
      </nav>
    </div>
  </header>

  <main>
    <div class="breadcrumb"><a href="/">Home</a> / Stains</div>
    <h1>Stain removal guides</h1>
    <p class="lede">Answer-first guides for common stains — with clear steps and what not to do.</p>

    <div class="card">
      <h2>Guides</h2>
      <ul>
${listItems}
      </ul>
    </div>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <div>Educational guidance only. Always test on an inconspicuous area first.</div>
      <div>Last updated: <time datetime="${today}">${formatDisplayDate(new Date())}</time></div>
    </div>
  </footer>
</body>
</html>
`;

  await fs.writeFile(path.join(stainsDir, "index.html"), stainsIndexHtml, "utf8");

  console.log(`Updated sitemap.xml and stains/index.html with ${stainFiles.length} stain pages.`);
};

build();
