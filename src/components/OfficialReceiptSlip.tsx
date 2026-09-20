import React, { useRef, useState } from 'react';
import type { Donation } from '../types';
import { Download, Share2 } from 'lucide-react';

interface OfficialReceiptSlipProps {
  donation: Donation;
  showActions?: boolean;
}

/**
 * OfficialReceiptSlip
 * Renders donor name, kit count, total amount, receipt token, and serial number
 * directly over the uploaded receipt template image using responsive CSS percentages & Container Queries (cqw).
 * Also supports 1-click HTML5 Canvas export for WhatsApp sharing and downloading.
 */
export const OfficialReceiptSlip: React.FC<OfficialReceiptSlipProps> = ({
  donation,
  showActions = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const formattedAmount = Number(donation.totalAmount || 0).toLocaleString('en-IN');
  const dateStr = new Date(donation.timestamp || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Generate 819x1024 Canvas for 100% pixel-perfect download & WhatsApp share
  const generateSlipCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 819;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    // 1. Draw Template Image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/receipt-template.jpg';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load receipt template image'));
    });
    ctx.drawImage(img, 0, 0, 819, 1024);

    // 2. Token & Serial under RECEIPT divider (y = 246)
    ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(`No: ${donation.receiptToken}`, 202, 246);

    ctx.textAlign = 'right';
    ctx.fillText(`Date: ${dateStr}`, 505, 246);

    // 3. Donor Name over the dotted placeholder (y = 321, x = 272 to 510)
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#064E3B'; // Deep emerald
    ctx.textAlign = 'left';
    const displayDonor = donation.donorName.length > 24 ? donation.donorName.substring(0, 22) + '...' : donation.donorName;
    ctx.fillText(displayDonor, 272, 321);

    // 4. Amount / Kits over "നൽകിയ സംഭാവന.......................... തുക" placeholder (y = 422, x = 325 to 475)
    ctx.font = '900 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#007A33';
    ctx.textAlign = 'center';
    ctx.fillText(`₹${formattedAmount}`, 400, 422);

    // 5. Right Side Rounded Card Box (x = 565 to 780, y = 395 to 520)
    // Top Half: Kits Count (e.g. 5 Kits)
    ctx.textAlign = 'center';
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('KITS CONTRIBUTED', 672, 428);

    ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${donation.kitCount} ${donation.kitCount === 1 ? 'Kit' : 'Kits'}`, 672, 453);

    // Bottom Half: Serial Number
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FDE047'; // Bright gold
    ctx.fillText('Serial No', 672, 488);

    ctx.font = '900 20px monospace';
    ctx.fillStyle = '#FEF08A';
    const serialDisplay = donation.serialNumber ? `#${donation.serialNumber}` : 'Standard';
    ctx.fillText(serialDisplay, 672, 513);

    return canvas;
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const canvas = await generateSlipCanvas();
      const safeName = (donation.donorName || 'donor').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `ibada-receipt-slip-${donation.receiptToken}-${safeName}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFeedback('Official receipt image downloaded!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Could not generate receipt image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      setIsExporting(true);
      const canvas = await generateSlipCanvas();
      const safeName = (donation.donorName || 'donor').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `ibada-receipt-slip-${donation.receiptToken}-${safeName}.png`;

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      const rawPhone = (donation.whatsAppNumber || '').replace(/\D/g, '');
      const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

      const messageText =
        `*Ibada Kit Challenge — Official Receipt Slip*\n\n` +
        `Assalamu Alaikum *${donation.donorName}*,\n` +
        `Here is your official donation receipt slip for *${donation.kitCount} ${donation.kitCount === 1 ? 'Kit' : 'Kits'}* (₹${formattedAmount}). 🤲\n\n` +
        `• *Receipt Token:* ${donation.receiptToken}\n` +
        (donation.serialNumber ? `• *Serial No:* #${donation.serialNumber}\n` : '') +
        `• *Date:* ${dateStr}\n\n` +
        `_May Allah accept and reward your contribution abundantly!_`;

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], filename, { type: 'image/png' })],
          title: 'Ibada Kit Official Receipt',
          text: messageText
        });
        setFeedback('Receipt shared successfully!');
      } else {
        // Fallback: download image and open WhatsApp web/app
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const waUrl = formattedPhone
          ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
        window.open(waUrl, '_blank');
        setFeedback('Slip downloaded! Opening WhatsApp...');
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 
        Responsive Receipt Container:
        Maintains the exact 819:1024 (~4:5) aspect ratio.
        Container Queries (container-type: inline-size) allow font-sizes (cqw)
        to scale in 100% lockstep with screen dimensions.
      */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          aspectRatio: '819 / 1024',
          containerType: 'inline-size',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(15, 76, 58, 0.22)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          background: '#19806F'
        }}
      >
        {/* The Base Receipt Template Image */}
        <img
          src="/receipt-template.jpg"
          alt="Official Receipt Template"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        />

        {/* 1. Header Info: Receipt Token & Date below RECEIPT heading (y ~ 22.8% to 24.6%) */}
        <div
          style={{
            position: 'absolute',
            left: '24.5%',
            top: '23.0%',
            width: '37.0%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '1.8cqw',
            fontWeight: 700,
            color: '#475569',
            fontFamily: 'monospace',
            pointerEvents: 'none'
          }}
        >
          <span>No: {donation.receiptToken}</span>
          <span style={{ fontSize: '1.6cqw', color: '#64748B' }}>{dateStr}</span>
        </div>

        {/* 2. Donor Name: Exact overlay over the dotted line (y ~ 30.2% to 32.0%) */}
        <div
          style={{
            position: 'absolute',
            left: '33.2%',
            top: '30.1%',
            width: '29.3%',
            height: '2.8%',
            display: 'flex',
            alignItems: 'center',
            fontSize: '2.8cqw',
            fontWeight: 800,
            color: '#064E3B',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            pointerEvents: 'none'
          }}
          title={donation.donorName}
        >
          {donation.donorName}
        </div>

        {/* 3. Amount & Kits: Exact overlay over "നൽകിയ സംഭാവന.......... തുക" (y ~ 40.0% to 42.0%) */}
        <div
          style={{
            position: 'absolute',
            left: '39.5%',
            top: '40.0%',
            width: '18.5%',
            height: '2.8%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.7cqw',
            fontWeight: 900,
            color: '#007A33',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            pointerEvents: 'none'
          }}
        >
          ₹{formattedAmount}
        </div>

        {/* 4. Right-Hand Card Box Outline (x ~ 68.5%, y ~ 38.6% to 51.5%) */}
        <div
          style={{
            position: 'absolute',
            left: '68.5%',
            top: '38.6%',
            width: '26.2%',
            height: '12.4%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
            padding: '1.5% 0'
          }}
        >
          {/* Top Half: Kits Count (e.g. 5 Kits) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
            <span style={{ fontSize: '1.4cqw', fontWeight: 700, color: 'rgba(255, 255, 255, 0.85)', letterSpacing: '0.04em' }}>
              KITS CONTRIBUTED
            </span>
            <span style={{ fontSize: '3.0cqw', fontWeight: 900, color: '#FFFFFF', marginTop: '1%' }}>
              {donation.kitCount} {donation.kitCount === 1 ? 'Kit' : 'Kits'}
            </span>
          </div>

          {/* Center Divider Line */}
          <div style={{ width: '80%', height: 1, background: 'rgba(255, 255, 255, 0.25)' }} />

          {/* Bottom Half: Serial Number */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
            <span style={{ fontSize: '1.4cqw', fontWeight: 700, color: '#FDE047', letterSpacing: '0.04em' }}>
              Serial No
            </span>
            <span style={{ fontSize: '2.3cqw', fontWeight: 900, color: '#FEF08A', fontFamily: 'monospace', marginTop: '1%' }}>
              {donation.serialNumber ? `#${donation.serialNumber}` : 'Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* Optional Feedback banner */}
      {feedback && (
        <div style={{
          marginTop: 12,
          padding: '8px 16px',
          background: '#EBF7EE',
          color: '#008A2E',
          borderRadius: 8,
          fontSize: '0.82rem',
          fontWeight: 700,
          border: '1px solid #A5D6B8'
        }}>
          {feedback}
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 480 }}>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={isExporting}
            style={{
              flex: '1 1 150px',
              padding: '10px 16px',
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)'
            }}
          >
            <Share2 size={16} />
            <span>{isExporting ? 'Rendering...' : 'Share on WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            style={{
              flex: '1 1 150px',
              padding: '10px 16px',
              background: '#FFFFFF',
              color: '#0F5132',
              border: '1px solid #A5D6B8',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7
            }}
          >
            <Download size={16} />
            <span>Download Slip PNG</span>
          </button>
        </div>
      )}
    </div>
  );
};
