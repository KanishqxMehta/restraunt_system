import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const TDD_MD = path.join(ROOT, "Technical_Design_Document.md");
const DEPLOYMENT_MD = path.join(ROOT, "deployment.md");
const OUTPUT_DIR = path.join(ROOT, "submission_bundle");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log("1. Generating Technical_Design_Document.docx via Pandoc...");
execSync(`pandoc "${TDD_MD}" -o "${path.join(OUTPUT_DIR, "Technical_Design_Document.docx")}"`, {
  stdio: "inherit",
});

console.log("2. Converting Markdown to Styled HTML for PDF export...");
const htmlTemp = path.join(OUTPUT_DIR, "tdd_styled.html");
execSync(
  `pandoc "${TDD_MD}" --standalone -o "${htmlTemp}" --metadata title="Technical Design Document - Company A"`,
  { stdio: "inherit" },
);

// Inject modern clean CSS into HTML
let htmlContent = fs.readFileSync(htmlTemp, "utf-8");
const styling = `
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #1f1c18;
    max-width: 900px;
    margin: 40px auto;
    padding: 0 20px;
  }
  h1, h2, h3, h4 { color: #0f352d; margin-top: 1.4em; }
  h1 { border-bottom: 2px solid #0f352d; padding-bottom: 8px; }
  table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 13px; }
  th, td { border: 1px solid #ded2bf; padding: 8px 12px; text-align: left; }
  th { background-color: #faf7f2; color: #0f352d; }
  code { background-color: #f5efe4; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
  pre { background-color: #1b1917; color: #f5f5f4; padding: 14px; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote { border-left: 4px solid #c99b53; margin: 16px 0; padding-left: 16px; color: #544d42; }
  @page { margin: 20mm; }
</style>
`;
htmlContent = htmlContent.replace("</head>", `${styling}</head>`);
fs.writeFileSync(htmlTemp, htmlContent, "utf-8");

console.log("3. Rendering Technical_Design_Document.pdf via Chromium...");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file://${htmlTemp}`, { waitUntil: "networkidle" });
const pdfPath = path.join(OUTPUT_DIR, "Technical_Design_Document.pdf");
await page.pdf({
  path: pdfPath,
  format: "A4",
  margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  printBackground: true,
});
await browser.close();

// Copy deployment.md to bundle
fs.copyFileSync(DEPLOYMENT_MD, path.join(OUTPUT_DIR, "deployment.md"));

// Also copy PDF and DOCX to repository root for easy review
fs.copyFileSync(pdfPath, path.join(ROOT, "Technical_Design_Document.pdf"));
fs.copyFileSync(
  path.join(OUTPUT_DIR, "Technical_Design_Document.docx"),
  path.join(ROOT, "Technical_Design_Document.docx"),
);

console.log("4. Creating final submission ZIP bundle...");
const zipFile = path.join(ROOT, "Company_A_Direct_Ordering_Submission.zip");
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

// Create ZIP with only the requested files per brief
execSync(
  `zip -j "${zipFile}" "${path.join(OUTPUT_DIR, "Technical_Design_Document.pdf")}" "${path.join(OUTPUT_DIR, "Technical_Design_Document.docx")}" "${path.join(OUTPUT_DIR, "deployment.md")}"`,
  { stdio: "inherit" },
);

const stats = fs.statSync(zipFile);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`\n Submission Package Ready!`);
console.log(`Archive: ${zipFile}`);
console.log(`Size: ${sizeMb} MB (Limit: 25 MB)`);
console.log(`Contents:`);
console.log(`  - Technical_Design_Document.pdf`);
console.log(`  - Technical_Design_Document.docx`);
console.log(`  - deployment.md\n`);
