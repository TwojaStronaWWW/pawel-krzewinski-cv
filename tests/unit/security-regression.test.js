const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { server, resolveSafeFilePath, isCrossSiteSubrequest, SECURITY_HEADERS } = require('../../scripts/serve');

const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Regresja Bezpieczeństwa i Threat Protection (ISO 27001 / OWASP / DevSecOps)', () => {
  describe('[P0 CRITICAL] Ochrona Produkcji i Potoków CI/CD (.github/workflows/)', () => {
    it('deploy.yml nie może zawierać zahardkodowanego krzysztofpoczatek.pl ani serwer417204 i musi posiadać Fail-Closed SFTP Guard', () => {
      const deployPath = path.join(ROOT_DIR, '.github', 'workflows', 'deploy.yml');
      const content = fs.readFileSync(deployPath, 'utf-8');

      assert.strictEqual(content.includes('krzysztofpoczatek.pl'), false, 'Krytyczny błąd P0: wykryto krzysztofpoczatek.pl w deploy.yml!');
      assert.strictEqual(content.includes('serwer417204'), false, 'Wykryto zahardkodowany identyfikator serwera w deploy.yml!');
      assert.match(content, /remote_path:\s*\$\{\{\s*secrets\.SFTP_REMOTE_PATH\s*\}\}/);
      assert.match(content, /TARGET_PATH:\s*\$\{\{\s*secrets\.SFTP_REMOTE_PATH\s*\}\}/);
      assert.match(content, /if\s*\[\s*-z\s*"\$\{TARGET_PATH:-\}"\s*\]/);
      assert.match(content, /krzysztofpoczatek\\\.pl/);
      assert.match(content, /exit 1/);
      assert.match(content, /permissions:\s*\n\s*contents:\s*read/);
    });

    it('ai-security-review.yml powinien wymuszać author_association (OWNER, MEMBER, COLLABORATOR) i używać modelu gemini-3.5-flash', () => {
      const aiWorkflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'ai-security-review.yml');
      assert.ok(fs.existsSync(aiWorkflowPath), 'Brak .github/workflows/ai-security-review.yml');
      const content = fs.readFileSync(aiWorkflowPath, 'utf-8');

      assert.match(content, /github\.event\.pull_request\.author_association/);
      assert.match(content, /github\.event\.comment\.author_association/);
      assert.ok(content.includes('"OWNER"'));
      assert.ok(content.includes('"MEMBER"'));
      assert.ok(content.includes('"COLLABORATOR"'));
      assert.match(content, /gemini-3\.5-flash/);
      assert.match(content, /x-goog-api-key/);
      assert.strictEqual(content.includes('?key='), false, 'Klucz API Gemini nie może być przekazywany w URL query string');
    });

    it('żaden workflow GitHub Actions nie powinien używać cache: npm przy braku package-lock.json', () => {
      const hasPackageLock = fs.existsSync(path.join(ROOT_DIR, 'package-lock.json'));
      if (!hasPackageLock) {
        const workflowsDir = path.join(ROOT_DIR, '.github', 'workflows');
        const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(workflowsDir, file), 'utf-8');
          assert.doesNotMatch(content, /cache:\s*['"]?npm['"]?/i, `Workflow ${file} używa cache: npm bez package-lock.json`);
        }
      }
    });
  });

  describe('[REF-01] Utwardzenie serwera Apache (.htaccess)', () => {
    const htaccessPath = path.join(ROOT_DIR, '.htaccess');
    const htaccess = fs.readFileSync(htaccessPath, 'utf-8');

    it('powinien definiować kompresję Brotli i Deflate oraz kluczowe nagłówki bezpieczeństwa (HSTS, CSP, nosniff, COOP, CORP)', () => {
      assert.match(htaccess, /mod_brotli\.c/);
      assert.match(htaccess, /mod_deflate\.c/);
      assert.match(htaccess, /Strict-Transport-Security/);
      assert.match(htaccess, /Content-Security-Policy/);
      assert.match(htaccess, /X-Content-Type-Options\s+"nosniff"/);
      assert.match(htaccess, /Cross-Origin-Opener-Policy\s+"same-origin-allow-popups"/);
      assert.match(htaccess, /Cross-Origin-Resource-Policy\s+"same-site"/);
      assert.doesNotMatch(htaccess, /unsafe-eval/i);
      assert.doesNotMatch(htaccess, /unsafe-inline/i);
    });

    it('powinien chronić przed PHP2Shell w QUERY_STRING oraz blokować pliki .git, .env, .sqlite, .db-wal, .csv, .pem, .key, package.json i .gitleaks.toml (zachowując .well-known)', () => {
      assert.match(htaccess, /auto_prepend_file/);
      assert.match(htaccess, /allow_url_include/);
      assert.match(htaccess, /\(\?!\\\.well-known\/\)/);
      assert.match(htaccess, /\\\.env/);
      assert.match(htaccess, /\\\.git/);
      assert.match(htaccess, /sqlite/);
      assert.match(htaccess, /db-wal/);
      assert.match(htaccess, /db-shm/);
      assert.match(htaccess, /csv/);
      assert.match(htaccess, /pem\|key/);
      assert.match(htaccess, /package\(-lock\)\?\\\.json/);
      assert.match(htaccess, /\\\.gitleaks\\\.toml/);
    });
  });

  describe('Utwardzenie serwera lokalnego (scripts/serve.js)', () => {
    it('resolveSafeFilePath powinien blokować Path Traversal, dot-files, pliki konfiguracyjne i skany RODO', () => {
      const blockedPaths = [
        '/../../etc/passwd',
        '/..%2f..%2fetc/passwd',
        '/..\\..\\Windows\\win.ini',
        '/.env',
        '/.env.local',
        '/.env.bak',
        '/.git/HEAD',
        '/.git/config',
        '/.githooks/pre-commit',
        '/.github/workflows/deploy.yml',
        '/.npmrc',
        '/.gitleaks.toml',
        '/.htaccess',
        '/package.json',
        '/AGENTS.md',
        '/SECURITY.md',
        '/private.key',
        '/cert.pem',
        '/baza.sqlite3',
        '/vault.kdbx',
        '/oauth-token.json',
        '/source-scans/Scan_20261101_101836.pdf',
        '/scripts/serve.js',
        '/tests/unit/main.test.js',
      ];

      for (const unsafeUrl of blockedPaths) {
        const res = resolveSafeFilePath(unsafeUrl, ROOT_DIR);
        assert.strictEqual(res.isAllowed, false, `Ścieżka powinna być zablokowana (403): ${unsafeUrl}`);
      }
    });

    it('resolveSafeFilePath powinien odrzucać uszkodzone kodowanie URI i bajty zerowe (400)', () => {
      assert.strictEqual(resolveSafeFilePath('/%E0%A4%A', ROOT_DIR).isMalformed, true);
      assert.strictEqual(resolveSafeFilePath('/index.html%00.jpg', ROOT_DIR).isMalformed, true);
      assert.strictEqual(resolveSafeFilePath('/index.html\0', ROOT_DIR).isMalformed, true);
    });

    it('[REF-05] isCrossSiteSubrequest powinien blokować podżądania cross-site (Sec-Fetch-Site: cross-site), zezwalając na nawigację top-level', () => {
      assert.strictEqual(isCrossSiteSubrequest({ 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors' }), true);
      assert.strictEqual(isCrossSiteSubrequest({ 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'no-cors' }), true);
      assert.strictEqual(isCrossSiteSubrequest({ 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' }), false);
      assert.strictEqual(isCrossSiteSubrequest({ 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors' }), false);
    });

    it('resolveSafeFilePath powinien zezwalać na publiczne zasoby CV oraz /.well-known/security.txt', () => {
      const allowedPaths = [
        '/',
        '/index.html',
        '/llms.txt',
        '/robots.txt',
        '/sitemap.xml',
        '/site.webmanifest',
        '/.well-known/security.txt',
        '/assets/css/main.css?v=1.1',
        '/documents/list_motywacyjny.html',
      ];

      for (const safeUrl of allowedPaths) {
        const res = resolveSafeFilePath(safeUrl, ROOT_DIR);
        assert.strictEqual(res.isMalformed, false, `Ścieżka nie powinna być oznaczona jako malformed: ${safeUrl}`);
        assert.strictEqual(res.isAllowed, true, `Ścieżka publiczna powinna być dozwolona (200): ${safeUrl}`);
      }
    });

    describe('Testy odpowiedzi HTTP na lokalnym gnieździe loopback (127.0.0.1:0)', () => {
      let baseUrl;

      before((_, done) => {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          baseUrl = `http://127.0.0.1:${addr.port}`;
          done();
        });
      });

      after((_, done) => {
        server.close(done);
      });

      function requestStatus(urlPath, method = 'GET') {
        return new Promise((resolve, reject) => {
          const req = http.request(`${baseUrl}${urlPath}`, { method }, (res) => {
            res.resume();
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers }));
          });
          req.on('error', reject);
          req.end();
        });
      }

      it('zwraca 200 OK z kompletem nagłówków bezpieczeństwa dla /index.html oraz /.well-known/security.txt', async () => {
        const indexRes = await requestStatus('/index.html');
        assert.strictEqual(indexRes.statusCode, 200);
        assert.strictEqual(indexRes.headers['x-content-type-options'], SECURITY_HEADERS['X-Content-Type-Options']);
        assert.ok(indexRes.headers['content-security-policy']);

        const secRes = await requestStatus('/.well-known/security.txt');
        assert.strictEqual(secRes.statusCode, 200);

        const headRes = await requestStatus('/llms.txt', 'HEAD');
        assert.strictEqual(headRes.statusCode, 200);
      });

      it('zwraca 403 dla prób odczytu .env, package.json i Directory Traversal, 400 dla %00 oraz 405 dla POST', async () => {
        assert.strictEqual((await requestStatus('/.env')).statusCode, 403);
        assert.strictEqual((await requestStatus('/package.json')).statusCode, 403);
        assert.strictEqual((await requestStatus('/..%2f..%2fetc/passwd')).statusCode, 403);
        assert.strictEqual((await requestStatus('/index.html%00')).statusCode, 400);
        assert.strictEqual((await requestStatus('/index.html', 'POST')).statusCode, 405);
        assert.strictEqual((await requestStatus('/nie-istnieje-404.html')).statusCode, 404);
      });
    });
  });

  describe('Strict Separation of Concerns (Zero-Inline HTML) & RODO Guard', () => {
    it('żaden śledzony plik HTML (index.html oraz documents/*.html) nie może zawierać atrybutów style="..." ani onclick/on*="..."', () => {
      const htmlFiles = [
        path.join(ROOT_DIR, 'index.html'),
        ...fs
          .readdirSync(path.join(ROOT_DIR, 'documents'))
          .filter((f) => f.endsWith('.html'))
          .map((f) => path.join(ROOT_DIR, 'documents', f)),
      ];

        for (const filePath of htmlFiles) {
        const rel = path.relative(ROOT_DIR, filePath);
        const content = fs.readFileSync(filePath, 'utf-8');

        assert.doesNotMatch(content, /\sstyle\s*=\s*["']/i, `Wykryto niedozwolony atrybut inline style="..." w ${rel}`);
        assert.doesNotMatch(content, /<style[\s>]/i, `Wykryto osadzony blok <style> w ${rel} (wymagany zewnętrzny plik .css)`);
        assert.doesNotMatch(content, /\son[a-z]+\s*=\s*["']/i, `Wykryto niedozwolony handler inline on*="..." w ${rel}`);
        assert.doesNotMatch(content, /\bpesel\b/i, `Wykryto słowo PESEL w publicznym pliku HTML (${rel}) — naruszenie RODO`);
        assert.match(content, /<a\s+href="#main-content"\s+class="skip-link">/i, `Brak .skip-link WCAG 2.2 AA w ${rel}`);
        assert.match(content, /<main\s+id="main-content"[\s>]/i, `Brak <main id="main-content"> w ${rel}`);
      }
    });
  });
});
