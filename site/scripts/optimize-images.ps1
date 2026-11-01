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

Copy-Item (Join-Path $src 'favicon.ico') (Join-Path $dst 'favicon.ico') -Force

# Logo 保留透明度，改成網站強調色（--accent #c9b37e）
$logoSrc = [System.Drawing.Image]::FromFile((Join-Path $src 'logo.png'))
$logo = New-Object System.Drawing.Bitmap -ArgumentList $logoSrc
$logoSrc.Dispose()
for ($y = 0; $y -lt $logo.Height; $y++) {
  for ($x = 0; $x -lt $logo.Width; $x++) {
    $a = $logo.GetPixel($x, $y).A
    $logo.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, 0xc9, 0xb3, 0x7e))
  }
}
$logo.Save((Join-Path $dst 'logo.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$logo.Dispose()

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
