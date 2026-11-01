const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Higiena repozytorium (Repo Hygiene wzorowane na Gal Anonim i _site-template)', () => {
  it('plik package.json powinien posiadać wymagane skrypty CI (test, test:watch, check, check:syntax, prepare, serve, dev)', () => {
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'Brak package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    assert.ok(pkg.scripts, 'Brak sekcji scripts w package.json');
    assert.ok(pkg.scripts.test, 'Brak skryptu test');
    assert.ok(pkg.scripts['test:watch'], 'Brak skryptu test:watch');
    assert.ok(pkg.scripts['check:syntax'], 'Brak skryptu check:syntax');
    assert.ok(pkg.scripts['check:syntax'].includes('scripts/serve.js'), 'check:syntax powinien weryfikować scripts/serve.js');
    assert.ok(pkg.scripts['check:syntax'].includes('scripts/generate-pdf.js'), 'check:syntax powinien weryfikować scripts/generate-pdf.js');
    assert.ok(pkg.scripts.check, 'Brak skryptu check');
    assert.ok(pkg.scripts.prepare, 'Brak skryptu prepare');
    assert.ok(pkg.scripts.serve, 'Brak skryptu serve');
    assert.ok(pkg.scripts.dev, 'Brak skryptu dev');
  });

  it('konfiguracja CI/CD (.github/workflows/deploy.yml) powinna istnieć i posiadać zdefiniowane etapy', () => {
    const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'deploy.yml');
    assert.ok(fs.existsSync(workflowPath), 'Brak pliku .github/workflows/deploy.yml');
    const content = fs.readFileSync(workflowPath, 'utf-8');

    assert.match(content, /runs-on:\s*ubuntu-latest/i);
    assert.match(content, /actions\/checkout@v4/i);
    assert.match(content, /purge_cache/i, 'Potok deploy.yml powinien posiadać opcjonalny krok czyszczenia cache Cloudflare');
  });

  it('kluczowe pliki źródłowe nie mogą zawierać pozostałości po konfliktach gita (merge conflict markers)', () => {
    const extensionsToCheck = ['.html', '.js', '.css', '.json', '.yml', '.md'];

    const CONFLICT_START = '<<<<<<<' + ' ';
    const CONFLICT_END = '>>>>>>>' + ' ';

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.git') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (fullPath === __filename) continue;
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (extensionsToCheck.some(ext => entry.name.endsWith(ext))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          assert.strictEqual(
            content.includes(CONFLICT_START) || content.includes(CONFLICT_END),
            false,
            `Wykryto marker konfliktu git w pliku: ${path.relative(ROOT_DIR, fullPath)}`
          );
        }
      }
    }

    scanDir(ROOT_DIR);
  });

  it('pliki dokumentacji i standardów AGENTS.md, GEMINI.md, SECURITY.md, .editorconfig oraz szablon PR powinny istnieć', () => {
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'AGENTS.md')), 'Brak AGENTS.md');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'GEMINI.md')), 'Brak GEMINI.md');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'SECURITY.md')), 'Brak SECURITY.md');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.editorconfig')), 'Brak .editorconfig');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'pull_request_template.md')), 'Brak .github/pull_request_template.md');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml')), 'Brak bug_report.yml');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'ISSUE_TEMPLATE', 'task.yml')), 'Brak task.yml');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'ISSUE_TEMPLATE', 'config.yml')), 'Brak config.yml');
  });

  it('git hook (.githooks/pre-commit) powinien istnieć, posiadać shebang bash, blokadę sekretów i uruchamiać npm run check', () => {
    const hookPath = path.join(ROOT_DIR, '.githooks', 'pre-commit');
    assert.ok(fs.existsSync(hookPath), 'Brak .githooks/pre-commit');
    const content = fs.readFileSync(hookPath, 'utf-8');
    const firstLine = content.split(/\r?\n/)[0];

    assert.match(firstLine, /^#!\/(usr\/bin\/env bash|bin\/bash)\s*$/, 'Hook pre-commit nie posiada poprawnego shebangu bash');
    assert.ok(content.includes('\\.env'), 'Hook pre-commit powinien chronić przed zatwierdzeniem plików .env');
    assert.ok(content.includes('npm run check'), 'Hook pre-commit nie wywołuje komendy npm run check');
  });

  it('git hook (.githooks/commit-msg) powinien istnieć i weryfikować format Conventional Commits', () => {
    const hookPath = path.join(ROOT_DIR, '.githooks', 'commit-msg');
    assert.ok(fs.existsSync(hookPath), 'Brak .githooks/commit-msg');
    const content = fs.readFileSync(hookPath, 'utf-8');
    const firstLine = content.split(/\r?\n/)[0];

    assert.match(firstLine, /^#!\/(usr\/bin\/env bash|bin\/bash)\s*$/, 'Hook commit-msg nie posiada poprawnego shebangu bash');
    assert.match(content, /build\|chore\|ci\|docs\|feat\|fix\|perf\|refactor\|revert\|style\|test/i);
    assert.match(content, /Conventional Commits/i);
  });

  it('plik .gitattributes powinien normalizować końce linii LF dla skryptów i hooków', () => {
    const gitAttrPath = path.join(ROOT_DIR, '.gitattributes');
    assert.ok(fs.existsSync(gitAttrPath), 'Brak .gitattributes');
    const content = fs.readFileSync(gitAttrPath, 'utf-8');

    assert.match(content, /\* text=auto eol=lf/i);
    assert.match(content, /\.githooks\/\* text eol=lf/i);
  });

  it('skrypty narzędziowe (scripts/generate-pdf.js oraz scripts/serve.js) powinny istnieć i chronić przed Directory Traversal', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts', 'generate-pdf.js');
    assert.ok(fs.existsSync(scriptPath), 'Brak scripts/generate-pdf.js');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'serve.js')), 'Brak scripts/serve.js');

    const pdfModule = require('../../scripts/generate-pdf');
    assert.strictEqual(typeof pdfModule.generatePdf, 'function');
    assert.strictEqual(typeof pdfModule.findBrowserBinary, 'function');

    const serveModule = require('../../scripts/serve');
    assert.strictEqual(typeof serveModule.resolveSafeFilePath, 'function');
    assert.strictEqual(serveModule.SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
    assert.ok(serveModule.MIME_TYPES['.webmanifest']);

    const validResult = serveModule.resolveSafeFilePath('/index.html', ROOT_DIR);
    assert.strictEqual(validResult.isAllowed, true);

    const traversalResult = serveModule.resolveSafeFilePath('/../../etc/passwd', ROOT_DIR);
    assert.strictEqual(traversalResult.isAllowed, false, 'Serwer powinien blokować próby Directory Traversal');
  });

  it('konfiguracja audytu Lighthouse CI (.lighthouserc.json) powinna istnieć i definiować asercje jakościowe', () => {
    const lhciPath = path.join(ROOT_DIR, '.lighthouserc.json');
    assert.ok(fs.existsSync(lhciPath), 'Brak .lighthouserc.json');

    const config = JSON.parse(fs.readFileSync(lhciPath, 'utf-8'));
    assert.ok(config.ci, 'Brak klucza ci');
    assert.ok(config.ci.assert && config.ci.assert.assertions, 'Brak definicji asercji w lighthouserc.json');
    assert.ok(config.ci.assert.assertions['categories:accessibility']);
    assert.ok(config.ci.assert.assertions['categories:seo']);
  });

  it('pliki robots.txt, sitemap.xml oraz site.webmanifest powinny istnieć i definiować poprawne reguły', () => {
    const manifestPath = path.join(ROOT_DIR, 'site.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'Brak site.webmanifest');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.ok(manifest.name && manifest.icons && manifest.icons.length > 0);

    const robotsPath = path.join(ROOT_DIR, 'robots.txt');
    assert.ok(fs.existsSync(robotsPath), 'Brak robots.txt');
    const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
    assert.match(robotsContent, /User-agent:\s*\*/i);
    assert.match(robotsContent, /Sitemap:\s*https:\/\/krzysztofpoczatek\.pl\/sitemap\.xml/i);

    const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'Brak sitemap.xml');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    assert.match(sitemapContent, /<loc>https:\/\/krzysztofpoczatek\.pl\/<\/loc>/i);
    assert.match(sitemapContent, /<loc>https:\/\/krzysztofpoczatek\.pl\/Krzysztof_Poczatek_CV\.pdf<\/loc>/i);
  });

  it('konfiguracja Dependabot (.github/dependabot.yml) powinna istnieć i chronić zależności przed CVE', () => {
    const dependabotPath = path.join(ROOT_DIR, '.github', 'dependabot.yml');
    assert.ok(fs.existsSync(dependabotPath), 'Brak .github/dependabot.yml');
    const content = fs.readFileSync(dependabotPath, 'utf-8');
    assert.match(content, /package-ecosystem:\s*"github-actions"/i);
    assert.match(content, /package-ecosystem:\s*"npm"/i);
  });

  it('plik README.md powinien istnieć, posiadać odznaki statusu i poprawne ścieżki do grafik z assets/images/', () => {
    const readmePath = path.join(ROOT_DIR, 'README.md');
    assert.ok(fs.existsSync(readmePath), 'Brak README.md');
    const content = fs.readFileSync(readmePath, 'utf-8');
    assert.match(content, /# Krzysztof Początek/i);
    assert.match(content, /CI%2FCD%20Pipeline/i);
    assert.match(content, /Unit%20Tests/i);
    assert.strictEqual(content.includes('assets/img/'), false, 'W README.md pozostały nieistniejące ścieżki assets/img/');
    assert.ok(content.includes('assets/images/photo.jpg'));
    assert.ok(content.includes('assets/images/og-preview.png'));
  });
});
