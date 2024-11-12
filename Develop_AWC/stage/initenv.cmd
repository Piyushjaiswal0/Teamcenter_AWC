:: Copyright (c) 2022 Siemens

:: Stage dir settings
SET AWS2_STAGE_DIR=%~dps0

:: the Active Workspace Client stage directory
SET AWC_STAGE_DIR=%AWS2_STAGE_DIR%
IF NOT DEFINED AWC_STAGE_DIR @ECHO AWC_STAGE_DIR NOT DEFINED & EXIT /B 1

SET ROOT=%AWC_STAGE_DIR%

:: Add Node.js to PATH
SET PATH=%AWS2_STAGE_DIR%\bin\wntx64\nodejs;%AWS2_STAGE_DIR%\bin;%AWS2_STAGE_DIR%\node_modules\.bin;%PATH%

:: Set CI to false
SET CI=false

:: Disable requested by 3rd party tooling for donations
SET DISABLE_OPENCOLLECTIVE=true

:: Set limit for image inline for webpack
SET IMAGE_INLINE_SIZE_LIMIT=250000

:: Allow for changing the memory settings for the node.js process
IF NOT DEFINED NODE_OPTIONS SET NODE_OPTIONS=--max-old-space-size=8192

:: Disable build optimization as in kitted enviroment we do not install optional dependencies and optimized build needs these
SET SKIP_BUILD_OPTIMIZATION=true

:: Clear error variables
@SET ERRORLEVEL=
@SET ERROR_CODE=
