import { useState, useRef, useEffect, SyntheticEvent } from 'react';
import { Palette, Trash2, Check, X, Circle, ArrowUpRight, Undo } from 'lucide-react';

interface DrawingCanvasProps {
  imageUrl: string;
  title: string;
  onSave: (annotatedImageUrl: string) => void;
  onCancel: () => void;
}

export default function DrawingCanvas({ imageUrl, title, onSave, onCancel }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [color, setColor] = useState('#ef4444'); // Red standard
  const [lineWidth, setLineWidth] = useState(4);
  const [tool, setTool] = useState<'pen' | 'circle' | 'arrow'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  
  // Track start of shapes
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [canvasInited, setCanvasInited] = useState(false);

  // Background image reference
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load the initial image and render on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      
      // We want to scale the canvas to fit a reasonable viewport width
      const maxWidth = Math.min(800, window.innerWidth - 40);
      const ratio = img.width / img.height;
      
      canvas.width = maxWidth;
      canvas.height = maxWidth / ratio;
      
      // Draw standard original image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setCanvasInited(true);
      
      // Save original state to history
      setHistory([canvas.toDataURL()]);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory(prev => [...prev, canvas.toDataURL()]);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const prevState = newHistory[newHistory.length - 1];

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHistory(newHistory);
    };
    img.src = prevState;
  };

  // Get mouse/touch relative coordinates
  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Support touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    setStartX(x);
    setStartY(y);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'pen') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'circle' || tool === 'arrow') {
      // For shapes, we draw in preview mode
      // Clear canvas and redraw the last history item to avoid trailing shapes
      if (history.length > 0) {
        const lastImg = new Image();
        lastImg.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(lastImg, 0, 0, canvas.width, canvas.height);
          
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';

          if (tool === 'circle') {
            const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (tool === 'arrow') {
            // Draw line
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.stroke();
            
            // Draw arrowhead
            const angle = Math.atan2(y - startY, x - startX);
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.moveTo(x, y);
            ctx.lineTo(x - 15 * Math.cos(angle - Math.PI / 6), y - 15 * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(x - 15 * Math.cos(angle + Math.PI / 6), y - 15 * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
          }
        };
        lastImg.src = history[history.length - 1];
      }
    }
  };

  const stopDrawing = (e: any) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveToHistory();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const colors = [
    { value: '#ef4444', label: 'Red' },
    { value: '#fbbf24', label: 'Yellow' },
    { value: '#10b981', label: 'Green' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#f43f5e', label: 'Rose' },
    { value: '#d946ef', label: 'Purple' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Title and control bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-blue-600" />
              Draw Annotation on Pic
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{title}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
              title="Undo last Stroke"
            >
              <Undo className="w-3.5 h-3.5" /> Undo
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700 flex items-center gap-1 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* Canvas Workspace and Drawing Toolbar Container */}
        <div className="flex flex-col lg:flex-row flex-1 p-6 gap-6 items-center lg:items-stretch overflow-y-auto min-h-0 bg-slate-50">
          {/* Main Canvas Drawing Deck */}
          <div ref={containerRef} className="flex-1 flex items-center justify-center relative bg-white rounded-xl p-2 border border-slate-200 w-full min-h-[300px] lg:min-h-0 shadow-inner">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="max-w-full rounded shadow-md cursor-crosshair touch-none"
              style={{ display: canvasInited ? 'block' : 'none' }}
            />
            {!canvasInited && (
              <div className="text-slate-400 text-sm animate-pulse">
                Loading image and initializing workspace...
              </div>
            )}
          </div>

          {/* Tools sidebar selection */}
          <div className="w-full lg:w-64 bg-white rounded-xl border border-slate-200 p-4 shrink-0 flex flex-col gap-5 justify-between shadow-sm">
            <div className="flex flex-col gap-4">
              {/* Tool selector */}
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-2 uppercase tracking-wider">Markup Mode</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTool('pen')}
                    className={`p-2 py-3 rounded-lg text-xs font-medium border flex flex-col items-center gap-1.5 transition ${
                      tool === 'pen'
                        ? 'bg-blue-50 border-blue-600 text-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    Pen Draw
                  </button>
                  <button
                    onClick={() => setTool('circle')}
                    className={`p-2 py-3 rounded-lg text-xs font-medium border flex flex-col items-center gap-1.5 transition ${
                      tool === 'circle'
                        ? 'bg-blue-50 border-blue-600 text-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Circle className="w-4 h-4" />
                    Circle
                  </button>
                  <button
                    onClick={() => setTool('arrow')}
                    className={`p-2 py-3 rounded-lg text-xs font-medium border flex flex-col items-center gap-1.5 transition ${
                      tool === 'arrow'
                        ? 'bg-blue-50 border-blue-600 text-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Arrow
                  </button>
                </div>
              </div>

              {/* Color list palette */}
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-2 uppercase tracking-wider">Select Color</span>
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={`h-7 w-7 rounded-full flex items-center justify-center transition border-2 ${
                        color === c.value ? 'border-slate-800 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    >
                      {color === c.value && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stroke width selector */}
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">Pen Weight ({lineWidth}px)</span>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="2"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Fine</span>
                  <span>Medium</span>
                  <span>Thick</span>
                </div>
              </div>
            </div>

            {/* Instruction on canvas annotation */}
            <div className="bg-blue-50/70 p-3 rounded-lg text-[11px] text-slate-600 leading-normal border border-blue-100">
              <span className="text-blue-600 font-semibold">Tip:</span> Simply drag or slide on the photo in real-time. Circles and Arrows begin where you touch and stretch to highlight structural parts.
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1.5"
          >
            <X className="w-4 h-4" /> Cancel Markup
          </button>
          <button
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas) {
                // Return compiled base64 image data
                onSave(canvas.toDataURL('image/jpeg', 0.9));
              }
            }}
            disabled={!canvasInited}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-60 text-white rounded-lg font-semibold transition flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Check className="w-4 h-4" /> Save Annotated Image
          </button>
        </div>
      </div>
    </div>
  );
}
