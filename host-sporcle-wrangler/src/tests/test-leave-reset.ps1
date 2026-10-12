# E:\matb3aa-game\host-sporcle-wrangler\test-leave-reset.ps1
$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:8788/host-sporcle'

function PostJson($url, $body) {
    $json = $body | ConvertTo-Json -Compress -Depth 10
    Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $json
}
function GetJson($url) { Invoke-RestMethod -Uri $url -Method Get }
function Section($t) { Write-Host ""; Write-Host "── $t ──" -ForegroundColor Cyan }

$create = PostJson "$Base/create" @{
    hostName = 'Ali'
    mode     = 'collect'
    config   = @{ level = 1; artists = @(264, 9); count = 2; instruments = 'none' }
}
$Code = $create.code; $HostId = $create.hostId
$join = PostJson "$Base/$Code/join" @{ name = 'Raffat' }
$GuestId = $join.playerId

Section "LEAVE IN LOBBY — Raffat leaves"
PostJson "$Base/$Code/action" @{ playerId = $GuestId; type = 'leave' } | Out-Null
$s1 = GetJson "$Base/$Code/state"
Write-Host "players: $($s1.players.Count)  (should be 1 — Ali only)"

Section "RE-JOIN Raffat"
$join2 = PostJson "$Base/$Code/join" @{ name = 'Raffat' }
$GuestId2 = $join2.playerId
Write-Host "new GUEST=$GuestId2"

Section "PLAY a full 2-question game quickly (with auto-advance)"
PostJson "$Base/$Code/action" @{ playerId = $GuestId2; type = 'ready'; ready = $true } | Out-Null
PostJson "$Base/$Code/action" @{ playerId = $HostId; type = 'start' } | Out-Null
Start-Sleep 5

for ($i = 0; $i -lt 2; $i++) {
    $dbg = GetJson "$Base/$Code/debug"
    $correct = $dbg.question.correctValue
    PostJson "$Base/$Code/action" @{ playerId = $HostId; type = 'answer'; typed = $correct } | Out-Null
    PostJson "$Base/$Code/action" @{ playerId = $GuestId2; type = 'answer'; typed = $correct } | Out-Null
    Start-Sleep 2
    # Advance manually
    PostJson "$Base/$Code/action" @{ playerId = $HostId; type = 'advance' } | Out-Null
    Start-Sleep 1
}

Section "STATE → finished"
$sf = GetJson "$Base/$Code/state"
Write-Host "phase=$($sf.phase)"
Write-Host "finished: $($sf.finished | ConvertTo-Json -Compress -Depth 5)"

Section "RESET"
PostJson "$Base/$Code/action" @{ playerId = $HostId; type = 'reset' } | Out-Null
$sr = GetJson "$Base/$Code/state"
Write-Host "phase=$($sr.phase)  (should be lobby)"
$sr.players | ForEach-Object { Write-Host ("  {0,-6} score={1} ready={2}" -f $_.name, $_.score, $_.ready) }