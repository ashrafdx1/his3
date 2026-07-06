import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api-client';
import { translations, Language } from '../services/translations';

interface DirectorDashboardProps {
  user: { email: string; roles: string[]; profilePictureUrl?: string | null };
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  colorTheme: string;
  setColorTheme: (color: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  onProfileUpdate: (newProfile: { username: string; profilePictureUrl?: string | null }) => void;
}

export function DirectorDashboard({
  user,
  onLogout,
  theme,
  toggleTheme,
  colorTheme,
  setColorTheme,
  lang,
  setLang,
  onProfileUpdate,
}: DirectorDashboardProps) {
  // Navigation & UI States
  const [activeSection, setActiveSection] = useState('executive-summary');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showFarewell, setShowFarewell] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [navWarning, setNavWarning] = useState<{
    show: boolean;
    targetSection: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    targetSection: '',
    message: '',
    onConfirm: () => {},
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [budgetFormMode, setBudgetFormMode] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingBudget, setEditingBudget] = useState<any | null>(null);
  const [budgetNameInput, setBudgetNameInput] = useState('');
  const [budgetAmountInput, setBudgetAmountInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null);
  const [activeDeptName, setActiveDeptName] = useState<string | null>(null);
  const [deptModalMode, setDeptModalMode] = useState<'ADD_EMPLOYEES' | 'REMOVE_EMPLOYEES' | 'VIEW_EMPLOYEES' | null>(null);
  const [deptModalEmployees, setDeptModalEmployees] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [isLoadingDeptModal, setIsLoadingDeptModal] = useState(false);
  // Admin Messaging States
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [adminMessageText, setAdminMessageText] = useState('');
  const [isSendingAdminMessage, setIsSendingAdminMessage] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [msgTab, setMsgTab] = useState<'active' | 'archived'>('active');
  const chatInputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedThreadId, threads.find(t => t.id === selectedThreadId)?.messages]);

  useEffect(() => {
    if (selectedThreadId !== null) {
      const activeThread = threads.find(t => t.id === selectedThreadId);
      if (activeThread && activeThread.has_admin_unread) {
        apiClient.post(`/messages/admin/${selectedThreadId}/mark-read`).then(() => {
          setThreads(prev => prev.map(t => t.id === selectedThreadId ? { ...t, has_admin_unread: false } : t));
          setUnreadMessagesCount(prev => Math.max(0, prev - 1));
        }).catch(() => {});
      }
    }
  }, [selectedThreadId, threads]);


  const getStatusLabel = (status: string) => {
    if (lang === 'ar') {
      switch (status) {
        case 'PENDING': return 'معلق';
        case 'ACCEPTED': return 'مفتوح';
        case 'DENIED': return 'مرفوض';
        case 'CLOSED': return 'مغلق';
        case 'ARCHIVED': return 'مؤرشف';
        default: return status;
      }
    } else {
      switch (status) {
        case 'PENDING': return 'PENDING';
        case 'ACCEPTED': return 'OPENED';
        case 'DENIED': return 'DENIED';
        case 'CLOSED': return 'CLOSED';
        case 'ARCHIVED': return 'ARCHIVED';
        default: return status;
      }
    }
  };

  const getLocalizedSystemMessage = (text: string) => {
    if (lang !== 'ar') return text;
    if (text.includes('accepted your message request')) {
      return 'مرحبًا! لقد قبلت طلب المراسلة الخاص بك. كيف يمكنني مساعدتك؟';
    } else if (text.includes('closed by the admin')) {
      return 'تم إغلاق هذه المحادثة من قبل المدير.';
    } else if (text.includes('started the chat session') || text.includes('started the chat')) {
      return 'بدأ المدير جلسة المحادثة.';
    } else if (text.includes('reopened the chat') || text.includes('reopened the chat session')) {
      return 'أعاد المدير فتح جلسة المحادثة.';
    } else if (text.includes('requested to reopen')) {
      return 'طلب الموظف إعادة فتح المحادثة.';
    } else if (text.includes('denied')) {
      return 'تم رفض طلب المراسلة من قبل المدير.';
    } else if (text.includes('archived by the admin')) {
      return 'تم أرشفة هذه المحادثة من قبل المدير.';
    }
    return text;
  };

  const t = translations[lang];
  const isRtl = lang === 'ar';

  // Settings profile state
  const [currentUsername, setCurrentUsername] = useState(user.email);
  const [newUsername, setNewUsername] = useState(user.email);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(user.profilePictureUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setProfilePictureUrl(user.profilePictureUrl || null);
  }, [user.profilePictureUrl]);

  const fetchThreads = async (silent = false) => {
    if (!silent) setIsLoadingThreads(true);
    try {
      const response = await apiClient.get('/messages/admin/threads');
      // Merge incoming data without wiping existing list — prevents flicker 
      // when admin is viewing a thread while polling updates arrive
      setThreads(prev => {
        const incoming: any[] = response.data;
        if (prev.length === 0) return incoming;
        // Build a map of existing threads by id to preserve order
        const prevMap = new Map(prev.map((t: any) => [t.id, t]));
        // Update existing + add new; preserve order from server
        const merged = incoming.map((t: any) => prevMap.has(t.id) ? { ...prevMap.get(t.id), ...t } : t);
        return merged;
      });
      const unreadCount = response.data.filter((t: any) => t.has_admin_unread).length;
      setUnreadMessagesCount(unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setIsLoadingThreads(false);
    }
  };

  const handleSelectThread = async (id: number) => {
    setSelectedThreadId(id);
    try {
      await apiClient.post(`/messages/admin/${id}/mark-read`);
      setThreads(prev => prev.map(t => t.id === id ? { ...t, has_admin_unread: false } : t));
      setUnreadMessagesCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const handleRespondRequest = async (id: number, action: 'ACCEPT' | 'DENY') => {
    try {
      const targetThread = threads.find(t => t.id === id);
      const res = await apiClient.post(`/messages/admin/${id}/respond`, { action });
      setThreads(prev => prev.map(t => t.id === id ? { ...res.data, has_admin_unread: false } : t));
      if (targetThread?.has_admin_unread) {
        setUnreadMessagesCount(prev => Math.max(0, prev - 1));
      }
      triggerToast(action === 'ACCEPT' ? (lang === 'ar' ? 'تم قبول طلب المراسلة' : 'Message request accepted') : (lang === 'ar' ? 'تم رفض طلب المراسلة' : 'Message request denied'));
      fetchThreads(true);
    } catch (e) {
      triggerToast(lang === 'ar' ? 'فشل إرسال الاستجابة' : 'Failed to respond to request.');
    }
  };

  const handleAdminSendMessage = async (e: React.FormEvent, threadId: number) => {
    e.preventDefault();
    if (!adminMessageText.trim()) return;
    setIsSendingAdminMessage(true);
    try {
      const res = await apiClient.post(`/messages/admin/${threadId}/send`, { text: adminMessageText });
      setThreads(prev => prev.map(t => t.id === threadId ? res.data : t));
      setAdminMessageText('');
      fetchThreads(true);
      setTimeout(() => chatInputRef.current?.focus(), 50);
    } catch (e) {
      triggerToast(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message.');
    } finally {
      setIsSendingAdminMessage(false);
    }
  };

  const handleAdminCloseThread = async (threadId: number) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من إغلاق هذه المحادثة؟' : 'Are you sure you want to close this conversation?')) return;
    try {
      const res = await apiClient.post(`/messages/admin/${threadId}/close`);
      setThreads(prev => prev.map(t => t.id === threadId ? res.data : t));
      triggerToast(lang === 'ar' ? 'تم إغلاق المحادثة' : 'Conversation closed.');
      fetchThreads(true);
    } catch (e) {
      triggerToast(lang === 'ar' ? 'فشل إغلاق المحادثة' : 'Failed to close conversation.');
    }
  };

  const handleAdminStartChat = async (employeeId: number) => {
    try {
      const res = await apiClient.post('/messages/admin/start-chat', { employeeId });
      const newThread = res.data;
      setThreads(prev => {
        const exists = prev.some(t => t.id === newThread.id);
        if (exists) {
          return prev.map(t => t.id === newThread.id ? newThread : t);
        } else {
          return [newThread, ...prev];
        }
      });
      setSelectedThreadId(newThread.id);
      setMsgTab('active');
      triggerToast(lang === 'ar' ? 'تم بدء المحادثة' : 'Chat started.');
      setTimeout(() => chatInputRef.current?.focus(), 150);
    } catch (e) {
      triggerToast(lang === 'ar' ? 'فشل بدء المحادثة' : 'Failed to start chat.');
    }
  };

  const handleAdminArchiveThread = async (threadId: number) => {
    try {
      const res = await apiClient.post(`/messages/admin/${threadId}/archive`);
      setThreads(prev => prev.map(t => t.id === threadId ? res.data : t));
      triggerToast(lang === 'ar' ? 'تم أرشفة المحادثة' : 'Conversation archived.');
      fetchThreads(true);
    } catch (e) {
      triggerToast(lang === 'ar' ? 'فشل أرشفة المحادثة' : 'Failed to archive conversation.');
    }
  };

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(() => {
      fetchThreads(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string | null>(null);

  // Dynamic Dashboard States (seeding realistic interactive data)
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 'APP-101', title: 'Procurement: High-Field MRI Scanner Upgrade', requester: 'Radiology Dept', amount: '$1,250,000', status: 'PENDING', date: '2026-06-21' },
    { id: 'APP-102', title: 'Staffing: Emergency Medicine Night Residency Increase', requester: 'ER Dept', amount: '$180,000/yr', status: 'PENDING', date: '2026-06-22' },
    { id: 'APP-103', title: 'Clinical: Pediatric Ward Extension Plan Approval', requester: 'Pediatrics Dept', amount: 'N/A', status: 'PENDING', date: '2026-06-20' },
    { id: 'APP-104', title: 'Financial: Global Lab Consumables Allocation Q3', requester: 'Pathology Lab', amount: '$45,000', status: 'PENDING', date: '2026-06-22' }
  ]);

  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('his_alerts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 'ALT-901', message: 'Critical shortage of O-Negative Blood (Current: 2 Units)', severity: 'CRITICAL', time: '12 mins ago', resolved: false },
      { id: 'ALT-902', message: 'ER Ambulatory Inflow Surge: Capacity exceeded by 15%', severity: 'HIGH', time: '34 mins ago', resolved: false },
      { id: 'ALT-903', message: 'Temp anomaly detected in Vaccine Storage Unit B', severity: 'WARNING', time: '1 hour ago', resolved: false }
    ];
  });

  const [suggestions, setSuggestions] = useState([
    { id: 'SUG-301', title: 'Deploy digital check-in kiosks in outpatient lobby', category: 'Patient Flow', votes: 42, author: 'Nurse Janet Vance', date: '3 hours ago' },
    { id: 'SUG-302', title: 'Integrate speech-to-text EHR tools for physicians', category: 'Operational Efficiency', votes: 29, author: 'Dr. Marcus Reynolds', date: '1 day ago' },
    { id: 'SUG-303', title: 'Install active thermal insulation for sterile supply storage', category: 'Infrastructure', votes: 15, author: 'Technician Liam Brody', date: '2 days ago' }
  ]);

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('his_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 'NOT-001', title: 'Compliance Audit Passed', text: 'Joint Commission validation check completed with score 98.4%.', read: false, time: '1 hour ago' },
      { id: 'NOT-002', title: 'IT System Patch Scheduled', text: 'Core EHR system maintenance scheduled for Sunday at 02:00 AM.', read: false, time: '3 hours ago' },
      { id: 'NOT-003', title: 'Pharmacy Inventory Restock', text: 'Critical drug supply shipment verified and received.', read: true, time: '6 hours ago' }
    ];
  });

  const [departments] = useState([
    { name: 'Cardiology', director: 'Dr. Sarah Carter', occupancy: 92, rating: 4.8, waitTime: '15 mins', activeStaff: 28 },
    { name: 'Oncology', director: 'Dr. David Foster', occupancy: 87, rating: 4.9, waitTime: '22 mins', activeStaff: 32 },
    { name: 'Pediatrics', director: 'Dr. Elena Rostova', occupancy: 78, rating: 4.7, waitTime: '10 mins', activeStaff: 24 },
    { name: 'Emergency', director: 'Dr. James Thorne', occupancy: 96, rating: 4.5, waitTime: '45 mins', activeStaff: 42 },
    { name: 'Neurology', director: 'Dr. Alan Vance', occupancy: 81, rating: 4.6, waitTime: '18 mins', activeStaff: 19 }
  ]);

  const [internalRequests] = useState([
    { id: 'REQ-401', item: 'HVAC Filter Replacements - Operating Room 3', requester: 'Surgical Team', priority: 'HIGH', status: 'PENDING' },
    { id: 'REQ-402', item: 'EHR Tablet Handsets Repair', requester: 'Ward 4B Nurses', priority: 'MEDIUM', status: 'IN_PROGRESS' },
    { id: 'REQ-403', item: 'Replacement IV Stands (Qty 10)', requester: 'Pediatric Clinic', priority: 'LOW', status: 'PENDING' }
  ]);

  // General Hospital Status Overview Data
  const [erTraffic, setErTraffic] = useState('HIGH');
  const [icuBedsFree, setIcuBedsFree] = useState(3);
  const [activeAmbulances, setActiveAmbulances] = useState(6);

  // Departments Management States and Operations
  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [newDeptArabicName, setNewDeptArabicName] = useState('');
  const [newDeptArabicDesc, setNewDeptArabicDesc] = useState('');
  const [formMode, setFormMode] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingDept, setEditingDept] = useState<any | null>(null);

  const fetchDepartments = async () => {
    setIsLoadingDepts(true);
    try {
      const response = await apiClient.get('/departments');
      setDbDepartments(response.data);
    } catch (err: any) {
      triggerToast(lang === 'ar' ? 'فشل تحميل الأقسام من الخادم.' : 'Failed to fetch departments from server.');
    } finally {
      setIsLoadingDepts(false);
    }
  };

  const fetchBudget = async () => {
    try {
      const response = await apiClient.get('/budget');
      setBudgetData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch budget:', err);
    }
  };

  useEffect(() => {
    if (activeSection === 'departments-management') {
      fetchDepartments();
    }
    if (activeSection === 'employees-management' || activeSection === 'messages') {
      fetchEmployees();
    }
    if (activeSection === 'financial-overview') {
      fetchBudget();
    }
  }, [activeSection]);

  // Employees Management States
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);
  const [isLoadingEmps, setIsLoadingEmps] = useState(false);
  const [empFormMode, setEmpFormMode] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [isSavingEmp, setIsSavingEmp] = useState(false);
  const [isUploadingEmpPhoto, setIsUploadingEmpPhoto] = useState(false);

  // Employee form fields
  const [empArabicFirst, setEmpArabicFirst] = useState('');
  const [empArabicMiddle, setEmpArabicMiddle] = useState('');
  const [empArabicLast, setEmpArabicLast] = useState('');
  const [empEnglishFirst, setEmpEnglishFirst] = useState('');
  const [empEnglishMiddle, setEmpEnglishMiddle] = useState('');
  const [empEnglishLast, setEmpEnglishLast] = useState('');
  const [empGender, setEmpGender] = useState('');
  const [empDob, setEmpDob] = useState('');
  const [empType, setEmpType] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empSalary, setEmpSalary] = useState('');
  const [empPictureUrl, setEmpPictureUrl] = useState('');

  const fetchEmployees = async () => {
    setIsLoadingEmps(true);
    try {
      const response = await apiClient.get('/employees');
      setDbEmployees(response.data);
    } catch (err: any) {
      triggerToast(lang === 'ar' ? 'فشل تحميل الموظفين من الخادم.' : 'Failed to fetch employees from server.');
    } finally {
      setIsLoadingEmps(false);
    }
  };

  const resetEmpForm = () => {
    setEmpArabicFirst(''); setEmpArabicMiddle(''); setEmpArabicLast('');
    setEmpEnglishFirst(''); setEmpEnglishMiddle(''); setEmpEnglishLast('');
    setEmpGender(''); setEmpDob(''); setEmpType('');
    setEmpPhone(''); setEmpEmail(''); setEmpSalary(''); setEmpPictureUrl('');
    setEditingEmp(null);
  };

  const handleEmpAddClick = () => {
    if (empFormMode !== null) {
      setEmpFormMode(null);
      resetEmpForm();
    } else {
      setEmpFormMode('ADD');
      resetEmpForm();
    }
  };

  const handleEmpEditClick = (emp: any) => {
    setEmpFormMode('EDIT');
    setEditingEmp(emp);
    setEmpArabicFirst(emp.arabic_first_name || '');
    setEmpArabicMiddle(emp.arabic_middle_name || '');
    setEmpArabicLast(emp.arabic_last_name || '');
    setEmpEnglishFirst(emp.english_first_name || '');
    setEmpEnglishMiddle(emp.english_middle_name || '');
    setEmpEnglishLast(emp.english_last_name || '');
    setEmpGender(emp.gender || '');
    setEmpDob(emp.date_of_birth ? emp.date_of_birth.split('T')[0] : '');
    setEmpType(emp.employment_type || '');
    setEmpPhone(emp.phone_number || '');
    setEmpEmail(emp.email || '');
    setEmpSalary(emp.salary ? String(emp.salary) : '');
    setEmpPictureUrl(emp.employee_picture_url || '');
  };

  const handleEmpFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerToast(lang === 'ar' ? 'يرجى تحديد ملف صورة صالح.' : 'Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      triggerToast(lang === 'ar' ? 'حجم الصورة يجب أن لا يتجاوز 5 ميجابايت.' : 'Image size must be under 5MB.');
      return;
    }
    setIsUploadingEmpPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/storage/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEmpPictureUrl(res.data.url || res.data.path || '');
      triggerToast(lang === 'ar' ? 'تم رفع الصورة بنجاح.' : 'Photo uploaded successfully.');
    } catch (err: any) {
      triggerToast(lang === 'ar' ? 'فشل رفع الصورة.' : 'Failed to upload photo.');
    } finally {
      setIsUploadingEmpPhoto(false);
    }
  };

  const openDeptModal = async (deptId: number, deptName: string, mode: 'ADD_EMPLOYEES' | 'REMOVE_EMPLOYEES' | 'VIEW_EMPLOYEES') => {
    setActiveDeptId(deptId);
    setActiveDeptName(deptName);
    setDeptModalMode(mode);
    setDeptModalEmployees([]);
    setSelectedEmployeeIds([]);
    setIsLoadingDeptModal(true);
    try {
      if (mode === 'ADD_EMPLOYEES') {
        const res = await apiClient.get('/departments/unassigned-employees');
        setDeptModalEmployees(res.data);
      } else {
        const res = await apiClient.get(`/departments/${deptId}/employees`);
        setDeptModalEmployees(res.data);
      }
    } catch (err) {
      triggerToast(lang === 'ar' ? 'فشل تحميل الموظفين.' : 'Failed to load employees.');
    } finally {
      setIsLoadingDeptModal(false);
    }
  };

  const handleDeptModalCommit = async () => {
    if (!activeDeptId || deptModalMode === 'VIEW_EMPLOYEES') return;
    if (selectedEmployeeIds.length === 0) {
      triggerToast(lang === 'ar' ? 'يرجى تحديد موظف واحد على الأقل.' : 'Please select at least one employee.');
      return;
    }
    setIsLoadingDeptModal(true);
    try {
      if (deptModalMode === 'ADD_EMPLOYEES') {
        await apiClient.post(`/departments/${activeDeptId}/assign-employees`, {
          employeeIds: selectedEmployeeIds
        });
        triggerToast(lang === 'ar' ? 'تم إضافة الموظفين إلى القسم بنجاح.' : 'Employees successfully assigned to the department.');
      } else if (deptModalMode === 'REMOVE_EMPLOYEES') {
        await apiClient.post(`/departments/${activeDeptId}/remove-employees`, {
          employeeIds: selectedEmployeeIds
        });
        triggerToast(lang === 'ar' ? 'تم إزالة الموظفين من القسم بنجاح.' : 'Employees successfully removed from the department.');
      }
      setDeptModalMode(null);
      await fetchDepartments();
    } catch (err) {
      triggerToast(lang === 'ar' ? 'فشل تنفيذ الإجراء.' : 'Failed to commit changes.');
    } finally {
      setIsLoadingDeptModal(false);
    }
  };

  const handleToggleManager = async (employeeId: number, isCurrentManager: boolean) => {
    if (!activeDeptId) return;
    setIsLoadingDeptModal(true);
    try {
      const action = isCurrentManager ? 'REMOVE' : 'SET';
      await apiClient.post(`/departments/${activeDeptId}/manager`, {
        employeeId,
        action
      });
      triggerToast(
        action === 'SET'
          ? (lang === 'ar' ? 'تم تعيين الموظف مديراً للقسم بنجاح.' : 'Employee set as department manager successfully.')
          : (lang === 'ar' ? 'تم إزالة الموظف من إدارة القسم بنجاح.' : 'Employee removed from manager position successfully.')
      );
      const res = await apiClient.get(`/departments/${activeDeptId}/employees`);
      setDeptModalEmployees(res.data);
      await fetchDepartments();
      // Reload employee registry as well
      await fetchEmployees();
    } catch (err) {
      triggerToast(lang === 'ar' ? 'فشل تحديث المدير.' : 'Failed to update manager.');
    } finally {
      setIsLoadingDeptModal(false);
    }
  };

  const handleBudgetFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(budgetAmountInput);
    if (isNaN(amt)) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال مبلغ مالي صالح.' : 'Please enter a valid amount.');
      return;
    }
    setIsSavingBudget(true);
    try {
      const payload = {
        budget_name: budgetNameInput,
        budget_amount: amt
      };
      if (budgetFormMode === 'ADD') {
        await apiClient.post('/budget', payload);
        triggerToast(lang === 'ar' ? 'تم إضافة الميزانية بنجاح.' : 'Budget created successfully.');
      } else if (budgetFormMode === 'EDIT' && editingBudget) {
        await apiClient.patch(`/budget/${editingBudget.budget_id}`, payload);
        triggerToast(lang === 'ar' ? 'تم تحديث الميزانية بنجاح.' : 'Budget updated successfully.');
      }
      setBudgetFormMode(null);
      setEditingBudget(null);
      setBudgetNameInput('');
      setBudgetAmountInput('');
      await fetchBudget();
    } catch (err: any) {
      triggerToast(lang === 'ar' ? 'فشل حفظ الميزانية.' : 'Failed to save budget.');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const hasUnsavedDeptChanges = () => {
    if (formMode === 'ADD') {
      return !!(newDeptName.trim() || newDeptDesc.trim() || newDeptArabicName.trim() || newDeptArabicDesc.trim());
    }
    if (formMode === 'EDIT' && editingDept) {
      return newDeptName !== (editingDept.name || '') ||
             newDeptDesc !== (editingDept.description || '') ||
             newDeptArabicName !== (editingDept['dept-arabic-name'] || '') ||
             newDeptArabicDesc !== (editingDept['dept-arabic-description'] || '');
    }
    return false;
  };

  const hasUnsavedEmpChanges = () => {
    if (empFormMode === 'ADD') {
      return !!(
        empArabicFirst.trim() || empArabicMiddle.trim() || empArabicLast.trim() ||
        empEnglishFirst.trim() || empEnglishMiddle.trim() || empEnglishLast.trim() ||
        empGender || empDob || empType ||
        empPhone.trim() || empEmail.trim() || empSalary.trim() || empPictureUrl
      );
    }
    if (empFormMode === 'EDIT' && editingEmp) {
      return empArabicFirst !== (editingEmp.arabic_first_name || '') ||
             empArabicMiddle !== (editingEmp.arabic_middle_name || '') ||
             empArabicLast !== (editingEmp.arabic_last_name || '') ||
             empEnglishFirst !== (editingEmp.english_first_name || '') ||
             empEnglishMiddle !== (editingEmp.english_middle_name || '') ||
             empEnglishLast !== (editingEmp.english_last_name || '') ||
             empGender !== (editingEmp.gender || '') ||
             empDob !== (editingEmp.date_of_birth ? editingEmp.date_of_birth.split('T')[0] : '') ||
             empType !== (editingEmp.employment_type || '') ||
             empPhone !== (editingEmp.phone_number || '') ||
             empEmail !== (editingEmp.email || '') ||
             empSalary !== (editingEmp.salary ? String(editingEmp.salary) : '') ||
             empPictureUrl !== (editingEmp.employee_picture_url || '');
    }
    return false;
  };

  const hasUnsavedBudgetChanges = () => {
    if (budgetFormMode === 'ADD') {
      return !!(budgetNameInput.trim() || budgetAmountInput.trim());
    }
    if (budgetFormMode === 'EDIT' && editingBudget) {
      return budgetNameInput !== (editingBudget.budget_name || '') ||
             parseFloat(budgetAmountInput) !== (editingBudget.budget_amount ? parseFloat(editingBudget.budget_amount) : 0);
    }
    return false;
  };

  const checkUnsavedChangesBeforeNavigation = (targetSection: string) => {
    if (activeSection === 'departments-management' && hasUnsavedDeptChanges()) {
      setNavWarning({
        show: true,
        targetSection,
        message: lang === 'ar'
          ? 'بعض البيانات التي أدخلتها في نموذج القسم قد تضيع.. الاستمرار سيؤدي إلى حذف بياناتك'
          : 'some data you entered in the department form may be lost..proceed will delete your data',
        onConfirm: () => {
          setFormMode(null);
          setEditingDept(null);
          setNewDeptName('');
          setNewDeptDesc('');
          setNewDeptArabicName('');
          setNewDeptArabicDesc('');
          if (targetSection === 'settings') {
            setShowSettings(true);
          } else {
            setActiveSection(targetSection);
            setShowSettings(false);
          }
          setNavWarning(prev => ({ ...prev, show: false }));
        }
      });
      return false;
    } else if (activeSection === 'employees-management' && hasUnsavedEmpChanges()) {
      setNavWarning({
        show: true,
        targetSection,
        message: lang === 'ar'
          ? 'بعض البيانات التي أدخلتها في نموذج الموظف قد تضيع.. الاستمرار سيؤدي إلى حذف بياناتك'
          : 'some data you entered in the employee form may be lost..proceed will delete your data',
        onConfirm: () => {
          setEmpFormMode(null);
          resetEmpForm();
          if (targetSection === 'settings') {
            setShowSettings(true);
          } else {
            setActiveSection(targetSection);
            setShowSettings(false);
          }
          setNavWarning(prev => ({ ...prev, show: false }));
        }
      });
      return false;
    } else if (activeSection === 'financial-overview' && hasUnsavedBudgetChanges()) {
      setNavWarning({
        show: true,
        targetSection,
        message: lang === 'ar'
          ? 'بعض البيانات التي أدخلتها في نموذج الميزانية قد تضيع.. الاستمرار سيؤدي إلى حذف بياناتك'
          : 'some data you entered in the budget form may be lost..proceed will delete your data',
        onConfirm: () => {
          setBudgetFormMode(null);
          setEditingBudget(null);
          setBudgetNameInput('');
          setBudgetAmountInput('');
          if (targetSection === 'settings') {
            setShowSettings(true);
          } else {
            setActiveSection(targetSection);
            setShowSettings(false);
          }
          setNavWarning(prev => ({ ...prev, show: false }));
        }
      });
      return false;
    }
    return true;
  };

  const handleEmpFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = [empArabicFirst, empArabicMiddle, empArabicLast, empEnglishFirst, empEnglishMiddle, empEnglishLast, empGender, empDob, empType, empPhone, empEmail, empSalary, empPictureUrl];
    if (requiredFields.some(f => !f.trim())) {
      triggerToast(lang === 'ar' ? 'جميع الحقول مطلوبة.' : 'All fields are required.');
      return;
    }
    if (!validateEmail(empEmail)) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address.');
      return;
    }
    const salaryNum = parseFloat(empSalary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال راتب صالح.' : 'Please enter a valid salary.');
      return;
    }
    setIsSavingEmp(true);
    try {
      const payload = {
        arabic_first_name: empArabicFirst, arabic_middle_name: empArabicMiddle, arabic_last_name: empArabicLast,
        english_first_name: empEnglishFirst, english_middle_name: empEnglishMiddle, english_last_name: empEnglishLast,
        gender: empGender, date_of_birth: empDob, employment_type: empType,
        phone_number: empPhone, email: empEmail, salary: salaryNum, employee_picture_url: empPictureUrl,
      };
      if (empFormMode === 'ADD') {
        await apiClient.post('/employees', payload);
        triggerToast(lang === 'ar' ? 'تم إضافة الموظف بنجاح.' : 'Employee added successfully.');
      } else {
        await apiClient.patch(`/employees/${editingEmp.employee_id}`, payload);
        triggerToast(lang === 'ar' ? 'تم تحديث بيانات الموظف.' : 'Employee updated successfully.');
      }
      setEmpFormMode(null);
      resetEmpForm();
      await fetchEmployees();
      await fetchBudget();
    } catch (err: any) {
      const msg = err.response?.data?.message || (lang === 'ar' ? 'فشل حفظ البيانات.' : 'Failed to save employee.');
      triggerToast(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSavingEmp(false);
    }
  };

  const handleDeleteEmployee = async (id: number, name: string) => {
    const confirmDelete = window.confirm(
      lang === 'ar' ? `هل أنت متأكد من حذف الموظف "${name}"؟` : `Are you sure you want to delete employee "${name}"?`
    );
    if (!confirmDelete) return;
    try {
      await apiClient.delete(`/employees/${id}`);
      triggerToast(lang === 'ar' ? 'تم حذف الموظف بنجاح.' : 'Employee deleted successfully.');
      await fetchEmployees();
      await fetchBudget();
    } catch (err: any) {
      triggerToast(lang === 'ar' ? 'فشل حذف الموظف.' : 'Failed to delete employee.');
    }
  };

  const handleAddClick = () => {
    if (formMode === 'ADD') {
      setFormMode(null);
    } else {
      setFormMode('ADD');
      setEditingDept(null);
      setNewDeptName('');
      setNewDeptDesc('');
      setNewDeptArabicName('');
      setNewDeptArabicDesc('');
    }
  };

  const handleEditClick = (dept: any) => {
    setFormMode('EDIT');
    setEditingDept(dept);
    setNewDeptName(dept.name);
    setNewDeptDesc(dept.description || '');
    setNewDeptArabicName(dept['dept-arabic-name'] || '');
    setNewDeptArabicDesc(dept['dept-arabic-description'] || '');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) {
      triggerToast(lang === 'ar' ? 'اسم القسم مطلوب' : 'Department name is required');
      return;
    }

    const hasArabicName = !!newDeptArabicName.trim();
    const hasArabicDesc = !!newDeptArabicDesc.trim();
    if (hasArabicName !== hasArabicDesc) {
      triggerToast(
        lang === 'ar'
          ? 'إذا قمت بإدخال الاسم باللغة العربية أو الوصف باللغة العربية، فيجب عليك إدخال كلاهما.'
          : 'If you provide either Arabic Name or Arabic Description, you must fill out both fields.'
      );
      return;
    }

    setIsAddingDept(true);
    try {
      if (formMode === 'ADD') {
        await apiClient.post('/departments', {
          name: newDeptName,
          description: newDeptDesc,
          arabicName: newDeptArabicName.trim() || undefined,
          arabicDescription: newDeptArabicDesc.trim() || undefined,
        });
        triggerToast(lang === 'ar' ? 'تم إضافة القسم بنجاح' : 'Department added successfully');
      } else {
        await apiClient.patch(`/departments/${editingDept.departmentId}`, {
          name: newDeptName,
          description: newDeptDesc,
          arabicName: newDeptArabicName.trim() || undefined,
          arabicDescription: newDeptArabicDesc.trim() || undefined,
        });
        triggerToast(lang === 'ar' ? 'تم تحديث القسم بنجاح' : 'Department updated successfully');
      }
      setNewDeptName('');
      setNewDeptDesc('');
      setNewDeptArabicName('');
      setNewDeptArabicDesc('');
      setFormMode(null);
      setEditingDept(null);
      await fetchDepartments();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || (lang === 'ar' ? 'فشل حفظ التعديلات.' : 'Failed to save changes.');
      triggerToast(errorMsg);
    } finally {
      setIsAddingDept(false);
    }
  };


  const handleDeleteDepartment = async (id: string, name: string) => {
    const confirmDelete = window.confirm(
      lang === 'ar'
        ? `هل أنت متأكد من حذف القسم "${name}"؟`
        : `Are you sure you want to delete department "${name}"?`
    );
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/departments/${id}`);
      triggerToast(lang === 'ar' ? 'تم حذف القسم بنجاح' : 'Department deleted successfully');
      await fetchDepartments();
    } catch (err: any) {
      triggerToast(lang === 'ar' ? 'فشل حذف القسم.' : 'Failed to delete department.');
    }
  };

  // Auto Dismiss Welcome Modal
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Persist alerts and notifications
  useEffect(() => {
    localStorage.setItem('his_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('his_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Toast notifications helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Feature coming soon helper
  const handleFutureFeature = (featureName: string) => {
    triggerToast(`${featureName} coming soon`);
  };

  // Interactive functions
  const handleApprove = (id: string, name: string) => {
    setPendingApprovals(prev => prev.map(item => item.id === id ? { ...item, status: 'APPROVED' } : item));
    triggerToast(`Request ${id} (${name}) has been APPROVED.`);
  };

  const handleDeny = (id: string, name: string) => {
    setPendingApprovals(prev => prev.map(item => item.id === id ? { ...item, status: 'REJECTED' } : item));
    triggerToast(`Request ${id} (${name}) has been REJECTED.`);
  };

  const handleResolveAlert = (id: string) => {
    setAlerts((prev: any[]) => prev.map((alt: any) => alt.id === id ? { ...alt, resolved: true } : alt));
    triggerToast(`Alert ${id} resolved.`);
  };

  const handleUpvoteSuggestion = (id: string) => {
    setSuggestions((prev: any[]) => prev.map((sug: any) => sug.id === id ? { ...sug, votes: sug.votes + 1 } : sug));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev: any[]) => prev.map((n: any) => ({ ...n, read: true })));
    setAlerts((prev: any[]) => prev.map((alt: any) => ({ ...alt, resolved: true })));
    triggerToast(lang === 'ar' ? 'تم تحديد كل الإشعارات كمقروءة ومعالجة التنبيهات.' : 'All notifications marked as read and alerts resolved.');
  };

  // Handle Logout Overlay Sequence
  const triggerLogoutSequence = () => {
    setShowFarewell(true);
    setTimeout(() => {
      onLogout();
    }, 2500);
  };

  // Helper to resolve profile picture url
  const getFullProfilePicUrl = (path: string | null) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = (() => {
      const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1/v1';
      try {
        return new URL(url).origin;
      } catch (e) {
        return 'http://localhost:3000';
      }
    })();
    return `${base}${path}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSettingsErrorMsg(lang === 'ar' ? 'يرجى تحديد ملف صورة صالح.' : 'Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSettingsErrorMsg(lang === 'ar' ? 'حجم الصورة يجب أن لا يتجاوز 5 ميجابايت.' : 'Image size must be under 5MB.');
      return;
    }

    setIsUploading(true);
    setSettingsErrorMsg(null);
    setSettingsSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Upload to storage
      const response = await apiClient.post('/storage/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const uploadedUrl = response.data.url;

      // 2. Instantly update the profile picture URL on backend profile
      const profileResponse = await apiClient.post('/auth/profile', {
        username: currentUsername,
        profilePictureUrl: uploadedUrl,
      });

      if (profileResponse.data.success) {
        setProfilePictureUrl(profileResponse.data.user.profilePictureUrl);
        onProfileUpdate({ username: currentUsername, profilePictureUrl: profileResponse.data.user.profilePictureUrl });
        triggerToast(lang === 'ar' ? 'تم تحديث الصورة الشخصية بنجاح.' : 'Profile picture updated successfully.');
      }
    } catch (err: any) {
      setSettingsErrorMsg(lang === 'ar' ? 'فشل رفع وتحديث الصورة الشخصية.' : 'Failed to upload and update profile picture.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Profile Update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);

    if (!newUsername.trim()) {
      setSettingsErrorMsg(t.emptyUsernameError);
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setSettingsErrorMsg(t.passwordLengthError);
        return;
      }
      if (newPassword !== confirmPassword) {
        setSettingsErrorMsg(t.passwordMismatchError);
        return;
      }
    }

    try {
      const response = await apiClient.post('/auth/profile', {
        username: newUsername,
        password: newPassword ? newPassword : undefined,
      });

      if (response.data.success) {
        setCurrentUsername(newUsername);
        setSettingsSuccessMsg(t.successUpdateMsg);
        setNewPassword('');
        setConfirmPassword('');
        onProfileUpdate({ username: newUsername, profilePictureUrl: response.data.user.profilePictureUrl });
        triggerToast(lang === 'ar' ? 'تم تحديث بيانات الملف الشخصي.' : 'Profile credentials updated.');
        setTimeout(() => setShowSettings(false), 1200);
      }
    } catch (err: any) {
      if (err.response) {
        setSettingsErrorMsg(err.response.data?.message || (lang === 'ar' ? 'فشل تحديث الملف الشخصي.' : 'Failed to update profile.'));
      } else {
        setSettingsErrorMsg(lang === 'ar' ? 'خطأ في الشبكة. تعذر الاتصال بالخادم.' : 'Network error. Unable to reach backend server.');
      }
    }
  };

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', position: 'relative', direction: isRtl ? 'rtl' : 'ltr' }}>
      
      {/* 1. Welcome Overlay Screen */}
      {showWelcome && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'hsl(var(--bg-primary) / 0.94)',
          backdropFilter: 'blur(30px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel text-center" style={{
            padding: '50px',
            maxWidth: '550px',
            borderRadius: '16px',
            border: '1px solid hsl(var(--border-color))',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)'
          }}>
            <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '20px' }}>🛡️</span>
            <h1 className="text-gradient" style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '12px' }}>{t.welcomeDirector}</h1>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1.1rem', marginBottom: '24px' }}>
              {t.welcomeSub}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <span className="badge" style={{ backgroundColor: 'hsla(var(--accent-blue), 0.08)', color: 'hsl(var(--accent-blue))', padding: '6px 14px', borderRadius: '20px', fontWeight: 600 }}>{t.activeRoleDirector}</span>
              <span className="badge" style={{ backgroundColor: 'hsla(var(--accent-teal), 0.08)', color: 'hsl(var(--accent-blue))', padding: '6px 14px', borderRadius: '20px', fontWeight: 600 }}>{t.dbSynced}</span>
            </div>
            {/* Spinning Indicator */}
            <div className="spinner" style={{ margin: '30px auto 0 auto', width: '28px', height: '28px', border: '3px solid hsla(var(--accent-blue), 0.1)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
      )}

      {/* 2. Farewell Overlay Screen */}
      {showFarewell && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'hsl(var(--bg-primary) / 0.96)',
          backdropFilter: 'blur(30px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel text-center" style={{
            padding: '50px',
            maxWidth: '500px',
            borderRadius: '16px',
            border: '1px solid hsl(var(--border-color))',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)'
          }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '20px' }}>🚪</span>
            <h1 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '12px' }}>{t.sessionTerminated}</h1>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1.05rem', marginBottom: '20px' }}>
              {t.farewellMsg.replace('{username}', currentUsername)}
            </p>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
              {t.redirectMsg}
            </p>
            <div className="spinner" style={{ margin: '35px auto 0 auto', width: '28px', height: '28px', border: '3px solid hsla(var(--danger), 0.1)', borderTopColor: 'hsl(var(--danger))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
      )}

      {/* Left Navigation Sidebar */}
      <aside className={`glass-panel sidebar-aside ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{
        width: '320px',
        borderRadius: '0',
        borderLeft: isRtl ? '1px solid hsl(var(--border-color))' : 'none',
        borderRight: isRtl ? 'none' : '1px solid hsl(var(--border-color))',
        borderTop: 'none',
        borderBottom: 'none',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        zIndex: 10,
        height: '100vh',
        position: 'sticky',
        top: 0
      }}>
        {/* Sidebar Header Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, hsla(var(--accent-blue), 0.08), hsla(var(--accent-teal), 0.08))',
            border: '1px solid hsla(var(--accent-blue), 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px hsla(var(--accent-blue), 0.08)'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          </div>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{t.brandName}</h2>
            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--accent-blue))', fontWeight: 600, letterSpacing: '0.05em' }}>{lang === 'ar' ? 'قيادة المدير' : 'DIRECTOR COMMAND'}</p>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid hsl(var(--border-color))' }} />

        {/* Sidebar Navigation Options */}
        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flex: 1,
          overflowY: 'auto',
          paddingRight: isRtl ? '0' : '28px',
          paddingLeft: isRtl ? '28px' : '0'
        }}>
          {[
            { id: 'departments-management', label: t.navDeptManagement, desc: t.navDeptManagementDesc },
            { id: 'employees-management', label: (t as any).navEmpManagement, desc: (t as any).navEmpManagementDesc },
            { id: 'financial-overview', label: t.navFinancialOverview, desc: t.navFinancialOverviewDesc },
            { id: 'messages', label: `💬 ${lang === 'ar' ? 'الرسائل' : 'Messages'}`, desc: lang === 'ar' ? 'طلبات المراسلة والدردشة' : 'Message requests & chat' },
            { id: 'executive-summary', label: t.navExecSummary, desc: t.navExecSummaryDesc },
            { id: 'hospital-status', label: t.navHospitalStatus, desc: t.navHospitalStatusDesc },
            { id: 'pending-approvals', label: t.navPendingApprovals, desc: t.navPendingApprovalsDesc },
            { id: 'department-performance', label: t.navDeptPerformance, desc: t.navDeptPerformanceDesc },
            { id: 'workforce-overview', label: t.navWorkforceOverview, desc: t.navWorkforceOverviewDesc },
            { id: 'alerts-center', label: t.navAlertsCenter, desc: t.navAlertsCenterDesc },
            { id: 'internal-requests', label: t.navInternalRequests, desc: t.navInternalRequestsDesc },
            { id: 'suggestions-dashboard', label: t.navSuggestions, desc: t.navSuggestionsDesc },
            { id: 'notifications-center', label: t.navNotificationsCenter, desc: t.navNotificationsCenterDesc }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (checkUnsavedChangesBeforeNavigation(item.id)) {
                  setActiveSection(item.id);
                  setShowSettings(false);
                }
              }}
              className="sidebar-nav-btn"
              style={{
                width: '100%',
                padding: '12px 14px',
                textAlign: isRtl ? 'right' : 'left',
                background: activeSection === item.id && !showSettings ? 'hsla(var(--accent-blue), 0.08)' : 'transparent',
                border: '1px solid',
                borderColor: activeSection === item.id && !showSettings ? 'hsla(var(--accent-blue), 0.2)' : 'transparent',
                borderRadius: '10px',
                color: activeSection === item.id && !showSettings ? 'hsl(var(--accent-blue))' : 'hsl(var(--text-secondary))',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' /* , flexDirection: isRtl ? 'row-reverse' : 'row' */ }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{item.label}</div>
                {item.id === 'messages' && unreadMessagesCount > 0 && (
                  <span style={{
                    backgroundColor: 'hsl(var(--danger))',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    minWidth: '18px',
                    height: '18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(225, 29, 72, 0.4)'
                  }}>
                    {unreadMessagesCount}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>{item.desc}</div>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'hsl(var(--bg-tertiary))', padding: '16px', borderRadius: '12px', border: '1px solid hsl(var(--border-color))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--success))' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'محرك قاعدة البيانات: Postgres' : 'Node Engine: Postgres'}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
            {lang === 'ar' ? 'عنوان الـ IP المتصل: 127.0.0.1' : 'Connected IP: 127.0.0.1'}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Top Header */}
        <header className="glass-panel header-container" style={{
          height: '75px',
          borderRadius: '0',
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: 'none',
          borderLeft: 'none',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 8,
          position: 'sticky',
          top: 0
        }}>
          {/* Header Title (Desktop only) */}
          <div className="header-title-section">
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {showSettings 
                ? t.settingsTitle 
                : activeSection === 'departments-management' ? t.navDeptManagement.substring(3)
                : activeSection === 'executive-summary' ? t.navExecSummary.substring(3)
                : activeSection === 'hospital-status' ? t.navHospitalStatus.substring(3)
                : activeSection === 'pending-approvals' ? t.navPendingApprovals.substring(3)
                : activeSection === 'department-performance' ? t.navDeptPerformance.substring(3)
                : activeSection === 'financial-overview' ? t.navFinancialOverview.substring(3)
                : activeSection === 'workforce-overview' ? t.navWorkforceOverview.substring(3)
                : activeSection === 'alerts-center' ? t.navAlertsCenter.substring(3)
                : activeSection === 'internal-requests' ? t.navInternalRequests.substring(3)
                : activeSection === 'suggestions-dashboard' ? t.navSuggestions.substring(3)
                : t.navNotificationsCenter.substring(3)
              }
            </h1>
          </div>

          {/* Desktop-only Header Actions */}
          <div className="header-actions-desktop" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Color Swatches */}
            <div className="color-swatches" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', background: 'hsl(var(--bg-tertiary))', borderRadius: '20px', border: '1px solid hsl(var(--border-color))' }}>
              {['blue', 'green', 'purple', 'red', 'orange', 'yellow', 'pink'].map((color) => {
                const hexMap: Record<string, string> = {
                  blue: '#2563eb',
                  green: '#0d9488',
                  purple: '#8b5cf6',
                  red: '#e11d48',
                  orange: '#ea580c',
                  yellow: '#ca8a04',
                  pink: '#db2777'
                };
                return (
                  <button
                    key={color}
                    onClick={() => setColorTheme(color)}
                    className={`color-swatch color-swatch-${color}`}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: hexMap[color],
                      border: colorTheme === color ? '1.5px solid hsl(var(--text-primary))' : '1px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                      transform: colorTheme === color ? 'scale(1.2)' : 'none'
                    }}
                    title={color}
                  />
                );
              })}
            </div>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="lang-toggle-btn"
              style={{
                background: 'none',
                border: '1px solid hsl(var(--border-color))',
                color: 'hsl(var(--text-secondary))',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '38px',
                padding: '0 16px',
                boxSizing: 'border-box',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: 'hsl(var(--bg-tertiary))',
                transition: 'var(--transition-smooth)'
              }}
            >
              {lang === 'en' ? '🌐 العربية' : '🌐 English'}
            </button>

            {/* User Profile Badge */}
            <div
              className="user-profile-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                height: '38px',
                padding: '0 12px',
                boxSizing: 'border-box',
                background: 'hsl(var(--bg-tertiary))',
                borderRadius: '20px',
                border: '1px solid hsl(var(--border-color))',
                transition: 'var(--transition-smooth)'
              }}
            >
              {profilePictureUrl ? (
                <img
                  src={getFullProfilePicUrl(profilePictureUrl)}
                  alt={currentUsername}
                  onClick={() => setLightboxImageUrl(getFullProfilePicUrl(profilePictureUrl))}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid hsl(var(--border-color))',
                    cursor: 'zoom-in'
                  }}
                />
              ) : (
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, hsl(var(--accent-blue)), hsl(var(--accent-purple)))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff'
                }}>
                  {currentUsername.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUsername}</span>
            </div>

            {/* Notification Bell Icon Button */}
            <button
              onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
              className={`header-icon-btn notification-bell-btn ${showNotificationDrawer ? 'active' : ''}`}
              style={{ position: 'relative' }}
              title={t.notificationsTooltip}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {(notifications.some((n: any) => !n.read) || alerts.some((a: any) => !a.resolved)) && (
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: isRtl ? 'auto' : '6px',
                  left: isRtl ? '6px' : 'auto',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'hsl(var(--danger))',
                  boxShadow: '0 0 8px hsl(var(--danger))'
                }} />
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="header-icon-btn theme-toggle-btn"
              title="Toggle Night/Light Mode"
            >
              {theme === 'dark' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Settings Gear Button */}
            <button
              onClick={() => {
                if (showSettings) {
                  setShowSettings(false);
                } else {
                  if (checkUnsavedChangesBeforeNavigation('settings')) {
                    setShowSettings(true);
                  }
                }
              }}
              className={`header-icon-btn settings-toggle-btn ${showSettings ? 'active' : ''}`}
              title="Profile Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            {/* Logout Button */}
            <button
              onClick={triggerLogoutSequence}
              className="header-icon-btn logout-btn"
              style={{ color: 'hsl(var(--danger))' }}
              title="Secure Sign Out"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>

          {/* Mobile-only Header Actions (3 items: Burger Button, Admin Name, Settings Icon) */}
          <div className="header-actions-mobile" style={{ display: 'none', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            {/* 1. Burger button */}
            <button
              className="hamburger-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: 'none',
                color: 'hsl(var(--text-secondary))',
                cursor: 'pointer',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'hsla(var(--accent-blue), 0.08)',
                border: '1px solid hsla(var(--accent-blue), 0.15)',
                margin: 0
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* 2. Admin name */}
            <span className="mobile-admin-name-text">
              {currentUsername || 'Admin'}
            </span>

            {/* 3. Settings icon */}
            <button
              onClick={() => {
                if (showSettings) {
                  setShowSettings(false);
                } else {
                  if (checkUnsavedChangesBeforeNavigation('settings')) {
                    setShowSettings(true);
                  }
                }
              }}
              className={`header-icon-btn settings-toggle-btn ${showSettings ? 'active' : ''}`}
              title="Profile Settings"
              style={{ margin: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Global Toast */}
        {toastMessage && (
          <div className="glass-panel" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '14px 24px',
            borderRadius: '8px',
            border: '1px solid hsl(var(--border-color))',
            backgroundColor: 'hsl(var(--bg-secondary))',
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'hsl(var(--text-primary))'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--accent-blue))' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        )}

        <main className="main-content" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          
          {/* Settings Section Panel (Takes priority if showSettings is true) */}
          {showSettings ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px', margin: '0 auto' }}>
              <div className="glass-panel" style={{ padding: '36px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.4rem' }}>{t.updateProfileTitle}</h3>
                  <button className="btn-secondary" onClick={() => setShowSettings(false)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>{t.closeBtn}</button>
                </div>

                {settingsSuccessMsg && (
                  <div style={{ padding: '12px', background: 'hsla(var(--success), 0.1)', border: '1px solid hsla(var(--success), 0.3)', color: 'hsl(var(--success))', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                    {settingsSuccessMsg}
                  </div>
                )}
                {settingsErrorMsg && (
                  <div style={{ padding: '12px', background: 'hsla(var(--danger), 0.1)', border: '1px solid hsla(var(--danger), 0.3)', color: 'hsl(var(--danger))', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                    {settingsErrorMsg}
                  </div>
                )}

                {/* Mobile adjustments visible settings (theme colors, theme mode, language switcher) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  paddingBottom: '20px',
                  marginBottom: '20px',
                  borderBottom: '1px solid hsla(var(--border-color), 0.6)'
                }}>
                  {/* Seven Colors Swatches */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', fontWeight: 600 }}>
                      {lang === 'ar' ? 'لون الواجهة المفضل' : 'UI Color Theme'}
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['blue', 'green', 'purple', 'red', 'orange', 'yellow', 'pink'].map((color) => {
                        const hexMap: Record<string, string> = {
                          blue: '#2563eb',
                          green: '#0d9488',
                          purple: '#8b5cf6',
                          red: '#e11d48',
                          orange: '#ea580c',
                          yellow: '#ca8a04',
                          pink: '#db2777'
                        };
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setColorTheme(color)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: hexMap[color],
                              border: colorTheme === color ? '2.5px solid hsl(var(--text-primary))' : '1.5px solid transparent',
                              cursor: 'pointer',
                              padding: 0,
                              transform: colorTheme === color ? 'scale(1.15)' : 'none',
                              transition: 'transform 0.2s'
                            }}
                            title={color}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Dark Mode & Language Toggles */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: 600 }}>
                        {lang === 'ar' ? 'المظهر' : 'Theme Mode'}
                      </label>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={toggleTheme}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}
                      >
                        {theme === 'dark' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>☀️ {lang === 'ar' ? 'الوضع المضيء' : 'Light Mode'}</span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🌙 {lang === 'ar' ? 'الوضع المظلم' : 'Dark Mode'}</span>
                        )}
                      </button>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: 600 }}>
                        {lang === 'ar' ? 'اللغة' : 'Language'}
                      </label>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', fontWeight: 600 }}
                      >
                        🌐 {lang === 'en' ? 'العربية' : 'English'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile-only Logout/Sign Out Button */}
                <div className="mobile-settings-logout" style={{ marginTop: '12px', paddingBottom: '20px', borderBottom: '1px solid hsla(var(--border-color), 0.6)' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={triggerLogoutSequence}
                    style={{
                      padding: '10px 16px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      justifyContent: 'center',
                      color: 'white',
                      backgroundColor: 'hsl(var(--danger))',
                      borderColor: 'transparent',
                      fontWeight: 600,
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    🚪 {lang === 'ar' ? 'تسجيل الخروج الآمن' : 'Secure Sign Out'}
                  </button>
                </div>

                {/* Profile Picture Upload Section (Independent of username/password form) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid hsla(var(--border-color), 0.6)' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    {profilePictureUrl ? (
                      <img
                        src={getFullProfilePicUrl(profilePictureUrl)}
                        alt="Profile Preview"
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid hsl(var(--accent-blue))',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, hsl(var(--accent-blue)), hsl(var(--accent-purple)))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)'
                      }}>
                        {newUsername.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isUploading && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2
                      }}>
                        <div className="spinner" style={{ width: '20px', height: '20px', border: '2.5px solid hsla(var(--bg-secondary), 0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="profile-pic-upload"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid hsl(var(--border-color))',
                      backgroundColor: 'hsl(var(--bg-secondary))',
                      color: 'hsl(var(--text-secondary))',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--bg-tertiary))'; e.currentTarget.style.color = 'hsl(var(--accent-blue))'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--bg-secondary))'; e.currentTarget.style.color = 'hsl(var(--text-secondary))'; }}
                  >
                    {lang === 'ar' ? 'تحميل صورة شخصية' : 'Upload Profile Picture'}
                  </label>
                  <input
                    type="file"
                    id="profile-pic-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                </div>

                <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px' }}>{t.usernameLabel}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  </div>
                  <div style={{ borderBottom: '1px solid hsla(var(--border-color), 0.6)', margin: '10px 0' }} />
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px' }}>{t.newPasswordLabel}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        className="form-input"
                        style={{
                          paddingLeft: isRtl ? '48px' : '14px',
                          paddingRight: isRtl ? '14px' : '48px'
                        }}
                        placeholder={t.passkeyPlaceholder}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="password-toggle-btn"
                        style={{
                          position: 'absolute',
                          right: isRtl ? 'auto' : '16px',
                          left: isRtl ? '16px' : 'auto',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'hsl(var(--text-muted))',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showNewPassword ? (
                          /* Open Eye SVG (Visible) */
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          /* Striked Eye SVG (Hidden) */
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px' }}>{t.confirmPasswordLabel}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form-input"
                        style={{
                          paddingLeft: isRtl ? '48px' : '14px',
                          paddingRight: isRtl ? '14px' : '48px'
                        }}
                        placeholder={t.confirmPasskeyPlaceholder}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="password-toggle-btn"
                        style={{
                          position: 'absolute',
                          right: isRtl ? 'auto' : '16px',
                          left: isRtl ? '16px' : 'auto',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'hsl(var(--text-muted))',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showConfirmPassword ? (
                          /* Open Eye SVG (Visible) */
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          /* Striked Eye SVG (Hidden) */
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                    {t.applyChangesBtn}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            
            // Standard Navigation Tabs
            <>
              {/* SECTION: MESSAGES */}
              {activeSection === 'messages' && (
                <div className="messaging-section-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 180px)', minHeight: 0 }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                      {lang === 'ar' ? 'رسائل الموظفين' : 'Employee Messages'}
                    </h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>
                      {lang === 'ar' 
                        ? 'مراجعة طلبات المحادثة من الموظفين وإجراء دردشة تفاعلية.' 
                        : 'Review incoming chat requests from employees and engage in interactive messaging.'}
                    </p>
                  </div>

                  <div className="glass-panel messaging-grid-container" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '0', padding: 0, overflow: 'hidden', flex: 1, minHeight: 0, borderRadius: '16px' }}>
                    {/* Left Panel: Threads List */}
                    <div style={{ borderRight: isRtl ? 'none' : '1px solid hsl(var(--border-color))', borderLeft: isRtl ? '1px solid hsl(var(--border-color))' : 'none', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                      <div style={{ padding: '16px', borderBottom: '1px solid hsl(var(--border-color))', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {lang === 'ar' ? 'المحادثات' : 'Conversations'}
                        </div>
                        
                        {/* Segmented active/archived selector tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid hsla(var(--border-color), 0.5)', marginBottom: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setMsgTab('active')}
                            style={{
                              flex: 1,
                              padding: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderBottom: msgTab === 'active' ? '2px solid hsl(var(--accent-blue))' : '2px solid transparent',
                              color: msgTab === 'active' ? 'hsl(var(--accent-blue))' : 'hsl(var(--text-secondary))',
                              cursor: 'pointer'
                            }}
                          >
                            {lang === 'ar' ? 'النشطة' : 'Active'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMsgTab('archived')}
                            style={{
                              flex: 1,
                              padding: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderBottom: msgTab === 'archived' ? '2px solid hsl(var(--accent-blue))' : '2px solid transparent',
                              color: msgTab === 'archived' ? 'hsl(var(--accent-blue))' : 'hsl(var(--text-secondary))',
                              cursor: 'pointer'
                            }}
                          >
                            {lang === 'ar' ? 'المؤرشفة' : 'Archived'}
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                handleAdminStartChat(parseInt(val, 10));
                                e.target.value = '';
                              }
                            }}
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '8px', cursor: 'pointer', flex: 1, backgroundColor: 'hsl(var(--bg-secondary))' }}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              {lang === 'ar' ? '➕ بدء محادثة جديدة...' : '➕ Start new chat...'}
                            </option>
                            {dbEmployees.map((emp: any) => {
                              const empNameSelect = lang === 'ar' && emp.arabic_first_name
                                ? `${emp.arabic_first_name} ${emp.arabic_last_name}`
                                : `${emp.english_first_name} ${emp.english_last_name}`;
                              return (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                  {empNameSelect} ({emp.email})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                      
                      {/* Conversations scroll area with fixed height to force scrollbar */}
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
                        {(() => {
                          const filteredThreads = threads.filter(t => {
                            if (msgTab === 'archived') {
                              return t.status === 'ARCHIVED';
                            } else {
                              return t.status !== 'ARCHIVED';
                            }
                          });

                          if (isLoadingThreads && filteredThreads.length === 0) {
                            return (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                                <div className="spinner" style={{ width: '24px', height: '24px', border: '2.5px solid hsla(var(--accent-blue), 0.1)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                              </div>
                            );
                          }

                          if (filteredThreads.length === 0) {
                            return (
                              <div style={{ padding: '24px', fontStyle: 'italic', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                                {lang === 'ar' 
                                  ? (msgTab === 'archived' ? 'لا توجد محادثات مؤرشفة.' : 'لا توجد محادثات نشطة.') 
                                  : (msgTab === 'archived' ? 'No archived conversations.' : 'No active conversations.')}
                              </div>
                            );
                          }

                          return filteredThreads.map((thread) => {
                            const isSelected = selectedThreadId === thread.id;
                            const messages = JSON.parse(thread.messages || '[]');
                            const lastMessage = messages[messages.length - 1];
                            const empName = lang === 'ar' && thread.arabic_first_name
                              ? `${thread.arabic_first_name} ${thread.arabic_last_name}`
                              : `${thread.english_first_name} ${thread.english_last_name}`;

                            return (
                              <div
                                key={thread.id}
                                onClick={() => handleSelectThread(thread.id)}
                                style={{
                                  padding: '14px 18px',
                                  borderBottom: '1px solid hsla(var(--border-color), 0.5)',
                                  cursor: 'pointer',
                                  backgroundColor: isSelected ? 'hsla(var(--accent-blue), 0.08)' : 'transparent',
                                  transition: 'background-color 0.2s ease',
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px'
                                }}
                              >
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'hsla(var(--accent-blue), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid hsla(var(--accent-blue), 0.2)', fontSize: '0.8rem', overflow: 'hidden', flexShrink: 0 }}>
                                  {thread.employee_picture_url ? (
                                    <img src={getFullProfilePicUrl(thread.employee_picture_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : '👤'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                                    <span style={{ fontWeight: thread.has_admin_unread ? 700 : 600, fontSize: '0.88rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {empName}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                                      {new Date(thread.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                                    <span style={{ fontSize: '0.78rem', color: thread.has_admin_unread ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))', fontWeight: thread.has_admin_unread ? 600 : 400, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block', maxWidth: '140px' }}>
                                      {lastMessage ? (lastMessage.isSystem ? getLocalizedSystemMessage(lastMessage.text) : lastMessage.text) : (lang === 'ar' ? 'طلب محادثة جديد' : 'New request')}
                                    </span>
                                    <span className="badge" style={{
                                      fontSize: '0.65rem',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      backgroundColor: thread.status === 'PENDING' ? 'hsla(var(--warning), 0.12)'
                                        : (thread.status === 'ACCEPTED' || thread.status === 'ARCHIVED') ? 'hsla(var(--success), 0.12)'
                                        : thread.status === 'DENIED' ? 'hsla(var(--danger), 0.12)'
                                        : 'hsla(var(--text-muted), 0.12)',
                                      color: thread.status === 'PENDING' ? 'hsl(var(--warning))'
                                        : (thread.status === 'ACCEPTED' || thread.status === 'ARCHIVED') ? 'hsl(var(--success))'
                                        : thread.status === 'DENIED' ? 'hsl(var(--danger))'
                                        : 'hsl(var(--text-muted))'
                                    }}>
                                      {getStatusLabel(thread.status)}
                                    </span>
                                  </div>
                                </div>
                                {thread.has_admin_unread && (
                                  <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: 'hsl(var(--danger))',
                                    position: 'absolute',
                                    left: isRtl ? '10px' : 'auto',
                                    right: isRtl ? 'auto' : '10px',
                                    top: '45%'
                                  }} />
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {/* Right Panel: Chat Pane */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'hsla(var(--bg-secondary), 0.2)' }}>
                      {selectedThreadId === null ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', color: 'hsl(var(--text-muted))' }}>
                          <span style={{ fontSize: '3rem', marginBottom: '12px' }}>💬</span>
                          <div>{lang === 'ar' ? 'حدد محادثة من القائمة للبدء' : 'Select a conversation to start messaging'}</div>
                        </div>
                      ) : (() => {
                        const thread = threads.find(t => t.id === selectedThreadId);
                        if (!thread) return null;
                        const messages = JSON.parse(thread.messages || '[]');
                        const empNameHeader = lang === 'ar' && thread.arabic_first_name
                          ? `${thread.arabic_first_name} ${thread.arabic_last_name}`
                          : `${thread.english_first_name} ${thread.english_last_name}`;

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                            {/* Chat Header */}
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border-color))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'hsl(var(--bg-secondary))', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'hsla(var(--accent-blue), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid hsla(var(--accent-blue), 0.2)', fontSize: '0.85rem', overflow: 'hidden' }}>
                                  {thread.employee_picture_url ? (
                                    <img src={getFullProfilePicUrl(thread.employee_picture_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : '👤'}
                                </div>
                                <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                                    {empNameHeader}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                    {thread.email} • {thread.department_name || (lang === 'ar' ? 'بدون قسم' : 'No Department')}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: thread.status === 'ACCEPTED' ? 'hsla(var(--success), 0.12)'
                                    : thread.status === 'PENDING' ? 'hsla(var(--warning), 0.12)'
                                    : thread.status === 'DENIED' ? 'hsla(var(--danger), 0.12)'
                                    : 'hsla(var(--text-muted), 0.12)',
                                  color: thread.status === 'ACCEPTED' ? 'hsl(var(--success))'
                                    : thread.status === 'PENDING' ? 'hsl(var(--warning))'
                                    : thread.status === 'DENIED' ? 'hsl(var(--danger))'
                                    : 'hsl(var(--text-muted))'
                                }}>
                                  {getStatusLabel(thread.status)}
                                </span>
                                {thread.status === 'ACCEPTED' && (
                                  <button
                                    onClick={() => handleAdminCloseThread(thread.id)}
                                    className="btn-delete"
                                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'hsla(var(--danger), 0.1)', border: '1px solid hsla(var(--danger), 0.3)', borderRadius: '6px', color: 'hsl(var(--danger))', cursor: 'pointer' }}
                                  >
                                    ❌ {lang === 'ar' ? 'إغلاق المحادثة' : 'Close Chat'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Chat Body (Messages / Requests) */}
                            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflow: 'auto' }}>
                              {thread.status === 'PENDING' ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', gap: '16px' }}>
                                  <div className="glass-panel" style={{ padding: '24px', maxWidth: '400px', textAlign: 'center', backgroundColor: 'hsla(var(--warning), 0.05)', border: '1px solid hsla(var(--warning), 0.25)' }}>
                                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🔔</span>
                                    <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>{lang === 'ar' ? 'طلب محادثة معلق' : 'Pending Message Request'}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '20px' }}>
                                      {lang === 'ar' 
                                        ? `يرغب الموظف ${thread.arabic_first_name || thread.english_first_name} في بدء محادثة معك. هل ترغب في قبول الطلب؟`
                                        : `Employee ${thread.english_first_name} wants to message you. Do you want to accept or deny this request?`}
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                      <button onClick={() => handleRespondRequest(thread.id, 'ACCEPT')} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                        {lang === 'ar' ? 'قبول' : 'Accept'}
                                      </button>
                                      <button onClick={() => handleRespondRequest(thread.id, 'DENY')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'hsl(var(--danger))' }}>
                                        {lang === 'ar' ? 'رفض' : 'Deny'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {messages.map((msg: any, idx: number) => {
                                    if (msg.isSystem) {
                                      return (
                                        <div key={idx} style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: '8px 0' }}>
                                          {getLocalizedSystemMessage(msg.text)}
                                        </div>
                                      );
                                    }
                                    const isAdminMsg = msg.sender === 'admin';
                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          display: 'flex',
                                          justifyContent: isAdminMsg ? 'flex-end' : 'flex-start',
                                          width: '100%'
                                        }}
                                      >
                                        <div style={{
                                          maxWidth: '70%',
                                          padding: '10px 14px',
                                          borderRadius: isAdminMsg ? (isRtl ? '16px 2px 16px 16px' : '2px 16px 16px 16px') : (isRtl ? '2px 16px 16px 16px' : '16px 2px 16px 16px'),
                                          backgroundColor: isAdminMsg ? 'hsl(var(--accent-blue))' : 'hsla(var(--bg-tertiary), 0.6)',
                                          color: isAdminMsg ? '#fff' : 'hsl(var(--text-primary))',
                                          border: isAdminMsg ? 'none' : '1px solid hsla(var(--border-color), 0.5)',
                                          fontSize: '0.85rem',
                                          lineHeight: '1.4'
                                        }}>
                                          <div>{msg.text}</div>
                                          <div style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: isAdminMsg ? 'flex-end' : 'flex-start', color: isAdminMsg ? 'rgba(255,255,255,0.7)' : 'hsl(var(--text-muted))', marginTop: '4px', gap: '4px' }}>
                                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {isAdminMsg && (
                                              msg.read ? (
                                                <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '0.75rem', marginLeft: '2px' }} title="Read">✓✓</span>
                                              ) : (
                                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginLeft: '2px' }} title="Sent">✓</span>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <div ref={messagesEndRef} />
                                </>
                              )}
                            </div>

                            {/* Chat Footer Input */}
                            {thread.status === 'ACCEPTED' && (
                              <form
                                onSubmit={(e) => handleAdminSendMessage(e, thread.id)}
                                style={{ padding: '16px', borderTop: '1px solid hsl(var(--border-color))', display: 'flex', gap: '10px', backgroundColor: 'hsl(var(--bg-secondary))', flexDirection: isRtl ? 'row-reverse' : 'row' }}
                              >
                                <input
                                  ref={chatInputRef}
                                  type="text"
                                  className="form-input"
                                  placeholder={lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
                                  value={adminMessageText}
                                  onChange={(e) => setAdminMessageText(e.target.value)}
                                  style={{ flex: 1 }}
                                />
                                <button type="submit" className="btn-primary" disabled={isSendingAdminMessage || !adminMessageText.trim()} style={{ padding: '10px 20px' }}>
                                  {lang === 'ar' ? 'إرسال' : 'Send'}
                                </button>
                              </form>
                            )}

                            {thread.status === 'CLOSED' && (
                              <div style={{ padding: '16px', borderTop: '1px solid hsl(var(--border-color))', display: 'flex', gap: '12px', backgroundColor: 'hsl(var(--bg-secondary))' }}>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => handleAdminStartChat(thread.employee_id)}
                                  style={{ padding: '10px 24px', fontWeight: 600, flex: 1 }}
                                >
                                  {lang === 'ar' ? 'إعادة فتح المحادثة' : 'Reopen Chat'}
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => handleAdminArchiveThread(thread.id)}
                                  style={{ padding: '10px 24px', fontWeight: 600, flex: 1 }}
                                >
                                  {lang === 'ar' ? 'أرشفة المحادثة' : 'Archive Chat'}
                                </button>
                              </div>
                            )}

                            {thread.status === 'ARCHIVED' && (
                              <div style={{ padding: '16px', borderTop: '1px solid hsl(var(--border-color))', display: 'flex', justifyContent: 'center', backgroundColor: 'hsl(var(--bg-secondary))' }}>
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => handleAdminStartChat(thread.employee_id)}
                                  style={{ padding: '10px 24px', fontWeight: 600, width: '100%' }}
                                >
                                  {lang === 'ar' ? 'إعادة فتح المحادثة' : 'Reopen Chat'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 0: DEPARTMENTS MANAGEMENT */}
              {activeSection === 'departments-management' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                      {lang === 'ar' ? 'إدارة الأقسام' : 'Departments Management'}
                    </h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>
                      {lang === 'ar' 
                        ? 'إنشاء وتعديل وحذف الأقسام الطبية وتعيين المسؤولين.' 
                        : 'Create, modify, and delete hospital departments and manage personnel.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      onClick={handleAddClick}
                      className="btn-primary"
                      style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {formMode !== null ? (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          {lang === 'ar' ? 'إضافة (ADD)' : 'ADD'}
                        </>
                      )}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', transition: 'all 0.3s ease' }}>
                    
                    {/* Form Panel (Create / Edit) */}
                    {formMode !== null && (
                      <div className="glass-panel" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 700 }}>
                          {formMode === 'ADD'
                            ? (lang === 'ar' ? 'إضافة قسم جديد' : 'Add New Department')
                            : (lang === 'ar' ? 'تعديل القسم' : 'Edit Department')
                          }
                        </h3>
                        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'اسم القسم' : 'Department Name'} *
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              required
                              placeholder={lang === 'ar' ? 'أدخل اسم القسم (مثال: الطوارئ)' : 'e.g. Cardiology'}
                              value={newDeptName}
                              onChange={(e) => setNewDeptName(e.target.value)}
                              disabled={isAddingDept}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'الوصف' : 'Description'}
                            </label>
                            <textarea
                              className="form-input"
                              style={{ minHeight: '100px', resize: 'vertical' }}
                              placeholder={lang === 'ar' ? 'أدخل وصف القسم...' : 'Provide details about the department...'}
                              value={newDeptDesc}
                              onChange={(e) => setNewDeptDesc(e.target.value)}
                              disabled={isAddingDept}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'الاسم باللغة العربية (اختياري)' : 'Arabic Name (Optional)'}
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder={lang === 'ar' ? 'أدخل الاسم باللغة العربية' : 'e.g. قسم القلب'}
                              value={newDeptArabicName}
                              onChange={(e) => setNewDeptArabicName(e.target.value)}
                              disabled={isAddingDept}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'الوصف باللغة العربية (اختياري)' : 'Arabic Description (Optional)'}
                            </label>
                            <textarea
                              className="form-input"
                              style={{ minHeight: '80px', resize: 'vertical' }}
                              placeholder={lang === 'ar' ? 'أدخل الوصف باللغة العربية' : 'Arabic details...'}
                              value={newDeptArabicDesc}
                              onChange={(e) => setNewDeptArabicDesc(e.target.value)}
                              disabled={isAddingDept}
                            />
                          </div>
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={isAddingDept}
                            style={{ width: '100%', padding: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            {isAddingDept ? (
                              <>
                                <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid hsla(var(--bg-secondary), 0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                              </>
                            ) : (
                              formMode === 'ADD'
                                ? (lang === 'ar' ? 'حفظ القسم' : 'Save Department')
                                : (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
                            )}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Department Registry Table */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 700 }}>
                        {lang === 'ar' ? 'سجل الأقسام المعتمدة' : 'Department Registry'}
                      </h3>
                      
                      {isLoadingDepts ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid hsla(var(--accent-blue), 0.1)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                      ) : dbDepartments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'hsl(var(--text-muted))' }}>
                          {lang === 'ar' ? 'لا توجد أقسام مسجلة حالياً.' : 'No departments registered yet.'}
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', width: '60px' }}>#</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{lang === 'ar' ? 'الوصف' : 'Description'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{lang === 'ar' ? 'المدير' : 'Manager'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{lang === 'ar' ? 'آخر تعديل' : 'Last Edited'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', width: '100px' }}>{lang === 'ar' ? 'الموظفون' : 'Employees'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', width: '140px' }}>{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dbDepartments.map((dept, index) => (
                                <tr key={dept.id} style={{ borderBottom: '1px solid hsla(var(--border-color), 0.5)' }}>
                                  <td style={{ padding: '12px', fontSize: '0.9rem', color: 'hsl(var(--text-muted))' }}>{index + 1}</td>
                                  <td style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span>{dept.name}</span>
                                      {dept['dept-arabic-name'] && (
                                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--accent-blue))', fontWeight: 500 }}>
                                          {dept['dept-arabic-name']}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={dept.description}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span>{dept.description || '-'}</span>
                                      {dept['dept-arabic-description'] && (
                                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--accent-blue) / 0.7)', fontStyle: 'italic' }}>
                                          {dept['dept-arabic-description']}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                                    {dept.department_management === 'yes' ? (
                                      <span style={{ fontWeight: 600, color: 'hsl(var(--accent-blue))' }}>
                                        {dept.managerName ? `${dept.managerName} (ID: ${dept['department-mgr-id']})` : `Assigned (ID: ${dept['department-mgr-id']})`}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'hsl(var(--accent-blue))', fontStyle: 'italic' }}>
                                        {lang === 'ar' ? 'غير معين' : 'Unassigned'}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                    {dept.last_edited ? new Date(dept.last_edited).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US') : (lang === 'ar' ? 'لم يعدل' : 'Never')}
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.9rem', textAlign: 'center' }}>
                                    <span className="badge" style={{ backgroundColor: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-secondary))', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                                      {dept.employeeCount}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        onClick={() => handleEditClick(dept)}
                                        style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-blue))', cursor: 'pointer', padding: '4px' }}
                                        title={lang === 'ar' ? 'تعديل القسم' : 'Edit Department'}
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                      </button>
                                      
                                      <button
                                        onClick={() => openDeptModal(dept.departmentId, dept.name, 'ADD_EMPLOYEES')}
                                        style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-blue))', cursor: 'pointer', padding: '4px' }}
                                        title={lang === 'ar' ? 'إضافة موظفين' : 'Add Employees'}
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <line x1="12" y1="5" x2="12" y2="19" />
                                          <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                      </button>

                                      <button
                                        onClick={() => openDeptModal(dept.departmentId, dept.name, 'REMOVE_EMPLOYEES')}
                                        style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-blue))', cursor: 'pointer', padding: '4px' }}
                                        title={lang === 'ar' ? 'إزالة موظفين' : 'Remove Employees'}
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                      </button>

                                      <button
                                        onClick={() => openDeptModal(dept.departmentId, dept.name, 'VIEW_EMPLOYEES')}
                                        style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-blue))', cursor: 'pointer', padding: '4px' }}
                                        title={lang === 'ar' ? 'عرض الموظفين والمدير' : 'View Employees'}
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                          <circle cx="12" cy="12" r="3" />
                                        </svg>
                                      </button>

                                      <button
                                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                        style={{ background: 'none', border: 'none', color: 'hsl(var(--danger))', cursor: 'pointer', padding: '4px' }}
                                        title={lang === 'ar' ? 'حذف القسم' : 'Delete'}
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          <line x1="10" y1="11" x2="10" y2="17" />
                                          <line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* EMPLOYEES MANAGEMENT SECTION */}
              {activeSection === 'employees-management' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                      {lang === 'ar' ? 'إدارة الموظفين' : 'Employees Management'}
                    </h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>
                      {lang === 'ar'
                        ? 'إضافة وتعديل وحذف بيانات موظفي المستشفى وإدارة ملفاتهم.'
                        : 'Add, edit, and manage hospital employee records and profiles.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      onClick={handleEmpAddClick}
                      className="btn-primary"
                      style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {empFormMode !== null ? (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          {lang === 'ar' ? 'إلغاء' : 'CANCEL'}
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          {lang === 'ar' ? 'إضافة موظف (ADD)' : 'ADD EMPLOYEE'}
                        </>
                      )}
                    </button>
                  </div>

                  {/* Employee Edit Form Panel (Spacious layout, pushes table down) */}
                  {empFormMode === 'EDIT' && (
                    <div className="glass-panel" style={{ padding: '28px', marginBottom: '30px' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 700 }}>
                        {lang === 'ar' ? 'تعديل بيانات الموظف' : 'Edit Employee Details'}
                      </h3>
                      
                      {editingEmp && (
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px', padding: '12px 20px', background: 'hsl(var(--bg-tertiary))', borderRadius: '10px', border: '1px solid hsl(var(--border-color))' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'hsla(var(--accent-blue), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid hsla(var(--accent-blue), 0.2)', overflow: 'hidden' }}>
                              {empPictureUrl ? <img src={getFullProfilePicUrl(empPictureUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(var(--accent-blue))' }}>{editingEmp.username || '—'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>ID: #{editingEmp.employee_id}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleEmpFormSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                          
                          {/* Column 1: Names & DOB */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'hsl(var(--accent-blue))', fontWeight: 700, borderBottom: '1px solid hsla(var(--border-color), 0.5)', paddingBottom: '6px' }}>
                              {lang === 'ar' ? 'الاسم والبيانات الشخصية' : 'Personal Information'}
                            </h4>
                            
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'الاسم الأول (عربي) *' : 'Arabic First Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empArabicFirst} onChange={e => setEmpArabicFirst(e.target.value)} disabled={isSavingEmp} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'الاسم الأوسط (عربي) *' : 'Arabic Middle Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empArabicMiddle} onChange={e => setEmpArabicMiddle(e.target.value)} disabled={isSavingEmp} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'اسم العائلة (عربي) *' : 'Arabic Last Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empArabicLast} onChange={e => setEmpArabicLast(e.target.value)} disabled={isSavingEmp} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                  {lang === 'ar' ? 'الجنس *' : 'Gender *'}
                                </label>
                                <select className="form-input" required value={empGender} onChange={e => setEmpGender(e.target.value)} disabled={isSavingEmp}>
                                  <option value="">--</option>
                                  <option value="male">{lang === 'ar' ? 'ذكر' : 'Male'}</option>
                                  <option value="female">{lang === 'ar' ? 'أنثى' : 'Female'}</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                  {lang === 'ar' ? 'تاريخ الميلاد *' : 'Date of Birth *'}
                                </label>
                                <input
                                  type={empDob ? 'date' : 'text'}
                                  lang="en"
                                  placeholder={lang === 'ar' ? 'يوم,شهر,سنة' : 'dd/mm/year'}
                                  onFocus={(e) => { e.target.type = 'date'; }}
                                  onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                  className="form-input"
                                  required
                                  value={empDob}
                                  onChange={e => setEmpDob(e.target.value)}
                                  disabled={isSavingEmp}
                                  max={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Column 2: English Name & Contact Info */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'hsl(var(--accent-blue))', fontWeight: 700, borderBottom: '1px solid hsla(var(--border-color), 0.5)', paddingBottom: '6px' }}>
                              {lang === 'ar' ? 'الاسم بالإنجليزية وتفاصيل الاتصال' : 'English Name & Contact'}
                            </h4>
                            
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'الاسم الأول (إنجليزي) *' : 'English First Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empEnglishFirst} onChange={e => setEmpEnglishFirst(e.target.value)} disabled={isSavingEmp} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'الاسم الأوسط (إنجليزي) *' : 'English Middle Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empEnglishMiddle} onChange={e => setEmpEnglishMiddle(e.target.value)} disabled={isSavingEmp} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'اسم العائلة (إنجليزي) *' : 'English Last Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empEnglishLast} onChange={e => setEmpEnglishLast(e.target.value)} disabled={isSavingEmp} />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'رقم الهاتف *' : 'Phone Number *'}
                              </label>
                              <input type="tel" className="form-input" required placeholder={lang === 'ar' ? 'مثال: +966500000000' : 'e.g. +966500000000'} value={empPhone} onChange={e => setEmpPhone(e.target.value)} disabled={isSavingEmp} />
                            </div>
                          </div>

                          {/* Column 3: Job, Email, Salary, Photo */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'hsl(var(--accent-blue))', fontWeight: 700, borderBottom: '1px solid hsla(var(--border-color), 0.5)', paddingBottom: '6px' }}>
                              {lang === 'ar' ? 'الوظيفة والراتب والصورة' : 'Job, Salary & Photo'}
                            </h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                  {lang === 'ar' ? 'نوع التوظيف *' : 'Employment Type *'}
                                </label>
                                <select className="form-input" required value={empType} onChange={e => setEmpType(e.target.value)} disabled={isSavingEmp}>
                                  <option value="">--</option>
                                  <option value="doctor">{lang === 'ar' ? 'طبيب' : 'Doctor'}</option>
                                  <option value="staff">{lang === 'ar' ? 'موظف' : 'Staff'}</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                  {lang === 'ar' ? 'الراتب الشهري *' : 'Monthly Salary *'}
                                </label>
                                <input
                                  type="number"
                                  lang="en"
                                  className="form-input"
                                  required
                                  min="0"
                                  step="25000"
                                  placeholder="25000"
                                  value={empSalary}
                                  onChange={e => setEmpSalary(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      const current = parseFloat(empSalary) || 0;
                                      setEmpSalary((current + 25000).toString());
                                    } else if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      const current = parseFloat(empSalary) || 0;
                                      if (current >= 25000) {
                                        setEmpSalary((current - 25000).toString());
                                      }
                                    }
                                  }}
                                  disabled={isSavingEmp}
                                />
                              </div>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                              </label>
                              <input type="email" className="form-input" required value={empEmail} onChange={e => setEmpEmail(e.target.value)} disabled={isSavingEmp} />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'صورة الموظف *' : 'Employee Photo *'}
                              </label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <label
                                  htmlFor="emp-photo-upload-edit"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                                    background: 'hsla(var(--accent-blue), 0.1)', border: '1px solid hsla(var(--accent-blue), 0.3)',
                                    borderRadius: '8px', color: 'hsl(var(--accent-blue))', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                    opacity: isUploadingEmpPhoto ? 0.6 : 1
                                  }}
                                >
                                  {isUploadingEmpPhoto ? (
                                    <><div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid hsla(var(--accent-blue), 0.2)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                      {lang === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</>
                                  ) : (
                                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                      {lang === 'ar' ? 'تغيير الصورة' : 'Change Photo'}</>
                                  )}
                                </label>
                                <input id="emp-photo-upload-edit" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEmpFileChange} disabled={isUploadingEmpPhoto || isSavingEmp} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '16px' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              setEmpFormMode(null);
                              resetEmpForm();
                            }}
                            disabled={isSavingEmp || isUploadingEmpPhoto}
                            style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSavingEmp || isUploadingEmpPhoto}
                            style={{ padding: '8px 24px', fontSize: '0.85rem', fontWeight: 600 }}
                          >
                            {isSavingEmp ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', transition: 'all 0.3s ease' }}>

                    {/* Employee Add Form Panel */}
                    {empFormMode === 'ADD' && (
                      <div className="glass-panel" style={{ padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.15rem', marginBottom: '18px', fontWeight: 700 }}>
                          {lang === 'ar' ? 'إضافة موظف جديد' : 'Add New Employee'}
                        </h3>

                        <form onSubmit={handleEmpFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          
                          {/* Arabic Names */}
                          <div style={{ fontSize: '0.78rem', color: 'hsl(var(--accent-blue))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-4px' }}>
                            {lang === 'ar' ? 'الاسم باللغة العربية' : 'Arabic Name'}
                          </div>
                          {[
                            { label: lang === 'ar' ? 'الاسم الأول *' : 'Arabic First Name *', val: empArabicFirst, set: setEmpArabicFirst, ph: 'مثال: أحمد' },
                            { label: lang === 'ar' ? 'الاسم الأوسط *' : 'Arabic Middle Name *', val: empArabicMiddle, set: setEmpArabicMiddle, ph: 'مثال: محمد' },
                            { label: lang === 'ar' ? 'اسم العائلة *' : 'Arabic Last Name *', val: empArabicLast, set: setEmpArabicLast, ph: 'مثال: الخالد' },
                          ].map(({ label, val, set, ph }) => (
                            <div key={label}>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>{label}</label>
                              <input type="text" className="form-input" required placeholder={ph} value={val} onChange={e => set(e.target.value)} disabled={isSavingEmp} />
                            </div>
                          ))}

                          {/* English Names */}
                          <div style={{ fontSize: '0.78rem', color: 'hsl(var(--accent-blue))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px', marginBottom: '-4px' }}>
                            {lang === 'ar' ? 'الاسم باللغة الإنجليزية' : 'English Name'}
                          </div>
                          {[
                            { label: lang === 'ar' ? 'الاسم الأول *' : 'English First Name *', val: empEnglishFirst, set: setEmpEnglishFirst, ph: 'e.g. Ahmed' },
                            { label: lang === 'ar' ? 'الاسم الأوسط *' : 'English Middle Name *', val: empEnglishMiddle, set: setEmpEnglishMiddle, ph: 'e.g. Mohamed' },
                            { label: lang === 'ar' ? 'اسم العائلة *' : 'English Last Name *', val: empEnglishLast, set: setEmpEnglishLast, ph: 'e.g. Al-Khaled' },
                          ].map(({ label, val, set, ph }) => (
                            <div key={label}>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>{label}</label>
                              <input type="text" className="form-input" required placeholder={ph} value={val} onChange={e => set(e.target.value)} disabled={isSavingEmp} />
                            </div>
                          ))}

                          {/* Gender */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'الجنس *' : 'Gender *'}
                            </label>
                            <select className="form-input" required value={empGender} onChange={e => setEmpGender(e.target.value)} disabled={isSavingEmp}>
                              <option value="">{lang === 'ar' ? '-- اختر الجنس --' : '-- Select Gender --'}</option>
                              <option value="male">{lang === 'ar' ? 'ذكر' : 'Male'}</option>
                              <option value="female">{lang === 'ar' ? 'أنثى' : 'Female'}</option>
                            </select>
                          </div>

                          {/* Date of Birth */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'تاريخ الميلاد *' : 'Date of Birth *'}
                            </label>
                            <input
                              type={empDob ? 'date' : 'text'}
                              lang="en"
                              placeholder={lang === 'ar' ? 'يوم,شهر,سنة' : 'dd/mm/year'}
                              onFocus={(e) => { e.target.type = 'date'; }}
                              onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                              className="form-input"
                              required
                              value={empDob}
                              onChange={e => setEmpDob(e.target.value)}
                              disabled={isSavingEmp}
                              max={new Date().toISOString().split('T')[0]}
                            />
                          </div>

                          {/* Employment Type */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'نوع التوظيف *' : 'Employment Type *'}
                            </label>
                            <select className="form-input" required value={empType} onChange={e => setEmpType(e.target.value)} disabled={isSavingEmp}>
                              <option value="">{lang === 'ar' ? '-- اختر النوع --' : '-- Select Type --'}</option>
                              <option value="doctor">{lang === 'ar' ? 'طبيب' : 'Doctor'}</option>
                              <option value="staff">{lang === 'ar' ? 'موظف' : 'Staff'}</option>
                            </select>
                          </div>

                          {/* Phone */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'رقم الهاتف *' : 'Phone Number *'}
                            </label>
                            <input type="tel" className="form-input" required placeholder={lang === 'ar' ? 'مثال: +966500000000' : 'e.g. +966500000000'} value={empPhone} onChange={e => setEmpPhone(e.target.value)} disabled={isSavingEmp} />
                          </div>

                          {/* Email */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                            </label>
                            <input type="email" className="form-input" required placeholder={lang === 'ar' ? 'مثال: ahmed@hospital.com' : 'e.g. ahmed@hospital.com'} value={empEmail} onChange={e => setEmpEmail(e.target.value)} disabled={isSavingEmp} />
                          </div>

                          {/* Salary */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'الراتب الشهري (ريال) *' : 'Monthly Salary *'}
                            </label>
                            <input
                              type="number"
                              lang="en"
                              className="form-input"
                              required
                              min="0"
                              step="25000"
                              placeholder={lang === 'ar' ? 'مثال: 25000' : 'e.g. 25000'}
                              value={empSalary}
                              onChange={e => setEmpSalary(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  const current = parseFloat(empSalary) || 0;
                                  setEmpSalary((current + 25000).toString());
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const current = parseFloat(empSalary) || 0;
                                  if (current >= 25000) {
                                    setEmpSalary((current - 25000).toString());
                                  }
                                }
                              }}
                              disabled={isSavingEmp}
                            />
                          </div>

                          {/* Photo Upload */}
                          <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', fontWeight: 600 }}>
                              {lang === 'ar' ? 'صورة الموظف *' : 'Employee Photo *'}
                            </label>
                            {empPictureUrl && (
                              <div style={{ marginBottom: '10px' }}>
                                <img
                                  src={getFullProfilePicUrl(empPictureUrl)}
                                  alt="Employee Preview"
                                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid hsl(var(--accent-blue))' }}
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            )}
                            <label
                              htmlFor="emp-photo-upload"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                                background: 'hsla(var(--accent-blue), 0.1)', border: '1px solid hsla(var(--accent-blue), 0.3)',
                                borderRadius: '8px', color: 'hsl(var(--accent-blue))', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                opacity: isUploadingEmpPhoto ? 0.6 : 1
                              }}
                            >
                              {isUploadingEmpPhoto ? (
                                <><div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid hsla(var(--accent-blue), 0.2)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                  {lang === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</>
                              ) : (
                                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                  {lang === 'ar' ? 'رفع صورة' : 'Upload Photo'}</>
                              )}
                            </label>
                            <input id="emp-photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEmpFileChange} disabled={isUploadingEmpPhoto || isSavingEmp} />
                            {!empPictureUrl && (
                              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '6px' }}>
                                {lang === 'ar' ? 'يجب رفع صورة للموظف قبل الحفظ.' : 'A photo must be uploaded before saving.'}
                              </p>
                            )}
                          </div>

                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSavingEmp || isUploadingEmpPhoto}
                            style={{ width: '100%', padding: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
                          >
                            {isSavingEmp ? (
                              <><div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid hsla(var(--bg-secondary), 0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</>
                            ) : (
                              lang === 'ar' ? 'حفظ الموظف' : 'Save Employee'
                            )}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Employees Registry Table */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 700 }}>
                        {lang === 'ar' ? 'سجل الموظفين' : 'Employee Registry'}
                      </h3>

                      {isLoadingEmps ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid hsla(var(--accent-blue), 0.1)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        </div>
                      ) : dbEmployees.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'hsl(var(--text-muted))' }}>
                          {lang === 'ar' ? 'لا يوجد موظفون مسجلون حالياً.' : 'No employees registered yet.'}
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem', width: '50px' }}>#</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{lang === 'ar' ? 'الصورة' : 'Photo'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{lang === 'ar' ? 'اسم المستخدم' : 'Username'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{lang === 'ar' ? 'الجنس' : 'Gender'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{lang === 'ar' ? 'العنوان الوظيفي' : 'Title'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{lang === 'ar' ? 'الراتب' : 'Salary'}</th>
                                <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.82rem', width: '100px' }}>{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dbEmployees.map((emp, index) => (
                                <tr key={emp.employee_id} style={{ borderBottom: '1px solid hsla(var(--border-color), 0.5)' }}>
                                  <td style={{ padding: '12px', fontSize: '0.88rem', color: 'hsl(var(--text-muted))' }}>{index + 1}</td>
                                  <td style={{ padding: '12px' }}>
                                    {emp.employee_picture_url ? (
                                      <img
                                        src={getFullProfilePicUrl(emp.employee_picture_url)}
                                        alt="Employee"
                                        onClick={() => setLightboxImageUrl(getFullProfilePicUrl(emp.employee_picture_url))}
                                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid hsla(var(--accent-blue), 0.3)', cursor: 'zoom-in' }}
                                        onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    ) : (
                                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'hsla(var(--accent-blue), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid hsla(var(--accent-blue), 0.2)' }}>
                                        <span style={{ fontSize: '1rem' }}>👤</span>
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span>{`${emp.english_first_name} ${emp.english_middle_name} ${emp.english_last_name}`}</span>
                                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--accent-blue))', fontWeight: 500 }} dir="rtl">
                                        {`${emp.arabic_first_name} ${emp.arabic_middle_name} ${emp.arabic_last_name}`}
                                      </span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.85rem', color: 'hsl(var(--accent-blue))', fontWeight: 500 }}>
                                    {emp.username || '—'}
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.85rem', color: 'hsl(var(--accent-blue))', fontWeight: 500 }}>
                                    {emp.gender === 'male' ? (lang === 'ar' ? 'ذكر' : 'Male') : (lang === 'ar' ? 'أنثى' : 'Female')}
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    <span style={{
                                      padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                      background: 'hsla(var(--accent-blue), 0.1)',
                                      color: 'hsl(var(--accent-blue))',
                                      border: '1px solid hsla(var(--accent-blue), 0.25)',
                                      marginLeft: isRtl ? '0' : '-10px',
                                      marginRight: isRtl ? '-10px' : '0',
                                      display: 'inline-block'
                                    }}>
                                      {emp.employment_type === 'doctor' ? (lang === 'ar' ? 'طبيب' : 'Doctor') : (lang === 'ar' ? 'موظف' : 'Staff')}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                                    {emp.title === 'Manager' ? (
                                      <span style={{ fontWeight: 600, color: 'hsl(var(--accent-blue))' }}>
                                        {lang === 'ar' ? 'مدير' : 'Manager'}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'hsl(var(--accent-blue))' }}>
                                        {lang === 'ar' ? 'لا يوجد' : 'none'}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.82rem', color: 'hsl(var(--accent-blue))', fontWeight: 500, maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={emp.email}>
                                    {emp.email}
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.82rem', color: 'hsl(var(--accent-blue))', fontWeight: 500 }}>
                                    {emp.phone_number || '—'}
                                  </td>
                                  <td style={{ padding: '12px', fontSize: '0.85rem', color: 'hsl(var(--accent-blue))', fontWeight: 600 }}>
                                    {emp.salary ? Number(emp.salary).toLocaleString('en-US') : '—'}
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        onClick={() => handleEmpEditClick(emp)}
                                        style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-blue))', cursor: 'pointer', padding: '4px' }}
                                        title={lang === 'ar' ? 'تعديل' : 'Edit'}
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEmployee(emp.employee_id, `${emp.english_first_name} ${emp.english_last_name}`)}
                                        style={{ background: 'none', border: 'none', color: 'hsl(var(--danger))', cursor: 'pointer', padding: '4px' }}
                                        title={lang === 'ar' ? 'حذف' : 'Delete'}
                                      >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* SECTION 1: EXECUTIVE SUMMARY KPIs */}
              {activeSection === 'executive-summary' && (

                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{t.kpiTitle}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{t.kpiDesc}</p>
                  </div>

                  {/* KPI Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>🛏️</span>
                      <h4 style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.kpiBedRate}</h4>
                      <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>86.8%</div>
                      {/* Simple custom SVG Sparkline */}
                      <svg width="100%" height="24" viewBox="0 0 100 20" style={{ marginTop: '8px' }}>
                        <path d="M0,15 Q25,12 50,8 T100,5" fill="none" stroke="hsl(var(--accent-teal))" strokeWidth="2" />
                      </svg>
                      <p style={{ color: 'hsl(var(--success))', fontSize: '0.75rem', marginTop: '4px' }}>{t.kpiIncreaseYesterday}</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>📅</span>
                      <h4 style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.kpiLengthStay}</h4>
                      <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>{lang === 'ar' ? '4.8 أيام' : '4.8 Days'}</div>
                      <svg width="100%" height="24" viewBox="0 0 100 20" style={{ marginTop: '8px' }}>
                        <path d="M0,5 Q25,9 50,15 T100,10" fill="none" stroke="hsl(var(--accent-blue))" strokeWidth="2" />
                      </svg>
                      <p style={{ color: 'hsl(var(--success))', fontSize: '0.75rem', marginTop: '4px' }}>{t.kpiDecreaseOptimized}</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>💲</span>
                      <h4 style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.kpiNetBilling}</h4>
                      <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>$3,845,900</div>
                      <svg width="100%" height="24" viewBox="0 0 100 20" style={{ marginTop: '8px' }}>
                        <path d="M0,18 Q25,14 50,10 T100,2" fill="none" stroke="hsl(var(--accent-purple))" strokeWidth="2" />
                      </svg>
                      <p style={{ color: 'hsl(var(--success))', fontSize: '0.75rem', marginTop: '4px' }}>{t.kpiAboveProjections}</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>🧑‍⚕️</span>
                      <h4 style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.kpiStaffRatio}</h4>
                      <div style={{ fontSize: '2.2rem', fontWeight: 800 }}>1:2.4</div>
                      <svg width="100%" height="24" viewBox="0 0 100 20" style={{ marginTop: '8px' }}>
                        <path d="M0,10 Q25,10 50,10 T100,10" fill="none" stroke="hsl(var(--text-muted))" strokeWidth="2" />
                      </svg>
                      <p style={{ color: 'hsl(var(--warning))', fontSize: '0.75rem', marginTop: '4px' }}>{t.kpiStableRange}</p>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>{t.quickActions}</h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button className="btn-primary" onClick={() => handleFutureFeature(t.actionExportPdf)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{t.actionExportPdf}</button>
                      <button className="btn-secondary" onClick={() => handleFutureFeature(t.actionRecalculate)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{t.actionRecalculate}</button>
                      <button className="btn-secondary" onClick={() => handleFutureFeature(t.actionConfigureThresholds)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{t.actionConfigureThresholds}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: HOSPITAL STATUS OVERVIEW */}
              {activeSection === 'hospital-status' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{t.statusTitle}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{t.statusDesc}</p>
                  </div>

                  <div className="hospital-status-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', alignItems: 'start' }}>
                    
                    {/* Status Overview Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="glass-panel" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>{t.capacityMetricsTitle}</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                              <span>{t.erTrafficLabel}</span>
                              <span style={{ fontWeight: 600, color: erTraffic === 'HIGH' ? 'hsl(var(--danger))' : 'hsl(var(--success))' }}>
                                {erTraffic === 'HIGH' ? (lang === 'ar' ? 'مرتفع' : 'HIGH') : (lang === 'ar' ? 'طبيعي' : 'NORMAL')}
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'hsl(var(--bg-tertiary))', borderRadius: '4px' }}>
                              <div style={{ width: erTraffic === 'HIGH' ? '85%' : '40%', height: '100%', background: erTraffic === 'HIGH' ? 'hsl(var(--danger))' : 'hsl(var(--success))', borderRadius: '4px' }} />
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                              <span>{t.icuAvailabilityLabel}</span>
                              <span style={{ fontWeight: 600 }}>{icuBedsFree} {t.bedsLeft}</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'hsl(var(--bg-tertiary))', borderRadius: '4px' }}>
                              <div style={{ width: `${(15 - icuBedsFree) / 15 * 100}%`, height: '100%', background: icuBedsFree < 4 ? 'hsl(var(--warning))' : 'hsl(var(--accent-blue))', borderRadius: '4px' }} />
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                              <span>{t.ambulancesFieldLabel}</span>
                              <span style={{ fontWeight: 600 }}>{activeAmbulances} {t.dispatch}</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'hsl(var(--bg-tertiary))', borderRadius: '4px' }}>
                              <div style={{ width: `${activeAmbulances / 8 * 100}%`, height: '100%', background: 'hsl(var(--accent-teal))', borderRadius: '4px' }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Buttons */}
                      <div className="glass-panel" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>{t.incidentActionsTitle}</h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className="btn-primary"
                            onClick={() => {
                              setErTraffic('HIGH');
                              setIcuBedsFree(1);
                              setActiveAmbulances(8);
                              triggerToast(lang === 'ar' ? 'تم إعلان حالة الطوارئ القصوى (الرمز الأحمر) في الأقسام.' : 'CRITICAL CODE RED Status declared across wards.');
                            }}
                            style={{ background: 'linear-gradient(135deg, hsl(var(--danger)), #900)', border: 'none', boxShadow: 'none' }}
                          >
                            {t.declareCodeRedBtn}
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => {
                              setErTraffic('NORMAL');
                              setIcuBedsFree(6);
                              setActiveAmbulances(3);
                              triggerToast(lang === 'ar' ? 'تمت إعادة تعيين حالة الأقسام إلى الطبيعية.' : 'Wards status returned to green.');
                            }}
                          >
                            {t.resetStatusBtn}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Operational Map Mock Widget */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>{t.interactiveBedMapTitle}</h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '10px',
                        background: 'hsl(var(--bg-tertiary))',
                        padding: '16px',
                        borderRadius: '12px',
                        textAlign: 'center'
                      }}>
                        {Array.from({ length: 16 }).map((_, idx) => {
                          const isOccupied = idx !== 4 && idx !== 9 && idx !== 13;
                          return (
                            <div
                              key={idx}
                              onClick={() => handleFutureFeature(lang === 'ar' ? `بيانات السرير الباطنية ${idx + 101}` : `Bed ${idx + 101} patient metadata`)}
                              className="bed-map-cell"
                              style={{
                                padding: '12px 6px',
                                borderRadius: '6px',
                                background: isOccupied ? 'hsla(var(--danger), 0.1)' : 'hsla(var(--success), 0.1)',
                                border: '1px solid',
                                borderColor: isOccupied ? 'hsla(var(--danger), 0.4)' : 'hsla(var(--success), 0.4)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                transition: 'var(--transition-smooth)'
                              }}
                              title={isOccupied ? (lang === 'ar' ? 'السرير مشغول' : 'Bed Occupied') : (lang === 'ar' ? 'السرير شاغر' : 'Bed Available')}
                            >
                              <div>B{idx + 101}</div>
                              <div style={{ color: isOccupied ? 'hsl(var(--danger))' : 'hsl(var(--success))', fontSize: '0.65rem', fontWeight: 600, marginTop: '4px' }}>
                                {isOccupied ? (lang === 'ar' ? 'مشغول' : 'OCC') : (lang === 'ar' ? 'شاغر' : 'VAC')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button className="btn-secondary" onClick={() => handleFutureFeature(t.bedLayoutBtn)} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', marginTop: '16px' }}>
                        {t.bedLayoutBtn}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* SECTION 3: PENDING APPROVALS */}
              {activeSection === 'pending-approvals' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{t.signOffTitle}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{t.signOffDesc}</p>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{t.tableId}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{t.tableDetails}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{t.tableDept}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{t.tableCost}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{t.tableStatus}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'left' : 'right' }}>{t.tableActions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingApprovals.map((req) => (
                          <tr key={req.id} style={{ borderBottom: '1px solid hsla(var(--border-color), 0.5)' }}>
                            <td style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--accent-blue))' }}>{req.id}</td>
                            <td style={{ padding: '16px 12px' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{req.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>{lang === 'ar' ? 'التاريخ' : 'Date'}: {req.date}</div>
                            </td>
                            <td style={{ padding: '16px 12px', fontSize: '0.85rem' }}>{req.requester}</td>
                            <td style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: 600 }}>{req.amount}</td>
                            <td style={{ padding: '16px 12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: req.status === 'APPROVED' ? 'hsla(var(--success), 0.15)' : req.status === 'REJECTED' ? 'hsla(var(--danger), 0.15)' : 'hsla(var(--warning), 0.15)',
                                color: req.status === 'APPROVED' ? 'hsl(var(--success))' : req.status === 'REJECTED' ? 'hsl(var(--danger))' : 'hsl(var(--warning))'
                              }}>
                                {req.status === 'APPROVED' ? (lang === 'ar' ? 'معتمد' : 'APPROVED') : req.status === 'REJECTED' ? (lang === 'ar' ? 'مرفوض' : 'REJECTED') : (lang === 'ar' ? 'معلق' : 'PENDING')}
                              </span>
                            </td>
                            <td style={{ padding: '16px 12px', textAlign: isRtl ? 'left' : 'right' }}>
                              {req.status === 'PENDING' ? (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
                                  <button
                                    onClick={() => handleApprove(req.id, req.title)}
                                    className="btn-approve"
                                    style={{
                                      backgroundColor: 'hsla(var(--success), 0.15)',
                                      color: 'hsl(var(--success))',
                                      border: '1px solid hsla(var(--success), 0.4)',
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem',
                                      fontWeight: 600
                                    }}
                                  >
                                    {t.btnApprove}
                                  </button>
                                  <button
                                    onClick={() => handleDeny(req.id, req.title)}
                                    className="btn-deny"
                                    style={{
                                      backgroundColor: 'hsla(var(--danger), 0.15)',
                                      color: 'hsl(var(--danger))',
                                      border: '1px solid hsla(var(--danger), 0.4)',
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem',
                                      fontWeight: 600
                                    }}
                                  >
                                    {t.btnDeny}
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>{lang === 'ar' ? 'تمت معالجته' : 'Processed'}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 4: DEPARTMENT PERFORMANCE */}
              {activeSection === 'department-performance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{lang === 'ar' ? 'أداء الأقسام الطبية والتقييمات' : 'Department Index & Ratings'}</h2>
                      <p style={{ color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'مؤشرات الأداء وأوقات الانتظار مصنفة حسب التخصصات السريرية.' : 'Performance and wait times cataloged by clinical specialties.'}</p>
                    </div>
                    <button className="btn-primary" onClick={() => handleFutureFeature(lang === 'ar' ? 'إضافة قسم' : 'Add Department')} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{lang === 'ar' ? 'إضافة قسم' : 'Add Department'}</button>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{lang === 'ar' ? 'اسم القسم' : 'Department Name'}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{lang === 'ar' ? 'رئيس القسم السريري' : 'Clinical Chief'}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{lang === 'ar' ? 'إشغال الأسرة' : 'Bed Occupancy'}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{lang === 'ar' ? 'معدل الرضا' : 'Satisfaction Rating'}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{lang === 'ar' ? 'متوسط وقت الانتظار' : 'Avg Wait Time'}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{lang === 'ar' ? 'الكادر النشط' : 'Active Staff'}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'left' : 'right' }}>{lang === 'ar' ? 'الإجراء' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.map((dept) => {
                          const deptNamesAr: Record<string, string> = {
                            Cardiology: 'قسم القلب',
                            Oncology: 'قسم الأورام',
                            Pediatrics: 'قسم الأطفال',
                            Emergency: 'قسم الطوارئ',
                            Neurology: 'قسم الأعصاب'
                          };
                          const chiefsAr: Record<string, string> = {
                            'Dr. Sarah Carter': 'د. سارة كارتر',
                            'Dr. David Foster': 'د. ديفيد فوستر',
                            'Dr. Elena Rostova': 'د. إيلينا روستوفا',
                            'Dr. James Thorne': 'د. جيمس ثورن',
                            'Dr. Alan Vance': 'د. ألان فانس'
                          };
                          return (
                            <tr key={dept.name} style={{ borderBottom: '1px solid hsla(var(--border-color), 0.5)' }}>
                              <td style={{ padding: '16px 12px', fontWeight: 600 }}>{lang === 'ar' ? deptNamesAr[dept.name] : dept.name}</td>
                              <td style={{ padding: '16px 12px', fontSize: '0.85rem' }}>{lang === 'ar' ? chiefsAr[dept.director] : dept.director}</td>
                              <td style={{ padding: '16px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{dept.occupancy}%</span>
                                  <div style={{ width: '60px', height: '6px', background: 'hsl(var(--bg-tertiary))', borderRadius: '3px' }}>
                                    <div style={{ width: `${dept.occupancy}%`, height: '100%', background: dept.occupancy > 90 ? 'hsl(var(--danger))' : 'hsl(var(--accent-teal))', borderRadius: '3px' }} />
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--warning))' }}>⭐ {dept.rating} / 5.0</td>
                              <td style={{ padding: '16px 12px', fontSize: '0.85rem' }}>{lang === 'ar' ? dept.waitTime.replace('mins', 'دقيقة') : dept.waitTime}</td>
                              <td style={{ padding: '16px 12px', fontSize: '0.85rem' }}>{dept.activeStaff} {lang === 'ar' ? 'ممارس صحي' : 'Clinicians'}</td>
                              <td style={{ padding: '16px 12px', textAlign: isRtl ? 'left' : 'right' }}>
                                <button
                                  onClick={() => handleFutureFeature(lang === 'ar' ? 'تعديل رئيس القسم' : `Editing Departments`)}
                                  className="btn-text-action"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'hsl(var(--accent-blue))',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600
                                  }}
                                >
                                  {lang === 'ar' ? 'تعديل الرئيس' : 'Edit Chief'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 5: FINANCIAL OVERVIEW */}
              {activeSection === 'financial-overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{lang === 'ar' ? 'المركز المالي للمستشفى' : 'Hospital Financial Center'}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'مراجعة مصادر الإيرادات والمصروفات وتوزيع ميزانيات الأقسام.' : 'Review revenue streams, costs, and cost allocations.'}</p>
                  </div>

                  <div className="financial-grid-container" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
                    
                    {/* SVG Chart Panel */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>{lang === 'ar' ? 'اتجاه الإيرادات والمصروفات (النصف الأول 2026)' : 'Revenue & Expenses Trend (H1 2026)'}</h3>
                      
                      {/* High-fidelity Custom SVG Area Chart */}
                      <svg width="100%" height="220" viewBox="0 0 500 200" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--accent-blue))" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="hsl(var(--accent-blue))" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--accent-purple))" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="hsl(var(--accent-purple))" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Background Grid Lines */}
                        <line x1="40" y1="40" x2="480" y2="40" stroke="hsla(var(--border-color), 0.4)" strokeDasharray="3" />
                        <line x1="40" y1="90" x2="480" y2="90" stroke="hsla(var(--border-color), 0.4)" strokeDasharray="3" />
                        <line x1="40" y1="140" x2="480" y2="140" stroke="hsla(var(--border-color), 0.4)" strokeDasharray="3" />
                        <line x1="40" y1="170" x2="480" y2="170" stroke="hsla(var(--border-color), 0.8)" />

                        {/* Y-Axis Labels */}
                        <text x="30" y="44" fill="hsl(var(--text-muted))" fontSize="9" textAnchor="end">{lang === 'ar' ? '1 مليون$' : '$1M'}</text>
                        <text x="30" y="94" fill="hsl(var(--text-muted))" fontSize="9" textAnchor="end">{lang === 'ar' ? '500 ألف$' : '$500k'}</text>
                        <text x="30" y="144" fill="hsl(var(--text-muted))" fontSize="9" textAnchor="end">{lang === 'ar' ? '100 ألف$' : '$100k'}</text>

                        {/* Area Fill path (Revenue) */}
                        <path d="M 40 170 L 40 120 L 120 100 L 200 70 L 280 60 L 360 45 L 440 30 L 480 30 L 480 170 Z" fill="url(#revGrad)" />
                        {/* Stroke Path (Revenue) */}
                        <path d="M 40 120 L 120 100 L 200 70 L 280 60 L 360 45 L 440 30 L 480 30" fill="none" stroke="hsl(var(--accent-blue))" strokeWidth="3.5" />

                        {/* Area Fill path (Expenses) */}
                        <path d="M 40 170 L 40 140 L 120 135 L 200 110 L 280 115 L 360 90 L 440 85 L 480 85 L 480 170 Z" fill="url(#expGrad)" />
                        {/* Stroke Path (Expenses) */}
                        <path d="M 40 140 L 120 135 L 200 110 L 280 115 L 360 90 L 440 85 L 480 85" fill="none" stroke="hsl(var(--accent-purple))" strokeWidth="2.5" />

                        {/* X-Axis Month labels */}
                        <text x="40" y="190" fill="hsl(var(--text-muted))" fontSize="9" textAnchor="middle">{lang === 'ar' ? 'يناير' : 'Jan'}</text>
                        <text x="120" y="190" fill="hsl(var(--text-muted))" fontSize="9" textAnchor="middle">{lang === 'ar' ? 'فبراير' : 'Feb'}</text>
                        <text x="200" y="190" fill="hsl(var(--text-muted))" fontSize="9" textAnchor="middle">{lang === 'ar' ? 'مارس' : 'Mar'}</text>
                        <text x="280" y="190" fill="hsl(var(--text-muted))" fontSize="9" textAnchor="middle">{lang === 'ar' ? 'أبريل' : 'Apr'}</text>
                        <text x="360" y="190" fill="hsl(var(--text-muted))" fontSize="9" textAnchor="middle">{lang === 'ar' ? 'مايو' : 'May'}</text>
                        <text x="440" y="190" fill="hsl(var(--text-muted))" fontSize="9" textAnchor="middle">{lang === 'ar' ? 'يونيو' : 'Jun'}</text>

                        {/* Chart Legend */}
                        <circle cx="320" cy="15" r="4" fill="hsl(var(--accent-blue))" />
                        <text x="330" y="18" fill="hsl(var(--text-secondary))" fontSize="9">{lang === 'ar' ? 'إيرادات الفواتير' : 'Billing Revenue'}</text>
                        <circle cx="415" cy="15" r="4" fill="hsl(var(--accent-purple))" />
                        <text x="425" y="18" fill="hsl(var(--text-secondary))" fontSize="9">{lang === 'ar' ? 'المصروفات' : 'Expenses'}</text>
                      </svg>
                    </div>

                    {/* Cost Center Breakdown */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>{lang === 'ar' ? 'تخصيص التكاليف والميزانية' : 'Cost Allocations'}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span>{lang === 'ar' ? 'رواتب الأطباء والتمريض' : 'Physician & Nurse Salaries'}</span>
                            <span>42%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'hsl(var(--bg-tertiary))', borderRadius: '3px' }}>
                            <div style={{ width: '42%', height: '100%', background: 'hsl(var(--accent-teal))', borderRadius: '3px' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span>{lang === 'ar' ? 'صيانة المعدات الطبية' : 'Equipment Maintenance'}</span>
                            <span>28%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'hsl(var(--bg-tertiary))', borderRadius: '3px' }}>
                            <div style={{ width: '28%', height: '100%', background: 'hsl(var(--accent-blue))', borderRadius: '3px' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span>{lang === 'ar' ? 'المستلزمات الصيدلانية والأدوية' : 'Pharmaceuticals Supplies'}</span>
                            <span>20%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'hsl(var(--bg-tertiary))', borderRadius: '3px' }}>
                            <div style={{ width: '20%', height: '100%', background: 'hsl(var(--accent-purple))', borderRadius: '3px' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span>{lang === 'ar' ? 'المرافق العامة والإدارة' : 'Utilities & Administration'}</span>
                            <span>10%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'hsl(var(--bg-tertiary))', borderRadius: '3px' }}>
                            <div style={{ width: '10%', height: '100%', background: 'hsl(var(--text-muted))', borderRadius: '3px' }} />
                          </div>
                        </div>
                      </div>
                      <button className="btn-secondary" onClick={() => handleFutureFeature(lang === 'ar' ? 'تعديل إعدادات التخصيص' : 'Change allocation settings')} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', marginTop: '24px' }}>
                        {lang === 'ar' ? 'تعديل إعدادات التخصيص' : 'Modify Allocation Settings'}
                      </button>
                    </div>

                  </div>

                  {/* Budget form */}
                  {budgetFormMode !== null && (
                    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 700 }}>
                        {budgetFormMode === 'ADD'
                          ? (lang === 'ar' ? 'إضافة ميزانية جديدة' : 'Add New Budget')
                          : (lang === 'ar' ? 'تعديل الميزانية' : 'Edit Budget')}
                      </h3>
                      <form onSubmit={handleBudgetFormSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                            {lang === 'ar' ? 'اسم الميزانية *' : 'Budget Name *'}
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            required
                            placeholder={lang === 'ar' ? 'مثال: صيانة' : 'e.g. maintenance'}
                            value={budgetNameInput}
                            onChange={(e) => setBudgetNameInput(e.target.value)}
                            disabled={isSavingBudget}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                            {lang === 'ar' ? 'المبلغ المالي *' : 'Budget Amount *'}
                          </label>
                          <input
                            type="number"
                            lang="en"
                            className="form-input"
                            required
                            step="100000"
                            placeholder={lang === 'ar' ? 'مثال: 100000' : 'e.g. 100000'}
                            value={budgetAmountInput}
                            onChange={(e) => setBudgetAmountInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                const current = parseFloat(budgetAmountInput) || 0;
                                setBudgetAmountInput((current + 100000).toString());
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                const current = parseFloat(budgetAmountInput) || 0;
                                if (current >= 100000) {
                                  setBudgetAmountInput((current - 100000).toString());
                                }
                              }
                            }}
                            disabled={isSavingBudget}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="submit" className="btn-primary" disabled={isSavingBudget} style={{ padding: '10px 20px' }}>
                            {isSavingBudget ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              setBudgetFormMode(null);
                              setEditingBudget(null);
                              setBudgetNameInput('');
                              setBudgetAmountInput('');
                            }}
                            disabled={isSavingBudget}
                            style={{ padding: '10px 20px' }}
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Overall Budget Registry */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{lang === 'ar' ? 'جدول الميزانية الإجمالية' : 'Overall Budget Registry'}</h3>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setBudgetFormMode('ADD');
                          setEditingBudget(null);
                          setBudgetNameInput('');
                          setBudgetAmountInput('');
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        {lang === 'ar' ? 'إضافة ميزانية' : 'Add Budget'}
                      </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                            <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{lang === 'ar' ? 'معرف الميزانية' : 'Budget ID'}</th>
                            <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{lang === 'ar' ? 'اسم الميزانية' : 'Budget Name'}</th>
                            <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{lang === 'ar' ? 'المبلغ المالي' : 'Budget Amount'}</th>
                            <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{lang === 'ar' ? 'عداد الميزانية' : 'Budget Counter'}</th>
                            <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{lang === 'ar' ? 'آخر تحديث' : 'Last Updated'}</th>
                            <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', width: '80px' }}>{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetData.map((b) => (
                            <tr key={b.budget_id} style={{ borderBottom: '1px solid hsla(var(--border-color), 0.5)' }}>
                              <td style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--accent-blue))' }}>{b.budget_id}</td>
                              <td style={{ padding: '16px 12px', fontSize: '0.88rem', fontWeight: 500 }}>
                                {b.budget_name === 'salaries' ? (lang === 'ar' ? 'الرواتب' : 'salaries') : b.budget_name}
                              </td>
                              <td style={{ padding: '16px 12px', fontSize: '0.88rem', fontWeight: 600, color: Number(b.budget_amount) < 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))' }}>
                                {Number(b.budget_amount).toLocaleString('en-US')}
                              </td>
                              <td style={{ padding: '16px 12px', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                                {b.budget_counter} {lang === 'ar' ? 'رواتب نشطة' : 'active salaries'}
                              </td>
                              <td style={{ padding: '16px 12px', fontSize: '0.82rem', color: 'hsl(var(--text-muted))' }}>
                                {new Date(b.updated_at).toLocaleString()}
                              </td>
                              <td style={{ padding: '16px 12px' }}>
                                <button
                                  onClick={() => {
                                    setBudgetFormMode('EDIT');
                                    setEditingBudget(b);
                                    setBudgetNameInput(b.budget_name);
                                    setBudgetAmountInput(b.budget_amount.toString());
                                  }}
                                  style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-blue))', cursor: 'pointer', padding: '4px' }}
                                  title={lang === 'ar' ? 'تعديل' : 'Edit'}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {budgetData.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                                {lang === 'ar' ? 'لا توجد بيانات ميزانية متوفرة' : 'No budget data available'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* SECTION 6: WORKFORCE OVERVIEW */}
              {activeSection === 'workforce-overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{t.workforceTitle}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{t.workforceDesc}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {/* Headcount Stat Panels */}
                    {[
                      { role: lang === 'ar' ? 'الأطباء والاستشاريون' : 'Doctors / Physicians', count: 124, active: 82, coverage: '94%', icon: '🩺' },
                      { role: lang === 'ar' ? 'الممرضون القانونيون' : 'Registered Nurses', count: 342, active: 218, coverage: '98%', icon: '🧑‍⚕️' },
                      { role: lang === 'ar' ? 'الإدارة والموارد البشرية' : 'Administration & HR', count: 85, active: 45, coverage: '100%', icon: '💼' },
                      { role: lang === 'ar' ? 'المخبريون والفنيون' : 'Technicians / Labs', count: 96, active: 62, coverage: '90%', icon: '🔬' }
                    ].map((staff) => (
                      <div key={staff.role} className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ fontSize: '2.5rem' }}>{staff.icon}</span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textTransform: 'uppercase' }}>{staff.role}</h4>
                          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0' }}>{staff.count} {t.workforceTotal}</div>
                          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>{t.workforceActive}: {staff.active} ({staff.coverage} {t.workforceCover})</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>{t.workforceActions}</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="btn-primary" onClick={() => handleFutureFeature(t.btnViewSchedule)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{t.btnViewSchedule}</button>
                      <button className="btn-secondary" onClick={() => handleFutureFeature(t.btnRequestTemp)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{t.btnRequestTemp}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 7: ALERTS CENTER */}
              {activeSection === 'alerts-center' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{t.alertsTitle}</h2>
                      <p style={{ color: 'hsl(var(--text-secondary))' }}>{t.alertsDesc}</p>
                    </div>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setAlerts((prev: any[]) => prev.map((alt: any) => ({ ...alt, resolved: true })));
                        triggerToast(lang === 'ar' ? 'تمت معالجة جميع التنبيهات.' : 'All alerts resolved.');
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      {lang === 'ar' ? 'معالجة جميع التنبيهات' : 'Resolve All Alerts'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {alerts.map((alt: any) => (
                      <div
                        key={alt.id}
                        className="glass-panel"
                        style={{
                          padding: '20px 24px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderLeft: isRtl ? 'none' : '4px solid',
                          borderRight: isRtl ? '4px solid' : 'none',
                          borderLeftColor: isRtl ? 'transparent' : (alt.resolved ? 'hsl(var(--success))' : alt.severity === 'CRITICAL' ? 'hsl(var(--danger))' : alt.severity === 'HIGH' ? 'hsl(var(--warning))' : 'hsl(var(--accent-blue))'),
                          borderRightColor: isRtl ? (alt.resolved ? 'hsl(var(--success))' : alt.severity === 'CRITICAL' ? 'hsl(var(--danger))' : alt.severity === 'HIGH' ? 'hsl(var(--warning))' : 'hsl(var(--accent-blue))') : 'transparent',
                          opacity: alt.resolved ? 0.6 : 1,
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: alt.severity === 'CRITICAL' ? 'hsla(var(--danger), 0.2)' : alt.severity === 'HIGH' ? 'hsla(var(--warning), 0.2)' : 'hsla(var(--accent-blue), 0.2)',
                              color: alt.severity === 'CRITICAL' ? 'hsl(var(--danger))' : alt.severity === 'HIGH' ? 'hsl(var(--warning))' : 'hsl(var(--accent-blue))'
                            }}>
                              {alt.severity === 'CRITICAL' ? (lang === 'ar' ? 'حرِج' : 'CRITICAL') : alt.severity === 'HIGH' ? (lang === 'ar' ? 'مرتفع' : 'HIGH') : (lang === 'ar' ? 'تحذير' : 'WARNING')}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{lang === 'ar' ? alt.time.replace('mins ago', 'دقائق مضت').replace('hour ago', 'ساعة مضت') : alt.time}</span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: alt.resolved ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))' }}>{alt.message}</div>
                        </div>

                        <div>
                          {!alt.resolved ? (
                            <button
                              onClick={() => handleResolveAlert(alt.id)}
                              className="btn-resolve"
                              style={{
                                padding: '6px 14px',
                                border: '1px solid hsla(var(--success), 0.4)',
                                backgroundColor: 'hsla(var(--success), 0.15)',
                                color: 'hsl(var(--success))',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {t.btnResolve}
                            </button>
                          ) : (
                            <span style={{ color: 'hsl(var(--success))', fontSize: '0.85rem', fontWeight: 600 }}>{t.resolvedLabel}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 8: INTERNAL REQUESTS BOARD */}
              {activeSection === 'internal-requests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{lang === 'ar' ? 'لوحة طلبات العمليات التشغيلية' : 'Operations Requests Board'}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'الدعم التشغيلي، صيانة الأجهزة، وقائمة طلبات تجديد المخزون.' : 'Operational support, equipment repair, and stock replenishment queue.'}</p>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{t.tableId}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{lang === 'ar' ? 'البند المطلوب / المهمة' : 'Requested Item / Task'}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{lang === 'ar' ? 'الوحدة الطالبة' : 'Requester Unit'}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{lang === 'ar' ? 'الأولوية' : 'Priority'}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'right' : 'left' }}>{t.tableStatus}</th>
                          <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: isRtl ? 'left' : 'right' }}>{lang === 'ar' ? 'الإجراء' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {internalRequests.map((req) => {
                          const itemsAr: Record<string, string> = {
                            'HVAC Filter Replacements - Operating Room 3': 'استبدال فلاتر التكييف - غرفة العمليات 3',
                            'EHR Tablet Handsets Repair': 'إصلاح أجهزة الأجهزة اللوحية للسجلات الطبية الإلكترونية',
                            'Replacement IV Stands (Qty 10)': 'استبدال حوامل المغذي الوريدي (الكمية 10)'
                          };
                          const unitsAr: Record<string, string> = {
                            'Surgical Team': 'فريق الجراحة',
                            'Ward 4B Nurses': 'تمريض الجناح 4B',
                            'Pediatric Clinic': 'عيادة الأطفال'
                          };
                          const priorityAr: Record<string, string> = {
                            'HIGH': 'عالية',
                            'MEDIUM': 'متوسطة',
                            'LOW': 'منخفضة'
                          };
                          return (
                            <tr key={req.id} style={{ borderBottom: '1px solid hsla(var(--border-color), 0.5)' }}>
                              <td style={{ padding: '16px 12px', fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--accent-blue))' }}>{req.id}</td>
                              <td style={{ padding: '16px 12px', fontWeight: 600 }}>{lang === 'ar' ? itemsAr[req.item] : req.item}</td>
                              <td style={{ padding: '16px 12px', fontSize: '0.85rem' }}>{lang === 'ar' ? unitsAr[req.requester] : req.requester}</td>
                              <td style={{ padding: '16px 12px' }}>
                                <span style={{
                                  color: req.priority === 'HIGH' ? 'hsl(var(--danger))' : req.priority === 'MEDIUM' ? 'hsl(var(--warning))' : 'hsl(var(--text-secondary))',
                                  fontWeight: 600,
                                  fontSize: '0.8rem'
                                }}>
                                  {lang === 'ar' ? priorityAr[req.priority] : req.priority}
                                </span>
                              </td>
                              <td style={{ padding: '16px 12px' }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  backgroundColor: req.status === 'IN_PROGRESS' ? 'hsla(var(--accent-blue), 0.15)' : 'hsla(var(--warning), 0.15)',
                                  color: req.status === 'IN_PROGRESS' ? 'hsl(var(--accent-blue))' : 'hsl(var(--warning))'
                                }}>
                                  {req.status === 'IN_PROGRESS' ? (lang === 'ar' ? 'قيد التنفيذ' : 'IN_PROGRESS') : (lang === 'ar' ? 'معلق' : 'PENDING')}
                                </span>
                              </td>
                              <td style={{ padding: '16px 12px', textAlign: isRtl ? 'left' : 'right' }}>
                                <button
                                  onClick={() => handleFutureFeature(lang === 'ar' ? `تعيين فني للطلب ${req.id}` : `Assigning Technician to ${req.id}`)}
                                  className="btn-text-action"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'hsl(var(--accent-blue))',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600
                                  }}
                                >
                                  {lang === 'ar' ? 'تعيين فني' : 'Assign Tech'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 9: SUGGESTIONS DASHBOARD */}
              {activeSection === 'suggestions-dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{t.suggestionsTitle}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{t.suggestionsDesc}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {suggestions.map((sug) => {
                      const categoriesAr: Record<string, string> = {
                        'Patient Flow': 'تدفق المرضى',
                        'Operational Efficiency': 'الكفاءة التشغيلية',
                        'Infrastructure': 'البنية التحتية'
                      };
                      const authorsAr: Record<string, string> = {
                        'Nurse Janet Vance': 'الممرضة جانيت فانس',
                        'Dr. Marcus Reynolds': 'د. ماركوس رينولدز',
                        'Technician Liam Brody': 'الفني ليام برودي'
                      };
                      const titlesAr: Record<string, string> = {
                        'Deploy digital check-in kiosks in outpatient lobby': 'تثبيت أكشاك التسجيل الرقمي الذاتي في ردهة العيادات الخارجية',
                        'Integrate speech-to-text EHR tools for physicians': 'دمج أدوات تحويل الكلام إلى نص في السجلات الطبية للأطباء',
                        'Install active thermal insulation for sterile supply storage': 'تركيب عزل حراري نشط لمخزن المستلزمات المعقمة'
                      };
                      return (
                        <div key={sug.id} className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="badge" style={{ backgroundColor: 'hsla(var(--accent-teal), 0.15)', color: 'hsl(var(--accent-teal))', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{lang === 'ar' ? categoriesAr[sug.category] : sug.category}</span>
                              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{t.by} {lang === 'ar' ? authorsAr[sug.author] : sug.author} • {lang === 'ar' ? sug.date.replace('hours ago', 'ساعات مضت').replace('day ago', 'يوم مضى').replace('days ago', 'أيام مضت') : sug.date}</span>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{lang === 'ar' ? titlesAr[sug.title] : sug.title}</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--accent-blue))' }}>{sug.votes} {t.votes}</span>
                            <button
                              onClick={() => handleUpvoteSuggestion(sug.id)}
                              className="btn-upvote"
                              style={{
                                backgroundColor: 'hsla(var(--accent-blue), 0.15)',
                                color: 'hsl(var(--accent-blue))',
                                border: '1px solid hsla(var(--accent-blue), 0.4)',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                            >
                              {lang === 'ar' ? '▲ تصويت' : '▲ Upvote'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 10: NOTIFICATIONS CENTER */}
              {activeSection === 'notifications-center' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{lang === 'ar' ? 'سجل تنبيهات النظام والأمن' : 'System Alert Log'}</h2>
                      <p style={{ color: 'hsl(var(--text-secondary))' }}>{t.navNotificationsCenterDesc}</p>
                    </div>
                    <button className="btn-secondary" onClick={handleMarkAllRead} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{t.markAllRead}</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {notifications.map((n: any) => {
                      const titlesAr: Record<string, string> = {
                        'Compliance Audit Passed': 'تم اجتياز تدقيق الامتثال',
                        'IT System Patch Scheduled': 'جدولة تحديث نظام تكنولوجيا المعلومات',
                        'Pharmacy Inventory Restock': 'إعادة تخزين مستودع الصيدلية'
                      };
                      const textsAr: Record<string, string> = {
                        'Joint Commission validation check completed with score 98.4%.': 'اكتمل فحص التحقق من اللجنة المشتركة بنسبة نجاح 98.4%.',
                        'Core EHR system maintenance scheduled for Sunday at 02:00 AM.': 'تمت جدولة صيانة نظام السجلات الطبية الأساسية يوم الأحد الساعة 02:00 صباحاً.',
                        'Critical drug supply shipment verified and received.': 'تم التحقق من شحنة الموارد الدوائية الحرجة واستلامها بنجاح.'
                      };
                      return (
                        <div
                          key={n.id}
                          className="glass-panel"
                          style={{
                            padding: '20px 24px',
                            borderLeft: isRtl ? 'none' : '4px solid',
                            borderRight: isRtl ? '4px solid' : 'none',
                            borderLeftColor: isRtl ? 'transparent' : (n.read ? 'hsl(var(--border-color))' : 'hsl(var(--accent-blue))'),
                            borderRightColor: isRtl ? (n.read ? 'hsl(var(--border-color))' : 'hsl(var(--accent-blue))') : 'transparent',
                            opacity: n.read ? 0.7 : 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{lang === 'ar' ? titlesAr[n.title] : n.title}</span>
                              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{lang === 'ar' ? n.time.replace('hour ago', 'ساعة مضت').replace('hours ago', 'ساعات مضت') : n.time}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? textsAr[n.text] : n.text}</div>
                          </div>

                          {!n.read && (
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--accent-blue))' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* Slide-out Notification Drawer (Side panel) */}
      {showNotificationDrawer && (
        <div
          onMouseLeave={() => setShowNotificationDrawer(false)}
          style={{
            position: 'fixed',
            top: '75px',
            right: isRtl ? 'auto' : 0,
            left: isRtl ? 0 : 'auto',
            width: '380px',
            backgroundColor: 'hsl(var(--bg-secondary) / 0.95)',
            backdropFilter: 'blur(20px)',
            borderLeft: isRtl ? 'none' : '1px solid hsl(var(--border-color))',
            borderRight: isRtl ? '1px solid hsl(var(--border-color))' : 'none',
            boxShadow: isRtl ? '10px 0 30px rgba(15, 23, 42, 0.08)' : '-10px 0 30px rgba(15, 23, 42, 0.08)',
            zIndex: 9,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: isRtl ? 'drawerSlideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'drawerSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem' }}>{t.activeNotifications}</h3>
            <button
              onClick={() => setShowNotificationDrawer(false)}
              style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              {t.closeDrawer}
            </button>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
            overflowY: 'auto',
            paddingRight: isRtl ? '0' : '12px',
            paddingLeft: isRtl ? '12px' : '0'
          }}>
            {notifications.map((n: any) => (
              <div
                key={n.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: n.read ? 'transparent' : 'hsla(var(--accent-blue), 0.05)',
                  border: '1px solid',
                  borderColor: n.read ? 'hsla(var(--border-color), 0.5)' : 'hsla(var(--accent-blue), 0.25)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{n.title}</span>
                  <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem' }}>{n.time}</span>
                </div>
                <div style={{ color: 'hsl(var(--text-secondary))' }}>{n.text}</div>
              </div>
            ))}
          </div>

          <button className="btn-secondary" onClick={handleMarkAllRead} style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}>
            {t.markAllRead}
          </button>
        </div>
      )}

      {/* Department Staff Management Modal */}
      {deptModalMode !== null && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'lightboxFadeIn 0.2s ease-out forwards'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {deptModalMode === 'ADD_EMPLOYEES' && (lang === 'ar' ? `إضافة موظفين إلى قسم ${activeDeptName}` : `Add Employees to ${activeDeptName}`)}
                  {deptModalMode === 'REMOVE_EMPLOYEES' && (lang === 'ar' ? `إزالة موظفين من قسم ${activeDeptName}` : `Remove Employees from ${activeDeptName}`)}
                  {deptModalMode === 'VIEW_EMPLOYEES' && (lang === 'ar' ? `موظفو قسم ${activeDeptName}` : `Employees in ${activeDeptName}`)}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
                  {deptModalMode === 'ADD_EMPLOYEES' && (lang === 'ar' ? 'اختر الموظفين غير المعينين لإضافتهم إلى هذا القسم' : 'Select unassigned employees to assign to this department')}
                  {deptModalMode === 'REMOVE_EMPLOYEES' && (lang === 'ar' ? 'اختر الموظفين لإزالتهم من هذا القسم' : 'Select employees to unassign from this department')}
                  {deptModalMode === 'VIEW_EMPLOYEES' && (lang === 'ar' ? 'عرض موظفي القسم وإدارتهم وتعيين المدير' : 'View department employees and manage leadership')}
                </p>
              </div>
              <button
                onClick={() => setDeptModalMode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'hsl(var(--text-muted))',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content/List */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
              {isLoadingDeptModal ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                  <div className="spinner" style={{ width: '28px', height: '28px', border: '3px solid hsla(var(--accent-blue), 0.1)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : deptModalEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
                  {lang === 'ar' ? 'لا يوجد موظفون يتطابقون مع هذا الإجراء.' : 'No employees matching this operation.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {deptModalEmployees.map((emp) => {
                    const isSelected = selectedEmployeeIds.includes(emp.employee_id);
                    const isManager = emp.title === 'Manager';
                    return (
                      <div
                        key={emp.employee_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? 'hsla(var(--accent-blue), 0.08)' : 'hsla(var(--bg-tertiary), 0.4)',
                          border: isSelected ? '1px solid hsla(var(--accent-blue), 0.3)' : '1px solid hsla(var(--border-color), 0.5)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {deptModalMode !== 'VIEW_EMPLOYEES' && (
                            <input
                              type="checkbox"
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmployeeIds([...selectedEmployeeIds, emp.employee_id]);
                                } else {
                                  setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== emp.employee_id));
                                }
                              }}
                            />
                          )}
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'hsla(var(--accent-blue), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid hsla(var(--accent-blue), 0.2)', fontSize: '0.8rem', overflow: 'hidden' }}>
                            {emp.employee_picture_url ? (
                              <img src={getFullProfilePicUrl(emp.employee_picture_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : '👤'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {`${emp.english_first_name} ${emp.english_last_name}`}
                              {isManager && (
                                <span className="badge" style={{ backgroundColor: 'hsla(var(--accent-teal), 0.15)', color: 'hsl(var(--accent-teal))', marginLeft: '8px', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                  {lang === 'ar' ? 'مدير' : 'Manager'}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                              {emp.email} • {emp.employment_type === 'doctor' ? (lang === 'ar' ? 'طبيب' : 'Doctor') : (lang === 'ar' ? 'موظف' : 'Staff')}
                            </div>
                          </div>
                        </div>

                        {deptModalMode === 'VIEW_EMPLOYEES' && (
                          <button
                            onClick={() => handleToggleManager(emp.employee_id, isManager)}
                            className={isManager ? "btn-secondary" : "btn-primary"}
                            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                          >
                            {isManager 
                              ? (lang === 'ar' ? 'إزالة كمدير' : 'Remove Manager')
                              : (lang === 'ar' ? 'تعيين كمدير' : 'Set Manager')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            {deptModalMode !== 'VIEW_EMPLOYEES' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '16px' }}>
                <button
                  onClick={() => setDeptModalMode(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  disabled={isLoadingDeptModal}
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleDeptModalCommit}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                  disabled={isLoadingDeptModal}
                >
                  {isLoadingDeptModal ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'تأكيد' : 'Confirm')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Image Lightbox Modal */}
      {lightboxImageUrl && (
        <div 
          onClick={() => setLightboxImageUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            cursor: 'zoom-out',
            animation: 'lightboxFadeIn 0.2s ease-out forwards'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImageUrl}
              alt="Lightbox"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                border: '3px solid hsl(var(--border-color))'
              }}
            />
            <button
              onClick={() => setLightboxImageUrl(null)}
              style={{
                position: 'absolute',
                top: '-15px',
                right: isRtl ? 'auto' : '-15px',
                left: isRtl ? '-15px' : 'auto',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'hsl(var(--bg-secondary))',
                border: '1px solid hsl(var(--border-color))',
                color: 'hsl(var(--text-primary))',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Custom Navigation Warning Modal */}
      {navWarning.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'lightboxFadeIn 0.2s ease'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '480px',
            width: '100%',
            padding: '28px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid hsl(var(--border-color))',
            backgroundColor: 'hsl(var(--bg-secondary))',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'hsla(var(--danger), 0.1)',
              color: 'hsl(var(--danger))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              margin: '0 auto'
            }}>
              ⚠️
            </div>
            <div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'hsl(var(--text-primary))' }}>
                {lang === 'ar' ? 'تنبيه: فقدان البيانات' : 'Warning: Unsaved Changes'}
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5' }}>
                {navWarning.message}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '4px' }}>
              <button
                className="nav-warning-cancel-btn"
                onClick={() => setNavWarning(prev => ({ ...prev, show: false }))}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                className="nav-warning-proceed-btn"
                onClick={navWarning.onConfirm}
              >
                {lang === 'ar' ? 'استمرار' : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 999
          }}
        />
      )}

      {/* Embedded CSS style tag for animations */}
      <style>{`
        @keyframes lightboxFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes welcomeScale {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes fadeTransition {
          0% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; pointer-events: none; }
        }
        @keyframes drawerSlide {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes drawerSlideLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
          color: #ffffff;
        }
        .badge {
          display: inline-block;
          font-size: 0.8rem;
        }
        .nav-warning-cancel-btn {
          padding: 10px 24px;
          font-weight: 600;
          flex: 1;
          background-color: hsl(var(--success));
          border: 1px solid hsl(var(--success));
          color: #ffffff;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-smooth);
          box-shadow: 0 4px 12px hsla(var(--success), 0.2);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .nav-warning-cancel-btn:hover {
          background-color: hsl(var(--success) / 0.85) !important;
          border-color: hsl(var(--success) / 0.85) !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px hsla(var(--success), 0.35);
        }
        .nav-warning-proceed-btn {
          padding: 10px 24px;
          font-weight: 600;
          flex: 1;
          background-color: hsla(var(--danger), 0.08);
          border: 1px solid hsl(var(--danger));
          color: hsl(var(--danger));
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-smooth);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }
        .nav-warning-proceed-btn:hover {
          background-color: hsl(var(--danger)) !important;
          color: #ffffff !important;
          border-color: hsl(var(--danger)) !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px hsla(var(--danger), 0.35);
        }
      `}</style>

    </div>
  );
}
