#!/bin/sh

cd "$(dirname "$0")/src/codegen" || exit 1
flatc --rust http_message.fbs
