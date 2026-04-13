# Site Recovery Runbook

Emergency playbook for when **elusiveracing.com.au** is down or broken. Based on the April 13, 2026 incident (broken auth plugin → white screen → Cloudflare cached the broken page).

> ⚠️ **Credentials are NOT stored in this file.** SSH password and WP-admin logins live in the password manager. If you can't find them, ask Jolean (developer) or check bank statements to identify the hosting provider for account recovery.

---

## Server Access

**Host:** RunCloud-managed VPS
**SSH IP:** `103.193.80.190`
**SSH user:** `runcloud`
**SSH port:** `22`
**WordPress path:** `/home/runcloud/webapps/Elusive_Racing/`
**Plugins path:** `/home/runcloud/webapps/Elusive_Racing/wp-content/plugins/`
**Nginx logs:** `/home/runcloud/logs/nginx/Elusive_Racing_error.log`

Connect:
```bash
ssh runcloud@103.193.80.190
```

---

## Symptom → Diagnosis

| Symptom | Likely cause |
|---|---|
| White screen on every page | Broken plugin (fatal PHP error) OR Cloudflare cached a broken response |
| White screen but `?foo=bar` URL works | **Cloudflare cached a broken page** — purge CF cache |
| Homepage works, `/wp-admin` white | Plugin breaks admin only — deactivate via SSH |
| React app login returns 401 | `elusive-auth-api` plugin deactivated — reactivate it |
| `wp: command not found` | You're not in WP directory — `cd /home/runcloud/webapps/Elusive_Racing/` |

---

## Recovery Procedures

### 1. Diagnose — is the site actually down?
```bash
curl -I https://elusiveracing.com.au
```
- `200 OK` with `cf-cache-status: HIT` → Cloudflare is serving a cached page (may be broken). Test with a cache-buster:
  ```bash
  curl -I "https://elusiveracing.com.au/?nocache=$(date +%s)"
  ```
- If cache-buster URL works but bare URL is white → **Cloudflare cache problem, skip to step 5**.

### 2. Check for recent fatal PHP errors
```bash
grep -i "fatal\|parse error" /home/runcloud/logs/nginx/Elusive_Racing_error.log | tail -20
```
Ignore `E_WARNING`, `E_DEPRECATED`, `E_NOTICE` — those are noise and don't cause white screens. You're looking for `PHP Fatal error` or `PHP Parse error`.

### 3. Deactivate a broken plugin (emergency)

**Option A — WP-CLI (preferred):**
```bash
cd /home/runcloud/webapps/Elusive_Racing/
wp plugin deactivate <plugin-slug>
```

**Option B — rename the folder (when WP-CLI is broken too):**
```bash
cd /home/runcloud/webapps/Elusive_Racing/wp-content/plugins/
mv <plugin-folder> <plugin-folder>-disabled
```
WordPress auto-deactivates missing plugins on the next page load.

> ⚠️ **Gotcha:** renaming the folder back does **not** auto-reactivate it — WordPress marked it inactive in the database. You must run `wp plugin activate <slug>` explicitly.

### 4. Clear WordPress caches
```bash
cd /home/runcloud/webapps/Elusive_Racing/
wp cache flush
wp transient delete --all
rm -rf /home/runcloud/webapps/Elusive_Racing/wp-content/cache/flying-press
```

### 5. Purge Cloudflare cache (critical if #4 didn't fix it)

Cloudflare's edge cache is separate from WordPress and FlyingPress. If CF is serving a cached broken page, local flushes **won't help**.

**Fastest path — WP admin Cloudflare plugin:**
1. Log into `https://elusiveracing.com.au/wp-admin/`
2. Go to `/wp-admin/options-general.php?page=cloudflare#/home`
3. Click **Purge Cache**

**Alternative:** log into Cloudflare dashboard directly → Caching → Configuration → **Purge Everything**.

**Last resort:** wait for the cache to expire naturally (hours).

### 6. Verify recovery
```bash
curl -I https://elusiveracing.com.au
```
Hard-refresh in browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows).

---

## Known Landmines

- **FlyingPress page cache** can serve stale broken HTML even after fixing the underlying issue. Always clear `wp-content/cache/flying-press` after any plugin change.
- **WordPress plugin editor (Appearance → Editor) corrupts PHP** by converting straight quotes to smart quotes. **Never edit PHP via the WP admin editor.** Edit files via SSH only.
- **Cloudflare cache persists across fixes.** A broken deployment can leave bad HTML cached for hours. Always purge CF after recovery.
- **`elusive-auth-api` plugin** is the custom auth bridge between the React storefront (Railway) and WordPress. Deactivating it breaks login on the React app but leaves the WordPress site itself working. The v1.0.0 baseline is preserved at `wp-plugin/elusive-auth-api/elusive-auth-api.php` in this repo.
- **`zipmoney-payments-woocommerce`** throws an `E_DEPRECATED` warning on every WP-CLI call. Harmless noise — ignore it.

---

## The Four Entities With Server Access

If you lose SSH access, only these can recover the site:

1. **Hosting provider** (identify via bank statement → recurring charge) — account recovery with domain + payment proof, typically ~1 hour
2. **RunCloud** control panel — `https://manage.runcloud.io/`
3. **The original developer** (Jolean) — has working credentials
4. **Onrai Studio** — possibly involved in backend setup

**Do not contact WordPress.org or WordPress.com** — this is a self-hosted WordPress install, they have no access to your files.

---

## Post-Incident Checklist

- [ ] Site responds `200` at `curl -I https://elusiveracing.com.au`
- [ ] Homepage loads in browser after hard-refresh
- [ ] `/wp-admin` loads
- [ ] React storefront login works (if `elusive-auth-api` is reactivated)
- [ ] Rotate any credentials shared in plain text during recovery
- [ ] Update this runbook if you learned something new
