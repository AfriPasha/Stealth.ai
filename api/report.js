export default async function handler(req, res) {
  // 1. Add CORS Headers to allow requests from the Desktop App
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Handle CORS preflight check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests for actual submissions
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { id, timestamp, category, description, screenshot, systemInfo } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: 'Missing category or description.' });
    }

    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!discordWebhookUrl) {
      console.warn('DISCORD_WEBHOOK_URL is not set in Vercel environment variables.');
      return res.status(200).json({ message: 'No webhook configured.' });
    }

    const formData = new FormData();
    const embed = {
      title: `🚨 Diagnostics Report: ${category}`,
      description: `**Description:**\n${description}`,
      color: 15730489, 
      timestamp: timestamp || new Date().toISOString(),
      fields: [
        { name: 'Report ID', value: `\`${id || 'N/A'}\``, inline: true },
        { name: 'OS Platform', value: systemInfo?.platform || 'Unknown', inline: true },
        { name: 'App Version', value: systemInfo?.appVersion || '1.0.0', inline: true }
      ],
      footer: {
        text: 'StealthAI Desktop App'
      }
    };

    if (screenshot && screenshot.startsWith('data:image/')) {
      embed.image = { url: 'attachment://screenshot.png' };
    }

    formData.append('payload_json', JSON.stringify({
      username: 'Stealth Diagnostics',
      embeds: [embed]
    }));

    if (screenshot && screenshot.startsWith('data:image/')) {
      const parts = screenshot.split(',');
      const mime = parts[0].match(/:(.*?);/)[1];
      const base64Data = parts[1];
      const buffer = Buffer.from(base64Data, 'base64');
      formData.append('files[0]', new Blob([buffer], { type: mime }), 'screenshot.png');
    }

    const discordResponse = await fetch(discordWebhookUrl, {
      method: 'POST',
      body: formData
    });

    if (!discordResponse.ok) {
      throw new Error(`Discord failed: ${discordResponse.status}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
