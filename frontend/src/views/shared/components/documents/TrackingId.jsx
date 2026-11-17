import {useState} from 'react';
import {Check, Copy} from 'lucide-react';

export default function TrackingId({value}) {
  const [copied,setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  };
  return <span className="group inline-flex max-w-full items-center gap-2 text-xs font-mono text-neutral-600 dark:text-gray-300">
    <span className="min-w-0 break-all">
      <span className="group-hover:hidden group-focus-within:hidden">Tracking ID hidden · hover to view</span>
      <span className="hidden group-hover:inline group-focus-within:inline">{value}</span>
    </span>
    <button type="button" onClick={copy} aria-label="Copy tracking ID" title="Copy tracking ID"
      className="shrink-0 inline-flex items-center gap-1 rounded border border-neutral-200 dark:border-gray-700 px-2 py-1 hover:bg-neutral-100 dark:hover:bg-gray-800 cursor-pointer">
      {copied ? <Check size={13}/> : <Copy size={13}/>} {copied ? 'Copied' : 'Copy'}
    </button>
  </span>;
}
