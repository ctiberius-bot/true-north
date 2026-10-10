import {launcherDescriptor} from "./launcher-interface.js";
export const macosLauncher=launcherDescriptor("macos");
export function macosInstallPlan(){return{...macosLauncher,launcher:"per-user LaunchAgent",credential_store:"macOS Keychain",requires_separate_approval:["install","pair_device","grant_browser_access","start_background_service"]}}
