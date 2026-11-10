# Polityka Bezpieczeństwa (Security Policy) – Paweł Krzewiński CV (`pawel-krzewinski-cv`)

## 1. Zakres i Rygor (ISO/IEC 27001:2023 & RODO)
Bezpieczeństwo danych, ochrona prywatności kandydata oraz integralność kodu i wdrożeń serwisu **pawelkrzewinski.pl** (`TwojaStronaWWW/pawel-krzewinski-cv`) są traktowane priorytetowo. Zgodnie z wytycznymi normy **ISO/IEC 27001:2023** oraz zasadą *Zero Data Leakage* stosujemy rygorystyczne procedury ochrony informacji, izolację źródłowych skanów dokumentów (`source-scans/`), automatyczny nadzór nad zależnościami (Dependabot) oraz lokalne i zdalne bramki jakościowe (Quality Gates).

## 2. Odpowiedzialne Ujawnianie Podatności (Responsible Disclosure — RFC 9116)
Jeżeli odkryłeś potencjalną lukę bezpieczeństwa w kodzie lub konfiguracji serwisu, prosimy o bezpośrednie i poufne zgłoszenie tego faktu:

- **Zakaz publicznego ujawniania:** Prosimy o **niepublikowanie** informacji o lukach w publicznych zgłoszeniach GitHub Issues przed ich zweryfikowaniem i usunięciem.
- **Zgłoszenie przez GitHub Security Advisories:** `https://github.com/TwojaStronaWWW/pawel-krzewinski-cv/security/advisories/new`
- **Kontakt bezpośredni:** Wyślij szczegółowy raport na adres `pawelkrzewinski1982@gmail.com` z dopiskiem `[SECURITY]` w tytule wiadomości (zgodnie z plikiem `/.well-known/security.txt`).

## 3. Gwarancje Architektoniczne i Threat Protection
- **Zero zewnętrznych zależności produkcyjnych (Zero-Bloat + `.npmrc`):** Brak paczek runtime oraz wymuszone `ignore-scripts=true` i `audit-level=high`.
- **Fail-Closed Production Guard (`deploy.yml`):** Wdrożenie SFTP weryfikuje sekret `SFTP_REMOTE_PATH` przed transferem i blokuje puste lub niedozwolone ścieżki produkcyjne.
- **Utwardzenie krawędziowe i lokalne (`.htaccess` + `scripts/serve.js`):** Ścisłe nagłówki bezpieczeństwa (`CSP`, `HSTS`, `COOP`, `CORP`, `X-Content-Type-Options: nosniff`), blokada zapytań PHP2Shell, ochrona przed Directory Traversal oraz blokada dostępu do plików ukrytych i konfiguracyjnych (`.git`, `.env`, `.pem`, `.key`, `.sqlite`, `package.json`, `.gitleaks.toml`).
- **Ochrona sekretów w Git Hooks i Gitleaks:** Hook `.githooks/pre-commit` oraz konfiguracja `.gitleaks.toml` blokują zatwierdzenie sekretów, kluczy prywatnych i plików `.env*`.
