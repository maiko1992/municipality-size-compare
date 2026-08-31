# data/municipality/s0010/*.json から検索用の軽量インデックス data/muni-index.json を生成する。
# ジオメトリは含めず、一覧・検索に必要な属性のみを抽出する（一度きりのセットアップ作業用）。

$srcDir = Join-Path $PSScriptRoot "..\data\municipality\s0010"
$outPath = Join-Path $PSScriptRoot "..\data\muni-index.json"

$items = New-Object System.Collections.Generic.List[object]

Get-ChildItem $srcDir -Filter "N03-21_*_210101.json" | Sort-Object Name | ForEach-Object {
    if ($_.Name -match "N03-21_(\d{2})_210101\.json") {
        $prefCode = $Matches[1]
    } else {
        $prefCode = $null
    }

    $json = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json

    foreach ($feature in $json.features) {
        $p = $feature.properties
        $cityCode = $p.N03_007
        $prefName = $p.N03_001
        $designatedCity = $p.N03_003
        $cityName = $p.N03_004

        if ($designatedCity) {
            $displayName = "$designatedCity $cityName"
        } else {
            $displayName = $cityName
        }

        $items.Add([PSCustomObject]@{
            code        = $cityCode
            prefCode    = $prefCode
            prefName    = $prefName
            designatedCity = $designatedCity
            cityName    = $cityName
            displayName = $displayName
            kana        = $null
        })
    }
}

Write-Output "total entries: $($items.Count)"

$jsonText = $items | ConvertTo-Json -Depth 5 -Compress
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outPath, $jsonText, $utf8NoBom)

Write-Output "written to: $outPath"
