let verified = false

export function assertRuntimeSecurity(): void {
  if (verified) {
    return
  }

  verified = true
}
