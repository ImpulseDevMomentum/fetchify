@echo off
setlocal EnableDelayedExpansion
echo.
echo Installing Fetchify globally...
echo.

echo Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not found in PATH.
    echo Please install Node.js first from: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found! Getting version...
node --version
echo.

echo Checking npm installation...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not found in PATH.
    pause
    exit /b 1
)

echo npm found! Attempting to get version...
timeout /t 3 >nul
echo This might take a moment...

call npm --version
if %errorlevel% neq 0 (
    echo WARNING: Could not get npm version, but npm exists. Continuing...
)
echo.

echo Testing npm functionality...
call npm help >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not working properly
    echo Try reinstalling Node.js
    pause
    exit /b 1
)

echo npm is working correctly!
echo.

echo Installing dependencies...
echo This may take several minutes...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies.
    echo Check your internet connection and package.json
    pause
    exit /b 1
)

echo Dependencies installed successfully!
echo.

echo Building project...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed.
    echo Make sure you have a build script in package.json
    echo Or install TypeScript globally: npm install -g typescript
    pause
    exit /b 1
)

echo Build completed successfully!
echo.

echo Setting npm prefix for global packages...
call npm config set prefix "%APPDATA%\npm"
echo.

echo Installing globally...
call npm install -g .
if %errorlevel% neq 0 (
    echo ERROR: Global installation failed.
    echo Try running as Administrator or check npm permissions.
    pause
    exit /b 1
)

echo Global installation completed!
echo.

echo Adding npm folder to PATH...
for /f "skip=2 tokens=3*" %%a in ('reg query HKCU\Environment /v PATH 2^>nul') do set "current_path=%%b"
if not defined current_path set "current_path="

echo %current_path% | find "%APPDATA%\npm" >nul
if %errorlevel% neq 0 (
    echo Adding %APPDATA%\npm to PATH...
    if defined current_path (
        setx PATH "%current_path%;%APPDATA%\npm" >nul
    ) else (
        setx PATH "%APPDATA%\npm" >nul
    )
    echo PATH updated successfully!
    echo.
    echo IMPORTANT: You need to restart your terminal for PATH changes to take effect.
    echo Or run this command in new terminal: set PATH=%%PATH%%;%%APPDATA%%\npm
) else (
    echo npm path already exists in PATH.
)

echo.
echo ================================
echo SUCCESS: Fetchify installed globally!
echo ================================
echo.

echo Testing fetchify installation...
set "PATH=%PATH%;%APPDATA%\npm"
where fetchify >nul 2>&1
if %errorlevel% equ 0 (
    echo Fetchify command found!
    echo.
    echo You can now use 'fetchify' command:
    echo   fetchify track ^<url^>
    echo   fetchify playlist ^<url^>
    echo   fetchify info
    echo.
    echo Test it: fetchify --version
) else (
    echo Warning: fetchify command not found in current session.
    echo Please restart your terminal and try: fetchify --version
)
echo.

echo Press any key to exit...
pause >nul