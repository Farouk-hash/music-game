# E:\matb3aa-game\host-sporcle-wrangler\test-leave-midgame.ps1
# Two players. Start the game. Guest leaves during question phase.
# Host should continue alone; guest marked left.

$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:8788/host-sporcle'

function PostJson($url, $body) {
    $json = $body | ConvertTo-Json -Compress -Depth 10
    Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $json
}
function GetJson($url) { Invoke-RestMethod -Uri $url -Method Get }
function Section($t) { Write-Host ""; Write-Host "── $t ──" -ForegroundColor Cyan }

# ── 1. Create ──
Section "1. HOST CREATES ROOM"
$hostCreate = PostJson "$Base/create" @{
    hostName = 'Ali'
    mode     = 'speed'
    config   = @{ level = 1; artists = @(264, 9); count = 3; instruments = 'none' }
}
$Code    = $hostCreate.code
$HostId  = $hostCreate.hostId
Write-Host "CODE=$Code  HOST=$HostId"

# ── 2. Guest joins ──
Section "2. GUEST JOINS"
$guest = PostJson "$Base/$Code/join" @{ name = 'Sara' }
$GuestId = $guest.playerId
Write-Host "GUEST=$GuestId"

# ── 3. Ready + Start ──
Section "3. GUEST READY + HOST START"
PostJson "$Base/$Code/action" @{ playerId = $GuestId; type = 'ready'; ready = $true } | Out-Null
PostJson "$Base/$Code/action" @{ playerId = $HostId;  type = 'start' } | Out-Null

# ── 4. Wait for question phase (loading + countdown = ~11s) ──
Section "4. WAIT 15s for question phase"
Start-Sleep -Seconds 15
$s1 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s1.phase) qIndex=$($s1.qIndex)"

# ── 5. Guest leaves mid-question ──
Section "5. GUEST LEAVES MID-QUESTION"
$leaveResult = PostJson "$Base/$Code/action" @{ playerId = $GuestId; type = 'leave' }
$leaveResult | ConvertTo-Json -Compress

# ── 6. State after leave ──
Section "6. STATE AFTER LEAVE"
$s2 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s2.phase) qIndex=$($s2.qIndex)"
$s2.players | ForEach-Object {
    Write-Host ("  {0,-6} isHost={1,-6} left={2,-6} locked={3}" -f $_.name, $_.isHost, $_.left, $_.locked)
}

# ── 7. Host answers → question should end (guest is 'left', not counted) ──
Section "7. HOST ANSWERS → question should end immediately"
$dbg = GetJson "$Base/$Code/debug"
$correct = $dbg.question.correctValue
Write-Host "correctValue=$correct"
$answerResult = PostJson "$Base/$Code/action" @{
    playerId = $HostId
    type     = 'answer'
    typed    = $correct
}
$answerResult | ConvertTo-Json -Compress

# ── 8. Final state ──
Section "8. FINAL STATE"
Start-Sleep -Seconds 1
$s3 = GetJson "$Base/$Code/state"
Write-Host "phase=$($s3.phase) qIndex=$($s3.qIndex)"
$s3.players | ForEach-Object {
    Write-Host ("  {0,-6} isHost={1,-6} left={2,-6} score={3}" -f $_.name, $_.isHost, $_.left, $_.score)
}

Section "SUMMARY"
Write-Host "CODE=$Code HOST=$HostId GUEST=$GuestId"