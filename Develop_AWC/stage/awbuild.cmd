:: Copyright (c) 2022 Siemens

:: ################################################################################
:: # Note:
:: #  This script is called by the installer to produce the Active Workspace site.
:: #  The use of this script and any other artifacts during the Active Workspace site
:: #  creation is subject to change.
:: ################################################################################

@IF NOT DEFINED echostate set echostate=off
@ECHO %echostate%

:: Run the initialize environment variable script from the same directory as this script.
CALL %~dps0\initenv.cmd %*

CD /D %AWC_STAGE_DIR%

CALL npm run audit
@ECHO %echostate%
IF %ERRORLEVEL% NEQ 0 @ECHO audit error & EXIT /B %ERRORLEVEL%

:: Uncomment below line to enable source maps in production build.
:: SET GENERATE_SOURCEMAP=true

CALL npm run build
@ECHO %echostate%
IF %ERRORLEVEL% NEQ 0 @ECHO build error & EXIT /B %ERRORLEVEL%

CALL npm run publish
@ECHO %echostate%
IF %ERRORLEVEL% NEQ 0 @ECHO publish error & EXIT /B %ERRORLEVEL%
