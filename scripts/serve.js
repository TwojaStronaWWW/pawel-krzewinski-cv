'use strict';

/**
 * Lekki, bezbiblioteczny i utwardzony serwer HTTP do lokalnego podglądu CV (pawel-krzewinski-cv).
 * Zero zewnętrznych zależności - wykorzystuje wbudowany moduł node:http.
 * Zgodny z ISO/IEC 27001 oraz OWASP ASVS (ochrona Path Traversal, blokada dot-files i sekretów).
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy':
    'accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'inline-speculation-rules'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'",
};

const BLOCKED_TOP_DIRS = new Set([
  'source-scans',
  'tests',
  'scripts',
  'node_modules',
  'docs',
  'coverage',
  'dist',
]);

const BLOCKED_FILENAMES = new Set([
  'package.json',
  'package-lock.json',
  'composer.json',
  'composer.lock',
  'agents.md',
  'gemini.md',
  'security.md',
  'readme.md',
]);

const BLOCKED_EXTENSIONS_PATTERN =
  /\.(pem|key|pfx|p12|kdbx|sqlite[0-9]*|db|db-wal|db-shm|sql|csv|json|php[0-9]*|phtml|phar|cgi|pl|py|sh|bat|cmd|ps1|bak|old|orig|tmp|swp|log|yml|yaml|toml|ini|conf)$/i;

const BLOCKED_SECRET_NAME_PATTERN = /(^|[\/\\])(.*token.*\.json|.*credentials.*\.json)$/i;

function isSafeRelativePath(relativeFromRoot) {
  if (!relativeFromRoot || relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
    return false;
  }

  const segments = relativeFromRoot.split(/[\/\\]+/).filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  // Blokada wszystkich plików i katalogów ukrytych (.*) z wyjątkiem RFC 9116 /.well-known/security.txt
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === '.' || seg === '..') {
      return false;
    }
    if (seg.startsWith('.')) {
      const isWellKnownSecurityTxt =
        i === 0 &&
        seg.toLowerCase() === '.well-known' &&
        segments.length === 2 &&
        segments[1].toLowerCase() === 'security.txt';
      if (!isWellKnownSecurityTxt) {
        return false;
      }
    }
  }

  if (BLOCKED_TOP_DIRS.has(segments[0].toLowerCase())) {
    return false;
  }

  const fileNameLower = segments[segments.length - 1].toLowerCase();
  if (BLOCKED_FILENAMES.has(fileNameLower)) {
    return false;
  }

  if (BLOCKED_EXTENSIONS_PATTERN.test(fileNameLower) || BLOCKED_SECRET_NAME_PATTERN.test(relativeFromRoot)) {
    return false;
  }

  return true;
}

function resolveSafeFilePath(rawUrl = '/', rootDir = ROOT_DIR) {
  const rawString = String(rawUrl || '/');
  if (rawString.includes('\0') || /%00/i.test(rawString)) {
    return { filePath: '', isAllowed: false, isMalformed: true };
  }

  const pathPart = rawString.split('?')[0].split('#')[0];
  let reqUrl;
  try {
    reqUrl = decodeURIComponent(pathPart);
  } catch {
    return { filePath: '', isAllowed: false, isMalformed: true };
  }

  if (reqUrl.includes('\0')) {
    return { filePath: '', isAllowed: false, isMalformed: true };
  }

  // Jawna detekcja prób wyjścia poza katalog główny (nawet przed normalizacją)
  const normalizedSlashes = reqUrl.replace(/\\/g, '/');
  if (/(^|\/)\.\.(\/|$)/.test(normalizedSlashes)) {
    return { filePath: '', isAllowed: false, isMalformed: false };
  }

  if (normalizedSlashes === '/' || normalizedSlashes === '') {
    reqUrl = '/index.html';
  }

  const resolvedRoot = path.resolve(rootDir);
  const relativeTarget = reqUrl.replace(/^[\/\\]+/, '');
  const filePath = path.resolve(resolvedRoot, relativeTarget);
  const relativeFromRoot = path.relative(resolvedRoot, filePath);

  const isInsideRoot =
    filePath.startsWith(resolvedRoot + path.sep) &&
    !relativeFromRoot.startsWith('..') &&
    !path.isAbsolute(relativeFromRoot);

  const isAllowed = isInsideRoot && isSafeRelativePath(relativeFromRoot);

  return { filePath, isAllowed, isMalformed: false };
}

function isCrossSiteSubrequest(headers = {}) {
  const fetchSite = String(headers['sec-fetch-site'] || '').toLowerCase();
  const fetchMode = String(headers['sec-fetch-mode'] || '').toLowerCase();
  if (fetchSite === 'cross-site' && fetchMode !== '' && fetchMode !== 'navigate') {
    return true;
  }
  return false;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      'Content-Type': 'text/plain; charset=utf-8',
      Allow: 'GET, HEAD',
      ...SECURITY_HEADERS,
    });
    res.end('405 Metoda niedozwolona');
    return;
  }

  if (isCrossSiteSubrequest(req.headers)) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      ...SECURITY_HEADERS,
    });
    res.end('403 Cross-Site Request Blocked');
    return;
  }

  const { filePath, isAllowed, isMalformed } = resolveSafeFilePath(req.url, ROOT_DIR);

  if (isMalformed) {
    res.writeHead(400, {
      'Content-Type': 'text/plain; charset=utf-8',
      ...SECURITY_HEADERS,
    });
    res.end('400 Nieprawidłowy adres URL');
    return;
  }

  // Zabezpieczenie przed Directory Traversal i dostępem do plików chronionych (ISO/IEC 27001 / OWASP)
  if (!isAllowed) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      ...SECURITY_HEADERS,
    });
    res.end('403 Dostęp zabroniony');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...SECURITY_HEADERS,
      });
      res.end('404 Nie znaleziono pliku');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache',
      ...SECURITY_HEADERS,
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'text/plain; charset=utf-8',
          ...SECURITY_HEADERS,
        });
      }
      res.end();
    });
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[pawel-krzewinski-cv Server] Działa lokalnie na http://localhost:${PORT}`);
    console.log(`[pawel-krzewinski-cv Server] Plik główny: http://localhost:${PORT}/index.html`);
    console.log(`[pawel-krzewinski-cv Server] Wciśnij Ctrl+C, aby zatrzymać.`);
  });
}

module.exports = {
  server,
  MIME_TYPES,
  SECURITY_HEADERS,
  resolveSafeFilePath,
  isCrossSiteSubrequest,
};
