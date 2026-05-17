const get = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const storage = { get, set }
