export const LAUNCHER_PROTOCOL_VERSION=1;
export function launcherDescriptor(os){
  if(!["macos","windows"].includes(os))throw new Error("unsupported_launcher_os");
  return Object.freeze({version:LAUNCHER_PROTOCOL_VERSION,os,transport:"chrome_native_messaging",installation_status:"not_installed",pairing_status:"not_paired",may_start_background:false,may_access_accounts:false,may_submit:false});
}
