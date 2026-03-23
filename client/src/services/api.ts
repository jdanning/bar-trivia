const API_URL = process.env.REACT_APP_API_URL || `${window.location.origin}/api`;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

async function deleteRequest<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export const api = {
  getGame: (id: string) => fetchJson<any>(`${API_URL}/games/${id}`),
  getQRCode: (id: string) => fetchJson<{ qrCode: string; code: string }>(`${API_URL}/games/${id}/qr`),
  getTunnel: () => fetchJson<{ url: string; status: string; error: string }>(`${API_URL}/tunnel`),
  getScoreboard: (id: string) => fetchJson<any[]>(`${API_URL}/games/${id}/scoreboard`),
  getAnswers: (gameId: string, questionId: string) => fetchJson<any[]>(`${API_URL}/games/${gameId}/answers/${questionId}`),
  getWagers: (gameId: string, playerId: string, roundNumber: number) =>
    fetchJson<{ usedWagers: number[]; availableWagers: number[] }>(
      `${API_URL}/games/${gameId}/wagers/${playerId}/${roundNumber}`
    ),
  getTemplates: () => fetchJson<any[]>(`${API_URL}/templates`),
  saveTemplate: (name: string, gameId: string) => postJson<any>(`${API_URL}/templates`, { name, gameId }),
  deleteTemplate: (id: string) => deleteRequest<any>(`${API_URL}/templates/${id}`),
};
