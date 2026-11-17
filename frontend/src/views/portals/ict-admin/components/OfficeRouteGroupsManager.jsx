import {useState} from 'react';
import {Pencil, Plus, Trash2, X} from 'lucide-react';

function GroupEditor({group, offices, onClose, onSave}) {
  const [name,setName]=useState(group?.group_name || '');
  const [description,setDescription]=useState(group?.description || '');
  const [selected,setSelected]=useState(() => [...new Set([
    ...(group?.offices || []).map(office => Number(office.id)),
    ...offices.filter(office => group && office.category?.trim().toLowerCase() === group.group_name.trim().toLowerCase()).map(office => Number(office.id))
  ])]);
  const [search,setSearch]=useState('');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const boundIds=new Set(offices.filter(office => group && office.category?.trim().toLowerCase() === group.group_name.trim().toLowerCase()).map(office => Number(office.id)));
  const visibleOffices=offices.filter(office => Number(office.id) !== 999 && office.name.toLowerCase().includes(search.toLowerCase()));

  const submit=async event=>{
    event.preventDefault();
    if (!name.trim() || !selected.length) {setError('Enter a name and select at least one office.');return;}
    setSaving(true);setError('');
    try {await onSave({id:group?.group_id,name:name.trim(),description:description.trim(),officeIds:selected});onClose();}
    catch(err){setError(err.message || 'Unable to save the office category.');}
    finally{setSaving(false);}
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="office-group-title" className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#180e10] shadow-2xl">
      <header className="flex items-center justify-between bg-[#8c1023] px-6 py-5 text-white">
        <h2 id="office-group-title" className="text-xl font-black">{group ? 'Edit office category' : 'Add office category'}</h2>
        <button type="button" onClick={onClose} aria-label="Close office category editor" className="rounded p-1 hover:bg-white/10 cursor-pointer"><X size={20}/></button>
      </header>
      <form onSubmit={submit} className="space-y-4 overflow-y-auto p-6">
        <label className="block text-sm font-bold text-neutral-800 dark:text-gray-200" htmlFor="office-group-name">Category name
          <input id="office-group-name" required maxLength={150} value={name} onChange={event=>setName(event.target.value)} placeholder="e.g. Colleges or Approval Offices" className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] px-3 py-2.5 text-sm font-normal text-neutral-900 dark:text-white"/>
        </label>
        <label className="block text-sm font-bold text-neutral-800 dark:text-gray-200" htmlFor="office-group-description">Description <span className="font-normal text-neutral-500">(optional)</span>
          <textarea id="office-group-description" rows={2} maxLength={2000} value={description} onChange={event=>setDescription(event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] px-3 py-2.5 text-sm font-normal text-neutral-900 dark:text-white"/>
        </label>
        <div>
          <label htmlFor="office-group-search" className="block text-sm font-bold text-neutral-800 dark:text-gray-200">Offices ({selected.length} selected)</label>
          <p className="mt-1 text-xs text-neutral-500 dark:text-gray-400">An office can belong to several routing categories. Its organizational category stays separate.</p>
          <input id="office-group-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Find an office…" className="mt-3 w-full rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] px-3 py-2 text-sm text-neutral-900 dark:text-white"/>
          <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-neutral-200 dark:border-gray-700 p-2 sm:grid-cols-2">
            {visibleOffices.map(office=>{
              const id=Number(office.id);
              return <label key={id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-800 dark:text-gray-200 hover:bg-neutral-50 dark:hover:bg-gray-800">
                <input type="checkbox" checked={selected.includes(id)} disabled={boundIds.has(id)} onChange={event=>setSelected(ids=>event.target.checked?[...ids,id]:ids.filter(item=>item!==id))} className="mt-0.5"/>
                <span>{office.name}{boundIds.has(id)&&<span className="block text-[11px] text-neutral-500">Assigned organizational category</span>}</span>
              </label>;
            })}
            {!visibleOffices.length&&<p className="px-2 py-3 text-sm text-neutral-500">No offices found.</p>}
          </div>
        </div>
        {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <footer className="flex justify-end gap-3 border-t border-neutral-100 dark:border-gray-800 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 dark:border-gray-700 px-4 py-2 text-sm font-bold text-neutral-700 dark:text-gray-300 cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-[#8c1023] px-4 py-2 text-sm font-bold text-white disabled:opacity-50 cursor-pointer">{saving?'Saving…':'Save category'}</button>
        </footer>
      </form>
    </section>
  </div>;
}

export default function OfficeRouteGroupsManager({groups,offices,onSave,onDelete}) {
  const [editing,setEditing]=useState(undefined);
  return <section className="rounded-2xl border border-neutral-200 dark:border-[#42292f] bg-white dark:bg-[#180e10] shadow-sm">
    <div className="flex flex-col justify-between gap-3 border-b border-neutral-100 dark:border-[#42292f] p-5 sm:flex-row sm:items-center">
      <div><h3 className="text-lg font-black text-neutral-900 dark:text-white">Office categories for workflows</h3><p className="mt-1 text-sm text-neutral-500 dark:text-gray-400">Choose which offices a submitter can select at each flexible workflow step.</p></div>
      <button type="button" onClick={()=>setEditing(null)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8c1023] px-4 py-2.5 text-sm font-bold text-white cursor-pointer"><Plus size={17}/> Add category</button>
    </div>
    <div className="divide-y divide-neutral-100 dark:divide-gray-800">
      {groups.map(group=>{
        const system=group.group_name.trim().toLowerCase()==='all offices';
        return <div key={group.group_id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-bold text-neutral-900 dark:text-white">{group.group_name}{system&&<span className="ml-2 rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">Automatic</span>}{!group.is_active&&<span className="ml-2 text-xs text-amber-700">Inactive</span>}</p>
            {group.description&&<p className="mt-0.5 text-xs text-neutral-500 dark:text-gray-400">{group.description}</p>}
            <p className="mt-1 text-xs text-neutral-500 dark:text-gray-400">{group.offices.length} {group.offices.length===1?'office':'offices'} · {group.workflow_count} {group.workflow_count===1?'workflow':'workflows'}</p>
          </div>
          {!system&&<div className="flex gap-4"><button type="button" onClick={()=>setEditing(group)} className="inline-flex items-center gap-1 text-xs font-bold text-[#8c1023] dark:text-red-400 underline cursor-pointer"><Pencil size={13}/> Edit</button><button type="button" onClick={()=>onDelete(group)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 dark:text-rose-400 underline cursor-pointer"><Trash2 size={13}/> Delete</button></div>}
        </div>;
      })}
      {!groups.length&&<p className="px-5 py-8 text-sm text-neutral-500">No office categories yet.</p>}
    </div>
    {editing!==undefined&&<GroupEditor key={editing?.group_id || 'new'} group={editing} offices={offices} onClose={()=>setEditing(undefined)} onSave={onSave}/>}
  </section>;
}
