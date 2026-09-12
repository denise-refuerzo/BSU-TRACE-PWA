import { useId, useRef, useState } from 'react';

export default function ProcessCombobox({ processTypes, value, onChange }) {
  const id = useId();
  const input = useRef(null);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const active = processTypes.filter(p => p.is_active === true);
  const selected = active.find(p => String(p.p_id) === String(value));
  const categories = [...new Map(active.map(p => [String(p.category_id), p.category_name])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));
  const matches = active.filter(p => (!category || String(p.category_id) === category)
    && p.process_name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => a.category_name.localeCompare(b.category_name) || a.process_name.localeCompare(b.process_name));
  function choose(p) { onChange(String(p.p_id)); setQuery(''); setOpen(false); setCursor(-1); input.current?.focus(); }
  return <div onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setOpen(false); setCursor(-1); } }}>
    <label htmlFor={`${id}-category`} className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category (optional)</label>
    <select id={`${id}-category`} value={category} onChange={e => {
      setCategory(e.target.value); setQuery(''); setCursor(-1); setOpen(false);
      if (selected && e.target.value && String(selected.category_id) !== e.target.value) onChange('');
    }} className="w-full border bg-white rounded-lg px-3 py-2 text-xs border-neutral-300 mb-3">
      <option value="">All categories</option>
      {categories.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
    </select>
    <label htmlFor={id} className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Process Type</label>
    <input ref={input} id={id} role="combobox" aria-autocomplete="list" aria-expanded={open}
      aria-controls={`${id}-list`} aria-activedescendant={open && matches[cursor] ? `${id}-option-${matches[cursor].p_id}` : undefined}
      aria-describedby={`${id}-help`} autoComplete="off" required value={selected ? selected.process_name : query}
      placeholder="Search document pipelines..." className="w-full border rounded-lg px-3 py-2 text-xs border-neutral-300 focus:ring-1 focus:ring-red-700 outline-none"
      onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
      onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true); setCursor(-1); }}
      onKeyDown={e => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); setOpen(true);
          setCursor(i => !matches.length ? -1 : e.key === 'ArrowDown' ? Math.min(i + 1, matches.length - 1) : i <= 0 ? matches.length - 1 : i - 1);
        } else if (e.key === 'Enter' && open) { e.preventDefault(); if (matches[cursor]) choose(matches[cursor]); }
        else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); setCursor(-1); }
      }} />
    {open && <ul id={`${id}-list`} role="listbox" aria-label="Matching pipelines" className="max-h-48 overflow-y-auto border border-neutral-200 rounded-lg mt-1 bg-white">
      {matches.map((p, i) => <li key={p.p_id} role="presentation">
        {(i === 0 || matches[i - 1].category_id !== p.category_id) && <div role="presentation" className="px-3 py-1.5 bg-neutral-100 text-[10px] font-bold text-red-800">{p.category_name}</div>}
        <div id={`${id}-option-${p.p_id}`} role="option" aria-label={`${p.process_name}, ${p.category_name}`} aria-selected={String(p.p_id) === String(value)}
          ref={node => { if (node && i === cursor) node.scrollIntoView({ block: 'nearest' }); }}
          onMouseDown={e => e.preventDefault()} onClick={() => choose(p)}
          className={`px-3 py-2 text-xs cursor-pointer hover:bg-red-50 ${i === cursor ? 'bg-red-100' : ''}`}>{p.process_name}</div>
      </li>)}
      {!matches.length && <li role="presentation" className="p-3 text-xs text-gray-500">No matching pipelines. Try another keyword or category.</li>}
    </ul>}
    <p id={`${id}-help`} className="text-[10px] text-gray-500 mt-1">{selected ? `Selected: ${selected.category_name}` : 'Choose a suggestion to load its route. Use ↑ / ↓ and Enter to select.'}</p>
  </div>;
}
