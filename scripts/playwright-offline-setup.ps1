# Playwright 离线环境打包脚本 (Windows)
# 用法: 在联网机器上运行此脚本，生成可拷贝到内网的压缩包
# 目标机器解压后运行 deploy.bat 即可使用

param(
    [string]$OutputDir = ".\playwright-offline-package",
    [string]$Browser = "chromium"
)

$ErrorActionPreference = "Stop"

# --- 配置 ---
$TempProject = Join-Path $env:TEMP "playwright-offline-build"
$PlaywrightVersion = "1.52.0"

Write-Host "`n========== Playwright 离线环境打包 ==========" -ForegroundColor Cyan
Write-Host "浏览器: $Browser"
Write-Host "输出目录: $OutputDir`n"

# --- Step 1: 创建临时项目并安装依赖 ---
Write-Host "[1/5] 安装 Playwright npm 包..." -ForegroundColor Yellow

if (Test-Path $TempProject) {
    Remove-Item $TempProject -Recurse -Force
}
New-Item -ItemType Directory -Path $TempProject | Out-Null

Push-Location $TempProject

npm init -y --silent 2>$null | Out-Null
npm install "@playwright/test@$PlaywrightVersion" "playwright@$PlaywrightVersion" --save 2>&1 |
    Select-String -NotMatch "npm warn"

Write-Host "      npm 包安装完成" -ForegroundColor Green

# --- Step 2: 下载浏览器 ---
Write-Host "[2/5] 下载 $Browser 浏览器..." -ForegroundColor Yellow

npx playwright install $Browser 2>&1 | ForEach-Object { Write-Host "      $_" }

# 定位浏览器缓存目录
$BrowserCache = Join-Path $env:LOCALAPPDATA "ms-playwright"

if (-not (Test-Path $BrowserCache)) {
    Write-Host "      错误: 浏览器缓存目录不存在: $BrowserCache" -ForegroundColor Red
    Pop-Location
    exit 1
}

# 找到实际下载的浏览器目录（如 chromium-1234）
$BrowserDir = Get-ChildItem $BrowserCache -Directory |
    Where-Object { $_.Name -like "$Browser*" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $BrowserDir) {
    Write-Host "      错误: 未找到 $Browser 浏览器目录" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "      浏览器目录: $($BrowserDir.FullName)" -ForegroundColor Green

# --- Step 3: 收集 Windows 系统依赖 DLL ---
Write-Host "[3/5] 检查系统依赖..." -ForegroundColor Yellow

# Playwright Chromium 依赖的常见运行时，Windows 上一般自带
# 这里只做检查提示
$missingDeps = @()

$sysDlls = @(
    "$env:SYSTEMROOT\System32\d3dcompiler_47.dll",
    "$env:SYSTEMROOT\System32\msvcp140.dll",
    "$env:SYSTEMROOT\System32\vcruntime140.dll"
)

foreach ($dll in $sysDlls) {
    if (-not (Test-Path $dll)) {
        $missingDeps += (Split-Path $dll -Leaf)
    }
}

if ($missingDeps.Count -gt 0) {
    Write-Host "      注意: 以下 DLL 可能缺失（目标机器也需检查）:" -ForegroundColor DarkYellow
    $missingDeps | ForEach-Object { Write-Host "        - $_" -ForegroundColor DarkYellow }
} else {
    Write-Host "      系统依赖检查通过" -ForegroundColor Green
}

# --- Step 4: 生成部署脚本 ---
Write-Host "[4/5] 生成部署脚本..." -ForegroundColor Yellow

# 清理输出目录
if (Test-Path $OutputDir) {
    Remove-Item $OutputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# 创建内网部署用的目录结构
$PkgDir = Join-Path $OutputDir "playwright-env"
New-Item -ItemType Directory -Path $PkgDir -Force | Out-Null
New-Item -ItemType Directory -Path "$PkgDir\node_modules" -Force | Out-Null
New-Item -ItemType Directory -Path "$PkgDir\ms-playwright" -Force | Out-Null
New-Item -ItemType Directory -Path "$PkgDir\examples" -Force | Out-Null

# 拷贝 node_modules
Write-Host "      拷贝 node_modules..." -ForegroundColor DarkGray
Copy-Item "$TempProject\node_modules" "$PkgDir\node_modules" -Recurse -Force

# 拷贝浏览器
Write-Host "      拷贝浏览器 $(${BrowserDir}.Name)..." -ForegroundColor DarkGray
Copy-Item $BrowserDir.FullName "$PkgDir\ms-playwright\$(${BrowserDir}.Name)" -Recurse -Force

# 拷贝 package 文件
Copy-Item "$TempProject\package.json" "$PkgDir\package.json"
Copy-Item "$TempProject\package-lock.json" "$PkgDir\package-lock.json" -ErrorAction SilentlyContinue

# 写 deploy.bat
$deployBat = @"
@echo off
chcp 65001 >nul 2>&1
echo.
echo ========== Playwright 环境部署 ==========
echo.

REM 设置浏览器路径
set "SCRIPT_DIR=%~dp0"
set "PLAYWRIGHT_BROWSERS_PATH=%SCRIPT_DIR%ms-playwright"
set "NODE_PATH=%SCRIPT_DIR%node_modules"

REM 验证浏览器存在
if not exist "%PLAYWRIGHT_BROWSERS_PATH%\$($BrowserDir.Name)" (
    echo [错误] 浏览器目录不存在: %PLAYWRIGHT_BROWSERS_PATH%\$($BrowserDir.Name)
    echo 请确认解压后目录结构完整
    pause
    exit /b 1
)

echo [OK] 浏览器路径: %PLAYWRIGHT_BROWSERS_PATH%\$($BrowserDir.Name)
echo [OK] NODE_PATH: %NODE_PATH%
echo.
echo 环境变量已设置，可运行测试:
echo   set PLAYWRIGHT_BROWSERS_PATH=%PLAYWRIGHT_BROWSERS_PATH%
echo   npx playwright test
echo.
echo 或直接运行示例:
echo   deploy-run-example.bat
echo.

REM 写入用户级环境变量（可选，取消注释启用）
REM setx PLAYWRIGHT_BROWSERS_PATH "%PLAYWRIGHT_BROWSERS_PATH%"

pause
"@

Set-Content -Path "$PkgDir\deploy.bat" -Value $deployBat -Encoding UTF8

# 写 deploy-run-example.bat
$runExample = @"
@echo off
chcp 65001 >nul 2>&1
set "SCRIPT_DIR=%~dp0"
set "PLAYWRIGHT_BROWSERS_PATH=%SCRIPT_DIR%ms-playwright"
set "NODE_PATH=%SCRIPT_DIR%node_modules"

echo 运行 Playwright 示例测试...
echo.
npx --yes playwright test --config "%SCRIPT_DIR%examples\playwright.config.ts" "%SCRIPT_DIR%examples\example.spec.ts"
echo.
pause
"@

Set-Content -Path "$PkgDir\deploy-run-example.bat" -Value $runExample -Encoding UTF8

# 写 playwright.config.ts
$pwConfig = @"
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    // 不指定 executablePath，由 PLAYWRIGHT_BROWSERS_PATH 环境变量控制
    launchOptions: {
      args: ['--no-sandbox', '--disable-gpu'],
    },
  },
})
"@

