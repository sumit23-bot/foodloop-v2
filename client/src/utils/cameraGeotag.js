/**
 * Shared Canvas Geotag Watermarking Helper
 * Stamps real-time timestamp and GPS coordinates directly into image pixels.
 */
export function stampWatermarkOnImage(imageSrc, coords, title = '🛡️ ClothesLoop Verified Live Proof') {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 640;
      canvas.height = img.height || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const coordsStr = coords 
        ? `${coords.lat.toFixed(4)}°N, ${coords.lon.toFixed(4)}°E` 
        : 'Location Unavailable';

      const fontSize = Math.max(12, Math.floor(canvas.width * 0.024));
      const padding = Math.floor(fontSize * 0.8);
      const boxHeight = fontSize * 3.8;
      const boxWidth = Math.min(canvas.width - 24, Math.max(300, canvas.width * 0.58));
      const boxX = 12;
      const boxY = canvas.height - boxHeight - 12;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
        ctx.fill();
      } else {
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      }
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(boxX, boxY, 4, boxHeight);

      ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
      ctx.fillStyle = '#c084fc';
      ctx.fillText(title, boxX + padding + 4, boxY + fontSize * 1.2);

      ctx.font = `${Math.floor(fontSize * 0.88)}px "Courier New", Courier, monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`📅 ${dateStr} ${timeStr}`, boxX + padding + 4, boxY + fontSize * 2.3);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`📍 GPS: ${coordsStr}`, boxX + padding + 4, boxY + fontSize * 3.3);

      resolve(canvas.toDataURL('image/jpeg', 0.90));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}
