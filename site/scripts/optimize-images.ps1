# 將 assets-src/ 的原始圖片縮成兩種寬度（800、1920），輸出到 assets/。
# 用法：powershell -ExecutionPolicy Bypass -File site/scripts/optimize-images.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'assets-src'
$dst = Join-Path $root 'assets'
New-Item -ItemType Directory -Force $dst | Out-Null

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 80L

# 不縮圖、直接複製的檔案
foreach ($name in @('logo.png', 'favicon.ico')) {
  Copy-Item (Join-Path $src $name) (Join-Path $dst $name) -Force
}

Get-ChildItem $src -File | Where-Object { $_.Extension -in '.jpg', '.png' -and $_.Name -ne 'logo.png' } | ForEach-Object {
  $base = $_.BaseName
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  try {
    # 依 EXIF 方向轉正
    if ($img.PropertyIdList -contains 0x0112) {
      switch ([int]$img.GetPropertyItem(0x0112).Value[0]) {
        3 { $img.RotateFlip('Rotate180FlipNone') }
        6 { $img.RotateFlip('Rotate90FlipNone') }
        8 { $img.RotateFlip('Rotate270FlipNone') }
      }
    }
    foreach ($width in 800, 1920) {
      $out = Join-Path $dst "$base-$width.jpg"
      if ((Test-Path $out) -and (Get-Item $out).LastWriteTime -gt $_.LastWriteTime) { continue }
      $scale = [Math]::Min(1.0, [double]$width / $img.Width)
      $w = [int][Math]::Round($img.Width * $scale)
      $h = [int][Math]::Round($img.Height * $scale)
      $bmp = New-Object System.Drawing.Bitmap $w, $h
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = 'HighQualityBicubic'
      $g.PixelOffsetMode = 'HighQuality'
      $g.Clear([System.Drawing.Color]::FromArgb(20, 17, 14))
      $g.DrawImage($img, 0, 0, $w, $h)
      $bmp.Save($out, $codec, $params)
      $g.Dispose(); $bmp.Dispose()
    }
  } finally {
    $img.Dispose()
  }
}

$total = (Get-ChildItem $dst -File | Measure-Object Length -Sum).Sum
"assets: {0} files, {1:N1} MB" -f (Get-ChildItem $dst -File).Count, ($total / 1MB)
