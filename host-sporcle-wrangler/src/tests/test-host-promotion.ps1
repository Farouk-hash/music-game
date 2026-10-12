# E:\matb3aa-game\host-sporcle-wrangler\test-host-promotion.ps1
# Three players join. Host leaves.
# The earliest-joined guest should become the new host.

$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:8788/host-sporcle'

function PostJson($url, $body) {
    $json = $body | ConvertTo-Json -Compress -Depth 10
    Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $json
}
function GetJson($url) { Invoke-RestMethod -Uri $url -Method Get }
function Section($t) { Write-Host ""; Write-Host "── $t ──" -ForegroundColor Cyan }

# ── 1. Host creates ──
Section "1. HOST (Ali) CREATES ROOM"
$hostCreate = PostJson "$Base/create" @{
    hostName = 'Ali'
    mode     = 'speed'
    config   = @{ level = 1; artists = @(264, 9); count = 3; instruments = 'none' }
}
$Code   = $hostCreate.code
$HostId = $hostCreate.hostId
Write-Host "CODE=$Code  HOST_ID=$HostId"

# ── 2. Guest 2 (Sara) joins ──
Section "2. SARA JOINS (should become new host later)"
$sara = PostJson "$Base/$Code/join" @{ name = 'Sara' }
$SaraId = $sara.playerId
Write-Host "SARA_ID=$SaraId"

# ── 3. Guest 3 (Omar) joins ──
Section "3. OMAR JOINS"
$omar = PostJson "$Base/$Code/join" @{ name = 'Omar' }
$OmarId = $omar.playerId
Write-Host "OMAR_ID=$OmarId"

# ── 4. State before host leaves ──
Section "4. STATE BEFORE HOST LEAVES"
$s1 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s1.phase)"
$s1.players | ForEach-Object {
    Write-Host ("  {0,-6} isHost={1}" -f $_.name, $_.isHost)
}

# ── 5. Host leaves (via /action) ──
Section "5. HOST (Ali) LEAVES"
$leaveResult = PostJson "$Base/$Code/action" @{ playerId = $HostId; type = 'leave' }
$leaveResult | ConvertTo-Json -Compress

# ── 6. State after host leaves ──
Section "6. STATE AFTER HOST LEAVES"
$s2 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s2.phase)  playerCount=$($s2.players.Count)"
$s2.players | ForEach-Object {
    Write-Host ("  {0,-6} id={1,-10} isHost={2}" -f $_.name, $_.id.Substring(0,8), $_.isHost)
}

# ── 7. Assertions ──
Section "7. ASSERTIONS"
$newHost = $s2.players | Where-Object { $_.isHost -eq $true }
if (-not $newHost) {
    Write-Host "FAIL: no host found after leave" -ForegroundColor Red
} elseif ($newHost.name -eq 'Sara') {
    Write-Host "PASS: Sara (first joined) is now host" -ForegroundColor Green
} else {
    Write-Host "FAIL: expected Sara, got $($newHost.name)" -ForegroundColor Red
}

# ── 8. Verify the new host can start ──
Section "8. NEW HOST CAN START (needs both non-host ready)"
# Omar (not host) needs to ready up. Sara is host now, doesn't ready.
PostJson "$Base/$Code/action" @{ playerId = $OmarId; type = 'ready'; ready = $true } | Out-Null
Start-Sleep -Milliseconds 300

# Attempt to start as Sara (new host)
$startResult = PostJson "$Base/$Code/action" @{ playerId = $SaraId; type = 'start' }
$startResult | ConvertTo-Json -Compress

# ── 9. Check phase ──
Section "9. PHASE AFTER START"
Start-Sleep -Milliseconds 500
$s3 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s3.phase)  (expect 'loading' or 'countdown')"

# ── 10. Wait for countdown to finish and confirm game runs ──
Section "10. WAIT 15s → question phase"
Start-Sleep -Seconds 15
$s4 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s4.phase) qIndex=$($s4.qIndex) totalQuestions=$($s4.totalQuestions)"

Section "SUMMARY"
Write-Host "CODE=$Code  HOST_ID=$HostId  SARA_ID=$SaraId  OMAR_ID=$OmarId"
Write-Host "New host should be Sara (earliest-joined guest)."