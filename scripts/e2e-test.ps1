# ============================================================
# Rivox AI SaaS - End-to-End Pipeline Test (curl.exe based)
# Product -> Score -> Ad -> Link -> Redirect -> Click -> Commission -> Compliance
# Asserts response CONTENT + status (not just status codes).
# ASCII-only on purpose: PowerShell 5.1 misreads UTF-8 without BOM.
# ============================================================
$ErrorActionPreference = "Continue"
$Base = "http://localhost:3000"
$Root = "C:\Users\mz712\rivox-ai-saas"
$keys = Get-Content "$Root\.supabase-keys.json" -Raw | ConvertFrom-Json
$sess = Get-Content "$Root\.test-session.json" -Raw | ConvertFrom-Json
$ref = $keys.ref
$Url = $keys.url
$Pass = 0; $Fail = 0

function Ok($name)   { $script:Pass++; Write-Host "[PASS] $name" -ForegroundColor Green }
function Bad($name, $detail) { $script:Fail++; Write-Host "[FAIL] $name :: $detail" -ForegroundColor Red }

# --- HTTP helper via .NET (PowerShell 5.1 mangles multi-line JSON passed to curl.exe) ---
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Net;
using System.Text;

public class HttpResult {
    public int Status;
    public string Body;
    public string Location;
}

public static class HttpX {
    public static HttpResult Do(string method, string url, string cookie, string body, string headers, bool allowRedirect) {
        try {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = method;
            req.AllowAutoRedirect = allowRedirect;
            req.Timeout = 90000;
            req.ReadWriteTimeout = 90000;
            if (!string.IsNullOrEmpty(cookie)) req.Headers[HttpRequestHeader.Cookie] = cookie;
            if (!string.IsNullOrEmpty(headers)) {
                foreach (string line in headers.Split('\n')) {
                    int i = line.IndexOf(':');
                    if (i <= 0) continue;
                    string k = line.Substring(0, i).Trim();
                    string v = line.Substring(i + 1).Trim();
                    if (string.Equals(k, "Accept", StringComparison.OrdinalIgnoreCase)) { req.Accept = v; }
                    else if (string.Equals(k, "Content-Type", StringComparison.OrdinalIgnoreCase)) { req.ContentType = v; }
                    else { req.Headers[k] = v; }
                }
            }
            if (!string.IsNullOrEmpty(body)) {
                byte[] b = Encoding.UTF8.GetBytes(body);
                if (string.IsNullOrEmpty(req.ContentType)) req.ContentType = "application/json";
                req.ContentLength = b.Length;
                using (Stream s = req.GetRequestStream()) { s.Write(b, 0, b.Length); }
            }
            try {
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse()) {
                    using (StreamReader sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8)) {
                        return new HttpResult { Status = (int)resp.StatusCode, Body = sr.ReadToEnd(), Location = resp.Headers["Location"] };
                    }
                }
            } catch (WebException ex) {
                HttpWebResponse er = ex.Response as HttpWebResponse;
                if (er != null) {
                    using (StreamReader sr = new StreamReader(er.GetResponseStream(), Encoding.UTF8)) {
                        return new HttpResult { Status = (int)er.StatusCode, Body = sr.ReadToEnd(), Location = er.Headers["Location"] };
                    }
                }
                return new HttpResult { Status = 0, Body = "ERR:" + ex.Message, Location = null };
            }
        } catch (Exception ex) {
            return new HttpResult { Status = 0, Body = "ERR:" + ex.Message, Location = null };
        }
    }
}
"@ -Language CSharp

function Http {
  param([string]$Method='GET', [string]$Url, [string]$Body=$null,
        [string]$Cookie=$null, [hashtable]$Headers=$null, [switch]$NoRedirect)
  $h = ''
  if ($Headers) { $h = ($Headers.GetEnumerator() | ForEach-Object { "$($_.Key): $($_.Value)" }) -join "`n" }
  $res = [HttpX]::Do($Method, $Url, $Cookie, $Body, $h, (-not $NoRedirect))
  return [pscustomobject]@{ Status = $res.Status; Body = $res.Body; Location = $res.Location }
}
function Json([string]$s) { try { $s | ConvertFrom-Json } catch { $null } }
function Snip([string]$s, [int]$n=200) {
  if (-not $s) { return '' }
  return ($s.Substring(0, [Math]::Min($n, $s.Length)) -replace "`n", ' ')
}

