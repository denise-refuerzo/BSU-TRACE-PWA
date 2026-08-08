import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../../api";

export function useRolesPermissions() {
  const [activeTab, setActiveTab] = useState('routes'); // 'routes' | 'rbac' | 'infrastructure'

  // --- CATALOG INDICES STATES ---
  const [offices, setOffices] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [infraSummary, setInfraSummary] = useState({ departments: [], roleStatistics: [], officeCapacity: [] });

  // --- INTERACTIVE VISUALIZER FORM STATES ---
  const [newProcessName, setNewProcessName] = useState('');
  const [selectedStops, setSelectedStops] = useState([null, null]); // Instantiated with minimum 2 rows configuration blocks

  // --- TRACKING METADATA CONTROLLER ---
  const [formMeta, setFormMeta] = useState({ currentProcessId: null, currentRouteId: null, is_active: true });

  // --- CAMPUS STRUCTURES FORM STATES ---
  const [newDeptName, setNewDeptName] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');

  useEffect(() => {
    fetchBaselineCatalogs();
  }, [activeTab]);

  const fetchBaselineCatalogs = async () => {
    try {
      const officeRes = await fetchWithAuth('http://localhost:5000/api/offices');
      const officeData = await officeRes.json();
      if (officeRes.ok) setOffices(officeData);

      const processRes = await fetchWithAuth('http://localhost:5000/api/process-types');
      const processData = await processRes.json();
      if (processRes.ok) setProcessTypes(processData);

      const summaryRes = await fetchWithAuth('http://localhost:5000/api/admin/infrastructure-summary');
      const summaryData = await summaryRes.json();
      if (summaryRes.ok) setInfraSummary(summaryData);
    } catch (err) {
      console.error("Error updating configuration indices matrices lines:", err);
    }
  };

  // --- DYNAMIC VISUALIZER STOP HANDLING ---
  const handleAddStopSlot = () => {
    if (selectedStops.length >= 7) {
      Swal.fire('Limit Reached', 'System routing columns limit workflows to a maximum constraint layer of 7 stops.', 'warning');
      return;
    }
    setSelectedStops([...selectedStops, null]);
  };

  const handleRemoveTrailingStopSlot = () => {
    if (selectedStops.length <= 2) {
      Swal.fire('Constraint Conflict', 'Relational database definitions dictate that process templates require a minimum of 2 stops.', 'warning');
      return;
    }
    const filtered = [...selectedStops];
    filtered.pop();
    setSelectedStops(filtered);
  };

  const handleStopSelectorChange = (index, value) => {
    const updated = [...selectedStops];
    const parsedValue = value ? parseInt(value) : null;
    updated[index] = parsedValue;

    // Automated Chain-Limiting Guard: If an admin clears a middle step out, clear all downstream choices
    if (parsedValue === null) {
      for (let i = index; i < updated.length; i++) {
        updated[i] = null;
      }
    }
    setSelectedStops(updated);
  };

  // Resets the workflow form back to creation defaults
  const resetWorkflowForm = () => {
    setNewProcessName('');
    setSelectedStops([null, null]);
    setFormMeta({ currentProcessId: null, currentRouteId: null, is_active: true });
  };

  // --- PROCESS TEMPLATE ROUTING TRANSACTION SUBMISSION ---
  const handleProcessFormSubmit = async (e) => {
    e.preventDefault();
    const processedStopsPayload = selectedStops.filter(s => s !== null);

    if (processedStopsPayload.length < 2) {
      Swal.fire('Configuration Rejection', 'Invalid configuration path: A minimum sequence of 2 office locations must be assigned.', 'error');
      return;
    }

    const isEditing = formMeta.currentProcessId !== null;
    const targetUrl = isEditing 
      ? `http://localhost:5000/api/process-types/${formMeta.currentProcessId}`
      : 'http://localhost:5000/api/process-types';
    const targetMethod = isEditing ? 'PUT' : 'POST';

    Swal.fire({
      title: isEditing ? 'Save Workflow Changes?' : 'Compile Workflow Template?',
      text: isEditing 
        ? `Are you sure you want to update the sequence layers for "${newProcessName}"? This adjusts downstream workflow processing queues immediately.`
        : `Are you sure you want to index the "${newProcessName}" document routing sequence? Active tracking modules will begin evaluating this layout immediately.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#800000',
      cancelButtonColor: '#4b5563',
      confirmButtonText: isEditing ? 'Yes, Save Overrides' : 'Yes, Deploy Template'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetchWithAuth(targetUrl, {
            method: targetMethod,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              processName: newProcessName, 
              stops: processedStopsPayload,
              routeId: formMeta.currentRouteId,
              isActive: formMeta.is_active
            })
          });
          const data = await response.json();

          if (!response.ok) throw new Error(data.error || 'Pipeline operation sequence crashed.');

          Swal.fire('Success!', data.message, 'success');
          resetWorkflowForm();
          fetchBaselineCatalogs();
        } catch (err) {
          Swal.fire('Operation Refused', err.message, 'error');
        }
      }
    });
  };

  // --- LOCATION INFRASTRUCTURE SUBMISSIONS ---
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth('http://localhost:5000/api/departments', {
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
      const response = await fetchWithAuth('http://localhost:5000/api/offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officeName: newOfficeName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      Swal.fire('Registered!', data.message, 'success');
      setNewOfficeName('');
      fetchBaselineCatalogs();
    } catch (err) {
      Swal.fire('Operation Blocked', err.message, 'error');
    }
  };

  return {
    activeTab, setActiveTab,
    offices, processTypes, infraSummary,
    newProcessName, setNewProcessName,
    selectedStops, setSelectedStops,
    formMeta, setFormMeta,
    newDeptName, setNewDeptName,
    newOfficeName, setNewOfficeName,
    handleAddStopSlot, handleRemoveTrailingStopSlot, handleStopSelectorChange,
    resetWorkflowForm, handleProcessFormSubmit, handleCreateDepartment, handleCreateOffice
  };
}