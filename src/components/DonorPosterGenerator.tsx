import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  Share2,
  ArrowLeft,
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Copy,
  Sliders
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
      name: searchParams.get('name') || 'Valued Supporter',
      type: searchParams.get('type') || 'kit', // 'kit' or 'sponsorship'
      kits: searchParams.get('kits') || searchParams.get('count') || '1',
      item: searchParams.get('item') || 'Relief Food & Essential Kits',
      amount: searchParams.get('amount') || '',
      ward: searchParams.get('ward') || '',
      panchayath: searchParams.get('panchayath') || 'Madavoor',
      serial: searchParams.get('serial') || ''
    };
  });

  // Photo state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // UI state
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoFrameRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement | null>(null);

  // Handle local photo upload (FileReader - Zero server storage)
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
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setFeedback('Photo added! You can drag to position or adjust zoom.');
      setTimeout(() => setFeedback(null), 3500);
    };
    reader.readAsDataURL(file);
  };

  // Drag & Pan handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!photoUrl) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Reset photo zoom and pan
  const handleResetPhoto = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Subtitle text for contribution (used in WhatsApp caption)
  const getContributionBadge = useCallback(() => {
    if (params.type === 'sponsorship') {
      return `★ Official Sponsor • ${params.item} ★`;
    }
    const count = parseInt(params.kits) || 1;
    return `★ Ibada Kit Supporter • ${count} ${count === 1 ? 'Kit' : 'Kits'} ★`;
  }, [params.type, params.item, params.kits]);

  /**
   * Generates 819x1024 high-resolution HTML5 Canvas matching the official poster template.
   */
  const generatePosterCanvas = useCallback(async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 819;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    // 1. Draw base official poster template image
    const templateImg = new Image();
    templateImg.crossOrigin = 'anonymous';
    templateImg.src = '/poster-template.jpg';
    await new Promise<void>((resolve, reject) => {
      templateImg.onload = () => resolve();
      templateImg.onerror = () => reject(new Error('Failed to load poster template'));
    });
    ctx.drawImage(templateImg, 0, 0, 819, 1024);

    // Frame bounds on 819x1024 canvas
    const frameX = 84;
    const frameY = 250;
    const frameW = 620;
    const frameH = 361;
    const frameRadius = 8;

    // 2. Draw User Photo inside White Area (Clipped)
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(frameX, frameY, frameW, frameH, frameRadius);
    } else {
      ctx.rect(frameX, frameY, frameW, frameH);
    }
    ctx.clip();

    if (photoUrl) {
      // Load user photo
      const userImg = new Image();
      userImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        userImg.onload = () => resolve();
        userImg.onerror = () => reject(new Error('Failed to load user image'));
        userImg.src = photoUrl;
      });

      // Calculate base 'cover' dimensions
      const imgAspect = userImg.width / userImg.height;
      const frameAspect = frameW / frameH;
      let baseW: number;
      let baseH: number;

      if (imgAspect > frameAspect) {
        // Image is wider than frame
        baseH = frameH;
        baseW = frameH * imgAspect;
      } else {
        // Image is taller than frame
        baseW = frameW;
        baseH = frameW / imgAspect;
      }

      // Apply user zoom
      const drawW = baseW * zoom;
      const drawH = baseH * zoom;

      // Scale pan coordinates relative to preview container width
      let panScale = 1;
      if (photoFrameRef.current) {
        const previewW = photoFrameRef.current.clientWidth || 300;
        panScale = frameW / previewW;
      }
      const scaledPanX = pan.x * panScale;
      const scaledPanY = pan.y * panScale;

      const drawX = frameX + (frameW - drawW) / 2 + scaledPanX;
      const drawY = frameY + (frameH - drawH) / 2 + scaledPanY;

      ctx.drawImage(userImg, drawX, drawY, drawW, drawH);
    } else {
      // Placeholder illustration if no photo uploaded
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(frameX, frameY, frameW, frameH);

      ctx.fillStyle = '#64748B';
      ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📸 Supporter Photo', frameX + frameW / 2, frameY + frameH / 2);
    }

    ctx.restore();

    // 3. Subtle Outer Border around the photo frame
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(frameX, frameY, frameW, frameH, frameRadius);
    } else {
      ctx.rect(frameX, frameY, frameW, frameH);
    }
    ctx.stroke();

    return canvas;
  }, [photoUrl, zoom, pan]);

  // Download high-resolution PNG
  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const canvas = await generatePosterCanvas();
      const safeName = (params.name || 'supporter').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `ibada-supporter-poster-${safeName}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFeedback('High-resolution poster downloaded successfully!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Could not generate poster. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // WhatsApp Share or Native Share
  const handleShareWhatsApp = async () => {
    try {
      setIsExporting(true);
      const canvas = await generatePosterCanvas();
      const safeName = params.name || 'Valued Supporter';
      const filename = `ibada-supporter-poster.png`;

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      const posterLink = window.location.href;

      const messageText =
        `*ശിഹാബ് തങ്ങൾ സെന്റർ സോഷ്യൽ വെൽഫെയർ കോംപ്ലക്സ്*\n` +
        `*ഇബാദ് കിറ്റ് ചലഞ്ച് — Supporter Poster* 🤲\n\n` +
        `Assalamu Alaikum,\n` +
        `I proudly supported the Ibada Kit Challenge!\n` +
        `• *Supporter:* ${safeName}\n` +
        `• *Contribution:* ${getContributionBadge().replace(/★/g, '').trim()}\n` +
        `• *Receipt No:* ${params.token}\n\n` +
        `Create your own supporter poster here:\n` +
        `${posterLink}\n\n` +
        `_May Allah reward everyone manifold!_`;

      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], filename, { type: 'image/png' })],
          title: 'Ibada Kit Challenge Supporter Poster',
          text: messageText
        });
        setFeedback('Poster shared successfully!');
      } else {
        // Desktop fallback: Download image and open WhatsApp web
        if (blob) {
          const link = document.createElement('a');
          link.download = filename;
          link.href = canvas.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
        window.open(waUrl, '_blank');
        setFeedback('Poster image downloaded! Opening WhatsApp...');
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy shareable link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setFeedback('Poster link copied to clipboard!');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B1914',
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
        background: 'rgba(11, 25, 20, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #008A2E 0%, #157E6E 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 138, 46, 0.3)'
          }}>
            <Camera size={20} color="#FFFFFF" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
              Supporter Poster Creator
            </h1>
            <span style={{ fontSize: '0.74rem', color: '#6EE7B7', fontWeight: 600 }}>
              ശിഹാബ് തങ്ങൾ സെന്റർ • ഇബാദ് കിറ്റ് ചലഞ്ച്
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
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 700,
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

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        maxWidth: 520,
        width: '100%',
        margin: '0 auto',
        padding: '18px 16px 40px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
      }}>

        {/* Feedback Alert */}
        {feedback && (
          <div style={{
            width: '100%',
            padding: '10px 14px',
            background: '#064E3B',
            color: '#A7F3D0',
            border: '1px solid #059669',
            borderRadius: 10,
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <CheckCircle2 size={16} color="#34D399" />
            <span>{feedback}</span>
          </div>
        )}

        {/*
          THE POSTER CONTAINER
          Exact 819:1024 aspect ratio matching the official template image.
          Container Query enables cqw scaling for responsive typography.
        */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '819 / 1024',
            containerType: 'inline-size',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15)',
            background: '#19806F',
            userSelect: 'none'
          }}
        >
          {/* Base Template Image */}
          <img
            src="/poster-template.jpg"
            alt="Official Poster Template"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none'
            }}
          />

          {/*
            THE DESIGNATED WHITE PHOTO AREA
            Coordinates: X: 84 to 704 (width: 620/819 = 75.70%)
                         Y: 250 to 611 (height: 361/1024 = 35.25%)
                         left: 10.26%, top: 24.41%
          */}
          <div
            ref={photoFrameRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: 'absolute',
              left: '10.26%',
              top: '24.41%',
              width: '75.70%',
              height: '35.25%',
              overflow: 'hidden',
              borderRadius: '1.2cqw',
              cursor: photoUrl ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              touchAction: 'none',
              background: '#FFFFFF',
              boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)'
            }}
            onClick={() => {
              if (!photoUrl) fileInputRef.current?.click();
            }}
          >
            {photoUrl ? (
              <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                {/* User Image with interactive pan and scale */}
                <img
                  ref={imgElementRef}
                  src={photoUrl}
                  alt="Donor Supporter"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                    pointerEvents: 'none',
                    display: 'block'
                  }}
                />
              </div>
            ) : (
              /* Inviting Photo Upload Target */
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2cqw',
                padding: '4cqw',
                textAlign: 'center',
                background: 'linear-gradient(145deg, #F0FDF4 0%, #DCFCE7 100%)',
                border: '2px dashed #16A34A',
                borderRadius: '1.2cqw',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  width: '11cqw',
                  height: '11cqw',
                  borderRadius: '50%',
                  background: '#008A2E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0, 138, 46, 0.3)'
                }}>
                  <Camera size={26} color="#FFFFFF" />
                </div>
                <div style={{ fontSize: '3.0cqw', fontWeight: 800, color: '#064E3B' }}>
                  Tap Here to Upload Photo
                </div>
                <div style={{ fontSize: '2.0cqw', color: '#15803D', fontWeight: 600 }}>
                  Camera or Gallery (JPG, PNG)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Photo Controls (if photo is uploaded) */}
        {photoUrl && (
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 700, color: '#E2E8F0' }}>
                <Sliders size={16} color="#34D399" />
                <span>Adjust Photo (Drag on photo to reposition)</span>
              </div>
              <button
                type="button"
                onClick={handleResetPhoto}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>

            {/* Zoom Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.8, Number((prev - 0.1).toFixed(2))))}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Zoom out"
              >
                <ZoomOut size={15} />
              </button>

              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: '#10B981',
                  height: 6,
                  cursor: 'pointer'
                }}
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))))}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Zoom in"
              >
                <ZoomIn size={15} />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: '#047857',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '5px 10px',
                  borderRadius: 6,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Upload size={12} />
                <span>Change Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons: Download & WhatsApp Share */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={isExporting}
            style={{
              width: '100%',
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px 20px',
              borderRadius: 12,
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
            }}
          >
            <Share2 size={18} />
            <span>{isExporting ? 'Preparing Poster...' : 'Share Poster on WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            style={{
              width: '100%',
              background: '#008A2E',
              color: '#FFFFFF',
              border: 'none',
              padding: '13px 20px',
              borderRadius: 12,
              fontSize: '0.94rem',
              fontWeight: 800,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              boxShadow: '0 4px 14px rgba(0, 138, 46, 0.35)'
            }}
          >
            <Download size={18} />
            <span>{isExporting ? 'Rendering Image...' : 'Download Poster (HD PNG)'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#94A3B8',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7
            }}
          >
            <Copy size={15} />
            <span>Copy Poster Creator Link</span>
          </button>
        </div>

        {/* Footer info */}
        <div style={{
          fontSize: '0.74rem',
          color: '#64748B',
          textAlign: 'center',
          lineHeight: 1.5,
          marginTop: 4
        }}>
          🔒 100% Private: Your photo is processed directly on your device canvas and never stored on any cloud server.
        </div>
      </main>
    </div>
  );
};