# --- Auth cookie (sb-<ref>-auth-token, base64url of session JSON) ---
$json = $sess | ConvertTo-Json -Compress -Depth 10
$b64  = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json)).Replace('+','-').Replace('/','_').TrimEnd('=')
$cookie = "sb-$ref-auth-token=base64-$b64"
$restH = @{ apikey = $keys.anon; Authorization = "Bearer $($sess.access_token)"; Accept = 'application/json'; Prefer = 'return=representation' }

Write-Host ""
Write-Host "=== 0. AUTH GUARD ===" -ForegroundColor Cyan
$r = Http -Method GET -Url "$Base/api/commissions?days=30" -NoRedirect
if ($r.Status -eq 401 -and $r.Body -match 'Unauthorized') { Ok "Unauth API => 401 JSON" }
else { Bad "Unauth API" "status=$($r.Status) body=$(Snip $r.Body 100)" }

$r = Http -Method GET -Url "$Base/dashboard" -NoRedirect
if ($r.Status -in 301,302,303,307,308) { Ok "Unauth /dashboard => $($r.Status) redirect to login" }
elseif ($r.Status -eq 404) { Ok "Unauth /dashboard => 404 (middleware rewrite blocks page)" }
else { Bad "Unauth /dashboard" "status=$($r.Status) (expected 3xx or 404)" }

Write-Host ""
Write-Host "=== 1. PRODUCT INSERT (REST + RLS) ===" -ForegroundColor Cyan
$product = @{
  user_id = $sess.user.id
  name = "Rivox Test - Magnesium Glycinate Supplement"
  description = "High-absorption magnesium for sleep and recovery. E2E test product."
  image_url = "https://picsum.photos/seed/rivox/600/600"
  affiliate_url = "https://www.amazon.in/dp/B0TESTRIVOX?tag=rivox-20"
  network = "amazon"
  commission_rate = 12.5
  commission_type = "percentage"
  category = "Supplements"
  price = 999
  original_price = 1499
  rating = 4.5
  review_count = 2340
  gravity_score = 78
  trend_score = 65
} | ConvertTo-Json
$r = Http -Method POST -Url "$Url/rest/v1/products" -Body $product -Headers $restH
$p = (Json $r.Body)
if ($r.Status -eq 201 -and $p) { $p = $p[0]; Ok "Product insert (201)"; Write-Host "  product_id = $($p.id)" }
else { Bad "Product insert" "status=$($r.Status) body=$(Snip $r.Body 250)"; Write-Host "Aborting." -ForegroundColor Yellow; exit 1 }

Write-Host ""
Write-Host "=== 2. SMART SCORE (/api/products/score) ===" -ForegroundColor Cyan
$scoreBody = @{
  product_id = $p.id
  commission_rate = 12.5; commission_type = "percentage"
  gravity_score = 78; trend_score = 65
  rating = 4.5; review_count = 2340
  price = 999; original_price = 1499
} | ConvertTo-Json
$r = Http -Method POST -Url "$Base/api/products/score" -Body $scoreBody -Cookie $cookie
$s = Json $r.Body
if ($r.Status -eq 200 -and $s.success -and $s.score.total -gt 0) { Ok "Score calculated (200, total=$($s.score.total))" }
else { Bad "Score calc" "status=$($r.Status) body=$(Snip $r.Body 250)" }
$r = Http -Method GET -Url "$Url/rest/v1/products?id=eq.$($p.id)&select=smart_score" -Headers $restH
$dbScore = (Json $r.Body)[0].smart_score
if ($dbScore -gt 0) { Ok "smart_score persisted ($dbScore)" }
else { Bad "smart_score persisted" "value=$dbScore" }

