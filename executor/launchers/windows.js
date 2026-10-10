import {launcherDescriptor} from "./launcher-interface.js";
export const windowsLauncher=launcherDescriptor("windows");
export function windowsInstallPlan(){return{...windowsLauncher,launcher:"per-user startup task or service",credential_store:"Windows Credential Manager",implementation_status:"interface_only_not_runtime_tested",requires_separate_approval:["implement_runtime","install","pair_device","grant_browser_access","start_background_service"]}}
