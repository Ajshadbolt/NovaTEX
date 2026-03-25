import { Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { invoke } from '@tauri-apps/api/core';
import { exists } from '@tauri-apps/plugin-fs';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import './PdfPreview.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface PageMeta {
  pageNumber: number;
  width: number;
  height: number;
}

export interface PdfPreviewProps {
  projectPath: string;
  pdfFile: string;
  compileTick: number;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
}

export function PdfPreview({ projectPath, pdfFile, compileTick, zoom, setZoom }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageMeta[]>([]);
  const scrollPosRef = useRef(0);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        setZoom((value) => {
          const nextZoom = value - event.deltaY * 0.01;
          return Math.min(Math.max(0.4, nextZoom), 3);
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setZoom]);

  useEffect(() => {
    let isDisposed = false;
    let nextPdf: pdfjsLib.PDFDocumentProxy | null = null;

    async function fetchAndRenderPdf() {
      const pdfPath = `${projectPath}/${pdfFile}`;
      const pdfExists = await exists(pdfPath);
      
      if (!pdfExists) {
        setLoadError(compileTick > 0 ? "Compilation failed or PDF not generated." : "No PDF generated yet. Press Cmd/Ctrl+Enter to compile.");
        setPages([]);
        setPdfProxy(null);
        return;
      }
      
      try {
        setLoadError(null);
        const bytes: number[] = await invoke('read_file_bytes', { path: pdfPath });
        const typedArray = new Uint8Array(bytes);
        
        const loadingTask = pdfjsLib.getDocument({ data: typedArray });
        const pdf = await loadingTask.promise;
        nextPdf = pdf;

        const newPages = await Promise.all(
          Array.from({ length: pdf.numPages }, async (_, index) => {
            const page = await pdf.getPage(index + 1);
            const viewport = page.getViewport({ scale: 1 });
            page.cleanup();
            return {
              pageNumber: index + 1,
              width: viewport.width,
              height: viewport.height,
            };
          }),
        );

        if (isDisposed) {
          await pdf.destroy();
          return;
        }

        setPdfProxy(pdf);
        setPages(newPages);
      } catch (e) {
        console.error("Failed to load PDF:", e);
        setLoadError("Failed to parse PDF binary.");
      }
    }

    void fetchAndRenderPdf();

    return () => {
      isDisposed = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      void nextPdf?.destroy();
    };
  }, [compileTick, pdfFile, projectPath]);

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
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = scrollPosRef.current;
        }
      }, 80);
    }
  }, [pages]);

  return (
    <div className="pdf-preview-shell">
      <div className="pdf-preview-header">
        <div className="pdf-preview-title-group">
          <span className="pdf-preview-kicker">Preview</span>
          <span className="pdf-preview-file">{pdfFile}</span>
        </div>
        <div className="pdf-preview-controls">
          <span className="pdf-preview-zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="pdf-preview-control" onClick={() => setZoom((value) => Math.max(0.4, value - 0.1))} aria-label="Zoom out">
            <Minus size={14} />
          </button>
          <button className="pdf-preview-control" onClick={() => setZoom(1)} aria-label="Reset zoom">
            <RotateCcw size={14} />
          </button>
          <button className="pdf-preview-control" onClick={() => setZoom((value) => Math.min(3, value + 0.1))} aria-label="Zoom in">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="pdf-preview-stage"
      >
        {loadError ? (
          <div className="pdf-preview-empty">
            <div className="pdf-preview-empty-icon">PDF</div>
            {loadError}
          </div>
        ) : (
          pages.map((page) => (
            <div key={`${compileTick}-${page.pageNumber}`} className="pdf-preview-page-shell">
              <PdfPage page={page} pdf={pdfProxy} zoom={zoom} rootRef={containerRef} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PdfPage({
  page,
  pdf,
  zoom,
  rootRef,
}: {
  page: PageMeta;
  pdf: pdfjsLib.PDFDocumentProxy | null;
  zoom: number;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      {
        root: rootRef.current,
        rootMargin: '300px 0px',
      },
    );

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [rootRef]);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !isVisible) return;
    const pdfDocument = pdf;

    let renderTask: pdfjsLib.RenderTask | null = null;
    let isCancelled = false;

    async function renderPage() {
      try {
        const pdfPage = await pdfDocument.getPage(page.pageNumber);
        if (isCancelled) return;

        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = pdfPage.getViewport({ scale: Math.max(0.7, zoom * 1.2) });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };
        renderTask = pdfPage.render(renderContext);
        await renderTask.promise;
        pdfPage.cleanup();
      } catch (e) {
        if ((e as any).name !== 'RenderingCancelledException') {
          console.error(`Page ${page.pageNumber} render error`, e);
        }
      }
    }

    void renderPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [isVisible, page.pageNumber, pdf, zoom]);

  return (
    <div
      ref={wrapperRef}
      className="pdf-page-wrapper"
      style={{
        minHeight: `${page.height * zoom}px`,
      }}
    >
      <canvas
        ref={canvasRef}
        className="pdf-page-canvas"
      />
    </div>
  );
}
