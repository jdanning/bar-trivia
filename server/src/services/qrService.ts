import QRCode from 'qrcode';
import { config } from '../config';

export async function generateQRCode(gameCode: string): Promise<string> {
  const joinUrl = `${config.publicUrl || config.clientUrl}/join/${gameCode}`;
  const dataUrl = await QRCode.toDataURL(joinUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
  return dataUrl;
}
