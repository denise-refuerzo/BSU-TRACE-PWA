import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { API_BASE_URL, fetchWithAuth } from "../../../../api";
import { createRealtimeClient } from '../../../../utils/realtimeClient';

const emptyAccountForm = {
  username: '', password: '', accountType: '', fullName: '', email: '', departmentId: '', officeId: '',
  isAssignatory: false, positionTitle: '', authorityMode: 'office', authorityOfficeIds: [], authorityDepartmentId: ''
};

export function useAccountManagement(enabled = true) {
  // Tab control state: toggles view smoothly between registry table and creation form
  const [activeTab, setActiveTab] = useState('registry');

  // --- REGISTRATION FORM STATES ---
  const [form, setForm] = useState(emptyAccountForm);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [emailAvailability, setEmailAvailability] = useState({ checking: false, available: null, message: '' });
  const [offices, setOffices] = useState([]);
  const [departments, setDepartments] = useState([]);

  // --- ADVANCED MANAGEMENT REGISTRY STATES ---
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [officeFilter, setOfficeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState('');
  const [sponsorFilter, setSponsorFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null); // Tracks account loaded into editing modal
 
  const fetchOffices = async () => {
    try {
      const res = await fetchWithAuth('/api/offices');
      const data = await res.json();
      if (res.ok) setOffices(data);
    } catch (err) {
      console.error("Failed building office catalog options drop down:", err);
    }
  };

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/accounts');
      const data = await res.json();
      if (res.ok) setAccounts(data.map(account => [2,3].includes(Number(account.a_id)) ? {...account,a_id:2,role_name:'Office Staff'} : account));
    } catch (err) {
      console.error("Error fetching institutional accounts catalog ledger:", err);
    }
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetchWithAuth('/api/departments');
      const data = await res.json();
      if (res.ok) setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Unable to load departments:', err);
    }
  };

  const checkEmailAvailability = async emailValue => {
    const email = String(emailValue || '').trim().toLowerCase();
    if (!email) return setEmailAvailability({ checking: false, available: null, message: '' });
    if (!/^[a-z0-9._%+-]+@g\.batstate-u\.edu\.ph$/.test(email)) {
      setEmailAvailability({ checking: false, available: false, message: 'Use an official email ending in @g.batstate-u.edu.ph.' });
      return;
    }
    setEmailAvailability({ checking: true, available: null, message: 'Checking email...' });
    try {
      const response = await fetchWithAuth(`/api/accounts/email-availability?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setEmailAvailability({ checking: false, available: Boolean(data.available), message: data.message || (data.available ? 'This email is available.' : 'This email is already registered.') });
    } catch {
      setEmailAvailability({ checking: false, available: null, message: 'Email availability could not be checked.' });
    }
  };

  // Sync baseline lookup catalogs upon initial component mount
  useEffect(() => {
    if (!enabled) return undefined;
    const refreshId = window.setTimeout(() => {
      fetchOffices();
      fetchDepartments();
      fetchAccounts();
    }, 0);
    return () => window.clearTimeout(refreshId);
  }, [enabled, fetchAccounts]);

  useEffect(() => {
    if (!enabled) return undefined;
    const socket = createRealtimeClient(API_BASE_URL, { secure: true, reconnection: true });
    const subscribe = () => socket.emit('join-ict-admin-room');
    socket.on('connect', subscribe);
    socket.on('account-registry-updated', fetchAccounts);
    return () => socket.disconnect();
  }, [enabled, fetchAccounts]);

  // --- ACCOUNT CREATION SUBMISSION ---
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return; 
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!/^[a-z0-9._%+-]+@g\.batstate-u\.edu\.ph$/.test(normalizedEmail)) {
      setMessage({ type: 'error', text: 'Use an official university email ending in @g.batstate-u.edu.ph.' });
      return;
    }
    if (form.accountType === 1 && !form.departmentId) {
      setMessage({ type: 'error', text: 'Choose a department for Faculty Staff.' });
      return;
    }
    if (form.accountType === 2 && !form.officeId) {
      setMessage({ type: 'error', text: 'Choose an office for Office Staff.' });
      return;
    }

    const submissionFormPayload = { ...form, email: normalizedEmail };
    
    // GSO Admin Auto-Assignment Interceptor
    if (form.accountType === 4) {
      const gsoOffice = offices.find(o => /general services|\bgso\b/i.test(o.name));
      submissionFormPayload.officeId = gsoOffice?.id || null;
    } else if (form.accountType !== 2 && form.accountType !== 3) {
      submissionFormPayload.officeId = null;
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
      setEmailAvailability({ checking: false, available: null, message: '' });
      setForm(emptyAccountForm);
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
            const gsoOffice = offices.find(o => /general services|\bgso\b/i.test(o.name));
            payloadOfficeId = gsoOffice?.id || null;
          } else if (selectedUser.a_id !== 2 && selectedUser.a_id !== 3) {
            payloadOfficeId = null;
          }

          const response = await fetchWithAuth(`/api/accounts/${selectedUser.u_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: selectedUser.username,
              fullName: selectedUser.full_name,
              email: selectedUser.uni_email,
              accountType: selectedUser.a_id,
              departmentId: selectedUser.d_id || null,
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
                          acc.uni_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(acc.sponsored_by || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || acc.a_id === parseInt(roleFilter);
    const matchesOffice = officeFilter === '' || String(acc.o_id || '') === officeFilter;
    const matchesDepartment = departmentFilter === '' || String(acc.d_id || '') === departmentFilter;
    const matchesOrigin = originFilter === '' || acc.account_origin === originFilter;
    const matchesStatus = statusFilter === '' || (statusFilter === 'active' ? acc.is_active !== false : acc.is_active === false);
    const matchesAuthority = authorityFilter === '' || (authorityFilter === 'assignatory' ? acc.is_assignatory === true : acc.is_assignatory !== true);
    const matchesSponsor = sponsorFilter === '' || String(acc.sponsor_id || '') === sponsorFilter;
    return matchesSearch && matchesRole && matchesOffice && matchesDepartment && matchesOrigin && matchesStatus && matchesAuthority && matchesSponsor;
  });

  return {
    activeTab, setActiveTab,
    form, setForm,
    message,
    emailAvailability, checkEmailAvailability,
    accounts, offices, departments,
    searchTerm, setSearchTerm,
    roleFilter, setRoleFilter,
    officeFilter, setOfficeFilter,
    departmentFilter, setDepartmentFilter,
    originFilter, setOriginFilter,
    statusFilter, setStatusFilter,
    authorityFilter, setAuthorityFilter,
    sponsorFilter, setSponsorFilter,
    selectedUser, setSelectedUser,
    filteredAccounts,
    handleCreateAccount,
    handleUpdateAccount
  };
}
