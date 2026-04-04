@echo off
:: ============================================================
::  ESS HR — Run All Tests
::  Double-click this file to run all module tests
:: ============================================================
::
::  Command-line usage:
::    "RUN TESTS.bat"                      run both modules
::    "RUN TESTS.bat" --module client      only ess_hr_client
::    "RUN TESTS.bat" --module admin       only ess_hr_admin
::    "RUN TESTS.bat" --tags ess_auth      specific tag(s)
::    "RUN TESTS.bat" --db ess-test        different database
::
setlocal

set PYTHON=d:\odoo19\python\python.exe
set SCRIPT=%~dp0_engine.py

if not exist "%PYTHON%" (
    echo.
    echo  ERROR: Python not found at %PYTHON%
    echo.
    pause
    exit /b 2
)

if not exist "%SCRIPT%" (
    echo.
    echo  ERROR: run_tests.py not found at %SCRIPT%
    echo.
    pause
    exit /b 2
)

"%PYTHON%" "%SCRIPT%" %*

set EXIT=%ERRORLEVEL%

echo.
if %EXIT% EQU 0 (
    echo  ============================================================
    echo   ALL TESTS PASSED
    echo  ============================================================
) else if %EXIT% EQU 2 (
    echo  ============================================================
    echo   COULD NOT START ODOO - check paths and database name
    echo  ============================================================
) else (
    echo  ============================================================
    echo   TESTS FAILED - check the test_errors_*.txt file
    echo  ============================================================
)
echo.

pause
endlocal
exit /b %EXIT%
