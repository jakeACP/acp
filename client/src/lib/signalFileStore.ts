let _pendingFile: File | null = null;

export function setPendingSignalFile(f: File | null) {
  _pendingFile = f;
}

export function getPendingSignalFile(): File | null {
  return _pendingFile;
}

export function clearPendingSignalFile() {
  _pendingFile = null;
}
