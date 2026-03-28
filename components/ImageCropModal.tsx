import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';

interface Props {
  imageSrc: string;
  type: 'avatar' | 'banner';
  outputOverride?: { w: number; h: number };
  onConfirm: (webpDataUrl: string) => void;
  onCancel: () => void;
}

const OUTPUT = { avatar: { w: 512, h: 512 }, banner: { w: 1500, h: 500 } };
const PREVIEW = { avatar: { w: 280, h: 280 }, banner: { w: 420, h: 140 } };
const LABEL = { avatar: 'Profil Fotoğrafı', banner: 'Kapak Fotoğrafı' };

const ImageCropModal: React.FC<Props> = ({ imageSrc, type, outputOverride, onConfirm, onCancel }) => {
  const pv = PREVIEW[type];
  const out = outputOverride || OUTPUT[type];
  const isAvatar = type === 'avatar';

  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Stable drag via pointer events + capture
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; posX: number; posY: number }>({
    active: false, startX: 0, startY: 0, posX: 0, posY: 0,
  });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalW(nw);
      setNaturalH(nh);
      const init = Math.max(pv.w / nw, pv.h / nh);
      setMinScale(init);
      setScale(init);
      setPos({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, type]);

  const clamp = useCallback(
    (x: number, y: number, s: number) => {
      const iw = naturalW * s;
      const ih = naturalH * s;
      return {
        x: Math.max(pv.w / 2 - iw / 2, Math.min(iw / 2 - pv.w / 2, x)),
        y: Math.max(pv.h / 2 - ih / 2, Math.min(ih / 2 - pv.h / 2, y)),
      };
    },
    [naturalW, naturalH, pv]
  );

  const applyScale = useCallback(
    (newScale: number) => {
      const clamped = Math.max(minScale, Math.min(minScale * 6, newScale));
      setScale(clamped);
      setPos(p => clamp(p.x, p.y, clamped));
      return clamped;
    },
    [minScale, clamp]
  );

  // Pointer events for stable drag (works with touch + mouse, no escape on fast move)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, posX: pos.x, posY: pos.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clamp(dragRef.current.posX + dx, dragRef.current.posY + dy, scale));
  };

  const onPointerUp = () => { dragRef.current.active = false; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    applyScale(scale * (e.deltaY > 0 ? 0.92 : 1.08));
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyScale(Number(e.target.value));
  };

  const handleReset = () => {
    setScale(minScale);
    setPos({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = out.w;
      canvas.height = out.h;
      const ctx = canvas.getContext('2d')!;
      const imgLeft = pv.w / 2 + pos.x - (naturalW * scale) / 2;
      const imgTop = pv.h / 2 + pos.y - (naturalH * scale) / 2;
      ctx.drawImage(
        img,
        -imgLeft / scale, -imgTop / scale,
        pv.w / scale, pv.h / scale,
        0, 0, out.w, out.h
      );
      onConfirm(canvas.toDataURL('image/webp', 0.88));
    };
    img.src = imageSrc;
  };

  const iw = naturalW * scale;
  const ih = naturalH * scale;
  const imgLeft = pv.w / 2 + pos.x - iw / 2;
  const imgTop = pv.h / 2 + pos.y - ih / 2;
  const sliderMax = minScale * 6;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">{LABEL[type]} — Kırp</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Basılı tutarak sürükleyin • Kaydırın veya kaydırıcıyla yakınlaştırın
        </p>

        {/* Crop viewport */}
        <div className="flex justify-center mb-5">
          <div
            ref={containerRef}
            className={`relative overflow-hidden border-2 border-amber-500 select-none cursor-grab active:cursor-grabbing touch-none ${
              isAvatar ? 'rounded-full' : 'rounded-xl'
            }`}
            style={{ width: pv.w, height: pv.h }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {naturalW > 0 && (
              <img
                src={imageSrc}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  width: iw,
                  height: ih,
                  left: imgLeft,
                  top: imgTop,
                  maxWidth: 'none',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Zoom slider */}
        <div className="mb-5 px-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-6 text-center">−</span>
            <input
              type="range"
              min={minScale}
              max={sliderMax}
              step={(sliderMax - minScale) / 200}
              value={scale}
              onChange={handleSlider}
              className="flex-1 h-1.5 appearance-none rounded-full bg-gray-700 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-gray-500 w-6 text-center">+</span>
            <button
              onClick={handleReset}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors flex-shrink-0"
              title="Sıfırla"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-1">
            {Math.round((scale / minScale) * 100)}% · Çıktı {out.w}×{out.h}px WebP
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} /> Uygula
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
