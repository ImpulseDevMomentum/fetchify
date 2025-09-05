@echo off
setlocal EnableDelayedExpansion
echo.
echo Fetchify Uninstaller
echo ====================
echo.

echo Checking if Fetchify is installed globally...
cmd /c "npm ls -g --depth=0 fetchify >nul 2>&1"
set "npm_status=%errorlevel%"

if %npm_status% neq 0 (
    echo Fetchify is not installed globally.
    echo Checking local installation...
    if exist "node_modules\fetchify" (
        echo Found local Fetchify installation.
    ) else (
        echo No Fetchify installation found.
        echo.
        goto END
    )
) else (
    echo Fetchify found in global packages.
)

echo.
echo This will remove:
echo - Global Fetchify package
echo - Local node_modules and build files
echo - Fetchify from PATH (optional)
echo.
set /p confirm=Are you sure you want to uninstall? (Y/N): 
if /i not "%confirm%"=="Y" (
    echo Uninstall cancelled.
    goto END
)

echo.
echo Starting uninstall process...
echo.

echo Removing global Fetchify package...
cmd /c "npm uninstall -g fetchify >nul 2>&1"
if %errorlevel% equ 0 (
    echo Global package removed successfully.
) else (
    echo Warning: Failed to remove global package (may not be installed).
)
echo.

echo Removing local build files...
for %%d in (dist build node_modules) do (
    if exist "%%d" (
        rmdir /s /q "%%d"
        echo Removed %%d folder.
    )
)

if exist "package-lock.json" (
    del /q "package-lock.json"
    echo Removed package-lock.json.
)

echo.
echo Local files cleaned up.
echo.

set /p remove_path=Do you want to remove npm folder from PATH? This may affect other global npm packages (Y/N): 
if /i "%remove_path%"=="Y" (
    echo Removing %APPDATA%\npm from PATH...
    for /f "skip=2 tokens=2,*" %%a in ('reg query HKCU\Environment /v PATH 2^>nul') do (
        set "current_path=%%b"
    )
    if defined current_path (
        set "new_path=!current_path:%APPDATA%\npm;=!"
        set "new_path=!new_path:;%APPDATA%\npm=!"
        set "new_path=!new_path:%APPDATA%\npm=!"
        setx PATH "!new_path!" >nul
        echo PATH updated successfully.
        echo Note: You may need to restart your terminal for changes to take effect.
    ) else (
        echo Could not read current PATH.
    )
) else (
    echo PATH left unchanged.
)

echo.
echo Checking for remaining Fetchify traces...
where fetchify >nul 2>&1
if %errorlevel% equ 0 (
    echo Warning: fetchify command still found in PATH.
    echo You may need to restart your terminal or manually remove it.
) else (
    echo Good: fetchify command no longer found.
)

echo.
echo Cleaning npm cache (recommended)...
cmd /c "npm cache clean --force >nul 2>&1"
if %errorlevel% equ 0 (
    echo npm cache cleaned.
) else (
    echo Warning: Could not clean npm cache.
)

echo.
echo ================================
echo Uninstall completed!
echo ================================
echo.
echo What was removed:
echo - Global Fetchify package
echo - Local build files and dependencies
if /i "%remove_path%"=="Y" (
    echo - Fetchify PATH entries
) else (
    echo - PATH was left unchanged
)
echo - npm cache cleared
echo.
echo If you had other global npm packages, they should still work.
echo If you want to reinstall Fetchify, run install.bat again.
echo.

:END
echo.
echo Press any key to exit...
pause >nul