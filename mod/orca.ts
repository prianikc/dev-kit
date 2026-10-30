const HANDLE = /"handle"\s*:\s*"(term_[^"]+)"/

export function createdHandle(stdout: string): string | undefined {
  return HANDLE.exec(stdout)?.[1]
}
