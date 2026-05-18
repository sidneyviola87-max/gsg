export async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform,
    navigator.maxTouchPoints || 0,
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(components);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem('mp_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('mp_device_id', deviceId);
  }
  return deviceId;
}

export async function getIPAddress(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    const d = await res.json();
    return d.ip as string;
  } catch {
    return 'unknown';
  }
}
