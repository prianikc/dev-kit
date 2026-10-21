export type DevKitSessionFiles = string[]

declare module 'claude-code' {
  interface PluginState {
    'dev-kit': {
      sessionFiles: DevKitSessionFiles
    }
  }
}
