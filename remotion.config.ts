import {Config} from '@remotion/cli/config';

Config.setEntryPoint('./src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell');
