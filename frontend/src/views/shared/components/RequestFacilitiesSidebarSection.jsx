import { useState } from 'react';
import { ChevronDown, ClipboardList, MonitorPlay, School, Truck } from 'lucide-react';

const sections = [
  { id: 'resource-gym', label: 'Gymnasium', icon: School },
  { id: 'resource-room', label: 'Rooms', icon: MonitorPlay },
  { id: 'resource-vehicle', label: 'Vehicles', icon: Truck },
  { id: 'resource-requests', label: 'Submitted Requests', icon: ClipboardList }
];

export default function RequestFacilitiesSidebarSection({ activeTab, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const active = activeTab.startsWith('resource-');

  const toggle = () => {
    setExpanded(current => active ? !current : true);
    if (!active) onSelect('resource-gym');
  };

  return (
    <div>
      <button onClick={toggle} aria-expanded={expanded} className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left font-bold transition-colors cursor-pointer ${active ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
        <span className="flex items-center gap-3"><School size={18} /> Request Facilities</span>
        <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="ml-5 mt-1 space-y-1 border-l border-neutral-700 pl-3">
          {sections.map(item => (
            <button key={item.id} onClick={() => onSelect(item.id)} className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors ${activeTab === item.id ? 'bg-red-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
              <item.icon size={14} /> {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
