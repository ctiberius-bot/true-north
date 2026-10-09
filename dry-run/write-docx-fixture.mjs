import {writeFile} from "node:fs/promises";
import {renderDocxDocument} from "../worker.js";

const output=process.argv[2];
if(!output)throw new Error("output_path_required");
await writeFile(output,renderDocxDocument("Chris Lockhart\n\nExecutive Architecture Leader\n\nEvidence-controlled Unicode check: résumé — transformation."));