Set-Content -Path "$PkgDir\examples\playwright.config.ts" -Value $pwConfig -Encoding UTF8

# 写示例测试
$exampleSpec = @"
import { test, expect } from '@playwright/test'

test('浏览器基本功能检查', async ({ page }) => {
  // 访问空白页验证浏览器可用
  await page.goto('about:blank')
  expect(page.url()).toBe('about:blank')

  // 验证页面标题可设置
  await page.evaluate(() => { document.title = 'test' })
  expect(await page.title()).toBe('test')
})

test('截图功能检查', async ({ page }) => {
  await page.setContent('<html><body><h1>Playwright OK</h1></body></html>')
  await page.screenshot({ path: 'test-screenshot.png' })
})
"@

Set-Content -Path "$PkgDir\examples\example.spec.ts" -Value $exampleSpec -Encoding UTF8

# 写 README
$readme = @"
# Playwright 离线环境

## 目录结构

``````
playwright-env/
  node_modules/       # Playwright npm 依赖
  ms-playwright/      # Chromium 浏览器
  examples/           # 示例测试 + 配置
  deploy.bat          # 环境初始化脚本
  deploy-run-example.bat  # 运行示例测试
``````

## 内网部署步骤

1. 确认目标机器已安装 Node.js 18+
2. 将整个 ``playwright-env`` 文件夹拷贝到目标机器
3. 双击 ``deploy.bat`` 初始化环境
4. 运行 ``deploy-run-example.bat`` 验证浏览器可用

## 在自己的项目中使用

``````bat
REM 在你的测试脚本中设置环境变量
set PLAYWRIGHT_BROWSERS_PATH=D:\path\to\playwright-env\ms-playwright
set NODE_PATH=D:\path\to\playwright-env\node_modules

REM 运行测试
npx playwright test
``````

## 在代码中指定浏览器路径

``````typescript
import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: 'D:/path/to/playwright-env/ms-playwright/$($BrowserDir.Name)/chrome-win/chrome.exe',
  headless: true,
})
``````

## 版本信息

- Playwright: $PlaywrightVersion
- 浏览器: $($BrowserDir.Name)
- 打包时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

Set-Content -Path "$PkgDir\README.md" -Value $readme -Encoding UTF8

Pop-Location

# --- Step 5: 打包压缩 ---
Write-Host "[5/5] 压缩打包..." -ForegroundColor Yellow

$ZipFile = Join-Path (Resolve-Path (Split-Path $OutputDir -Parent)) "playwright-offline-env.zip"

if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
}

# 使用 .NET 压缩（无需额外工具）
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $PkgDir,
    $ZipFile,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

$ZipSize = [math]::Round((Get-Item $ZipFile).Length / 1MB, 1)

Write-Host "`n========== 完成 ==========" -ForegroundColor Green
Write-Host ""
Write-Host "输出文件: $ZipFile" -ForegroundColor White
Write-Host "压缩包大小: ${ZipSize} MB" -ForegroundColor White
Write-Host ""
Write-Host "内网部署: 将 zip 拷贝到目标机器解压，运行 deploy.bat" -ForegroundColor Cyan
Write-Host ""
