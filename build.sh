#!/bin/bash
cat KoiPond.js KoiShaderHelper.js KoiShader.js > KoiScripts.js
sed -i -e "/Insert Koi.frag here/r./Koi.frag" KoiScripts.js
