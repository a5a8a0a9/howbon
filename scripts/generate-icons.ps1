param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\public\icons')
)

Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
$projectIcons = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\public\icons'))
if ($resolvedOutput -ne $projectIcons) {
  throw "Icon output must remain inside the project: $projectIcons"
}

[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)

foreach ($size in $sizes) {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#F7F0E3'))

  $margin = [Math]::Round($size * 0.12)
  $diameter = $size - ($margin * 2)
  $coral = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#CB5B49'))
  $creamPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#FFF8EA'), [Math]::Max(2, $size * 0.022))
  $graphics.FillEllipse($coral, $margin, $margin, $diameter, $diameter)
  $ringInset = [Math]::Round($size * 0.055)
  $graphics.DrawEllipse($creamPen, $margin + $ringInset, $margin + $ringInset, $diameter - ($ringInset * 2), $diameter - ($ringInset * 2))

  $fontSize = [Math]::Round($size * 0.34)
  $font = New-Object System.Drawing.Font('Microsoft JhengHei', $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel))
  $cream = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#FFF8EA'))
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $mark = [string][char]0x68D2
  $graphics.DrawString($mark, $font, $cream, (New-Object System.Drawing.RectangleF(0, -($size * 0.015), $size, $size)), $format)

  $path = Join-Path $resolvedOutput "icon-${size}x${size}.png"
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $format.Dispose()
  $cream.Dispose()
  $font.Dispose()
  $creamPen.Dispose()
  $coral.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
