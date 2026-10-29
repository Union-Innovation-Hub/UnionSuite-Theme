# Refresh approved taskbar assets in the existing upload ZIPs without rebuilding
# unrelated entries. Run the usage-guide build/check before this command.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskbarProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

function Get-EntryHash($entry) {
    $stream = $entry.Open()
    $hash = [System.Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($hash.ComputeHash($stream)).Replace('-', '') }
    finally { $hash.Dispose(); $stream.Dispose() }
}

function Update-TaskbarArchive($folder, $files) {
    $archivePath = [System.IO.Path]::GetFullPath((Join-Path $taskbarProjectRoot ('Theme/' + $folder + '.zip')))
    $temporary = $archivePath + '.' + [Guid]::NewGuid().ToString('N') + '.new'
    foreach ($target in @($archivePath, $temporary)) {
        if (-not $target.StartsWith($taskbarProjectRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw 'Archive must remain inside this project.'
        }
    }
    $sources = @{}
    foreach ($file in $files) {
        $source = Join-Path $taskbarProjectRoot ('Theme/' + $folder + '/' + $file)
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing source: $source" }
        $sources[$folder + '/' + $file] = $source
    }
    $untouched = @{}
    $original = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        if ($original.Entries | Group-Object FullName | Where-Object Count -gt 1) { throw 'Duplicate archive entries require review.' }
        foreach ($entry in $original.Entries) {
            if (-not $sources.ContainsKey($entry.FullName)) { $untouched[$entry.FullName] = Get-EntryHash $entry }
        }
    } finally { $original.Dispose() }
    try {
        Copy-Item -LiteralPath $archivePath -Destination $temporary
        $archive = [System.IO.Compression.ZipFile]::Open($temporary, [System.IO.Compression.ZipArchiveMode]::Update)
        try {
            foreach ($name in $sources.Keys) {
                $existing = $archive.GetEntry($name)
                if ($existing) { $existing.Delete() }
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $sources[$name], $name, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
            }
        } finally { $archive.Dispose() }
        $check = [System.IO.Compression.ZipFile]::OpenRead($temporary)
        try {
            foreach ($name in $sources.Keys) {
                if ((Get-EntryHash $check.GetEntry($name)) -ne (Get-FileHash -LiteralPath $sources[$name] -Algorithm SHA256).Hash) {
                    throw "Packaged source mismatch: $name"
                }
            }
            foreach ($name in $untouched.Keys) {
                if ((Get-EntryHash $check.GetEntry($name)) -ne $untouched[$name]) { throw "Unrelated entry changed: $name" }
            }
            if ($check.Entries.Count -ne ($sources.Count + $untouched.Count)) { throw 'Unexpected archive entries.' }
        } finally { $check.Dispose() }
        Move-Item -LiteralPath $temporary -Destination $archivePath -Force
        Write-Output "Updated $folder.zip: $($sources.Count) entries verified; $($untouched.Count) unrelated entries preserved."
    } finally {
        if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary }
    }
}

Update-TaskbarArchive 'UnionSuite' @(
    'Scripts/UnionSuiteTaskbar.js', 'zUnionSuite.css', 'zzDarkMode.css',
    'Usage-Guide.html', 'Theme-Config.html', 'README.md', 'Scripts/README.md',
    'docs/Usage-Guide.source.html', 'docs/taskbar-example.js', 'docs/README.md'
)
Update-TaskbarArchive 'UnionSuite-Client' @('Config.js')
