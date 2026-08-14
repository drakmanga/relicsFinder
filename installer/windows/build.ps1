<#
.SYNOPSIS
    Builds the Windows installer for Relic Finder.

.DESCRIPTION
    Four steps, in the only order they work in:

      1. the design system and the frontend, built into the backend's static
         resources, so the jar serves the page and the API from one port;
      2. the jar itself;
      3. jpackage, which wraps the jar and a Java 25 runtime into a folder with
         a launcher in it — an application image, not yet an installer;
      4. Inno Setup, which turns that folder into the .exe the user runs.

    Everything lands in build\windows\ and nothing is written outside the
    repository.

    Requirements: JDK 25 (for jpackage), Node 20+, and Inno Setup 6. On a
    GitHub Actions windows runner all three are already there; see
    .github\workflows\release.yml.

.PARAMETER Version
    Three numbers, which is all Windows records in the installed programs list.
    Anything else — a SNAPSHOT suffix, a fourth part — is refused by jpackage.

.PARAMETER SkipBuild
    Reuses the frontend and the jar already in target\. For iterating on the
    installer itself, where rebuilding the application every time is four
    minutes spent on something that did not change.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File installer\windows\build.ps1 -Version 0.1.0
#>
[CmdletBinding()]
param(
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string] $Version = '0.1.0',

    [switch] $SkipBuild
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# The repository root, whatever directory this was called from.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location $root

# PowerShell does not fail a script when a native command fails; it carries on
# with a broken artefact and reports success at the end. Every external call
# goes through this.
function Invoke-Step {
    param([string] $Title, [scriptblock] $Body)

    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
    & $Body
    if ($LASTEXITCODE -ne 0) {
        throw "$Title failed with exit code $LASTEXITCODE"
    }
}

function Resolve-Tool {
    param([string] $Name, [string[]] $Fallbacks, [string] $Hint)

    $found = Get-Command $Name -ErrorAction SilentlyContinue
    if ($found) { return $found.Source }

    foreach ($candidate in $Fallbacks) {
        if (Test-Path $candidate) { return $candidate }
    }
    throw "$Name not found. $Hint"
}

try {
    $build = Join-Path $root 'build\windows'
    $staging = Join-Path $build 'staging'
    $appImage = Join-Path $build 'app-image'
    $output = Join-Path $build 'installer'

    # A stale app image is worse than no app image: jpackage refuses to write
    # over one, and Inno would happily package yesterday's jar.
    if (Test-Path $build) { Remove-Item $build -Recurse -Force }
    New-Item -ItemType Directory -Path $staging, $appImage, $output -Force | Out-Null

    if (-not $SkipBuild) {
        Invoke-Step 'Frontend: dependencies' { npm ci }

        # The component library has to exist before apps/web compiles: it is
        # imported by name and its entry point is generated, not committed.
        Invoke-Step 'Frontend: design system' { npm run build:ui }

        # RELICS_STATIC_DIR is what puts the bundle inside the jar instead of
        # in apps/web/dist. Without it the installed application serves an
        # empty page.
        Invoke-Step 'Frontend: application' {
            $env:RELICS_STATIC_DIR = Join-Path $root 'src\main\resources\static'
            npm run build --workspace=@relic-finder/web
        }

        # Tests run in CI on every push; running them again here would double
        # the time to an installer without adding a gate.
        Invoke-Step 'Backend: jar' { & (Join-Path $root 'mvnw.cmd') -B -DskipTests package }
    }

    $jar = Get-ChildItem (Join-Path $root 'target') -Filter 'relicsApi-*.jar' |
        Where-Object { $_.Name -notlike '*-sources.jar' } |
        Select-Object -First 1
    if (-not $jar) { throw 'No jar in target\. Run without -SkipBuild.' }

    # Renamed on the way in: the configuration file jpackage writes names the
    # jar, and a version in that name would mean patching the file at every
    # release.
    Copy-Item $jar.FullName (Join-Path $staging 'relicsApi.jar') -Force

    $jpackage = Resolve-Tool -Name 'jpackage' -Fallbacks @(
        (Join-Path $env:JAVA_HOME 'bin\jpackage.exe')
    ) -Hint 'It ships with the JDK — install JDK 25 and set JAVA_HOME.'

    # An application image rather than an installer: jpackage's own MSI has no
    # room for the Java check, the consent screen or the shortcuts, which is
    # what Inno Setup is here for.
    #
    # The runtime is not trimmed with --add-modules. Spring resolves half of
    # what it needs by reflection, so jlink cannot see it, and a module missing
    # from the image surfaces as a ClassNotFoundException on a user's machine
    # weeks later. Forty megabytes is the cheaper side of that trade.
    #
    # The heap is capped because the default is a quarter of the machine's
    # memory, which on a gaming PC is gigabytes reserved by something that sits
    # in the tray. A gigabyte is several times the largest price cache seen.
    Invoke-Step 'jpackage: application image' {
        & $jpackage `
            --type app-image `
            --name RelicFinder `
            --app-version $Version `
            --vendor 'drakmanga' `
            --description 'Warframe relics, Prime parts and market prices' `
            --copyright 'MIT' `
            --input $staging `
            --main-jar relicsApi.jar `
            --icon (Join-Path $PSScriptRoot 'relic-finder.ico') `
            --java-options '-Drelics.desktop=true' `
            --java-options '-Xmx1024m' `
            --dest $appImage
    }

    $image = Join-Path $appImage 'RelicFinder'
    $cfg = Join-Path $image 'app\RelicFinder.cfg'
    if (-not (Test-Path $cfg)) { throw "jpackage produced no configuration file at $cfg" }

    # When the installer finds a Java 25 already on the machine and the user
    # takes it, it adds an app.runtime line to this file pointing at it, and
    # leaves the bundled runtime uninstalled. jpackage does not write that key
    # — the launcher only reads it — so what is checked here is the section it
    # goes in. Without a match the installer's Java detection would appear to
    # work and do nothing.
    if (-not (Select-String -Path $cfg -Pattern '^\[Application\]' -Quiet)) {
        throw "No [Application] section in $cfg — the installer's Java detection depends on it."
    }

    Write-Host ""
    Write-Host "--- RelicFinder.cfg ---" -ForegroundColor DarkGray
    Get-Content $cfg | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

    $iscc = Resolve-Tool -Name 'iscc' -Fallbacks @(
        'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
        'C:\Program Files\Inno Setup 6\ISCC.exe'
    ) -Hint 'Version 6.3 or later. Install it with: choco install innosetup'

    Invoke-Step 'Inno Setup: installer' {
        & $iscc `
            "/DAppVersion=$Version" `
            "/DAppImage=$image" `
            "/DOutputDir=$output" `
            (Join-Path $PSScriptRoot 'relic-finder.iss')
    }

    $installer = Get-ChildItem $output -Filter '*.exe' | Select-Object -First 1
    Write-Host ""
    Write-Host ("Installer: {0} ({1:N1} MB)" -f $installer.FullName, ($installer.Length / 1MB)) -ForegroundColor Green
}
finally {
    Pop-Location
}
