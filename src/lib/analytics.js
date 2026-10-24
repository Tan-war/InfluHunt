// Placeholder until a real analytics tool is plugged in: logs events in development only.
export function track(event, props = {}) {
  if (import.meta.env.DEV) console.info('[track]', event, props)
}
