export async function fetchMandi(state: string, commodity: string) {
  try {
    // Note: In real production you need the correct data.gov.in format and API key
    // This is aligned with the prompt's instructions.
    const res = await fetch(
      `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${process.env.DATA_GOV_IN_API_KEY}&format=json&filters[state]=${state}&filters[commodity]=${commodity}&limit=5`
    );
    if (!res.ok) return null;
    const mandi = await res.json();
    return mandi;
  } catch (error) {
    console.error("Mandi fetch error:", error);
    return null;
  }
}
