import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { invoke } from '@tauri-apps/api/core';
import { exists } from '@tauri-apps/plugin-fs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface PdfPreviewProps {
  projectPath: string;
  compileTick: number;
}

export function PdfPreview({ projectPath, compileTick }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<number[]>([]);
  const scrollPosRef = useRef(0);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom(z => {
          const newZoom = z - e.deltaY * 0.01;
          return Math.min(Math.max(0.2, newZoom), 5.0);
        });
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    async function fetchAndRenderPdf() {
      const pdfPath = `${projectPath}/main.pdf`;
      const pdfExists = await exists(pdfPath);
      
      if (!pdfExists) {
        setLoadError(compileTick > 0 ? "Compilation failed or PDF not generated." : "No PDF generated yet. Press Cmd+Enter to compile.");
        return;
      }
      
      try {
        setLoadError(null);
        const bytes: number[] = await invoke('read_file_bytes', { path: pdfPath });
        const typedArray = new Uint8Array(bytes);
        
        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
        const pdf = await loadingTask.promise;
        setPdfProxy(pdf);
        const newPages = Array.from({length: pdf.numPages}, (_, i) => i + 1);
        setPages(newPages);
      } catch (e) {
        console.error("Failed to load PDF:", e);
        setLoadError("Failed to parse PDF binary.");
      }
    }
    fetchAndRenderPdf();
  }, [projectPath, compileTick]);

  const handleScroll = () => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        scrollPosRef.current = containerRef.current.scrollTop;
      }
    }, 100);
  };

  useEffect(() => {
    if (pages.length > 0 && containerRef.current && scrollPosRef.current > 0) {
      // Delay slightly to ensure canvases are rendered
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = scrollPosRef.current;
        }
      }, 100);
    }
  }, [pages]);

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      style={{ 
        height: '100%', 
        width: '100%', 
        backgroundColor: '#1C1C1E', 
        overflowY: 'auto',
        overflowX: 'auto',
        position: 'relative',
        textAlign: 'center',
        padding: '32px 24px',
        boxSizing: 'border-box'
      }}
    >
      {loadError ? (
        <div style={{ margin: 'auto', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px' }}>
          <div style={{ opacity: 0.5, fontSize: '48px', marginBottom: '16px' }}>📄</div>
          {loadError}
        </div>
      ) : (
        pages.map(page => (
          <div key={`${compileTick}-${page}`} style={{ marginBottom: '24px' }}>
            <PdfPage pageNumber={page} pdf={pdfProxy} zoom={zoom} />
          </div>
        ))
      )}
    </div>
  );
}

// Sub-component to render individual pages lazily/independently
function PdfPage({ pageNumber, pdf, zoom }: { pageNumber: number, pdf: pdfjsLib.PDFDocumentProxy | null, zoom: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseSize, setBaseSize] = useState<{w: number, h: number} | null>(null);
  
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    
    let renderTask: pdfjsLib.RenderTask | null = null;
    let isCancelled = false;

    async function renderPage() {
      try {
        const page = await pdf!.getPage(pageNumber);
        if (isCancelled) return;
        
        // Retina scaling approach for crisp PDF rendering
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');
        
        if (!context) return;
        
        setBaseSize({ w: viewport.width, h: viewport.height });
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        // The dynamic style is applied in the React inline style
        
        context.scale(pixelRatio, pixelRatio);
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };
        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (e) {
        if ((e as any).name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNumber} render error`, e);
        }
      }
    }
    
    renderPage();
    
    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)', 
        borderRadius: '2px', // subtle macOS Document look
        backgroundColor: 'white',
        willChange: 'transform',
        width: baseSize ? `${baseSize.w * zoom}px` : undefined,
        height: baseSize ? `${baseSize.h * zoom}px` : undefined,
      }} 
    />
  );
}
