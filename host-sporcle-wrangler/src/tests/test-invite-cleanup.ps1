# test-invite-cleanup.ps1
#
# End-to-end test of the invite-cleanup flow.
# Pure ASCII - safe to save as any encoding.

param(
    [string]$MusicBase   = 'https://music-game-wrangler.abdulrahman-muhammad2090.workers.dev',
    [string]$SporcleBase = 'https://host-sporcle-wrangler.abdulrahman-muhammad2090.workers.dev'
)

$ErrorActionPreference = 'Stop'

function Line  { Write-Host ('-' * 62) -ForegroundColor DarkGray }
function Step  { param($m) Write-Host "`n>> $m" -ForegroundColor Cyan }
function Info  { param($m) Write-Host "   . $m" -ForegroundColor DarkGray }
function Ok    { param($m) Write-Host "   OK  $m" -ForegroundColor Green }
function Fail  { param($m) Write-Host "   FAIL $m" -ForegroundColor Red }

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Url,
        $Body = $null
    )

    $params = @{
        Method      = $Method
        Uri         = $Url
        Headers     = @{ Accept = 'application/json' }
        ErrorAction = 'Stop'
    }

    if ($null -ne $Body) {
        $params.ContentType = 'application/json'
        $params.Body        = ($Body | ConvertTo-Json -Compress -Depth 10)
    }

    try {
        $data = Invoke-RestMethod @params
        return @{ ok = $true; status = 200; data = $data }
    } catch {
        $status = $null
        $body   = $null

        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch {}
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $raw    = $reader.ReadToEnd()
                if ($raw) { $body = $raw | ConvertFrom-Json }
            } catch {}
        }

        return @{
            ok     = $false
            status = $status
            error  = $_.Exception.Message
            body   = $body
        }
    }
}

Line
Write-Host '  INVITE CLEANUP - END-TO-END TEST' -ForegroundColor Magenta
Line
Info "music-game-wrangler : $MusicBase"
Info "host-sporcle-wrangler: $SporcleBase"

Step 'Preflight - checking both workers are reachable'

$health = Invoke-Json -Method GET -Url "$SporcleBase/health"
if (-not $health.ok) {
    Fail "host-sporcle-wrangler unreachable: $($health.error)"
    exit 1
}
Ok "host-sporcle-wrangler OK (status $($health.status))"

$meCheck = Invoke-Json -Method GET -Url "$MusicBase/profiles/c54d209d-0822-41c0-9ec1-04ed407f79f1"
if (-not $meCheck.ok) {
    Fail "music-game-wrangler unreachable at $MusicBase -- $($meCheck.error)"
    exit 1
}
Ok "music-game-wrangler OK -- host profile is '$($meCheck.data.profile.nickname)'"

Step 'Cleaning up stale invites from earlier runs'

$pending0 = Invoke-Json -Method GET -Url "$MusicBase/invites/pending?as=769f4d9c-d33a-4bb3-a02e-7902544e28dd"
if ($pending0.ok -and $pending0.data.invites.Count -gt 0) {
    foreach ($inv in $pending0.data.invites) {
        $del = Invoke-Json -Method POST -Url "$MusicBase/invites/dismiss?as=769f4d9c-d33a-4bb3-a02e-7902544e28dd" -Body @{ inviteId = $inv.id }
        if ($del.ok) { Info "removed stale invite id=$($inv.id) room=$($inv.roomCode)" }
    }
    Ok "cleared $($pending0.data.invites.Count) stale invite(s)"
} else {
    Ok "no stale invites"
}

Step 'Ensuring the two profiles are friends (idempotent)'

$HostId   = 'c54d209d-0822-41c0-9ec1-04ed407f79f1'
$FriendId = '769f4d9c-d33a-4bb3-a02e-7902544e28dd'
$HostName = 'Farouk'

$statusResp = Invoke-Json -Method GET -Url "$MusicBase/follows/status?as=$HostId&target=$FriendId"
if (-not $statusResp.ok) {
    Fail "Could not fetch friendship status: $($statusResp.error)"
    exit 1
}
$currentStatus = $statusResp.data.status
Info "current status: $currentStatus"

