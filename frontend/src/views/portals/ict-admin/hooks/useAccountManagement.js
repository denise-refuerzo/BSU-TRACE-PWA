import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../../api";

export function useAccountManagement() {
  // Tab control state: toggles view smoothly between registry table and creation form
  const [activeTab, setActiveTab] = useState('registry');

  // --- REGISTRATION FORM STATES ---
  const [form, setForm] = useState({
    username: '', password: '', accountType: '', fullName: '', email: '', departmentId: '', officeId: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [offices, setOffices] = useState([]);

  // --- ADVANCED MANAGEMENT REGISTRY STATES ---
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); // Tracks account loaded into editing modal
 
  // Sync baseline lookup catalogs upon initial component mount
  useEffect(() => {
    fetchOffices();
    fetchAccounts();
  }, []);

  const fetchOffices = async () => {
    try {
      const res = await fetchWithAuth('/api/offices');
      const data = await res.json();
      if (res.ok) setOffices(data);
    } catch (err) {
      console.error("Failed building office catalog options drop down:", err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetchWithAuth('/api/accounts');
      const data = await res.json();
      if (res.ok) setAccounts(data);
    } catch (err) {
      console.error("Error fetching institutional accounts catalog ledger:", err);
    }
  };

  // --- ACCOUNT CREATION SUBMISSION ---
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return; 
    }

    const submissionFormPayload = { ...form };
    
    // GSO Admin Auto-Assignment Interceptor
    if (form.accountType === 4) {
      const gsoOffice = offices.find(o => o.name.includes('General Services Office') || o.name.includes('GSO'));
      submissionFormPayload.officeId = gsoOffice ? gsoOffice.id : 3; // Fallback to ID 3
    } else if (form.accountType !== 2 && form.accountType !== 3) {
      submissionFormPayload.officeId = null;
    }

    // Clean out departmentId if not an Originator role to ensure database mapping alignment
    if (form.accountType !== 1) {
      submissionFormPayload.departmentId = null;
    }

    try {
      const response = await fetchWithAuth('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionFormPayload)
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Creation failed');

      setMessage({ type: 'success', text: data.message });
      setForm({ username: '', password: '', accountType: '', fullName: '', email: '', departmentId: '', officeId: '' });
      fetchAccounts(); // Silent refresh of registry data cache
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // --- MODIFICATION HANDLER BACKED BY SWEETALERT2 VERIFICATION ---
  const handleUpdateAccount = async (e) => {
    e.preventDefault();

    Swal.fire({
      title: 'Verify Profile Changes?',
      text: `Are you sure you want to alter parameters for ${selectedUser.full_name}? This overwrites core credentials across university system tables.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#800000',
      cancelButtonColor: '#4b5563',
      confirmButtonText: 'Yes, Apply Synchronization',
      cancelButtonText: 'Abort Changes'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // GSO Admin Auto-Assignment Interceptor for Updates
          let payloadOfficeId = selectedUser.o_id;
          if (selectedUser.a_id === 4) {
            const gsoOffice = offices.find(o => o.name.includes('General Services Office') || o.name.includes('GSO'));
            payloadOfficeId = gsoOffice ? gsoOffice.id : 3;
          } else if (selectedUser.a_id !== 2 && selectedUser.a_id !== 3) {
            payloadOfficeId = null;
          }

          // Force null state if changed away from Originator
          let payloadDeptId = selectedUser.d_id;
          if (selectedUser.a_id !== 1) {
            payloadDeptId = null;
          }

          const response = await fetchWithAuth(`/api/accounts/${selectedUser.u_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: selectedUser.username,
              fullName: selectedUser.full_name,
              email: selectedUser.uni_email,
              accountType: selectedUser.a_id,
              departmentId: payloadDeptId,
              officeId: payloadOfficeId,
              isActive: selectedUser.is_active // 🟢 Passed soft active state toggle to backend schema query maps
            })
          });
          const data = await response.json();

          if (!response.ok) throw new Error(data.error || 'Synchronization update failure.');

          Swal.fire('Synchronized!', 'Personnel access profiles updated cleanly.', 'success');
          setSelectedUser(null); // Terminate modal context view
          fetchAccounts(); // Pull active changes straight from storage nodes
        } catch (err) {
          Swal.fire('Operational Fault', err.message, 'error');
        }
      }
    });
  };

  // Filter computation logic processing locally cached state arrays on the fly
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          acc.uni_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || acc.a_id === parseInt(roleFilter);
    return matchesSearch && matchesRole;
  });

  return {
    activeTab, setActiveTab,
    form, setForm,
    message,
    offices,
    searchTerm, setSearchTerm,
    roleFilter, setRoleFilter,
    selectedUser, setSelectedUser,
    filteredAccounts,
    handleCreateAccount,
    handleUpdateAccount
  };
}