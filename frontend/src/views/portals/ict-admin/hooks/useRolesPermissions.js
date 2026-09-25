import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { API_BASE_URL, fetchWithAuth } from "../../../../api";
import { createRealtimeClient } from '../../../../utils/realtimeClient';

export function useRolesPermissions(enabled = true) {
  // --- CATALOG INDICES STATES ---
  const [offices, setOffices] = useState([]);
  const [routeGroups, setRouteGroups] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [infraSummary, setInfraSummary] = useState({ departments: [], roleStatistics: [], officeCapacity: [] });

  // --- INTERACTIVE VISUALIZER FORM STATES ---
  const [newProcessName, setNewProcessName] = useState('');
  const [selectedStops, setSelectedStops] = useState([null, null]); // Instantiated with minimum 2 rows configuration blocks

  // --- TRACKING METADATA CONTROLLER ---
  const [formMeta, setFormMeta] = useState({ currentProcessId: null, currentRouteId: null, is_active: true });
 
  // --- CAMPUS STRUCTURES FORM STATES ---
  const [newDeptName, setNewDeptName] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeCategory, setNewOfficeCategory] = useState('');
  const [officeCategoryEnabled, setOfficeCategoryEnabled] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [workflowEditorOpen, setWorkflowEditorOpen] = useState(false);

  const fetchBaselineCatalogs = useCallback(async () => {
    try {
      setCatalogError('');
      const categoryRes = await fetchWithAuth('/api/document-categories');
      const categoryData = await categoryRes.json();
      if (!categoryRes.ok) throw new Error(categoryData.error || 'Unable to load categories.');
      setCategories(categoryData);
      const officeRes = await fetchWithAuth('/api/offices');
      const officeData = await officeRes.json();
      if (officeRes.ok) setOffices(officeData);
      const groupRes = await fetchWithAuth('/api/office-route-groups');
      const groupData = await groupRes.json();
      if (groupRes.ok) setRouteGroups(groupData);

      const processRes = await fetchWithAuth('/api/process-types');
      const processData = await processRes.json();
      if (processRes.ok) setProcessTypes(processData);

      const summaryRes = await fetchWithAuth('/api/admin/infrastructure-summary');
      const summaryData = await summaryRes.json();
      if (summaryRes.ok) setInfraSummary(summaryData);
    } catch (err) {
      setCatalogError(err.message || 'Unable to load workflow configuration.');
    }
  }, []);

  // --- DYNAMIC VISUALIZER STOP HANDLING ---
  const handleAddStopSlot = () => {
    if (selectedStops.length >= 7) {
      Swal.fire('Step limit reached', 'A document workflow can have up to seven office steps.', 'warning');
      return;
    }
    setSelectedStops([...selectedStops, null]);
  };

  const handleRemoveTrailingStopSlot = () => {
    if (selectedStops.length <= 2) {
      Swal.fire('At least two steps are required', 'A document workflow needs a starting and receiving office.', 'warning');
      return;
    }
    const filtered = [...selectedStops];
    filtered.pop();
    setSelectedStops(filtered);
  };

  const handleStopSelectorChange = (index, value) => {
    const updated = [...selectedStops];
    const current = updated[index];
    const parsedValue = value ? (current?.type === 'group' ? {type: 'group', groupId: parseInt(value, 10)} : parseInt(value, 10)) : null;
    updated[index] = parsedValue;

    // Automated Chain-Limiting Guard: If an admin clears a middle step out, clear all downstream choices
    if (parsedValue === null) {
      for (let i = index; i < updated.length; i++) {
        updated[i] = null;
      }
    }
    setSelectedStops(updated);
  };

  useEffect(() => {
    if (!enabled) return undefined;
    const refreshTimer = window.setTimeout(fetchBaselineCatalogs, 0);
    return () => window.clearTimeout(refreshTimer);
  }, [enabled, fetchBaselineCatalogs]);

  useEffect(() => {
    if (!enabled) return undefined;
    const socketUrl = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;
    const socket = createRealtimeClient(socketUrl, { secure: true, reconnection: true });
    const subscribe = () => socket.emit('join-ict-admin-room');
    socket.on('connect', subscribe);
    socket.on('admin-configuration-updated', fetchBaselineCatalogs);
    return () => socket.disconnect();
  }, [enabled, fetchBaselineCatalogs]);

  const handleStopKindChange = (index, kind) => {
    const updated = [...selectedStops];
    updated[index] = kind === 'group' ? {type: 'group', groupId: null} : null;
    for (let i = index + 1; i < updated.length; i += 1) updated[i] = null;
    setSelectedStops(updated);
  };

  // Resets the workflow form back to creation defaults
  const resetWorkflowForm = () => {
    setNewProcessName('');
    setCategoryId('');
    setSelectedStops([null, null]);
    setFormMeta({ currentProcessId: null, currentRouteId: null, is_active: true });
  };

  const openWorkflowEditor = (workflow = null) => {
    if (!workflow) {
      resetWorkflowForm();
      setWorkflowEditorOpen(true);
      return;
    }
    const stops = Array.from({ length: 7 }, (_, index) => {
      const step = index + 1;
      return workflow[`stop_${step}_kind`] === 'group'
        ? { type: 'group', groupId: workflow[`stop_${step}_group_id`] }
        : workflow[`stop_${step}`];
    }).filter(Boolean);
    setNewProcessName(workflow.process_name);
    setCategoryId(String(workflow.category_id));
    setSelectedStops(stops.length >= 2 ? stops : [null, null]);
    setFormMeta({ currentProcessId: workflow.p_id, currentRouteId: workflow.r_id, is_active: workflow.is_active ?? true });
    setWorkflowEditorOpen(true);
  };

  const closeWorkflowEditor = () => {
    setWorkflowEditorOpen(false);
    resetWorkflowForm();
  };

  // --- PROCESS TEMPLATE ROUTING TRANSACTION SUBMISSION ---
  const handleProcessFormSubmit = async (e) => {
    e.preventDefault();
    const processedStopsPayload = selectedStops.filter(s => s !== null && (Number.isInteger(s) || (s?.type === 'group' && Number.isInteger(s.groupId))));

    if (processedStopsPayload.length < 2) {
      Swal.fire('Complete the workflow', 'Choose at least two office locations.', 'error');
      return;
    }

    const isEditing = formMeta.currentProcessId !== null;
    const targetUrl = isEditing 
      ? `/api/process-types/${formMeta.currentProcessId}`
      : '/api/process-types';
    const targetMethod = isEditing ? 'PUT' : 'POST';

    Swal.fire({
      title: isEditing ? 'Save workflow changes?' : 'Create document workflow?',
      text: isEditing 
        ? `This will update the office sequence for "${newProcessName}".`
        : `This will make "${newProcessName}" available as a document workflow.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#800000',
      cancelButtonColor: '#4b5563',
      confirmButtonText: isEditing ? 'Save changes' : 'Create workflow'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetchWithAuth(targetUrl, {
            method: targetMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              processName: newProcessName,
              categoryId: Number(categoryId),
              stops: processedStopsPayload,
              routeId: formMeta.currentRouteId,
              isActive: formMeta.is_active
            })
          });
          const data = await response.json();

          if (!response.ok) throw new Error(data.error || 'Unable to save the workflow.');

          Swal.fire('Success!', data.message, 'success');
          closeWorkflowEditor();
          await fetchBaselineCatalogs();
        } catch (err) {
          Swal.fire('Operation Refused', err.message, 'error');
        }
      }
    });
  };

  const saveDepartment = async ({ id, name }) => {
    const response = await fetchWithAuth(id ? `/api/departments/${id}` : '/api/departments', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departmentName: name })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to save the department.');
    await fetchBaselineCatalogs();
    return data;
  };

  const saveOffice = async ({ id, name, category }) => {
    const response = await fetchWithAuth(id ? `/api/offices/${id}` : '/api/offices', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officeName: name, officeCategory: category || '' })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to save the office.');
    await fetchBaselineCatalogs();
    return data;
  };

  const saveCategory = async ({ id, name, description }) => {
    const response = await fetchWithAuth(`/api/document-categories${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: name, description })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to save the document type.');
    await fetchBaselineCatalogs();
    return data;
  };

  const deleteCategory = async category => {
    const result = await Swal.fire({ title: `Delete ${category.category_name}?`, text: 'This is only available when no document workflow uses this type.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#8c1023' });
    if (!result.isConfirmed) return false;
    const response = await fetchWithAuth(`/api/document-categories/${category.category_id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) {
      await Swal.fire('Unable to delete', data.error, 'error');
      return false;
    }
    await fetchBaselineCatalogs();
    await Swal.fire('Deleted', data.message, 'success');
    return true;
  };

  // --- LOCATION INFRASTRUCTURE SUBMISSIONS ---
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentName: newDeptName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      Swal.fire('Registered!', data.message, 'success');
      setNewDeptName('');
      fetchBaselineCatalogs();
    } catch (err) {
      Swal.fire('Operation Blocked', err.message, 'error');
    }
  };

  const handleCreateOffice = async (e) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth('/api/offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officeName: newOfficeName, officeCategory: officeCategoryEnabled ? newOfficeCategory : '' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      Swal.fire('Registered!', data.message, 'success');
      setNewOfficeName('');
      setNewOfficeCategory('');
      setOfficeCategoryEnabled(false);
      fetchBaselineCatalogs();
    } catch (err) {
      Swal.fire('Operation Blocked', err.message, 'error');
    }
  };

  const editInfrastructure = async (type, id, current) => {
    if (type === 'department') {
      const result = await Swal.fire({title:'Rename department', input:'text', inputValue:current, inputLabel:'New department name', showCancelButton:true, confirmButtonText:'Save', confirmButtonColor:'#8c1023', inputValidator:value => !value?.trim() ? 'A name is required.' : undefined});
      const value = result.isConfirmed ? result.value : '';
      if (!value || value.trim() === current) return;
      const response = await fetchWithAuth(`/api/departments/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({departmentName:value}) });
      const data = await response.json(); if (!response.ok) return Swal.fire('Operation blocked', data.error, 'error');
      Swal.fire('Updated', data.message, 'success'); fetchBaselineCatalogs();
      return;
    }
    const office = offices.find(item => String(item.id) === String(id));
    const officeSummary = (infraSummary.officeCapacity || []).find(item => String(item.o_id) === String(id));
    setEditingOffice({ id, name: office?.name || current, category: office?.category || officeSummary?.office_category || '', staff: officeSummary?.staff || [] });
  };
  const saveOfficeEdit = async value => {
    if (!editingOffice) return;
    const response = await fetchWithAuth(`/api/offices/${editingOffice.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(value) });
    const data = await response.json(); if (!response.ok) return Swal.fire('Operation blocked', data.error, 'error');
    setEditingOffice(null); Swal.fire('Updated', data.message, 'success'); fetchBaselineCatalogs();
  };
  const deleteInfrastructure = async (type, id, current) => {
    const result = await Swal.fire({title:`Delete ${current}?`, text:'Accounts, document workflows, and documents that use this item are protected. Deletion will be unavailable while it is still in use.', icon:'warning', showCancelButton:true, confirmButtonText:'Delete', confirmButtonColor:'#8c1023'});
    if (!result.isConfirmed) return;
    const response = await fetchWithAuth(`/api/${type === 'department' ? 'departments' : 'offices'}/${id}`, {method:'DELETE'}); const data=await response.json();
    if (!response.ok) return Swal.fire('Operation blocked', data.error, 'error'); Swal.fire('Deleted', data.message, 'success'); fetchBaselineCatalogs();
  };
  const deletePipeline = async p => {
    const result = await Swal.fire({title:`Delete ${p.process_name}?`, text:'Existing documents may prevent deletion. Hide this workflow instead if it is already in use.', icon:'warning', showCancelButton:true, confirmButtonText:'Delete', confirmButtonColor:'#8c1023'});
    if (!result.isConfirmed) return;
    const response=await fetchWithAuth(`/api/process-types/${p.p_id}`,{method:'DELETE'}); const data=await response.json();
    if (!response.ok) return Swal.fire('Operation blocked',data.error,'error'); Swal.fire('Deleted',data.message,'success'); resetWorkflowForm(); fetchBaselineCatalogs();
  };

  return {
    offices, routeGroups, processTypes, infraSummary,
    categories, categoryId, setCategoryId, catalogError, refreshCatalogs: fetchBaselineCatalogs,
    newProcessName, setNewProcessName,
    selectedStops, setSelectedStops,
    formMeta, setFormMeta,
    newDeptName, setNewDeptName,
    newOfficeName, setNewOfficeName,
    newOfficeCategory, setNewOfficeCategory, officeCategoryEnabled, setOfficeCategoryEnabled,
    editingOffice, setEditingOffice, saveOfficeEdit,
    workflowEditorOpen, openWorkflowEditor, closeWorkflowEditor,
    saveDepartment, saveOffice, saveCategory, deleteCategory,
    handleAddStopSlot, handleRemoveTrailingStopSlot, handleStopSelectorChange, handleStopKindChange,
    resetWorkflowForm, handleProcessFormSubmit, handleCreateDepartment, handleCreateOffice, editInfrastructure, deleteInfrastructure, deletePipeline
  };
}
