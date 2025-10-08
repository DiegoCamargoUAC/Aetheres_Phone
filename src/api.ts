export interface VoiceTokenResponse {
  token: string;
}

export async function fetchVoiceToken(identity: string): Promise<string> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE}/voice/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identity }),
  });

  if (!response.ok) {
    throw new Error(`Error fetching token: ${response.status}`);
  }

  const data: VoiceTokenResponse = await response.json();
  return data.token;
}
