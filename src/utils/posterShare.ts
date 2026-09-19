export interface ReceiptPosterData {
  token: string;
  donorName: string;
  type: 'sponsorship' | 'kit';
  itemsDescription: string;
  amount: number;
  amountPaid?: number;
  balanceAmount?: number;
  paymentStatus?: string;
  wardNumber?: number | string;
  panchayath?: string;
  collectedByName?: string;
}

/**
 * Renders a high-resolution 1080x1080 official receipt & supporter poster canvas.
 */
export async function generateReceiptPosterCanvas(data: ReceiptPosterData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // 1. Background Gradient (Emerald to Deep Forest Green)
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#023014');
  grad.addColorStop(0.5, '#005E20');
  grad.addColorStop(1, '#063D18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // 2. Outer Gold & White Border Frames
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, 1008, 1008);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 984, 984);

  // 3. Campaign Header Bar
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IBADA KIT CHALLENGE', 540, 120);

  // Sub-header badge
  ctx.fillStyle = '#FBBF24';
  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const subtitle = data.type === 'sponsorship' ? '★ OFFICIAL SPONSORSHIP RECEIPT ★' : '★ VERIFIED DONATION RECEIPT ★';
  ctx.fillText(subtitle, 540, 160);

  // 4. Central Card Container
  const cardW = 900;
  const cardH = 510;
  const cardX = 540 - cardW / 2;
  const cardY = 205;
  const cardR = 24;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
  else ctx.rect(cardX, cardY, cardW, cardH);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Emblem Circle with Checkmark
  const circleR = 48;
  const circleY = cardY + 70;
  ctx.fillStyle = '#EBF7EE';
  ctx.beginPath();
  ctx.arc(540, circleY, circleR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#008A2E';
  ctx.font = '900 42px sans-serif';
  ctx.fillText('✓', 540, circleY + 15);

  // Donor / Firm Name (Prominent)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  const displayDonor = data.donorName.length > 28 ? data.donorName.substring(0, 26) + '...' : data.donorName;
  ctx.fillText(displayDonor, 540, cardY + 185);

  // Contribution details
  ctx.fillStyle = '#4ADE80';
  ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const displayDesc = data.itemsDescription.length > 40 ? data.itemsDescription.substring(0, 38) + '...' : data.itemsDescription;
  ctx.fillText(displayDesc, 540, cardY + 245);

  // Amount badge
  ctx.fillStyle = '#FBBF24';
  ctx.font = '900 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const statusText = data.paymentStatus ? ` • ${data.paymentStatus}` : '';
  ctx.fillText(`₹${data.amount.toLocaleString('en-IN')}${statusText}`, 540, cardY + 315);

  // Location / Ward
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const loc = data.wardNumber ? `Ward ${data.wardNumber} • ${data.panchayath || 'Madavoor'}` : `${data.panchayath || 'Madavoor'}`;
  ctx.fillText(loc, 540, cardY + 375);

  // Collected by
  if (data.collectedByName) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Collected by: ${data.collectedByName}`, 540, cardY + 415);
  }

  // 5. Verification Token Badge (Bottom pill)
  const tokenText = `Receipt Token: ${data.token}`;
  ctx.font = '700 26px monospace';
  const textWidth = ctx.measureText(tokenText).width;
  const pillW = textWidth + 60;
  const pillH = 54;
  const pillX = 540 - pillW / 2;
  const pillY = 800;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 27);
  else ctx.rect(pillX, pillY, pillW, pillH);
  ctx.fill();

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(tokenText, 540, pillY + 36);

  // 6. Footer Taglines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('100% Direct Kit Distribution • Transparent & Verified', 540, 930);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('May Allah reward your generous contribution manifold! 🤲', 540, 970);

  return canvas;
}

/**
 * Downloads the generated high-resolution receipt poster PNG.
 */
export async function downloadReceiptPoster(posterData: ReceiptPosterData): Promise<void> {
  const canvas = await generateReceiptPosterCanvas(posterData);
  const safeName = (posterData.donorName || 'supporter').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const filename = `ibada-receipt-${posterData.token}-${safeName}.png`;
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Shares the receipt with image attachment and message content to WhatsApp.
 * Uses Web Share API (mobile phones) to directly attach the image file + text caption.
 * Falls back to downloading image and opening WhatsApp on desktop.
 */
export async function shareReceiptToWhatsApp(
  posterData: ReceiptPosterData,
  messageText: string,
  phoneNumber: string
): Promise<{ method: 'native' | 'download_and_whatsapp' | 'whatsapp_link'; success: boolean }> {
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const waUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

  try {
    const canvas = await generateReceiptPosterCanvas(posterData);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      window.open(waUrl, '_blank');
      return { method: 'whatsapp_link', success: true };
    }

    const safeName = (posterData.donorName || 'supporter').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `ibada-receipt-${posterData.token}-${safeName}.png`;
    const file = new File([blob], filename, { type: 'image/png' });

    // Try Web Share API (Mobile phones: Android Chrome, iOS Safari)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Ibada Kit Challenge Receipt',
        text: messageText,
        files: [file]
      });
      return { method: 'native', success: true };
    }

    // Desktop fallback: Download image file & open WhatsApp Web/Desktop with pre-filled text
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Open WhatsApp
    window.open(waUrl, '_blank');
    return { method: 'download_and_whatsapp', success: true };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User cancelled share dialog
      return { method: 'native', success: false };
    }
    // Fallback directly to WhatsApp URL
    window.open(waUrl, '_blank');
    return { method: 'whatsapp_link', success: true };
  }
}
