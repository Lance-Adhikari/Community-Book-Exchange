import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { ImportValidationError } from "./parser";

export const APPROVED_SOURCE_SHA256 = "648e7da6e5cde3d617afbf40027128a69c222e1d918b736a39147e4cae9500b7";
export const APPROVED_SOURCE_SIZE = 20_407;

function isInsideRepository(candidate: string, repositoryRoot: string): boolean {
  const relative = path.relative(repositoryRoot, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function assertApprovedFingerprint(sizeBytes: number, sha256: string): void {
  if (sizeBytes !== APPROVED_SOURCE_SIZE) {
    throw new ImportValidationError("SOURCE_SIZE_MISMATCH", "The source file size does not match the approved private backup.");
  }
  if (sha256.toLowerCase() !== APPROVED_SOURCE_SHA256) {
    throw new ImportValidationError("SOURCE_HASH_MISMATCH", "The source file hash does not match the approved private backup.");
  }
}

export async function loadApprovedPrivateSource(
  inputPath: string,
  repositoryRoot: string,
): Promise<{ readonly sql: string; readonly sizeBytes: number; readonly sha256: string }> {
  let sourcePath: string;
  let rootPath: string;
  try {
    [sourcePath, rootPath] = await Promise.all([realpath(inputPath), realpath(repositoryRoot)]);
  } catch {
    throw new ImportValidationError("SOURCE_NOT_FOUND", "The approved private SQL source could not be found or read.");
  }
  if (isInsideRepository(sourcePath.toLocaleLowerCase("en-CA"), rootPath.toLocaleLowerCase("en-CA"))) {
    throw new ImportValidationError("SOURCE_INSIDE_REPOSITORY", "The SQL source must remain outside the Git repository.");
  }
  const sourceStat = await stat(sourcePath);
  if (!sourceStat.isFile()) {
    throw new ImportValidationError("SOURCE_NOT_FILE", "The approved SQL source path is not a regular file.");
  }
  const buffer = await readFile(sourcePath);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  assertApprovedFingerprint(buffer.byteLength, sha256);
  return { sql: buffer.toString("utf8"), sizeBytes: buffer.byteLength, sha256 };
}
