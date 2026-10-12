# E:\matb3aa-game\host-sporcle-wrangler\test-speed.ps1
$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:8788/host-sporcle'

function PostJson($url, $body) {
    $json = $body | ConvertTo-Json -Compress -Depth 10
    Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $json
}
function GetJson($url) { Invoke-RestMethod -Uri $url -Method Get }
function Section($t) {
    Write-Host ""
    Write-Host "── $t ──" -ForegroundColor Cyan
}

Section "CREATE (speed, auto-advance 5s)"
$create = PostJson "$Base/create" @{
    hostName          = 'Ali'
    mode              = 'speed'
    autoAdvanceSeconds = 5
    config            = @{ level = 1; artists = @(264, 9); count = 3; instruments = 'none' }
}
$Code = $create.code; $HostId = $create.hostId
Write-Host "CODE=$Code  HOST=$HostId"

Section "JOIN"
$join = PostJson "$Base/$Code/join" @{ name = 'Raffat' }
$GuestId = $join.playerId
Write-Host "GUEST=$GuestId"

Section "READY"
PostJson "$Base/$Code/action" @{ playerId = $GuestId; type = 'ready'; ready = $true } | Out-Null

Section "START"
PostJson "$Base/$Code/action" @{ playerId = $HostId; type = 'start' } | Out-Null

Section "WAIT 5s → question"
Start-Sleep 5
$s = GetJson "$Base/$Code/state"
Write-Host "phase=$($s.phase) qIndex=$($s.qIndex)"

Section "PEEK CORRECT ANSWER (debug)"
$dbg = GetJson "$Base/$Code/debug"
$correct = $dbg.question.correctValue
Write-Host "correctValue=$correct"

Section "SARA ANSWERS CORRECT → question should end"
$ans = PostJson "$Base/$Code/action" @{ playerId = $GuestId; type = 'answer'; typed = $correct }
Write-Host "answer result: $($ans | ConvertTo-Json -Compress)"

Section "STATE → should be reveal, Raffat has score 1"
$s2 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s2.phase)"
$s2.players | ForEach-Object { Write-Host ("  {0,-6} score={1}" -f $_.name, $_.score) }

Section "WAIT 6s → auto-advance should fire"
Start-Sleep 6
$s3 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s3.phase) qIndex=$($s3.qIndex)"