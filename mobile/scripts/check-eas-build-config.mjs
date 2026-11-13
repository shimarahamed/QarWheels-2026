import { checkReleaseConfig } from './check-release-config.mjs';

if (process.env.EAS_BUILD_PROFILE === 'production') {
  process.exitCode = checkReleaseConfig();
}
