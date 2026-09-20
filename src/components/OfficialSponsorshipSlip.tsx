import React, { useRef, useState } from 'react';
import type { SponsorshipRecord } from '../types';
import { Download, Share2, CreditCard, Camera } from 'lucide-react';

interface OfficialSponsorshipSlipProps {
  sponsorship: SponsorshipRecord;
  showActions?: boolean;
  onOpenPayBalance?: (sponsorship: SponsorshipRecord) => void;
  onOpenPoster?: () => void;
}

/**
 * OfficialSponsorshipSlip
 * Renders donor/sponsor name, total committed amount, receipt token, and date
 * directly over the uploaded purple sponsorship receipt template image using responsive CSS percentages & Container Queries (cqw).
 * Also supports 1-click HTML5 Canvas export (819x1024) for WhatsApp sharing and downloading.
 */
export const OfficialSponsorshipSlip: React.FC<OfficialSponsorshipSlipProps> = ({
  sponsorship,
  showActions = true,
  onOpenPayBalance,
  onOpenPoster
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const formattedTotalAmount = Number(sponsorship.totalAmount || 0).toLocaleString('en-IN');
  const formattedAmountPaid = Number(sponsorship.amountPaid || 0).toLocaleString('en-IN');
  const formattedBalance = Number(sponsorship.balanceAmount || 0).toLocaleString('en-IN');

  const dateStr = new Date(sponsorship.createdDate || Date.now()).toLocaleDateString('en-IN', {
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
    img.src = '/sponsor-receipt-template.jpg';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load sponsor receipt template image'));
    });
    ctx.drawImage(img, 0, 0, 819, 1024);

    // 2. Token & Date under RECEIPT divider (y = 246)
    ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(`No: ${sponsorship.receiptToken}`, 202, 246);

    ctx.textAlign = 'right';
    ctx.fillText(`Date: ${dateStr}`, 505, 246);

    // 3. Sponsor / Organization Name over dotted placeholder (y = 321, x = 265 to 510)
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#2E1065'; // Deep royal purple
    ctx.textAlign = 'left';
    const displayDonor = sponsorship.donorName.length > 25 ? sponsorship.donorName.substring(0, 23) + '...' : sponsorship.donorName;
    ctx.fillText(displayDonor, 262, 321);

    // 4. Total Amount over "താങ്കൾ നൽകിയ സംഭാവന ..........................." placeholder (y = 400, x = 380 to 515)
    ctx.font = '900 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#4C1D95'; // Vibrant purple
    ctx.textAlign = 'center';
    ctx.fillText(`₹${formattedTotalAmount}`, 445, 400);

    return canvas;
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const canvas = await generateSlipCanvas();
      const safeName = (sponsorship.donorName || 'sponsor').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `ibada-sponsorship-slip-${sponsorship.receiptToken}-${safeName}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFeedback('Official sponsorship receipt downloaded!');
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
      const safeName = (sponsorship.donorName || 'sponsor').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `ibada-sponsorship-slip-${sponsorship.receiptToken}-${safeName}.png`;

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      const rawPhone = (sponsorship.mobileNumber || '').replace(/\D/g, '');
      const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

      const posterUrl = `${window.location.origin}/?poster=1&token=${encodeURIComponent(sponsorship.receiptToken)}&name=${encodeURIComponent(sponsorship.donorName)}&type=sponsorship&item=${encodeURIComponent(sponsorship.itemName || 'Sponsorship Contribution')}&amount=${sponsorship.totalAmount}&ward=${sponsorship.wardNumber || ''}&panchayath=${encodeURIComponent(sponsorship.panchayath || 'Madavoor')}`;

      const messageText =
        `*Ibada Kit Challenge — Official Sponsorship Receipt*\n\n` +
        `Dear *${sponsorship.donorName}*,\n` +
        `Thank you for your generous contribution of *₹${formattedTotalAmount}* to the Shihab Thangal Centre Social Welfare Complex. 🤲\n\n` +
        `• *Receipt Token:* ${sponsorship.receiptToken}\n` +
        `• *Total Contribution:* ₹${formattedTotalAmount}\n` +
        (sponsorship.paymentStatus !== 'Completed' ? `• *Amount Paid:* ₹${formattedAmountPaid}\n• *Balance:* ₹${formattedBalance}\n` : '') +
        `• *Date:* ${dateStr}\n\n` +
        `_May Allah reward your contribution manifold!_\n\n` +
        `📸 *Create your Supporter Poster with your photo:*\n` +
        `${posterUrl}`;

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], filename, { type: 'image/png' })],
          title: 'Ibada Kit Official Sponsorship Receipt',
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

  const handleOpenPosterMaker = () => {
    if (onOpenPoster) {
      onOpenPoster();
      return;
    }
    const posterUrl = `/?poster=1&token=${encodeURIComponent(sponsorship.receiptToken)}&name=${encodeURIComponent(sponsorship.donorName)}&type=sponsorship&item=${encodeURIComponent(sponsorship.itemName || 'Sponsorship Contribution')}&amount=${sponsorship.totalAmount}&ward=${sponsorship.wardNumber || ''}&panchayath=${encodeURIComponent(sponsorship.panchayath || 'Madavoor')}`;
    window.location.href = posterUrl;
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 
        Responsive Receipt Container:
        Maintains exact 819:1024 (~4:5) aspect ratio.
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
          boxShadow: '0 12px 30px rgba(59, 49, 90, 0.28)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          background: '#433878'
        }}
      >
        {/* The Base Purple Sponsorship Receipt Template Image */}
        <img
          src="/sponsor-receipt-template.jpg"
          alt="Official Sponsorship Receipt Template"
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
          <span>No: {sponsorship.receiptToken}</span>
          <span style={{ fontSize: '1.6cqw', color: '#64748B' }}>{dateStr}</span>
        </div>

        {/* 2. Donor / Firm Name: Exact overlay over the dotted line (y ~ 30.1% to 32.0%) */}
        <div
          style={{
            position: 'absolute',
            left: '32.0%',
            top: '30.1%',
            width: '30.5%',
            height: '2.8%',
            display: 'flex',
            alignItems: 'center',
            fontSize: '2.8cqw',
            fontWeight: 800,
            color: '#2E1065',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            pointerEvents: 'none'
          }}
          title={sponsorship.donorName}
        >
          {sponsorship.donorName}
        </div>

        {/* 3. Total Amount: Exact overlay over "താങ്കൾ നൽകിയ സംഭാവന ..........................." (y ~ 38.2% to 40.2%) */}
        <div
          style={{
            position: 'absolute',
            left: '46.2%',
            top: '38.2%',
            width: '15.8%',
            height: '2.8%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.7cqw',
            fontWeight: 900,
            color: '#4C1D95',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            pointerEvents: 'none'
          }}
        >
          ₹{formattedTotalAmount}
        </div>
      </div>

      {/* Partial / Balance Status Alert (if not fully paid) */}
      {sponsorship.paymentStatus !== 'Completed' && (
        <div style={{
          width: '100%',
          maxWidth: 480,
          marginTop: 10,
          padding: '10px 14px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem'
        }}>
          <div>
            <span style={{ color: '#92400E', fontWeight: 700 }}>
              {sponsorship.paymentStatus === 'Booked' ? 'Booked (Pending Payment)' : 'Advance Paid'}
            </span>
            <div style={{ color: '#78350F', fontSize: '0.74rem' }}>
              Paid: ₹{formattedAmountPaid} | Balance: <strong>₹{formattedBalance}</strong>
            </div>
          </div>
          {onOpenPayBalance && sponsorship.balanceAmount > 0 && (
            <button
              type="button"
              onClick={() => onOpenPayBalance(sponsorship)}
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <CreditCard size={13} />
              <span>Collect Balance</span>
            </button>
          )}
        </div>
      )}

      {/* Optional Feedback banner */}
      {feedback && (
        <div style={{
          marginTop: 12,
          padding: '8px 16px',
          background: '#F3E8FF',
          color: '#6B21A8',
          borderRadius: 8,
          fontSize: '0.82rem',
          fontWeight: 700,
          border: '1px solid #D8B4FE'
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
              flex: '1 1 180px',
              padding: '11px 16px',
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
              flex: '1 1 180px',
              padding: '11px 16px',
              background: '#FFFFFF',
              color: '#4C1D95',
              border: '1px solid #DDD6FE',
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

          {/* Dedicated Button to Create Supporter Poster with Photo */}
          <button
            type="button"
            onClick={handleOpenPosterMaker}
            style={{
              width: '100%',
              padding: '11px 16px',
              background: 'linear-gradient(135deg, #023D18 0%, #008A2E 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0, 138, 46, 0.25)',
              marginTop: 2
            }}
          >
            <Camera size={17} />
            <span>📸 Create Supporter Poster (Add Photo)</span>
          </button>
        </div>
      )}
    </div>
  );
};
