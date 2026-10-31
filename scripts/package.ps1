$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$extension = Join-Path $root "extension"
$manifest = Get-Content (Join-Path $extension "manifest.json") -Raw | ConvertFrom-Json
$output = Join-Path $root "dist"
New-Item -ItemType Directory -Path $output -Force | Out-Null
$license = Join-Path $root "LICENSE.md"
$zip = Join-Path $output "cascade-calendar-$($manifest.version).zip"
Compress-Archive -Path @((Join-Path $extension "*"), $license) -DestinationPath $zip -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zip)
try {
    if (-not ($archive.Entries | Where-Object { $_.FullName -eq "manifest.json" })) {
        throw "The ZIP must contain manifest.json at its root."
    }
    if (-not ($archive.Entries | Where-Object { $_.FullName -eq "LICENSE.md" })) {
        throw "The ZIP must include the MIT license."
    }
} finally {
    $archive.Dispose()
}
Write-Output $zip
