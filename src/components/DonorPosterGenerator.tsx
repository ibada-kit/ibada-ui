import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  Share2,
  ShieldCheck,
  Heart,
  ArrowLeft,
  Camera
} from 'lucide-react';

interface DonorPosterGeneratorProps {
  onBackToApp?: () => void;
}

export const DonorPosterGenerator: React.FC<DonorPosterGeneratorProps> = ({ onBackToApp }) => {
  // Extract parameters from URL query string
  const [params] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return {
      token: searchParams.get('token') || searchParams.get('id') || 'MDV-RELIEF',
      name: searchParams.get('name') || 'Valued Donor',
      type: searchParams.get('type') || 'kit', // 'kit' or 'sponsorship'
      kits: searchParams.get('kits') || searchParams.get('count') || '1',
      item: searchParams.get('item') || 'Relief Food & Essential Kits',
      amount: searchParams.get('amount') || '',
      ward: searchParams.get('ward') || '',
      panchayath: searchParams.get('panchayath') || 'Madavoor'
    };
  });

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local photo upload (FileReader - Zero server/azure storage)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Build contribution subtitle
  const getContributionText = () => {
    if (params.type === 'sponsorship') {
      return `Proud Sponsor: ${params.item}`;
    }
    const count = parseInt(params.kits) || 1;
    return `Contributed ${count} ${count === 1 ? 'Relief Kit' : 'Relief Kits'}`;
  };

  // Render high-resolution poster to Canvas for download
  const generatePosterCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    // 1. Draw Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
    grad.addColorStop(0, '#023014');
    grad.addColorStop(0.5, '#005E20');
    grad.addColorStop(1, '#063D18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Decorative Outer Border Frame
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 14;
    ctx.strokeRect(36, 36, 1008, 1008);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, 984, 984);

    // 3. Campaign Header Bar
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IBADA KIT CHALLENGE', 540, 120);

    // Sub-header badge
    ctx.fillStyle = '#FBBF24';
    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('★ OFFICIAL SUPPORTER ★', 540, 160);

    // 4. Central Photo Frame Area
    const frameSize = 480;
    const frameX = 540 - frameSize / 2;
    const frameY = 205;
    const frameRadius = 32;

    // Draw photo container shadow / background
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameSize, frameSize, frameRadius);
    ctx.clip();

    ctx.fillStyle = '#0B1E12';
    ctx.fillRect(frameX, frameY, frameSize, frameSize);

    // If user uploaded a photo, draw it with object-fit: cover
    if (photoUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const imgAspect = img.width / img.height;
          let drawW = frameSize;
          let drawH = frameSize;

          if (imgAspect > 1) {
            drawW = frameSize * imgAspect;
          } else {
            drawH = frameSize / imgAspect;
          }

          const drawX = frameX + (frameSize - drawW) / 2;
          const drawY = frameY + (frameSize - drawH) / 2;

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = photoUrl;
      });
    } else {
      // Placeholder illustration
      ctx.fillStyle = '#64748B';
      ctx.font = '600 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📸 Supporter Photo', 540, frameY + frameSize / 2);
    }
    ctx.restore();

    // Draw photo border rim
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameSize, frameSize, frameRadius);
    ctx.stroke();

    // 5. Donor Name (Prominent)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(params.name || 'Valued Supporter', 540, 755);

    // 6. Contribution Detail Ribbon
    const contributionText = getContributionText();
    ctx.fillStyle = '#4ADE80';
    ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(contributionText, 540, 810);

    // 7. Location & Panchayath
    const locationText = params.ward
      ? `Ward ${params.ward} • ${params.panchayath || 'Madavoor'}`
      : `${params.panchayath || 'Madavoor'} Relief Committee`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(locationText, 540, 855);

    // 8. Verification Token Badge (Bottom pill)
    const tokenText = `Receipt: ${params.token}`;
    ctx.font = '700 22px monospace';
    const textWidth = ctx.measureText(tokenText).width;
    const pillW = textWidth + 50;
    const pillH = 46;
    const pillX = 540 - pillW / 2;
    const pillY = 895;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 23);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(tokenText, 540, pillY + 31);

    // 9. Footer Tagline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('100% Direct Kit Distribution • Stand With Us', 540, 990);

    return canvas;
  };

  // Download high-resolution PNG
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const canvas = await generatePosterCanvas();
      const safeName = (params.name || 'supporter').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `ibada-kit-challenge-supporter-${safeName}.png`;

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export poster:', err);
      alert('Could not generate poster. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Native share or WhatsApp share
  const handleShare = async () => {
    try {
      const canvas = await generatePosterCanvas();
      const safeName = params.name || 'Valued Supporter';

      canvas.toBlob(async (blob) => {
        if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'supporter-poster.png', { type: 'image/png' })] })) {
          try {
            const file = new File([blob], `${safeName}-ibada-kit-supporter.png`, { type: 'image/png' });
            await navigator.share({
              title: 'Ibada Kit Challenge Supporter',
              text: `I proudly supported the Ibada Kit Challenge! 🤲\nJoin me in making a difference: ${window.location.origin}`,
              files: [file]
            });
            return;
          } catch {
            // User cancelled or fallback
          }
        }

        // Fallback: Open WhatsApp with text & current poster link
        const shareText = encodeURIComponent(
          `*I proudly contributed to the Ibada Kit Challenge!* 🤲%0A%0A` +
          `• *Donor:* ${safeName}%0A` +
          `• *Contribution:* ${getContributionText()}%0A` +
          `• *Receipt Token:* ${params.token}%0A%0A` +
          `Create your own supporter poster here:%0A${window.location.href}`
        );
        window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
      }, 'image/png');
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F172A',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoUpload}
      />

      {/* Top Header */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #008A2E 0%, #256CAA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Heart size={18} color="#FFFFFF" />
          </div>
          <div>
            <h1 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
              Ibada Kit Challenge
            </h1>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              Supporter Poster
            </span>
          </div>
        </div>

        {onBackToApp && (
          <button
            onClick={onBackToApp}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              padding: '7px 12px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ArrowLeft size={14} />
            <span>Portal</span>
          </button>
        )}
      </header>

      {/* Main Centered Content: Clean Poster + Simple Action Buttons */}
      <main style={{
        flex: 1,
        maxWidth: 500,
        width: '100%',
        margin: '0 auto',
        padding: '24px 16px 36px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20
      }}>
        {/* The Supporter Poster */}
        <div style={{
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 24,
          background: 'linear-gradient(145deg, #023D18 0%, #006822 55%, #0B4619 100%)',
          border: '6px solid #F59E0B',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 35px rgba(0, 138, 46, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 18px 16px 18px',
          textAlign: 'center',
          color: '#FFFFFF'
        }}>
          {/* Header */}
          <div>
            <div style={{
              fontSize: 'clamp(1rem, 4.2vw, 1.25rem)',
              fontWeight: 900,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Ibada Kit Challenge
            </div>
            <div style={{
              fontSize: 'clamp(0.68rem, 2.5vw, 0.78rem)',
              fontWeight: 800,
              color: '#FBBF24',
              letterSpacing: '0.08em',
              marginTop: 2
            }}>
              ★ OFFICIAL SUPPORTER ★
            </div>
          </div>

          {/* Central Photo Frame (Click to Upload / Change) */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '64%',
              aspectRatio: '1 / 1',
              margin: '0 auto',
              borderRadius: 20,
              border: '4px solid #F59E0B',
              background: '#0B1E12',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {photoUrl ? (
              <div style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <img
                  src={photoUrl}
                  alt="Donor"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                {/* Subtle tap to change badge */}
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(4px)',
                  color: '#FFFFFF',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Camera size={12} />
                  <span>Change</span>
                </div>
              </div>
            ) : (
              <div style={{
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                color: '#94A3B8'
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Upload size={24} color="#42B06F" />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Tap to Add Photo
                </span>
                <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                  Camera or Gallery
                </span>
              </div>
            )}
          </div>

          {/* Donor Info & Details */}
          <div style={{ marginTop: 6 }}>
            <div style={{
              fontSize: 'clamp(1.2rem, 4.8vw, 1.45rem)',
              fontWeight: 900,
              lineHeight: 1.2,
              color: '#FFFFFF'
            }}>
              {params.name || 'Valued Donor'}
            </div>

            <div style={{
              fontSize: 'clamp(0.76rem, 2.8vw, 0.86rem)',
              fontWeight: 800,
              color: '#4ADE80',
              marginTop: 3
            }}>
              {getContributionText()}
            </div>

            <div style={{
              fontSize: '0.7rem',
              color: '#D1FAE5',
              marginTop: 2
            }}>
              {params.ward ? `Ward ${params.ward} • ` : ''}{params.panchayath || 'Madavoor'}
            </div>

            {/* Receipt Token Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: '0.68rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#FFFFFF',
              marginTop: 6
            }}>
              <ShieldCheck size={11} />
              <span>Receipt: {params.token}</span>
            </div>
          </div>

          {/* Subtle Footer Tagline */}
          <div style={{
            fontSize: '0.58rem',
            color: 'rgba(255, 255, 255, 0.55)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            100% Direct Kit Distribution
          </div>
        </div>

        {/* Action Buttons: Only Download and Share via WhatsApp */}
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginTop: 4
        }}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              width: '100%',
              background: '#008A2E',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px 20px',
              borderRadius: 14,
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 4px 14px rgba(0, 138, 46, 0.4)',
              transition: 'transform 0.1s ease'
            }}
          >
            <Download size={19} />
            <span>{isDownloading ? 'Generating 1080p Image...' : 'Download Poster'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            style={{
              width: '100%',
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px 20px',
              borderRadius: 14,
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
              transition: 'transform 0.1s ease'
            }}
          >
            <Share2 size={19} />
            <span>Share via WhatsApp</span>
          </button>
        </div>

        <div style={{
          fontSize: '0.72rem',
          color: '#64748B',
          textAlign: 'center',
          lineHeight: 1.4
        }}>
          🔒 Handled 100% locally on your device. Zero external cloud storage.
        </div>
      </main>
    </div>
  );
};
