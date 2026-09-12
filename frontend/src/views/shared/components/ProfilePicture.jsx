import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { fetchWithAuth } from '../../../api';

const colors = ['#9f1239', '#6d28d9', '#1d4ed8', '#047857', '#b45309', '#0e7490'];

async function prepareImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 24000000) throw new Error('Choose an image up to 24 megapixels.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 256, 256);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size > 256 * 1024) throw new Error('Unable to resize this image. Please choose another.');
    return blob;
  } finally { URL.revokeObjectURL(source); }
}

export default function ProfilePicture({ name }) {
  const [picture, setPicture] = useState(null);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [failedImage, setFailedImage] = useState(null);
  const input = useRef(null);
  useEffect(() => {
    let cancelled = false;
    fetchWithAuth('/api/profile-picture').then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!cancelled) { setPicture(data.profilePic); setLoadError(false); setMessage(''); }
    }).catch(() => { if (!cancelled) { setLoadError(true); setMessage('Unable to load your picture.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision]);
  useEffect(() => {
    if (!pending) return;
    return () => URL.revokeObjectURL(pending.url);
  }, [pending]);
  const initial = Array.from((name || '').trim())[0]?.toLocaleUpperCase() || '?';
  const color = colors[Array.from((name || '').trim().toLocaleLowerCase()).reduce((sum, char) => sum + char.codePointAt(0), 0) % colors.length];
  const source = pending ? pending.url : picture;
  async function choose(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setBusy(true); setMessage('');
    try {
      const blob = await prepareImage(file);
      setPending({ blob, url: URL.createObjectURL(blob) });
    }
    catch (err) { setMessage(err.message || 'Unable to read that image.'); }
    finally { setBusy(false); }
  }
  async function save(remove = false) {
    setBusy(true); setMessage('');
    try {
      const res = await fetchWithAuth('/api/profile-picture', remove ? { method: 'DELETE' } : {
        method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: pending.blob
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPicture(data.profilePic); setPending(null); setFailedImage(null); setMessage(data.message);
    } catch (err) { setMessage(err.message || 'Unable to save your picture. Please retry.'); }
    finally { setBusy(false); }
  }
  return <div className="shrink-0 max-w-56 space-y-2">
    <div className="relative w-24 h-24">
      {source && source !== failedImage ? <img src={source} onError={() => setFailedImage(source)} alt={`${name || 'User'}'s profile`} className="w-24 h-24 rounded-2xl object-cover border-2 border-neutral-100 shadow-sm" />
        : <div role="img" aria-label={`${name || 'User'}'s initial: ${initial}`} style={{ backgroundColor: color }} className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold border-2 border-neutral-100 shadow-sm">{initial}</div>}
      <button type="button" disabled={busy || loading || loadError} aria-label="Choose profile picture" onClick={() => input.current?.click()} className="absolute -bottom-1 -right-1 bg-red-800 p-1.5 rounded-lg text-white shadow-md disabled:opacity-50"><Camera size={14} /></button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} className="hidden" aria-label="Profile picture file" />
    </div>
    <p className="text-[10px] text-neutral-500">JPG, PNG or WebP · Max 5 MB</p>
    {pending ? <div className="flex gap-3 text-xs">
      <button type="button" disabled={busy} onClick={() => save()} className="font-bold text-red-800 disabled:opacity-50">Save picture</button>
      <button type="button" disabled={busy} onClick={() => { setPending(null); setMessage(''); }} className="text-neutral-600">Cancel</button>
    </div> : picture && !loadError && <button type="button" disabled={busy || loading} onClick={() => save(true)} className="text-xs text-neutral-600 underline">Remove picture</button>}
    {loadError && <button type="button" onClick={() => { setLoading(true); setRevision(value => value + 1); }} className="text-xs underline">Retry</button>}
    <p role="status" className="text-xs text-neutral-600">{busy ? 'Processing picture...' : loading ? 'Loading picture...' : message}</p>
  </div>;
}
