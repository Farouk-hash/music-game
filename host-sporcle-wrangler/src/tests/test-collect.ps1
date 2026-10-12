# E:\matb3aa-game\host-sporcle-wrangler\test-collect.ps1
# powershell -ExecutionPolicy Bypass -File .\test-speed.ps1

$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:8788/host-sporcle'

function PostJson($url, $body) {
    $json = $body | ConvertTo-Json -Compress -Depth 10
    Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $json
}
function GetJson($url) { Invoke-RestMethod -Uri $url -Method Get }
function Section($t) { Write-Host ""; Write-Host "── $t ──" -ForegroundColor Cyan }

Section "CREATE (collect)"
$create = PostJson "$Base/create" @{
    hostName = 'Ali'
    mode     = 'collect'
    config   = @{ level = 1; artists = @(264, 9); count = 3; instruments = 'none' }
}
$Code = $create.code; $HostId = $create.hostId
$join = PostJson "$Base/$Code/join" @{ name = 'Raffat' }
$GuestId = $join.playerId
PostJson "$Base/$Code/action" @{ playerId = $GuestId; type = 'ready'; ready = $true } | Out-Null
PostJson "$Base/$Code/action" @{ playerId = $HostId; type = 'start' } | Out-Null
Start-Sleep 5

$s = GetJson "$Base/$Code/state"
Write-Host "phase=$($s.phase) qIndex=$($s.qIndex)"

$dbg = GetJson "$Base/$Code/debug"
$correct = $dbg.question.correctValue
Write-Host "correctValue=$correct"

Section "SARA ANSWERS CORRECT → question should NOT end (Ali hasn't answered)"
$a1 = PostJson "$Base/$Code/action" @{ playerId = $GuestId; type = 'answer'; typed = $correct }
Write-Host "Raffat: $($a1 | ConvertTo-Json -Compress)"

Section "ALI ANSWERS CORRECT → question should end"
$a2 = PostJson "$Base/$Code/action" @{ playerId = $HostId; type = 'answer'; typed = $correct }
Write-Host "Ali: $($a2 | ConvertTo-Json -Compress)"

Section "STATE → both score 1"
$s2 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s2.phase)"
$s2.players | ForEach-Object { Write-Host ("  {0,-6} score={1}" -f $_.name, $_.score) }