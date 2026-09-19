set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

# Check which tools are available for local development.
doctor:
    ./scripts/doctor.sh

# Check shell scripts and plugin manifests without running application tests.
check:
    ./scripts/check-scaffold.sh

# Report the development tools needed for the current scaffold.
setup:
    ./scripts/setup.sh
