#!/bin/sh
# Copyright (c) 2023 Siemens
################################################################################
# Note:
#  This script is called by the installer to produce the Active Workspace site.
#  The use of this script and any other artifacts during the Active Workspace site
 #  creation is subject to change.
################################################################################
SCRIPTDIR=`dirname $0`                  # The dir containing this script.
SCRIPTDIR=`cd ${SCRIPTDIR}; pwd`        # Convert it to an absolute path -
cd ${SCRIPTDIR}

# Disable CI environment variable to avoid forcing warnings to be treated as errors in the build.
export CI=false

# Disable build optimization as in kitted enviroment we do not install optional dependencies and optimized build needs these
export SKIP_BUILD_OPTIMIZATION=true

# Uncomment below line to enable sourcemaps in production build.
# export GENERATE_SOURCEMAP=true

# Uncomment if more or less memory is needed for the build
# export NODE_OPTIONS=--max-old-space-size=8192

npm run audit && npm run build && npm run publish
