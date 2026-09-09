import React, { useRef, useState, useEffect } from 'react';
import { X, MessageSquare, Download, ChevronDown, FileText, Image as ImageIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function TrackingDetailsModal({
  activeDetailsDoc,
  setShowDetailsModal,
  activeRouteStops,
  getRenderStops,
  onOpenChatWithDoc
}) {
  const qrContainerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getQrBase64 = () => {
    if (!qrContainerRef.current) return null;
    const svgElement = qrContainerRef.current.querySelector('svg');
    if (!svgElement) return null;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 512;
    canvas.width = size;
    canvas.height = size;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    });
  };

  const handleDownloadImage = async () => {
    setShowExportMenu(false);
    const pngUrl = await getQrBase64();
    if (!pngUrl) return;

    const link = document.createElement('a');
    link.download = `QR-${activeDetailsDoc.qr_code || 'Document'}.png`;
    link.href = pngUrl;
    link.click();
  };

  const handlePrintPdf = async () => {
    setShowExportMenu(false);
    const qrDataUrl = await getQrBase64();
    if (!qrDataUrl) return;

    const formattedDate = activeDetailsDoc.created_at
      ? new Date(activeDetailsDoc.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        }) + ', ' + new Date(activeDetailsDoc.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'N/A';

    const requestorName = activeDetailsDoc.full_name || activeDetailsDoc.creator_name || activeDetailsDoc.originator_name || 'Originator';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printableHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Routing Slip - ${activeDetailsDoc.qr_code || 'Document'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1a1a1a;
              margin: 0;
              padding: 24px;
            }
            .slip-card {
              max-width: 480px;
              margin: 0 auto;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
            }
            .header-title {
              font-size: 16px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #881337;
              margin: 0;
            }
            .sub-title {
              font-size: 11px;
              color: #6b7280;
              margin-top: 4px;
              margin-bottom: 20px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              font-weight: bold;
            }
            .qr-wrapper {
              display: inline-block;
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              background: #fafafa;
              margin-bottom: 12px;
            }
            .qr-wrapper img {
              width: 140px;
              height: 140px;
              display: block;
            }
            .ref-code {
              font-family: monospace;
              font-size: 14px;
              font-weight: 800;
              color: #111827;
              letter-spacing: 0.05em;
              margin: 6px 0 18px 0;
            }
            .details-table {
              width: 100%;
              text-align: left;
              border-top: 1px dashed #d1d5db;
              padding-top: 14px;
              font-size: 12px;
            }
            .details-table td {
              padding: 4px 0;
            }
            .label {
              color: #6b7280;
              font-weight: 600;
              width: 40%;
            }
            .value {
              color: #111827;
              font-weight: 700;
            }
            .footer-note {
              margin-top: 20px;
              font-size: 10px;
              color: #9ca3af;
              border-top: 1px solid #f3f4f6;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <h1 class="header-title">BSU - Trace Verification Slip</h1>
            <div class="sub-title">Document Routing & Tracking Identifier</div>
            
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" alt="Tracking QR" />
            </div>
            <div class="ref-code">${activeDetailsDoc.qr_code}</div>

            <table class="details-table">
              <tr>
                <td class="label">Document Title:</td>
                <td class="value">${activeDetailsDoc.title || 'Untitled'}</td>
              </tr>
              <tr>
                <td class="label">Form / Workflow:</td>
                <td class="value">${activeDetailsDoc.process_name || 'Standard'}</td>
              </tr>
              <tr>
                <td class="label">Requestor Name:</td>
                <td class="value">${requestorName}</td>
              </tr>
              <tr>
                <td class="label">Date Created:</td>
                <td class="value">${formattedDate}</td>
              </tr>
            </table>

            <div class="footer-note">
              Scan this QR tag at each designated station terminal to sign and update routing history.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();
  };

  const handleChatClick = () => {
    setShowDetailsModal(false);
    if (onOpenChatWithDoc) {
      onOpenChatWithDoc(activeDetailsDoc);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-[#FDFBF9]">
          <h3 className="font-bold text-neutral-950 text-base">Document Tracking Details</h3>
          <button onClick={() => setShowDetailsModal(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {activeDetailsDoc.status?.toLowerCase() === 'action required' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
              <p className="font-black uppercase flex items-center gap-1.5">
                ⚠️ Revision Notes Added by Signee:
              </p>
              <p className="mt-2 font-medium font-mono text-red-700 bg-white p-2.5 border border-red-200 rounded-lg shadow-2xs">
                {activeDetailsDoc.last_action 
                  ? activeDetailsDoc.last_action.replace('Sent Back for Revision:', '').trim()
                  : 'Corrections required before workflow clearance can proceed further.'}
              </p>
            </div>
          )}

          <div className="flex justify-between items-start gap-4">
            <div className="space-y-4 flex-1">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Document Title</span>
                <h4 className="text-lg font-black text-neutral-900 leading-tight mt-0.5">{activeDetailsDoc.title}</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Reference ID</span>
                  <p className="text-xs font-black font-mono text-red-800 tracking-wider mt-0.5">{activeDetailsDoc.qr_code}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Date Created</span>
                  <p className="text-xs font-bold text-neutral-700 mt-0.5">
                    {activeDetailsDoc.created_at ? new Date(activeDetailsDoc.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ', ' + new Date(activeDetailsDoc.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Form Type</span>
                  <p className="text-xs font-black text-neutral-800 uppercase tracking-tight mt-0.5">{activeDetailsDoc.process_name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Estimated Completion</span>
                  <p className="text-xs font-bold text-neutral-600 mt-0.5">
                    {activeDetailsDoc.edc ? new Date(activeDetailsDoc.edc).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : 'Calculating...'}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Current Status</span>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full font-black text-[10px] uppercase border shadow-2xs inline-block ${
                    activeDetailsDoc.status?.toLowerCase() === 'completed' ? 'bg-green-50 text-green-800 border-green-200' :
                    activeDetailsDoc.status?.toLowerCase() === 'action required' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-100'
                  }`}>
                    {activeDetailsDoc.status || 'Active Path'}
                  </span>
                </div>
              </div>
            </div>

            <div ref={qrContainerRef} className="bg-neutral-50 p-3 border border-neutral-200 rounded-xl flex flex-col items-center flex-shrink-0">
              <QRCodeSVG 
                value={activeDetailsDoc.qr_code} 
                size={80} 
                level={"M"}
                fgColor={"#171717"}
              />
              <span className="text-[8px] font-black text-neutral-400 mt-1.5 uppercase tracking-widest">Tracking QR</span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 text-left">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-4">Submission Route Status</span>
            <div className="relative pl-6 space-y-5">
              <div className="absolute left-[6px] top-1.5 bottom-1.5 w-0.5 bg-neutral-200"></div>
              
              {(() => {
                const detailsStopsNodes = getRenderStops(activeDetailsDoc, activeRouteStops);
                return detailsStopsNodes.map((node, i) => {
                  const isCompletedAll = activeDetailsDoc?.status?.toLowerCase() === 'completed';
                  const isHalted = activeDetailsDoc?.status?.toLowerCase() === 'action required';
                  
                  let isCurrent = false;
                  let isPast = false;

                  if (isCompletedAll) {
                    isPast = true;
                  } else if (node.logRef) {
                    if (!node.logRef.time_out) isCurrent = true;
                    else isPast = true;
                  }

                  const stopLog = node.logRef;
                  const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;
                  const timeIn = formatTime(stopLog?.time_in);
                  const timeOut = formatTime(stopLog?.time_out);

                  return (
                    <div key={i} className="relative flex flex-col">
                      <div className={`absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full border-2 bg-white flex items-center justify-center transition-all z-10 ${
                        isCurrent && node.isAdhocNode ? 'border-purple-600 bg-purple-600 ring-4 ring-purple-100' :
                        isCurrent && isHalted ? 'border-red-600 bg-red-600 shadow-sm' :
                        isCurrent ? 'border-red-700 bg-red-700 ring-4 ring-red-100' :
                        node.isAdhocNode ? 'border-purple-300 bg-purple-50' :
                        isPast ? 'border-red-800 bg-red-800' : 'border-neutral-300'
                      }`}>
                        {isCurrent && isHalted ? '✕' : isCurrent && node.isAdhocNode ? '⚡' : isPast && <div className="w-1 h-1 bg-white rounded-full"></div>}
                      </div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className={`text-xs font-bold leading-none ${
                            isCurrent && node.isAdhocNode ? 'text-purple-700 font-black' : isCurrent ? 'text-red-800 font-black' : isPast ? 'text-neutral-800' : 'text-neutral-400'
                          }`}>
                            {node.name}
                          </p>
                          <span className="text-[10px] text-gray-400 mt-1.5 font-medium block">
                            {isCurrent && node.isAdhocNode ? '📍 Currently in verification (Ad-Hoc Detour)' :
                            isCurrent && isHalted ? '🛑 Route Halted Here for Revision Notes' : 
                            isCurrent ? 'Under Active Review' : 
                            isPast ? 'Completed signature verification step' : 
                            'Awaiting structural arrival queue'}
                          </span>
                        </div>
                        {(timeIn || timeOut || isCurrent) && (
                          <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                            {timeIn ? (
                              <span className="text-[9px] font-mono font-bold text-neutral-600 bg-neutral-100/80 border border-neutral-200 px-1.5 py-0.5 rounded shadow-xs uppercase">
                                IN: {timeIn}
                              </span>
                            ) : (
                              isCurrent && <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-xs uppercase tracking-tight">Awaiting Scan In</span>
                            )}
                            {timeOut && (
                              <span className="text-[9px] font-mono font-bold text-neutral-600 bg-neutral-100/80 border border-neutral-200 px-1.5 py-0.5 rounded shadow-xs uppercase">
                                OUT: {timeOut}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={handleChatClick}
              className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-xs text-red-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare size={18} /> Chat regarding this file
            </button>

            {/* Export Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button 
                type="button" 
                onClick={() => setShowExportMenu(prev => !prev)}
                className="px-4 py-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-xl font-bold text-xs text-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download size={14} /> Download QR <ChevronDown size={14} className={showExportMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>

              {showExportMenu && (
                <div className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1.5 text-xs text-neutral-700 font-semibold animate-in fade-in slide-in-from-bottom-2">
                  <button
                    onClick={handleDownloadImage}
                    className="w-full px-3.5 py-2 text-left hover:bg-neutral-100 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ImageIcon size={14} className="text-neutral-500" /> Image (PNG)
                  </button>
                  <button
                    onClick={handlePrintPdf}
                    className="w-full px-3.5 py-2 text-left hover:bg-neutral-100 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileText size={14} className="text-[#D32F2F]" /> Printable PDF Slip
                  </button>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setShowDetailsModal(false)} 
            className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-500 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}