Add-Type -AssemblyName System.Drawing

$srcPath = "D:\messent_26_05_2026-App-main\assets\icon.png"
$destPath = "D:\messent_26_05_2026-App-main\assets\icon.png"

# Load source image
$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$w = $srcImg.Width
$h = $srcImg.Height

# Get background color from pixel (0,0)
$bmp = New-Object System.Drawing.Bitmap($srcImg)
$bgColor = $bmp.GetPixel(0, 0)

# Create new bitmap
$newBmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($newBmp)

# Set high quality settings
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear with background color
$g.Clear($bgColor)

# Calculate zoomed-out size (e.g. 70% of original size)
$scale = 0.7
$newW = [int]($w * $scale)
$newH = [int]($h * $scale)
$x = [int](($w - $newW) / 2)
$y = [int](($h - $newH) / 2)

# Draw original image scaled down and centered
$g.DrawImage($srcImg, $x, $y, $newW, $newH)

# Dispose resources
$g.Dispose()
$srcImg.Dispose()
$bmp.Dispose()

# Save new image (first save to a temp file, then replace to avoid lock)
$tempPath = "D:\messent_26_05_2026-App-main\assets\icon_temp.png"
$newBmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newBmp.Dispose()

# Replace original
Remove-Item $srcPath -Force
Move-Item $tempPath $destPath -Force

Write-Output "Successfully zoomed out icon by 70% and saved."
