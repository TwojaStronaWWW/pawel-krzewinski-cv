# Polityka Bezpieczeństwa (Security Policy) – Krzysztof Początek / TwojaStronaWWW

## 1. Zakres i Rygor (ISO/IEC 27001:2023)
Bezpieczeństwo danych, integralność kodu oraz stabilność produkcyjna serwisu **krzysztofpoczatek.pl** są traktowane priorytetowo. Zgodnie z wytycznymi normy **ISO/IEC 27001:2023** oraz zasadą *Zero Data Leakage* stosujemy rygorystyczne procedury ochrony informacji, automatyczny nadzór nad zależnościami (Dependabot) oraz lokalne i zdalne bramki jakościowe (Quality Gates).

## 2. Odpowiedzialne Ujawnianie Podatności (Responsible Disclosure)
Jeżeli odkryłeś potencjalną lukę bezpieczeństwa w kodzie lub konfiguracji serwisu, prosimy o bezpośrednie zgłoszenie tego faktu:

- **Zakaz publicznego ujawniania:** Prosimy o **niepublikowanie** informacji o lukach w publicznych zgłoszeniach GitHub Issues przed ich zweryfikowaniem i usunięciem.
- **Kontakt bezpośredni:** Wyślij szczegółowy raport na adres: `poczatek.krzysztof@gmail.com` z dopiskiem `[SECURITY]` w tytule wiadomości.

## 3. Gwarancje Architektoniczne
- **Zero zewnętrznych zależności produkcyjnych (Zero-Bloat):** Brak podatnych paczek zewnętrznych w warstwie runtime.
- **Ochrona przed Directory Traversal:** Lokalny serwer deweloperski (`scripts/serve.js`) rygorystycznie waliduje ścieżki plików.
- **Ochrona sekretów w Git Hooks:** Hook `.githooks/pre-commit` blokuje przypadkowe zatwierdzenie plików konfiguracyjnych i sekretów (`.env`, `.htpasswd`).
