export function getApiBase(): string {
  // Prefer explicit env var.
  const env = process.env.NEXT_PUBLIC_API_URL;
  const base = (env && env.trim()) ? env.trim() : 'http://127.0.0.1:5000';
  return base.replace(/\/$/, '');
}