Write-Host ""
Write-Host "=== 3. AD GENERATION (/api/ads) ===" -ForegroundColor Cyan
$adBody = @{ product_id = $p.id; platforms = @("instagram"); count = 2 } | ConvertTo-Json
$r = Http -Method POST -Url "$Base/api/ads" -Body $adBody -Cookie $cookie
$adResp = Json $r.Body
$adId = $null
$variants = if ($adResp.variants) { $adResp.variants } elseif ($adResp.data) { $adResp.data } else { $null }
if ($r.Status -eq 200 -and $adResp.success -and $variants.Count -ge 1) {
  $adId = $variants[0].id
  Ok "Ad generation (200, variants=$($variants.Count), id=$adId)"
} else { Bad "Ad generation" "status=$($r.Status) body=$(Snip $r.Body 250)" }

Write-Host ""
Write-Host "=== 4. LINK CREATION (/api/links) ===" -ForegroundColor Cyan
$linkBody = @{ product_id = $p.id; tracking_params = @{ sub1 = "ig-reel"; sub2 = "e2e-test" } } | ConvertTo-Json
$r = Http -Method POST -Url "$Base/api/links" -Body $linkBody -Cookie $cookie
$lkResp = Json $r.Body
$shortCode = $null; $linkId = $null
if ($r.Status -eq 200 -and $lkResp.success -and $lkResp.link.short_code) {
  $shortCode = $lkResp.link.short_code; $linkId = $lkResp.link.id
  Ok "Link created (200, code=$shortCode)"
  Write-Host "  short_url = $($lkResp.link.short_url)"
} else { Bad "Link creation" "status=$($r.Status) body=$(Snip $r.Body 250)" }

Write-Host ""
Write-Host "=== 5. SHORT URL REDIRECT (/go/$shortCode) ===" -ForegroundColor Cyan
if ($shortCode) {
  # 5a: anonymous visitor - must 3xx to affiliate URL
  $r = Http -Method GET -Url "$Base/go/$shortCode" -NoRedirect
  if ($r.Status -in 301,302,303,307,308) {
    $loc = $r.Location
    if ($loc -match 'amazon\.in') { Ok "Anonymous redirect => $($r.Status) -> affiliate URL" }
    else { Ok "Anonymous redirect => $($r.Status) (Location: $(Snip $loc 120))" }
  } else { Bad "Anonymous redirect" "status=$($r.Status) body=$(Snip $r.Body 150)" }

  # 5b: owner with cookie
  $r = Http -Method GET -Url "$Base/go/$shortCode" -Cookie $cookie -NoRedirect
  if ($r.Status -in 301,302,303,307,308) { Ok "Owner redirect => $($r.Status)" }
  else { Bad "Owner redirect" "status=$($r.Status) body=$(Snip $r.Body 150)" }

  Start-Sleep -Seconds 2
  $r = Http -Method GET -Url "$Url/rest/v1/affiliate_links?id=eq.$linkId&select=clicks" -Headers $restH
  $clicks = (Json $r.Body)[0].clicks
  if ($clicks -ge 2) { Ok "clicks counter incremented via RPC ($clicks)" }
  else { Bad "clicks counter" "clicks=$clicks (expected >=2 from 2 redirects)" }
}

