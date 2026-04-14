export function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL;
  const base = (env && env.trim()) ? env.trim() : 'http://127.0.0.1:5000';
  // Strip trailing slash so endpoints like /classes don't become //classes
  return base.replace(/\/$/, '');
}