if ($currentStatus -eq 'friends') {
    Ok 'Already friends'
} elseif ($currentStatus -eq 'incoming') {
    Info 'Friend already sent a request -- accepting'
    $r = Invoke-Json -Method POST -Url "$MusicBase/follows/accept?as=$HostId" -Body @{ followerId = $FriendId }
    if (-not $r.ok) { Fail "Accept failed: $($r.error)"; exit 1 }
    Ok 'Now friends'
} elseif ($currentStatus -eq 'requested') {
    Info 'Host already sent a request. Cleaning up and re-bootstrapping.'
    Invoke-Json -Method DELETE -Url "$MusicBase/follows?as=$HostId&other=$FriendId" | Out-Null
    Start-Sleep -Milliseconds 300
    Info 'Sending request host -> friend'
    $r1 = Invoke-Json -Method POST -Url "$MusicBase/follows?as=$HostId" -Body @{ followeeId = $FriendId }
    if (-not $r1.ok) { Fail "sendRequest (host->friend) failed: $($r1.error)"; exit 1 }
    Info 'Sending request friend -> host (auto-accepts mutual)'
    $r2 = Invoke-Json -Method POST -Url "$MusicBase/follows?as=$FriendId" -Body @{ followeeId = $HostId }
    if (-not $r2.ok) { Fail "sendRequest (friend->host) failed: $($r2.error)"; exit 1 }
    Ok "Now friends (mutual accept, status=$($r2.data.status))"
} else {
    Info 'Sending request host -> friend'
    $r1 = Invoke-Json -Method POST -Url "$MusicBase/follows?as=$HostId" -Body @{ followeeId = $FriendId }
    if (-not $r1.ok) { Fail "sendRequest (host->friend) failed: $($r1.error)"; exit 1 }
    Info 'Sending request friend -> host (auto-accepts mutual)'
    $r2 = Invoke-Json -Method POST -Url "$MusicBase/follows?as=$FriendId" -Body @{ followeeId = $HostId }
    if (-not $r2.ok) { Fail "sendRequest (friend->host) failed: $($r2.error)"; exit 1 }
    Ok "Now friends (mutual accept, status=$($r2.data.status))"
}

Step 'Creating a fresh room'

$create = Invoke-Json -Method POST -Url "$SporcleBase/host-sporcle/create" -Body @{
    hostName           = $HostName
    mode               = 'speed'
    config             = @{}
    autoAdvanceSeconds = 0
    profileId          = $HostId
}
if (-not $create.ok) {
    Fail "Create failed: $($create.error)"
    exit 1
}

$code   = $create.data.code
$hostId = $create.data.hostId
Ok "Room $code created (playerId=$hostId)"

Step "Inviting friend to room $code"

$invite = Invoke-Json -Method POST -Url "$MusicBase/invites?as=$HostId" -Body @{
    roomCode  = $code
    friendIds = @($FriendId)
}
if (-not $invite.ok) {
    Fail "Invite failed: $($invite.error)"
    exit 1
}
Ok "Invite sent (sent=$($invite.data.sent), revoked=$($invite.data.revoked))"

Step 'Verifying the invite landed in the friend list'

$pending1 = Invoke-Json -Method GET -Url "$MusicBase/invites/pending?as=$FriendId"
if (-not $pending1.ok) { Fail "Pending fetch failed: $($pending1.error)"; exit 1 }

$hasInvite = @($pending1.data.invites | Where-Object { $_.roomCode -eq $code }).Count -gt 0
if (-not $hasInvite) {
    Fail "Invite for room $code was NOT in the friend's pending list"
    exit 1
}
Ok "Invite for room $code confirmed in friend's pending list"

Step "Leaving room $code (this should fire the cleanup)"

$leave = Invoke-Json -Method POST -Url "$SporcleBase/host-sporcle/$code/action" -Body @{
    playerId = $hostId
    type     = 'leave'
}
if (-not $leave.ok) {
    Fail "Leave failed: $($leave.error)"
    exit 1
}

if ($leave.data.version -ne 0) {
    Fail "Expected version=0 (room destroyed) but got version=$($leave.data.version)"
    Info "This means the room was NOT the last player -- cleanup will not fire"
    exit 1
}
Ok 'Room destroyed -- DO returned version=0'

Step 'Waiting 3s for cleanup to propagate'

Start-Sleep -Seconds 3

Step 'Verifying the invite was removed by cleanup'

$pending2 = Invoke-Json -Method GET -Url "$MusicBase/invites/pending?as=$FriendId"
if (-not $pending2.ok) { Fail "Pending fetch failed: $($pending2.error)"; exit 1 }

$stillThere = @($pending2.data.invites | Where-Object { $_.roomCode -eq $code }).Count -gt 0
if ($stillThere) {
    Fail "Invite for room $code is STILL in the pending list"
    Info 'The cleanup did not fire. Check:'
    Info '  - host-sporcle-wrangler tail for [cleanup] logs'
    Info '  - music-game-wrangler tail for POST /invites/cleanup-room'
    Info '  - whether host-sporcle-wrangler has been redeployed'
    exit 1
}
Ok "Invite for room $code was removed"

Line
Write-Host '  ALL TESTS PASSED' -ForegroundColor Green
Line
Write-Host ''
Info "room code tested: $code"
Info "  host playerId : $hostId"
Info "  host profile  : $HostId"
Info "  friend profile: $FriendId"
Write-Host ''