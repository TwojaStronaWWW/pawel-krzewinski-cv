/**
 * Lekki, bezbiblioteczny serwer HTTP do lokalnego podglądu CV.
 * Zero zewnętrznych zależności - wykorzystuje wbudowany moduł node:http.
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
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const BLOCKED_PATH_PATTERN = /(^|[\/\\])(\.env.*|\.htaccess|\.git.*|.*\.(php|bak|tmp|log|sql|sh|swp))$/i;

function resolveSafeFilePath(rawUrl = '/', rootDir = ROOT_DIR) {
  let reqUrl;
  try {
    reqUrl = decodeURIComponent(String(rawUrl).split('?')[0].split('#')[0]);
  } catch {
    return { filePath: '', isAllowed: false, isMalformed: true };
  }
  if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

  const resolvedRoot = path.resolve(rootDir);
  const relativeTarget = reqUrl.replace(/^[\/\\]+/, '');
  const filePath = path.resolve(resolvedRoot, relativeTarget);

  const isAllowed =
    (filePath === resolvedRoot ||
    filePath.startsWith(resolvedRoot + path.sep)) &&
    !BLOCKED_PATH_PATTERN.test(filePath);

  return { filePath, isAllowed, isMalformed: false };
}

const server = http.createServer((req, res) => {
  const { filePath, isAllowed, isMalformed } = resolveSafeFilePath(req.url, ROOT_DIR);

  if (isMalformed) {
    res.writeHead(400, {
      'Content-Type': 'text/plain; charset=utf-8',
      ...SECURITY_HEADERS,
    });
    res.end('400 Nieprawidłowy adres URL');
    return;
  }

  // Zabezpieczenie przed Directory Traversal (ISO/IEC 27001 / OWASP)
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

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Moje-CV Server] Działa lokalnie na http://localhost:${PORT}`);
    console.log(`[Moje-CV Server] Plik główny: http://localhost:${PORT}/index.html`);
    console.log(`[Moje-CV Server] Wciśnij Ctrl+C, aby zatrzymać.`);
  });
}

module.exports = {
  server,
  MIME_TYPES,
  SECURITY_HEADERS,
  resolveSafeFilePath,
};