Write-Host ""
Write-Host "=== 6. CLICK EVENT (POST /api/clicks - anonymous beacon) ===" -ForegroundColor Cyan
if ($linkId) {
  $clickBody = @{ link_id = $linkId; ip = "103.44.55.66"; user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0"; referrer = "https://instagram.com/reel/abc"; url = "https://example.com/?utm_source=instagram&utm_medium=reel&utm_campaign=e2e" } | ConvertTo-Json
  $r = Http -Method POST -Url "$Base/api/clicks" -Body $clickBody   # NO cookie: anonymous
  $cr = Json $r.Body
  if ($r.Status -eq 200 -and $cr.success) { Ok "Anonymous click event recorded (200)" }
  else { Bad "Click event" "status=$($r.Status) body=$(Snip $r.Body 250)" }
  # verify row landed in DB
  $r = Http -Method GET -Url "$Url/rest/v1/click_events?link_id=eq.$linkId&select=id&limit=1" -Headers $restH
  $ev = Json $r.Body
  if ($ev.Count -ge 1) { Ok "click_events row exists (count=$($ev.Count))" }
  else { Bad "click_events row" "count=$($ev.Count) body=$(Snip $r.Body 150)" }
}

Write-Host ""
Write-Host "=== 7. COMMISSION CREATE (/api/commissions) ===" -ForegroundColor Cyan
$commBody = @{ link_id = $linkId; product_id = $p.id; network = "amazon"; amount = 149.85; currency = "INR"; status = "approved"; sale_date = (Get-Date).ToUniversalTime().ToString("o") } | ConvertTo-Json
$commId = $null
$r = Http -Method POST -Url "$Base/api/commissions" -Body $commBody -Cookie $cookie
$cm = Json $r.Body
if ($r.Status -eq 200 -and $cm.success -and $cm.commission.id) {
  $commId = $cm.commission.id
  Ok "Commission created (200, id=$commId)"
} else { Bad "Commission create" "status=$($r.Status) body=$(Snip $r.Body 250)" }

if ($commId -and $linkId) {
  Start-Sleep -Seconds 1
  $r = Http -Method GET -Url "$Url/rest/v1/affiliate_links?id=eq.$linkId&select=commission_earned,conversions" -Headers $restH
  $tot = (Json $r.Body)[0]
  if ($tot.commission_earned -gt 0 -and $tot.conversions -ge 1) {
    Ok "increment_commission RPC worked (earned=$($tot.commission_earned), conv=$($tot.conversions))"
  } else { Bad "increment_commission RPC" "earned=$($tot.commission_earned) conversions=$($tot.conversions)" }
}

Write-Host ""
Write-Host "=== 8. COMMISSION LIST (GET) ===" -ForegroundColor Cyan
$r = Http -Method GET -Url "$Base/api/commissions?days=30" -Cookie $cookie
$cl = Json $r.Body
if ($r.Status -eq 200 -and $cl.success -and ($cl.commissions | Where-Object { $_.id -eq $commId })) {
  Ok "Commission listed (200, count=$($cl.commissions.Count))"
} else { Bad "Commission list" "status=$($r.Status) body=$(Snip $r.Body 250)" }

Write-Host ""
Write-Host "=== 9. COMPLIANCE CHECK (/api/compliance) ===" -ForegroundColor Cyan
if ($adId) {
  $compBody = @{ content_type = "ad"; content_id = $adId; auto_fix = $true } | ConvertTo-Json
  $r = Http -Method POST -Url "$Base/api/compliance" -Body $compBody -Cookie $cookie
  $rep = Json $r.Body
  if ($r.Status -eq 200 -and $rep.success -and $null -ne $rep.report.overallPassed) {
    Ok "Compliance check (200, passed=$($rep.report.overallPassed), violations=$($rep.report.violations.Count))"
  } else { Bad "Compliance check" "status=$($r.Status) body=$(Snip $r.Body 250)" }
} else { Bad "Compliance check" "no ad id available" }

Write-Host ""
Write-Host "=== 10. CLICKS ANALYTICS (GET /api/clicks) ===" -ForegroundColor Cyan
$r = Http -Method GET -Url "$Base/api/clicks?days=30" -Cookie $cookie
$an = Json $r.Body
if ($r.Status -eq 200 -and $an.success -and $an.summary) {
  Ok "Analytics JSON (200, totalClicks=$($an.summary.totalClicks), raw=$($an.rawClicks))"
} else { Bad "Analytics" "status=$($r.Status) isJSON=$($null -ne $an) body=$(Snip $r.Body 200)" }

Write-Host ""
Write-Host "=== 11. DASHBOARD PAGES (auth cookie, must NOT be login page) ===" -ForegroundColor Cyan
foreach ($page in @("/dashboard", "/dashboard/products", "/dashboard/links", "/dashboard/analytics", "/dashboard/earnings", "/dashboard/ads", "/dashboard/images", "/dashboard/videos", "/dashboard/approval", "/dashboard/compliance")) {
  $r = Http -Method GET -Url "$Base$page" -Cookie $cookie
  $isLogin = $r.Body -match 'type="password"'
  if ($r.Status -eq 200 -and -not $isLogin) { Ok "GET $page (200, real page)" }
  elseif ($r.Status -eq 200 -and $isLogin) { Bad "GET $page" "200 but LOGIN PAGE (auth cookie rejected)" }
  else { Bad "GET $page" "status=$($r.Status)" }
}

Write-Host ""
Write-Host "=== 12. IMAGES + VIDEOS + APPROVAL APIs (smoke) ===" -ForegroundColor Cyan
$r = Http -Method GET -Url "$Base/api/images?product_id=$($p.id)" -Cookie $cookie
$ij = Json $r.Body
if ($r.Status -eq 200 -and $null -ne $ij) { Ok "GET /api/images (JSON)" } else { Bad "GET /api/images" "status=$($r.Status) body=$(Snip $r.Body 150)" }
$r = Http -Method GET -Url "$Base/api/videos" -Cookie $cookie
$vj = Json $r.Body
if ($r.Status -eq 200 -and $null -ne $vj) { Ok "GET /api/videos (JSON)" } else { Bad "GET /api/videos" "status=$($r.Status) body=$(Snip $r.Body 150)" }
$r = Http -Method GET -Url "$Base/api/approval?status=pending" -Cookie $cookie
$aj = Json $r.Body
if ($r.Status -eq 200 -and $null -ne $aj) { Ok "GET /api/approval (JSON)" } else { Bad "GET /api/approval" "status=$($r.Status) body=$(Snip $r.Body 150)" }

Write-Host ""
Write-Host "=== 13. PRODUCT IMPORT (/api/products/import) ===" -ForegroundColor Cyan
# 13a: keyword search returns scored candidates
$r = Http -Method POST -Url "$Base/api/products/import" -Body '{"action":"search","network":"amazon","query":"protein"}' -Cookie $cookie
$searchResp = Json $r.Body
$candidates = $searchResp.products
if ($r.Status -eq 200 -and $searchResp.success -and $candidates.Count -ge 1 -and $candidates[0].smart_score -gt 0) {
  Ok "Search amazon/protein => $($candidates.Count) candidates, top score=$($candidates[0].smart_score)"
} else { Bad "Import search" "status=$($r.Status) body=$(Snip $r.Body 250)" }

# 13b: URL import (network auto-detect, live fetch may be blocked by store)
$r = Http -Method POST -Url "$Base/api/products/import" -Body '{"action":"url","url":"https://hop.clickbank.net/?affiliate=etest&vendor=leanbellyjuice"}' -Cookie $cookie
$urlResp = Json $r.Body
if ($r.Status -eq 200 -and $urlResp.success -and $urlResp.product.name) {
  Ok "URL import (clickbank hop link) => name=$($urlResp.product.name.Substring(0,[Math]::Min(40,$urlResp.product.name.Length)))"
} else { Bad "URL import" "status=$($r.Status) body=$(Snip $r.Body 250)" }

# 13c: unknown network rejected
$r = Http -Method POST -Url "$Base/api/products/import" -Body '{"action":"search","network":"ebay","query":"x"}' -Cookie $cookie
if ($r.Status -eq 422) { Ok "Unknown network rejected (422)" }
else { Bad "Unknown network" "status=$($r.Status)" }

# 13d: save candidate -> product row with smart_score
if ($candidates -and $candidates.Count -ge 1) {
  $saveBody = @{ action = 'save'; product = $candidates[0] } | ConvertTo-Json -Depth 6
  $r = Http -Method POST -Url "$Base/api/products/import" -Body $saveBody -Cookie $cookie
  $saveResp = Json $r.Body
  if ($r.Status -eq 200 -and $saveResp.success -and $saveResp.product.id -and $saveResp.smart_score -gt 0) {
    Ok "Saved import => id=$($saveResp.product.id) smart_score=$($saveResp.smart_score)"
    # verify persisted
    $r2 = Http -Method GET -Url "$Url/rest/v1/products?id=eq.$($saveResp.product.id)&select=name,smart_score" -Headers $restH
    $row = (Json $r2.Body)[0]
    if ($row.name -eq $candidates[0].name -and $row.smart_score -gt 0) { Ok "Imported product persisted in DB" }
    else { Bad "Import persist" "row=$(Snip ($r2.Body) 200)" }
  } else { Bad "Import save" "status=$($r.Status) body=$(Snip $r.Body 250)" }
} else { Bad "Import save" "no candidates to save" }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESULT: $Pass passed, $Fail failed" -ForegroundColor $(if ($Fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "========================================" -ForegroundColor Cyan
if ($Fail -gt 0) { exit 1 }
