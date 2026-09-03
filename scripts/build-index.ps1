# data/municipality/s0010/*.json から検索用の軽量インデックス data/muni-index.json を生成する。
# ジオメトリは含めず、一覧・検索に必要な属性のみを抽出する（一度きりのセットアップ作業用）。
# あわせて、政令指定都市は区ごとのエントリに加え、区を統合した「市」単位のエントリ（isAggregate）も生成する。

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
            isAggregate = $false
            wardCodes   = $null
        })
    }
}

Write-Output "total ward/city entries: $($items.Count)"

# 政令指定都市（designatedCityが「市」で終わるもの）の区を市単位に統合したエントリを追加する。
# 全国地方公共団体コードの体系上、政令市本体のコードは所属する区コードの上4桁+"0"と一致する
# （例: 静岡市=22100(葵区22101/駿河区22102/清水区22103), 浜松市=22130(中区22131...)）。
# 同一県内に政令市が複数ある場合（神奈川・静岡・大阪・福岡）に区別するため、上3桁だけでは不十分。
$designatedGroups = $items | Where-Object { $_.designatedCity -and $_.designatedCity -like "*市" } |
    Group-Object -Property prefCode, designatedCity

foreach ($group in $designatedGroups) {
    $wards = $group.Group
    $wardCodes = $wards | ForEach-Object { $_.code } | Sort-Object
    $aggCode = $wardCodes[0].Substring(0, 4) + "0"

    $items.Add([PSCustomObject]@{
        code        = $aggCode
        prefCode    = $wards[0].prefCode
        prefName    = $wards[0].prefName
        designatedCity = $null
        cityName    = $wards[0].designatedCity
        displayName = $wards[0].designatedCity
        kana        = $null
        isAggregate = $true
        wardCodes   = $wardCodes
    })
}

Write-Output "total entries (aggregate含む): $($items.Count)"

$jsonText = $items | ConvertTo-Json -Depth 5 -Compress
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outPath, $jsonText, $utf8NoBom)

Write-Output "written to: $outPath"
