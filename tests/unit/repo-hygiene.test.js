const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Higiena repozytorium (Repo Hygiene — pawel-krzewinski-cv / _site-template)', () => {
  it('plik package.json powinien mieć poprawne metadane pawel-krzewinski-cv oraz wymagane skrypty CI', () => {
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'Brak package.json');
    const rawPkg = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(rawPkg);

    assert.strictEqual(pkg.name, 'pawel-krzewinski-cv');
    assert.strictEqual(rawPkg.toLowerCase().includes('krzysztofpoczatek.pl'), false, 'package.json nie może zawierać odwołań do krzysztofpoczatek.pl');
    assert.strictEqual(rawPkg.toLowerCase().includes('moje-cv'), false, 'package.json nie może zawierać starej nazwy moje-cv');

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

  it('konfiguracja CI/CD (.github/workflows/deploy.yml) powinna istnieć, posiadać etapy i chronić produkcję', () => {
    const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'deploy.yml');
    assert.ok(fs.existsSync(workflowPath), 'Brak pliku .github/workflows/deploy.yml');
    const content = fs.readFileSync(workflowPath, 'utf-8');

    assert.match(content, /runs-on:\s*ubuntu-latest/i);
    assert.match(content, /actions\/checkout@v4/i);
    assert.match(content, /purge_cache/i, 'Potok deploy.yml powinien posiadać opcjonalny krok czyszczenia cache Cloudflare');
    assert.strictEqual(content.includes('krzysztofpoczatek.pl'), false, 'deploy.yml NIE MOŻE zawierać zahardkodowanej domeny krzysztofpoczatek.pl');
    assert.match(content, /remote_path:\s*\$\{\{\s*secrets\.SFTP_REMOTE_PATH\s*\}\}/);
  });

  it('kluczowe pliki źródłowe nie mogą zawierać pozostałości po konfliktach gita (merge conflict markers)', () => {
    const extensionsToCheck = ['.html', '.js', '.css', '.json', '.yml', '.md'];

    const CONFLICT_START = '<<<<<<<' + ' ';
    const CONFLICT_END = '>>>>>>>' + ' ';

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name === '.git' ||
          entry.name === 'node_modules' ||
          entry.name === 'source-scans' ||
          entry.name === 'dist'
        ) {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (fullPath === __filename) continue;
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (extensionsToCheck.some((ext) => entry.name.endsWith(ext))) {
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

    const securityMd = fs.readFileSync(path.join(ROOT_DIR, 'SECURITY.md'), 'utf-8');
    assert.strictEqual(securityMd.toLowerCase().includes('krzysztofpoczatek.pl'), false, 'SECURITY.md nie może odwoływać się do krzysztofpoczatek.pl');
  });

  it('plik .gitignore powinien wykluczać sekrety, certyfikaty, bazy danych, skany RODO oraz katalog roboczy docs/audits/', () => {
    const gitignorePath = path.join(ROOT_DIR, '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), 'Brak .gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf-8');

    const requiredEntries = [
      'node_modules/',
      'dist/',
      'source-scans/',
      'docs/audits/',
      '.env',
      '.env.*',
      '!.env.example',
      '.env.bak*',
      '*.pem',
      '*.key',
      '*.pfx',
      '*.kdbx',
      '*.sqlite*',
      '.chrome-*/',
      '*token*.json',
    ];

    for (const entry of requiredEntries) {
      assert.ok(content.includes(entry), `Brak wymaganego wpisu w .gitignore: ${entry}`);
    }

    assert.strictEqual(
      fs.existsSync(path.join(ROOT_DIR, 'docs', 'audits')),
      false,
      'Nieśledzony katalog roboczy docs/audits/ nie powinien istnieć w repozytorium'
    );
  });

  it('pliki ochrony łańcucha dostaw (.npmrc) i detekcji sekretów (.gitleaks.toml) powinny istnieć i być poprawnie skonfigurowane', () => {
    const npmrcPath = path.join(ROOT_DIR, '.npmrc');
    assert.ok(fs.existsSync(npmrcPath), 'Brak .npmrc');
    const npmrc = fs.readFileSync(npmrcPath, 'utf-8');
    assert.match(npmrc, /^ignore-scripts=true$/m, '.npmrc musi wymuszać ignore-scripts=true');
    assert.match(npmrc, /^audit-level=high$/m, '.npmrc musi ustawiać audit-level=high');

    const gitleaksPath = path.join(ROOT_DIR, '.gitleaks.toml');
    assert.ok(fs.existsSync(gitleaksPath), 'Brak .gitleaks.toml');
    const gitleaks = fs.readFileSync(gitleaksPath, 'utf-8');
    assert.match(gitleaks, /useDefault\s*=\s*true/);
  });

  it('[REF-06] plik .well-known/security.txt powinien posiadać aktywną datę Expires: w przyszłości i poprawne dane domeny', () => {
    const secTxtPath = path.join(ROOT_DIR, '.well-known', 'security.txt');
    assert.ok(fs.existsSync(secTxtPath), 'Brak .well-known/security.txt');
    const content = fs.readFileSync(secTxtPath, 'utf-8');

    assert.strictEqual(content.toLowerCase().includes('krzysztofpoczatek.pl'), false, 'security.txt nie może zawierać krzysztofpoczatek.pl');
    assert.match(content, /^Contact:\s*(mailto:|https:\/\/)/m);
    assert.match(content, /^Preferred-Languages:\s*pl,\s*en/m);
    assert.match(content, /^Canonical:\s*https:\/\/pawelkrzewinski\.pl\/\.well-known\/security\.txt$/m);
    assert.match(content, /^Policy:\s*https:\/\/github\.com\/TwojaStronaWWW\/pawel-krzewinski-cv\//m);

    const expiresMatch = content.match(/^Expires:\s*(.+)$/m);
    assert.ok(expiresMatch, 'Brak pola Expires: w .well-known/security.txt');
    const expiresDate = new Date(expiresMatch[1].trim());
    assert.ok(!Number.isNaN(expiresDate.getTime()), 'Nieprawidłowy format daty ISO-8601 w polu Expires:');

    const minFutureMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
    assert.ok(
      expiresDate.getTime() > minFutureMs,
      `Data Expires (${expiresMatch[1]}) w security.txt wygasa za mniej niż 30 dni!`
    );
  });

  it('git hooki (.githooks/pre-commit, .githooks/commit-msg) oraz skrypty *.sh muszą mieć końce linii LF (\\n) i chronić sekrety', () => {
    const hookPath = path.join(ROOT_DIR, '.githooks', 'pre-commit');
    assert.ok(fs.existsSync(hookPath), 'Brak .githooks/pre-commit');
    const rawPreCommit = fs.readFileSync(hookPath);
    assert.strictEqual(rawPreCommit.includes(0x0d), false, '.githooks/pre-commit zawiera niedozwolone znaki CR (CRLF)!');

    const content = rawPreCommit.toString('utf-8');
    const firstLine = content.split('\n')[0];
    assert.match(firstLine, /^#!\/(usr\/bin\/env bash|bin\/bash)\s*$/, 'Hook pre-commit nie posiada poprawnego shebangu bash');
    assert.ok(content.includes('\\.env'), 'Hook pre-commit powinien chronić przed zatwierdzeniem plików .env*');
    assert.ok(content.includes('npm run check'), 'Hook pre-commit nie wywołuje komendy npm run check');

    const commitMsgPath = path.join(ROOT_DIR, '.githooks', 'commit-msg');
    assert.ok(fs.existsSync(commitMsgPath), 'Brak .githooks/commit-msg');
    const rawCommitMsg = fs.readFileSync(commitMsgPath);
    assert.strictEqual(rawCommitMsg.includes(0x0d), false, '.githooks/commit-msg zawiera niedozwolone znaki CR (CRLF)!');
    const commitMsgContent = rawCommitMsg.toString('utf-8');
    assert.match(commitMsgContent, /build\|chore\|ci\|docs\|feat\|fix\|perf\|refactor\|revert\|style\|test/i);
    assert.match(commitMsgContent, /Conventional Commits/i);
  });

  it('plik .gitattributes powinien normalizować końce linii LF dla skryptów *.sh i .githooks/*', () => {
    const gitAttrPath = path.join(ROOT_DIR, '.gitattributes');
    assert.ok(fs.existsSync(gitAttrPath), 'Brak .gitattributes');
    const content = fs.readFileSync(gitAttrPath, 'utf-8');

    assert.match(content, /\* text=auto eol=lf/i);
    assert.match(content, /\*\.sh text eol=lf/i);
    assert.match(content, /\.githooks\/\* text eol=lf/i);
  });

  it('uratowane dokumenty rekrutacyjne w katalogu documents/ powinny istnieć i mieć spójne zasoby CSS', () => {
    const docsDir = path.join(ROOT_DIR, 'documents');
    assert.ok(fs.existsSync(docsDir), 'Brak śledzonego katalogu documents/');

    const expectedDocs = [
      'list_motywacyjny.html',
      'list_motywacyjny_biblioteki.html',
      'plan_rekrutacji.html',
      'poradnik_biblioteki.html',
    ];

    for (const fileName of expectedDocs) {
      const fullPath = path.join(docsDir, fileName);
      assert.ok(fs.existsSync(fullPath), `Brak uratowanego dokumentu: documents/${fileName}`);
      assert.ok(fs.statSync(fullPath).size > 1000, `Plik documents/${fileName} jest podejrzanie mały`);
    }
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

  it('pliki robots.txt, llms.txt, sitemap.xml oraz site.webmanifest powinny istnieć i definiować poprawne reguły ([REF-07])', () => {
    const manifestPath = path.join(ROOT_DIR, 'site.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'Brak site.webmanifest');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.ok(manifest.name && manifest.icons && manifest.icons.length > 0);

    const llmsPath = path.join(ROOT_DIR, 'llms.txt');
    assert.ok(fs.existsSync(llmsPath), 'Brak llms.txt');
    const llmsContent = fs.readFileSync(llmsPath, 'utf-8');
    assert.ok(llmsContent.includes('Paweł Krzewiński'));

    const robotsPath = path.join(ROOT_DIR, 'robots.txt');
    assert.ok(fs.existsSync(robotsPath), 'Brak robots.txt');
    const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
    assert.match(robotsContent, /User-agent:\s*\*/i);
    assert.match(robotsContent, /^Allow:\s*\/llms\.txt$/m, 'robots.txt musi jawnie zezwalać na /llms.txt ([REF-07])');
    assert.match(robotsContent, /Sitemap:\s*https:\/\/pawelkrzewinski\.pl\/sitemap\.xml/i);

    const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'Brak sitemap.xml');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    assert.match(sitemapContent, /<loc>https:\/\/pawelkrzewinski\.pl\/<\/loc>/i);
    assert.match(sitemapContent, /<loc>https:\/\/pawelkrzewinski\.pl\/Pawel_Krzewinski_CV\.pdf<\/loc>/i);
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
    assert.match(content, /# Paweł Krzewiński/i);
    assert.match(content, /CI%2FCD%20Pipeline/i);
    assert.match(content, /Unit%20Tests/i);
    assert.strictEqual(content.includes('assets/img/'), false, 'W README.md pozostały nieistniejące ścieżki assets/img/');
    assert.ok(content.includes('assets/images/photo.jpg'));
    assert.ok(content.includes('assets/images/og-preview.png'));
  });
});
