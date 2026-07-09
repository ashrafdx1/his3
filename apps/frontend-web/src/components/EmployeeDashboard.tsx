import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api-client';
import { translations, Language } from '../services/translations';

const API_BASE = (() => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1/v1';
  try {
    return new URL(url).origin;
  } catch (e) {
    return 'http://localhost:3000';
  }
})();

function getProfilePicUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

interface EmployeeDashboardProps {
  user: {
    id: string;
    email: string;
    roles: string[];
    profilePictureUrl?: string | null;
    isFirstLogin?: boolean;
    isHRManager?: boolean;
  };
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  colorTheme: string;
  setColorTheme: (c: string) => void;
  lang: Language;
  setLang: (l: Language) => void;
  onProfileUpdate?: (newProfile: { username: string; profilePictureUrl?: string | null }) => void;
}

// const COLORS = [
//   { id: 'blue', hex: '#2563eb' },
//   { id: 'green', hex: '#0d9488' },
//   { id: 'purple', hex: '#8b5cf6' },
//   { id: 'orange', hex: '#ea580c' },
//   { id: 'red', hex: '#e11d48' },
//   { id: 'pink', hex: '#db2777' },
//   { id: 'teal', hex: '#0891b2' },
// ];

export function EmployeeDashboard({
  user,
  onLogout,
  theme,
  toggleTheme,
  colorTheme,
  setColorTheme,
  lang,
  setLang,
  onProfileUpdate,
}: EmployeeDashboardProps) {
  const isRtl = lang === 'ar';
  const chatInputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const [activeSection, setActiveSection] = useState(user.isHRManager ? 'employees-management' : 'overview');
  const [showSettings, setShowSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showFarewell, setShowFarewell] = useState(false);

  // Profile
  const [empProfile, setEmpProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [picUrl, setPicUrl] = useState<string | null>(getProfilePicUrl(user.profilePictureUrl));
  const [displayName, setDisplayName] = useState(user.email);
  const [settingUsername, setSettingUsername] = useState(user.email);
  const [settingNewPass, setSettingNewPass] = useState('');
  const [settingConfirmPass, setSettingConfirmPass] = useState('');
  const [showSNP, setShowSNP] = useState(false);
  const [showSCP, setShowSCP] = useState(false);
  const [settingMsg, setSettingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // const picRef = useRef<HTMLInputElement>(null);

  // First login
  const [showFirstLogin, setShowFirstLogin] = useState(false);
  const [fl_pass, setFl_pass] = useState('');
  const [fl_confirm, setFl_confirm] = useState('');
  const [fl_showPass, setFl_showPass] = useState(false);
  const [fl_showConfirm, setFl_showConfirm] = useState(false);
  const [fl_error, setFl_error] = useState('');
  const [fl_submitting, setFl_submitting] = useState(false);
  const [fl_done, setFl_done] = useState(false);

  // Messaging
  const [thread, setThread] = useState<any>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // HR Manager: Employees
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingEmps, setIsLoadingEmps] = useState(false);
  const [empFormMode, setEmpFormMode] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  const [isSavingEmp, setIsSavingEmp] = useState(false);
  const [empLightbox, setEmpLightbox] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState<Record<string, any>>({});
  const [isUploadingEmpPhoto, setIsUploadingEmpPhoto] = useState(false);

  // HR Manager: Departments Management States
  const [dbDepartments, setDbDepartments] = useState<any[]>([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);

  // HR Manager: Departments Modal States
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null);
  const [activeDeptName, setActiveDeptName] = useState('');
  const [deptModalMode, setDeptModalMode] = useState<'ADD_EMPLOYEES' | 'VIEW_EMPLOYEES' | null>(null);
  const [deptModalEmployees, setDeptModalEmployees] = useState<any[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [isLoadingDeptModal, setIsLoadingDeptModal] = useState(false);

  // Manager: My Department States
  const [myDeptEmployees, setMyDeptEmployees] = useState<any[]>([]);
  const [isLoadingMyDept, setIsLoadingMyDept] = useState(false);
  const [showRequestStaffModal, setShowRequestStaffModal] = useState(false);
  const [wantedCount, setWantedCount] = useState<number>(1);
  const [requestReason, setRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);


  // Unsaved changes warning state
  const [navWarning, setNavWarning] = useState<{
    show: boolean;
    targetSection: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    targetSection: '',
    message: '',
    onConfirm: () => {}
  });

  const hasUnsavedEmpChanges = () => {
    if (empFormMode === 'ADD') {
      return Object.keys(empForm).some(key => {
        const val = empForm[key];
        return val !== null && val !== undefined && val !== '';
      });
    }
    if (empFormMode === 'EDIT' && editingEmp) {
      return Object.keys(empForm).some(key => {
        const val = empForm[key];
        const originalVal = editingEmp[key];
        if (key === 'date_of_birth' && val && originalVal) {
          return val.substring(0, 10) !== originalVal.substring(0, 10);
        }
        if (key === 'salary') {
          return Number(val) !== Number(originalVal);
        }
        return (val ?? '') !== (originalVal ?? '');
      });
    }
    return false;
  };

  const checkUnsavedChangesBeforeNavigation = (targetSection: string) => {
    if (activeSection === 'employees-management' && hasUnsavedEmpChanges()) {
      setNavWarning({
        show: true,
        targetSection,
        message: lang === 'ar'
          ? 'بعض البيانات التي أدخلتها في نموذج الموظف قد تضيع.. الاستمرار سيؤدي إلى حذف بياناتك'
          : 'some data you entered in the employee form may be lost..proceed will delete your data',
        onConfirm: () => {
          setEmpFormMode(null);
          setEditingEmp(null);
          setEmpForm({});
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

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Load profile
  useEffect(() => {
    (async () => {
      setIsLoadingProfile(true);
      try {
        const res = await apiClient.get('/auth/me');
        const d = res.data;
        setEmpProfile(d);
        setDisplayName(d.username || user.email);
        setSettingUsername(d.username || user.email);
        setPicUrl(getProfilePicUrl(d.employee_picture_url) || getProfilePicUrl(user.profilePictureUrl));
        if (d.isFirstLogin) setTimeout(() => setShowFirstLogin(true), 2500);
        if (d.has_employee_unread) setHasUnread(true);
      } catch (e) { console.error(e); }
      finally { setIsLoadingProfile(false); }
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Fetch thread
  const fetchThread = async (silent = false) => {
    if (!silent) setIsLoadingThread(true);
    try {
      const res = await apiClient.get('/messages/active');
      setThread(res.data);
      if (res.data?.has_employee_unread) {
        if (activeSection === 'messages') {
          apiClient.post(`/messages/employee/mark-read/${res.data.id}`).catch(() => {});
          res.data.has_employee_unread = false;
          setHasUnread(false);
        } else {
          setHasUnread(true);
        }
      }
    } catch { setThread(null); }
    finally { if (!silent) setIsLoadingThread(false); }
  };

  useEffect(() => {
    fetchThread();
    const iv = setInterval(() => fetchThread(true), 4000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeSection, thread?.messages]);

  useEffect(() => {
    if (activeSection === 'messages' && thread && thread.has_employee_unread) {
      setHasUnread(false);
      apiClient.post(`/messages/employee/mark-read/${thread.id}`).then(() => {
        setThread((p: any) => p ? { ...p, has_employee_unread: false } : p);
      }).catch(() => {});
    }
  }, [activeSection, thread?.id, thread?.has_employee_unread]);

  // Fetch employees for HR manager
  const fetchEmployees = async () => {
    setIsLoadingEmps(true);
    try {
      const er = await apiClient.get('/employees');
      setEmployees(er.data);
    } catch { triggerToast(lang === 'ar' ? 'فشل تحميل الموظفين' : 'Failed to load employees.'); }
    finally { setIsLoadingEmps(false); }
  };

  const fetchDepartments = async () => {
    setIsLoadingDepts(true);
    try {
      const response = await apiClient.get('/departments');
      setDbDepartments(response.data);
    } catch (error) {
      triggerToast(lang === 'ar' ? 'فشل تحميل الأقسام من الخادم.' : 'Failed to fetch departments from server.');
    } finally {
      setIsLoadingDepts(false);
    }
  };

  const fetchMyDeptDetails = async () => {
    if (!empProfile || !empProfile.department_id) return;
    setIsLoadingMyDept(true);
    try {
      const res = await apiClient.get(`/departments/${empProfile.department_id}/employees`);
      setMyDeptEmployees(res.data);
      await fetchDepartments();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMyDept(false);
    }
  };

  const handleRequestStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empProfile || !empProfile.department_id) return;
    setIsSubmittingRequest(true);
    try {
      await apiClient.post(`/departments/${empProfile.department_id}/request-employees`, {
        wantedCount,
        reason: requestReason
      });
      triggerToast(lang === 'ar' ? 'تم إرسال طلب الموظفين بنجاح' : 'Staff request sent successfully.');
      setShowRequestStaffModal(false);
      setWantedCount(1);
      setRequestReason('');
      fetchMyDeptDetails();
    } catch (err) {
      triggerToast(lang === 'ar' ? 'فشل إرسال طلب الموظفين' : 'Failed to send staff request.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleClearRequest = async (deptId: number) => {
    try {
      await apiClient.post(`/departments/${deptId}/clear-request`);
      triggerToast(lang === 'ar' ? 'تم إنهاء طلب القسم بنجاح' : 'Cleared department request successfully.');
      await fetchDepartments();
    } catch (err) {
      triggerToast(lang === 'ar' ? 'فشل إنهاء طلب القسم' : 'Failed to clear department request.');
    }
  };

  const openDeptModal = async (deptId: number, deptName: string, mode: 'ADD_EMPLOYEES' | 'VIEW_EMPLOYEES') => {
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
      }
      setDeptModalMode(null);
      await fetchDepartments();
    } catch (err) {
      triggerToast(lang === 'ar' ? 'فشل تنفيذ الإجراء.' : 'Failed to commit changes.');
    } finally {
      setIsLoadingDeptModal(false);
    }
  };

  useEffect(() => {
    const isHR = empProfile ? empProfile.isHRManager === true : user.isHRManager;
    if (isHR) {
      fetchDepartments();
      if (activeSection === 'employees-management') {
        fetchEmployees();
      }
    } else if (empProfile && empProfile.title === 'Manager') {
      // Fetch departments for standard managers too, so they can resolve their department name
      fetchDepartments();
    }
    if (activeSection === 'my-department') {
      fetchMyDeptDetails();
    }
  }, [user.isHRManager, activeSection, empProfile]);

  // First login submit
  const handleFirstLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFl_error('');
    if (fl_pass.length < 6) { setFl_error(lang === 'ar' ? 'كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters.'); return; }
    if (fl_pass !== fl_confirm) { setFl_error(lang === 'ar' ? 'كلمتا المرور لا تتطابقان' : 'Passwords do not match.'); return; }
    setFl_submitting(true);
    try {
      await apiClient.post('/auth/profile', { username: displayName, password: fl_pass });
      setFl_done(true);
      setTimeout(() => { setShowFarewell(true); setTimeout(onLogout, 3000); }, 2000);
    } catch (err: any) {
      setFl_error(err?.response?.data?.message || (lang === 'ar' ? 'فشل تغيير كلمة المرور' : 'Failed to change password.'));
    } finally { setFl_submitting(false); }
  };

  // Messaging
  const handleRequestMsg = async () => {
    try {
      const res = await apiClient.post('/messages/request');
      setThread(res.data);
      triggerToast(lang === 'ar' ? 'تم إرسال الطلب' : 'Request sent to admin.');
    } catch { triggerToast(lang === 'ar' ? 'فشل إرسال الطلب' : 'Failed.'); }
  };

  const handleSendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !thread) return;
    setIsSendingMsg(true);
    try {
      const res = await apiClient.post('/messages/employee/send', { threadId: thread.id, text: msgText });
      setThread(res.data);
      setMsgText('');
      setTimeout(() => chatInputRef.current?.focus(), 50);
    } catch { triggerToast(lang === 'ar' ? 'فشل الإرسال' : 'Failed to send.'); }
    finally { setIsSendingMsg(false); }
  };

  // const markRead = async () => {
  //   if (!thread) return;
  //   try {
  //     await apiClient.post(`/messages/employee/mark-read/\${thread.id}`);
  //     setHasUnread(false);
  //     setThread((p: any) => p ? { ...p, has_employee_unread: false } : p);
  //   } catch {}
  // };

  // Settings
  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingMsg(null);
    if (settingNewPass && settingNewPass !== settingConfirmPass) {
      setSettingMsg({ type: 'error', text: lang === 'ar' ? 'كلمتا المرور لا تتطابقان' : 'Passwords do not match.' });
      return;
    }
    try {
      await apiClient.post('/auth/profile', { username: settingUsername, ...(settingNewPass ? { password: settingNewPass } : {}) });
      setDisplayName(settingUsername);
      setSettingNewPass(''); setSettingConfirmPass('');
      setSettingMsg({ type: 'success', text: lang === 'ar' ? 'تم التحديث بنجاح' : 'Profile updated successfully.' });
      if (onProfileUpdate) {
        onProfileUpdate({ username: settingUsername });
      }
    } catch (err: any) {
      setSettingMsg({ type: 'error', text: err?.response?.data?.message || 'Failed.' });
    }
  };

  const handlePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await apiClient.post('/storage/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data.url || res.data.path;
      setPicUrl(getProfilePicUrl(url) || url);
      await apiClient.post('/auth/profile', { username: displayName, profilePictureUrl: url });
      triggerToast(lang === 'ar' ? 'تم تحديث الصورة' : 'Photo updated.');
      if (onProfileUpdate) {
        onProfileUpdate({ username: displayName, profilePictureUrl: url });
      }
    } catch { triggerToast(lang === 'ar' ? 'فشل رفع الصورة' : 'Upload failed.'); }
    finally { setIsUploading(false); }
  };

  // HR Manager employee form
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
      const url = res.data.url || res.data.path || '';
      setEmpForm((prev: any) => ({ ...prev, employee_picture_url: url }));
      triggerToast(lang === 'ar' ? 'تم رفع الصورة بنجاح.' : 'Photo uploaded successfully.');
    } catch (err: any) {
      triggerToast(lang === 'ar' ? 'فشل رفع الصورة.' : 'Failed to upload photo.');
    } finally {
      setIsUploadingEmpPhoto(false);
    }
  };

  const openAdd = () => {
    setEmpForm({
      arabic_first_name: '', arabic_middle_name: '', arabic_last_name: '',
      english_first_name: '', english_middle_name: '', english_last_name: '',
      gender: '', date_of_birth: '', employment_type: '',
      phone_number: '', email: '', salary: '', employee_picture_url: ''
    });
    setEditingEmp(null);
    setEmpFormMode('ADD');
  };

  const openEdit = (emp: any) => {
    setEmpForm({
      english_first_name: emp.english_first_name || '',
      english_middle_name: emp.english_middle_name || '',
      english_last_name: emp.english_last_name || '',
      arabic_first_name: emp.arabic_first_name || '',
      arabic_middle_name: emp.arabic_middle_name || '',
      arabic_last_name: emp.arabic_last_name || '',
      email: emp.email || '',
      phone_number: emp.phone_number || '',
      gender: emp.gender || 'Male',
      date_of_birth: emp.date_of_birth ? String(emp.date_of_birth).split('T')[0] : '',
      employment_type: emp.employment_type || 'Doctor',
      salary: emp.salary || '',
      department_id: emp.department_id || '',
      username: emp.username || '',
      password: '',
      employee_picture_url: emp.employee_picture_url || ''
    });
    setEditingEmp(emp);
    setEmpFormMode('EDIT');
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (empFormMode === 'ADD') {
      const requiredFields = [
        empForm.arabic_first_name, empForm.arabic_middle_name, empForm.arabic_last_name,
        empForm.english_first_name, empForm.english_middle_name, empForm.english_last_name,
        empForm.gender, empForm.date_of_birth, empForm.employment_type,
        empForm.phone_number, empForm.email, empForm.salary, empForm.employee_picture_url
      ];
      if (requiredFields.some(f => !f || !String(f).trim())) {
        triggerToast(lang === 'ar' ? 'جميع الحقول مطلوبة.' : 'All fields are required.');
        return;
      }
    } else {
      const requiredFields = [
        empForm.arabic_first_name, empForm.arabic_last_name,
        empForm.english_first_name, empForm.english_last_name,
        empForm.gender, empForm.date_of_birth, empForm.employment_type,
        empForm.email
      ];
      if (requiredFields.some(f => !f || !String(f).trim())) {
        triggerToast(lang === 'ar' ? 'الاسم والبريد وتاريخ الميلاد والنوع حقول إجبارية.' : 'Names, email, DOB and employment type are required.');
        return;
      }
    }

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validateEmail(empForm.email)) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address.');
      return;
    }

    const salaryNum = parseFloat(empForm.salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال راتب صالح.' : 'Please enter a valid salary.');
      return;
    }

    setIsSavingEmp(true);
    try {
      const payload: any = {
        arabic_first_name: empForm.arabic_first_name,
        arabic_middle_name: empForm.arabic_middle_name,
        arabic_last_name: empForm.arabic_last_name,
        english_first_name: empForm.english_first_name,
        english_middle_name: empForm.english_middle_name,
        english_last_name: empForm.english_last_name,
        gender: empForm.gender,
        date_of_birth: empForm.date_of_birth,
        employment_type: empForm.employment_type,
        phone_number: empForm.phone_number,
        email: empForm.email,
        salary: salaryNum,
        employee_picture_url: empForm.employee_picture_url,
      };



      if (empFormMode === 'ADD') {
        await apiClient.post('/employees', payload);
        triggerToast(lang === 'ar' ? 'تمت إضافة الموظف بنجاح.' : 'Employee added successfully.');
      } else {
        await apiClient.patch(`/employees/${editingEmp.employee_id}`, payload);
        triggerToast(lang === 'ar' ? 'تم تحديث بيانات الموظف.' : 'Employee updated successfully.');
      }
      setEmpFormMode(null);
      setEditingEmp(null);
      setEmpForm({});
      fetchEmployees();
    } catch (err: any) {
      const msg = err.response?.data?.message || (lang === 'ar' ? 'فشل حفظ البيانات.' : 'Failed to save employee.');
      triggerToast(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSavingEmp(false);
    }
  };

  const handleLogout = () => { setShowFarewell(true); setTimeout(onLogout, 2800); };

  const isHR = empProfile ? empProfile.isHRManager === true : user.isHRManager;
  const isDeptManager = empProfile ? empProfile.title === 'Manager' : false;
  const hasActiveDeptRequests = dbDepartments.some(d => d.requestedCount && d.requestedCount > 0);

  const managerItems = isDeptManager ? [
    { id: 'my-department', label: lang === 'ar' ? '🏢 قسمي' : '🏢 My Department', desc: lang === 'ar' ? 'إدارة تفاصيل قسمك' : 'Manage your department details' },
    { id: 'department-schedule', label: lang === 'ar' ? '📅 جدول القسم' : '📅 Department Schedule', desc: lang === 'ar' ? 'قريباً' : 'Coming soon' },
    { id: 'department-attendance', label: lang === 'ar' ? '⏱️ حضور القسم' : '⏱️ Department Attendance', desc: lang === 'ar' ? 'قريباً' : 'Coming soon' },
  ] : [];

  const navItems: Array<{ id: string; label: string; desc: string; badge?: any }> = [
    ...(isDeptManager && !isHR ? managerItems : []),
    ...(isHR ? [
      { id: 'employees-management', label: lang === 'ar' ? '👥 إدارة الموظفين' : '👥 Employees Management', desc: lang === 'ar' ? 'إضافة وتحرير الموظفين' : 'Add and edit employees' },
      { id: 'departments-management', label: lang === 'ar' ? '🏢 إدارة الأقسام' : '🏢 Departments Management', desc: lang === 'ar' ? 'عرض الأقسام والموظفين' : 'View departments and employees', badge: hasActiveDeptRequests }
    ] : []),
    ...(isDeptManager && isHR ? managerItems : []),
    { id: 'overview', label: lang === 'ar' ? '🏥 نظرة عامة' : '🏥 Overview', desc: lang === 'ar' ? 'لوحة التحكم' : 'Your dashboard' },
    { id: 'salary', label: lang === 'ar' ? '💰 الراتب' : '💰 Salary', desc: lang === 'ar' ? 'راتبك الحالي' : 'Your current salary' },
    { id: 'schedule', label: lang === 'ar' ? '📅 الجدول' : '📅 Schedule', desc: lang === 'ar' ? 'جدول العمل' : 'Work schedule' },
    { id: 'messages', label: lang === 'ar' ? '💬 الرسائل' : '💬 Messages', desc: lang === 'ar' ? 'التواصل مع المدير' : 'Contact admin', badge: hasUnread },
    { id: 'coming-soon', label: lang === 'ar' ? '🚀 قريباً' : '🚀 Coming Soon', desc: lang === 'ar' ? 'ميزات قادمة' : 'Future features' },
  ];

  const fmtSalary = (n: number) => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'YER', minimumFractionDigits: 0 });

  const threadMessages = thread ? JSON.parse(thread.messages || '[]') : [];
  const threadStatus = thread?.status;

  return (
    <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh', direction: isRtl ? 'rtl' : 'ltr', position: 'relative' }}>

      {/* Global Toast */}
      {toastMsg && (
        <div className="glass-panel" style={{
          position: 'fixed',
          bottom: '24px',
          right: isRtl ? 'auto' : '24px',
          left: isRtl ? '24px' : 'auto',
          padding: '14px 24px',
          borderRadius: '8px',
          border: '1px solid hsl(var(--border-color))',
          backgroundColor: 'hsl(var(--bg-secondary))',
          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'hsl(var(--text-primary))'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--accent-blue))' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toastMsg}</span>
        </div>
      )}

      {/* Lightbox / Zoom Preview */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={lightboxUrl}
            alt="Preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
            }}
          />
        </div>
      )}

      {empLightbox && (
        <div
          onClick={() => setEmpLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={empLightbox}
            alt="Employee details"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
            }}
          />
        </div>
      )}

      {/* Welcome Screen Intro Effect */}
      {showWelcome && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'hsl(var(--bg-primary))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'welcomeFadeOut 0.5s ease-out 1.8s forwards'
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'welcomeScaleUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <span style={{ fontSize: '4.5rem', display: 'block' }}>🏥</span>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 800 }}>{t.brandName}</h1>
            <p style={{ color: 'hsl(var(--text-secondary))', letterSpacing: '0.05em', fontWeight: 600 }}>{lang === 'ar' ? 'بوابة الموظف الإلكترونية' : 'EMPLOYEE SECURE PORTAL'}</p>
          </div>
        </div>
      )}

      {/* Farewell Overlay Effect */}
      {showFarewell && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'hsl(var(--bg-primary))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'welcomeFadeIn 0.3s ease'
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '4.5rem' }}>👋</span>
            <h2 className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 800 }}>{lang === 'ar' ? 'إلى اللقاء!' : 'See You Soon!'}</h2>
            <p style={{ color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'يتم الآن تسجيل الخروج بشكل آمن...' : 'Securing your session and logging out...'}</p>
          </div>
        </div>
      )}

      {/* Force Change Password Overlay (First Login) */}
      {showFirstLogin && !fl_done && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '40px', borderRadius: '20px', border: '1px solid hsla(var(--accent-blue), 0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>🔐</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>{lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Your Password'}</h2>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
                {lang === 'ar' ? 'هذا أول تسجيل دخول. يرجى تعيين كلمة مرور جديدة.' : 'This is your first login. Please set a new password to continue.'}
              </p>
            </div>
            <form onSubmit={handleFirstLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                <div style={{ position: 'relative' }}>
                  <input type={fl_showPass ? 'text' : 'password'} className="form-input" placeholder={lang === 'ar' ? 'أدخل كلمة المرور الجديدة' : 'Enter new password'} value={fl_pass} onChange={e => setFl_pass(e.target.value)} autoFocus style={{ paddingRight: isRtl ? '14px' : '46px', paddingLeft: isRtl ? '46px' : '14px' }} />
                  <button type="button" onClick={() => setFl_showPass(p => !p)} style={{ position: 'absolute', right: isRtl ? 'auto' : '14px', left: isRtl ? '14px' : 'auto', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', padding: 0, display: 'flex', alignItems: 'center' }}>
                    {fl_showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                <div style={{ position: 'relative' }}>
                  <input type={fl_showConfirm ? 'text' : 'password'} className="form-input" placeholder={lang === 'ar' ? 'أعد إدخال كلمة المرور' : 'Confirm password'} value={fl_confirm} onChange={e => setFl_confirm(e.target.value)} style={{ paddingRight: isRtl ? '14px' : '46px', paddingLeft: isRtl ? '46px' : '14px' }} />
                  <button type="button" onClick={() => setFl_showConfirm(p => !p)} style={{ position: 'absolute', right: isRtl ? 'auto' : '14px', left: isRtl ? '14px' : 'auto', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', padding: 0, display: 'flex', alignItems: 'center' }}>
                    {fl_showConfirm ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {fl_error && <div style={{ padding: '10px 14px', background: 'hsla(var(--danger), 0.1)', border: '1px solid hsla(var(--danger), 0.3)', borderRadius: '8px', color: 'hsl(var(--danger))', fontSize: '0.85rem' }}>{fl_error}</div>}
              <button type="submit" className="btn-primary" disabled={fl_submitting} style={{ padding: '14px', fontWeight: 700 }}>
                {fl_submitting ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (lang === 'ar' ? 'تعيين كلمة المرور والمتابعة' : 'Set Password & Continue')}
              </button>
            </form>
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
            <span style={{ fontSize: '1.5rem' }}>👤</span>
          </div>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{t.brandName}</h2>
            <p style={{ fontSize: '0.7rem', color: 'hsl(var(--accent-blue))', fontWeight: 600, letterSpacing: '0.05em' }}>{lang === 'ar' ? 'بوابة الموظف' : 'EMPLOYEE PORTAL'}</p>
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
          {navItems.map((item) => (
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
                {item.badge && (
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
                    !
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
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'محرك قاعدة البيانات: Postgres' : 'Database Engine: Postgres'}</span>
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
                ? (lang === 'ar' ? 'إعدادات الحساب' : 'Account Settings')
                : activeSection === 'employees-management' ? (lang === 'ar' ? 'إدارة الموظفين' : 'Employees Management')
                : activeSection === 'departments-management' ? (lang === 'ar' ? 'إدارة الأقسام' : 'Departments Management')
                : activeSection === 'my-department' ? (lang === 'ar' ? 'قسمي' : 'My Department')
                : activeSection === 'department-schedule' ? (lang === 'ar' ? 'جدول القسم' : 'Department Schedule')
                : activeSection === 'department-attendance' ? (lang === 'ar' ? 'حضور القسم' : 'Department Attendance')
                : activeSection === 'overview' ? (lang === 'ar' ? 'نظرة عامة' : 'Overview')
                : activeSection === 'salary' ? (lang === 'ar' ? 'الراتب' : 'Salary')
                : activeSection === 'schedule' ? (lang === 'ar' ? 'الجدول' : 'Schedule')
                : activeSection === 'messages' ? (lang === 'ar' ? 'الرسائل' : 'Messages')
                : (lang === 'ar' ? 'قريباً' : 'Coming Soon')
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
              {picUrl ? (
                <img
                  src={picUrl}
                  alt={displayName}
                  onClick={() => setLightboxUrl(picUrl)}
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
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{displayName}</span>
            </div>

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
              onClick={handleLogout}
              className="header-icon-btn logout-btn"
              style={{ color: 'hsl(var(--danger))' }}
              title="Secure Sign Out"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>

          {/* Mobile-only Header Actions (3 items: Burger, Name, Settings) */}
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

            {/* 2. Admin/Employee name */}
            <span className="mobile-admin-name-text">
              {empProfile ? `${empProfile.english_first_name || ''} ${empProfile.english_last_name || ''}`.trim() || user.email : user.email}
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

        <main className="main-content" style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          
          {/* Settings Section Panel (Takes priority if showSettings is true) */}
          {showSettings ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '600px', margin: '0 auto' }}>
              <div className="glass-panel" style={{ padding: '36px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.4rem' }}>{t.updateProfileTitle}</h3>
                  <button className="btn-secondary" onClick={() => setShowSettings(false)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>{t.closeBtn}</button>
                </div>

                {settingMsg && (
                  <div style={{ padding: '12px', background: `hsla(var(--${settingMsg.type === 'success' ? 'success' : 'danger'}), 0.1)`, border: `1px solid hsla(var(--${settingMsg.type === 'success' ? 'success' : 'danger'}), 0.3)`, color: `hsl(var(--${settingMsg.type === 'success' ? 'success' : 'danger'}))`, borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                    {settingMsg.text}
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
                    onClick={handleLogout}
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
                    {picUrl ? (
                      <img
                        src={picUrl}
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
                        {displayName.charAt(0).toUpperCase()}
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
                    id="profile-pic-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePicUpload}
                  />
                </div>

                <form onSubmit={handleSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px' }}>{lang === 'ar' ? 'اسم المستخدم' : 'Username'}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settingUsername}
                      onChange={(e) => setSettingUsername(e.target.value)}
                    />
                  </div>
                  <div style={{ borderBottom: '1px solid hsla(var(--border-color), 0.6)', margin: '10px 0' }} />
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px' }}>{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password (blank to keep current)'}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showSNP ? 'text' : 'password'}
                        className="form-input"
                        style={{
                          paddingLeft: isRtl ? '48px' : '14px',
                          paddingRight: isRtl ? '14px' : '48px'
                        }}
                        placeholder="••••••••"
                        value={settingNewPass}
                        onChange={(e) => setSettingNewPass(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSNP(!showSNP)}
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
                        {showSNP ? (
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
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '6px' }}>{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showSCP ? 'text' : 'password'}
                        className="form-input"
                        style={{
                          paddingLeft: isRtl ? '48px' : '14px',
                          paddingRight: isRtl ? '14px' : '48px'
                        }}
                        placeholder="••••••••"
                        value={settingConfirmPass}
                        onChange={(e) => setSettingConfirmPass(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSCP(!showSCP)}
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
                        {showSCP ? (
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
                    {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              {/* HR Manager Pending Requests Notifications */}
              {isHR && dbDepartments.filter(d => d.requestedCount && d.requestedCount > 0).map(dept => (
                <div className="glass-panel alert-notification-banner" style={{
                  padding: '16px 24px',
                  borderRadius: '12px',
                  border: '1px solid hsla(var(--danger), 0.3)',
                  backgroundColor: 'hsla(var(--danger), 0.05)',
                  color: 'hsl(var(--text-primary))',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }} key={dept.departmentId}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🚨</span>
                    <div>
                      <span style={{ fontWeight: 700, color: 'hsl(var(--danger))' }}>
                        {lang === 'ar' ? 'طلب موظفين جديد:' : 'New Staff Request:'}
                      </span>{' '}
                      {lang === 'ar' 
                        ? `قسم "${dept['dept-arabic-name'] || dept.name}" يطلب ${dept.requestedCount === 1 ? 'موظفاً واحداً' : `${dept.requestedCount} موظفين`}.` 
                        : `Department "${dept.name}" wants ${dept.requestedCount} ${dept.requestedCount === 1 ? 'employee' : 'employees'}.`}
                      {dept.requestedReason && (
                        <span style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', display: 'block', marginTop: '2px' }}>
                          {lang === 'ar' ? `السبب: ${dept.requestedReason}` : `Reason: ${dept.requestedReason}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection('departments-management');
                      setShowSettings(false);
                    }}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    {lang === 'ar' ? 'عرض الطلبات' : 'View Requests'}
                  </button>
                </div>
              ))}

              {/* Overview Page */}
              {activeSection === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                      {lang === 'ar' ? `مرحباً، ${empProfile?.arabic_first_name || empProfile?.english_first_name || ''}!` : `Welcome, ${empProfile?.english_first_name || displayName}!`}
                    </h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'لوحة تحكم وبيانات الموظف.' : 'This is your secure employee command dashboard.'}</p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid-three-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    {[
                      { label: lang === 'ar' ? 'نوع الوظيفة' : 'Job Position', val: empProfile?.employment_type },
                      { label: lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title', val: empProfile?.title || (lang === 'ar' ? 'لا يوجد' : 'None') },
                      { label: lang === 'ar' ? 'حالة الحساب' : 'Account Status', val: lang === 'ar' ? '● نشط ومؤمن' : '● Active & Secure', color: 'hsl(var(--success))' }
                    ].map((c, i) => (
                      <div key={i} className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.label}</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: c.color || 'hsl(var(--accent-blue))' }}>{isLoadingProfile ? '...' : (c.val || '—')}</div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Information */}
                  {empProfile && (
                    <div className="glass-panel" style={{ padding: '28px' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>{lang === 'ar' ? 'الملف التعريفي والبيانات الشخصية' : 'Personal Profile Information'}</h3>
                      <div className="grid-two-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                        {[
                          { label: lang === 'ar' ? 'الاسم بالكامل (إنجليزي)' : 'English Name', val: `${empProfile.english_first_name || ''} ${empProfile.english_middle_name || ''} ${empProfile.english_last_name || ''}`.trim().replace(/\s+/g, ' ') },
                          { label: lang === 'ar' ? 'الاسم بالكامل (عربي)' : 'Arabic Name', val: `${empProfile.arabic_first_name || ''} ${empProfile.arabic_middle_name || ''} ${empProfile.arabic_last_name || ''}`.trim().replace(/\s+/g, ' ') },
                          { label: lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address', val: empProfile.email },
                          { label: lang === 'ar' ? 'رقم الهاتف المتصل' : 'Phone Number', val: empProfile.phone_number || '—' },
                          { label: lang === 'ar' ? 'الجنس' : 'Gender', val: lang === 'ar' ? (empProfile.gender?.toLowerCase() === 'male' ? 'ذكر' : 'أنثى') : empProfile.gender },
                          { label: lang === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth', val: empProfile.date_of_birth ? new Date(empProfile.date_of_birth).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '—' }
                        ].map((item, idx) => (
                          <div key={idx} style={{ padding: '12px', background: 'hsla(var(--bg-tertiary), 0.3)', borderRadius: '8px', border: '1px solid hsla(var(--border-color), 0.4)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '4px' }}>{item.label}</div>
                            <div style={{ fontWeight: 600, color: 'hsl(var(--accent-blue))', fontSize: '0.92rem' }}>{item.val || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Salary Section */}
              {activeSection === 'salary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '600px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{lang === 'ar' ? 'الراتب والتعويضات' : 'My Salary & Compensation'}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'تفاصيل الراتب الشهري الحالي.' : 'View your current monthly salary details.'}</p>
                  </div>
                  <div className="glass-panel" style={{ padding: '44px', textAlign: 'center', background: 'linear-gradient(135deg, hsla(var(--accent-blue), 0.06), hsla(var(--accent-teal), 0.06))', border: '1px solid hsla(var(--accent-blue), 0.2)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lang === 'ar' ? 'الراتب الشهري الأساسي' : 'Monthly Base Salary'}</div>
                    {isLoadingProfile ? (
                      <div style={{ width: '32px', height: '32px', border: '3px solid hsla(var(--accent-blue), 0.1)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                    ) : (
                      <div className="text-gradient" style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        {empProfile?.salary != null ? fmtSalary(empProfile.salary) : '—'}
                      </div>
                    )}
                    <div style={{ marginTop: '14px', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>{lang === 'ar' ? 'ريال يمني' : 'Yemeni Rial (YER)'}</div>
                  </div>
                  {empProfile && (
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h4 style={{ marginBottom: '16px', fontWeight: 700 }}>{lang === 'ar' ? 'تفاصيل العقد والتوظيف' : 'Employment & Contract Details'}</h4>
                      {[
                        { label: lang === 'ar' ? 'الراتب الأساسي' : 'Base Contract Salary', val: empProfile.salary != null ? fmtSalary(empProfile.salary) : '—' },
                        { label: lang === 'ar' ? 'طبيعة التوظيف' : 'Employment Type', val: empProfile.employment_type || '—' },
                        { label: lang === 'ar' ? 'المسمى الوظيفي' : 'Job Title', val: empProfile.title || (lang === 'ar' ? 'لا يوجد' : 'None') },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid hsl(var(--border-color))', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                          <span style={{ color: 'hsl(var(--text-secondary))' }}>{r.label}</span>
                          <span style={{ fontWeight: 700, color: 'hsl(var(--accent-blue))' }}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Schedule Section */}
              {activeSection === 'schedule' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
                  <span style={{ fontSize: '5rem' }}>📅</span>
                  <h2 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 800 }}>{lang === 'ar' ? 'جدول العمل' : 'Work Schedule'}</h2>
                  <p style={{ color: 'hsl(var(--text-secondary))', textAlign: 'center', maxWidth: '380px' }}>
                    {lang === 'ar' ? 'الميزة قيد التطوير والبرمجة حالياً.' : 'The work schedule feature is currently under active development. Stay tuned!'}
                  </p>
                </div>
              )}

              {/* Messages Section */}
              {activeSection === 'messages' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '600px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{lang === 'ar' ? 'المراسلات والطلبات' : 'Admin Chat & Messages'}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'تواصل مباشر مع مدير المستشفى.' : 'Direct messaging stream with the hospital director.'}</p>
                  </div>
                  {isLoadingThread ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                      <div style={{ width: '30px', height: '30px', border: '3px solid hsla(var(--accent-blue), 0.1)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : !thread ? (
                    <div className="glass-panel" style={{ padding: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', flex: 1, justifyContent: 'center' }}>
                      <span style={{ fontSize: '4rem' }}>💬</span>
                      <h3 style={{ fontWeight: 700, fontSize: '1.3rem' }}>{lang === 'ar' ? 'لا توجد محادثة نشطة حالياً' : 'No Active Messaging Session'}</h3>
                      <p style={{ color: 'hsl(var(--text-secondary))', maxWidth: '360px' }}>{lang === 'ar' ? 'أرسل طلب فتح مراسلة للمدير لبدء المناقشة.' : 'Send a communication request to the admin to open a secure chat.'}</p>
                      <button className="btn-primary" onClick={handleRequestMsg} style={{ padding: '12px 28px', fontWeight: 700 }}>📨 {lang === 'ar' ? 'إرسال طلب مراسلة' : 'Request to Chat with Admin'}</button>
                    </div>
                  ) : (
                    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, borderRadius: '16px' }}>
                      {/* Chat Header */}
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border-color))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'hsl(var(--bg-secondary))', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                          <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                            <div style={{ fontWeight: 700 }}>{lang === 'ar' ? 'المدير العام' : 'Hospital Director'}</div>
                            <div style={{ fontSize: '0.75rem', color: threadStatus === 'PENDING' ? 'hsl(var(--warning))' : (threadStatus === 'ACCEPTED' || threadStatus === 'ARCHIVED') ? 'hsl(var(--success))' : threadStatus === 'DENIED' ? 'hsl(var(--danger))' : 'hsl(var(--text-muted))' }}>
                              {getStatusLabel(threadStatus)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Messages Stream */}
                      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                        {threadStatus === 'PENDING' && threadMessages.length === 0 && (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '40px 20px' }}>
                            <span style={{ fontSize: '2.5rem' }}>⏳</span>
                            <p style={{ textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'تم إرسال طلبك. يرجى انتظار رد المدير لبدء التراسل.' : 'Your request has been sent. Waiting for the director to open the thread.'}</p>
                          </div>
                        )}
                        {threadMessages.map((msg: any, idx: number) => {
                          if (msg.isSystem) {
                            return (
                              <div key={idx} style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: '8px 0' }}>
                                {getLocalizedSystemMessage(msg.text)}
                              </div>
                            );
                          }
                          const isMyMsg = msg.sender === 'employee';
                          return (
                            <div key={idx} style={{ display: 'flex', justifyContent: isMyMsg ? 'flex-end' : 'flex-start' }}>
                              <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isMyMsg ? (isRtl ? '16px 2px 16px 16px' : '2px 16px 16px 16px') : (isRtl ? '2px 16px 16px 16px' : '16px 2px 16px 16px'), backgroundColor: isMyMsg ? 'hsl(var(--accent-blue))' : 'hsla(var(--bg-tertiary), 0.6)', color: isMyMsg ? '#fff' : 'hsl(var(--text-primary))', border: isMyMsg ? 'none' : '1px solid hsla(var(--border-color), 0.5)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                <div>{msg.text}</div>
                                <div style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: isMyMsg ? 'flex-end' : 'flex-start', color: isMyMsg ? 'rgba(255,255,255,0.7)' : 'hsl(var(--text-muted))', marginTop: '4px', gap: '4px' }}>
                                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {isMyMsg && (
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
                      </div>

                      {/* Message Input Form */}
                      {threadStatus === 'ACCEPTED' && (
                        <form onSubmit={handleSendMsg} style={{ padding: '14px 16px', borderTop: '1px solid hsl(var(--border-color))', display: 'flex', gap: '10px', backgroundColor: 'hsl(var(--bg-secondary))', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                          <input ref={chatInputRef} type="text" className="form-input" placeholder={lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'} value={msgText} onChange={e => setMsgText(e.target.value)} style={{ flex: 1 }} />
                          <button type="submit" className="btn-primary" disabled={isSendingMsg || !msgText.trim()} style={{ padding: '10px 20px' }}>{lang === 'ar' ? 'إرسال' : 'Send'}</button>
                        </form>
                      )}

                      {/* Request Limit Reached vs Reopen Trigger button */}
                      {(threadStatus === 'CLOSED' || threadStatus === 'DENIED' || threadStatus === 'ARCHIVED') && (
                        <div style={{ padding: '14px 16px', borderTop: '1px solid hsl(var(--border-color))', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'hsl(var(--bg-secondary))', gap: '10px' }}>
                          {thread.denied_count >= 2 ? (
                            <div style={{ width: '100%', padding: '12px', textAlign: 'center', backgroundColor: 'hsla(var(--danger), 0.05)', border: '1px solid hsla(var(--danger), 0.2)', borderRadius: '8px', color: 'hsl(var(--danger))', fontSize: '0.82rem' }}>
                              🚫 {lang === 'ar' 
                                ? 'تم تجاوز حد الطلبات (طلبان). لا يمكنك إرسال المزيد من طلبات المراسلة حالياً حتى يقوم المدير ببدء المحادثة معك.' 
                                : 'You have requested a chat 2 times and been rejected. You cannot send more requests. Please wait for the admin to initiate a chat.'}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={handleRequestMsg}
                              style={{ padding: '10px 24px', fontWeight: 600, width: '100%' }}
                            >
                              {lang === 'ar' ? 'طلب إعادة فتح المحادثة' : 'Request Admin to Reopen Chat'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Coming Soon Section */}
              {activeSection === 'coming-soon' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
                  <span style={{ fontSize: '5rem' }}>🚀</span>
                  <h2 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 800 }}>{lang === 'ar' ? 'قريباً جداً' : 'Coming Soon'}</h2>
                  <p style={{ color: 'hsl(var(--text-secondary))', textAlign: 'center', maxWidth: '380px' }}>{lang === 'ar' ? 'هذه الصفحة والميزات قيد التحضير والتطوير.' : 'This view is currently in layout staging. New features will arrive soon!'}</p>
                </div>
              )}

              {/* HR Manager: Employees Management Section */}
              {activeSection === 'employees-management' && user.isHRManager && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{lang === 'ar' ? 'إدارة الموظفين' : 'Employees Management'}</h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>{lang === 'ar' ? 'إضافة موظفين جدد، تحديث ملفاتهم، أو مراجعة قوائم الموظفين.' : 'Add new staff members, edit details, or manage current hospital personnel lists.'}</p>
                  </div>
                  <div>
                    <button onClick={empFormMode === null ? openAdd : () => { setEmpFormMode(null); setEditingEmp(null); }} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      {empFormMode !== null ? (<><span>✕</span> {lang === 'ar' ? 'إلغاء النموذج' : 'CANCEL FORM'}</>) : (<><span>+</span> {lang === 'ar' ? 'إضافة موظف جديد' : 'ADD NEW EMPLOYEE'}</>)}
                    </button>
                  </div>

                  {/* Add Form Panel */}
                  {empFormMode === 'ADD' && (
                    <div className="glass-panel" style={{ padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
                      <h3 style={{ fontSize: '1.15rem', marginBottom: '18px', fontWeight: 700 }}>
                        {lang === 'ar' ? 'إضافة موظف جديد' : 'Add New Employee'}
                      </h3>

                      <form onSubmit={handleSaveEmp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        {/* Arabic Names */}
                        <div style={{ fontSize: '0.78rem', color: 'hsl(var(--accent-blue))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '-4px' }}>
                          {lang === 'ar' ? 'الاسم باللغة العربية' : 'Arabic Name'}
                        </div>
                        {[
                          { label: lang === 'ar' ? 'الاسم الأول *' : 'Arabic First Name *', ph: 'مثال: أحمد', field: 'arabic_first_name' },
                          { label: lang === 'ar' ? 'الاسم الأوسط *' : 'Arabic Middle Name *', ph: 'مثال: محمد', field: 'arabic_middle_name' },
                          { label: lang === 'ar' ? 'اسم العائلة *' : 'Arabic Last Name *', ph: 'مثال: الخالد', field: 'arabic_last_name' },
                        ].map(({ label, ph, field }) => (
                          <div key={label}>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>{label}</label>
                            <input type="text" className="form-input" required placeholder={ph} value={empForm[field] ?? ''} onChange={e => setEmpForm(p => ({ ...p, [field]: e.target.value }))} disabled={isSavingEmp} />
                          </div>
                        ))}

                        {/* English Names */}
                        <div style={{ fontSize: '0.78rem', color: 'hsl(var(--accent-blue))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px', marginBottom: '-4px' }}>
                          {lang === 'ar' ? 'الاسم باللغة الإنجليزية' : 'English Name'}
                        </div>
                        {[
                          { label: lang === 'ar' ? 'الاسم الأول *' : 'English First Name *', ph: 'e.g. Ahmed', field: 'english_first_name' },
                          { label: lang === 'ar' ? 'الاسم الأوسط *' : 'English Middle Name *', ph: 'e.g. Mohamed', field: 'english_middle_name' },
                          { label: lang === 'ar' ? 'اسم العائلة *' : 'English Last Name *', ph: 'e.g. Al-Khaled', field: 'english_last_name' },
                        ].map(({ label, ph, field }) => (
                          <div key={label}>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>{label}</label>
                            <input type="text" className="form-input" required placeholder={ph} value={empForm[field] ?? ''} onChange={e => setEmpForm(p => ({ ...p, [field]: e.target.value }))} disabled={isSavingEmp} />
                          </div>
                        ))}

                        {/* Gender */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                            {lang === 'ar' ? 'الجنس *' : 'Gender *'}
                          </label>
                          <select className="form-input" required value={empForm.gender ?? ''} onChange={e => setEmpForm(p => ({ ...p, gender: e.target.value }))} disabled={isSavingEmp}>
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
                            type={empForm.date_of_birth ? 'date' : 'text'}
                            lang="en"
                            placeholder={lang === 'ar' ? 'يوم,شهر,سنة' : 'dd/mm/year'}
                            onFocus={(e) => { e.target.type = 'date'; }}
                            onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                            className="form-input"
                            required
                            value={empForm.date_of_birth ?? ''}
                            onChange={e => setEmpForm(p => ({ ...p, date_of_birth: e.target.value }))}
                            disabled={isSavingEmp}
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        {/* Employment Type */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                            {lang === 'ar' ? 'نوع التوظيف *' : 'Employment Type *'}
                          </label>
                          <select className="form-input" required value={empForm.employment_type ?? ''} onChange={e => setEmpForm(p => ({ ...p, employment_type: e.target.value }))} disabled={isSavingEmp}>
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
                          <input type="tel" className="form-input" required placeholder={lang === 'ar' ? 'مثال: +966500000000' : 'e.g. +966500000000'} value={empForm.phone_number ?? ''} onChange={e => setEmpForm(p => ({ ...p, phone_number: e.target.value }))} disabled={isSavingEmp} />
                        </div>

                        {/* Email */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                            {lang === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                          </label>
                          <input type="email" className="form-input" required placeholder={lang === 'ar' ? 'مثال: ahmed@hospital.com' : 'e.g. ahmed@hospital.com'} value={empForm.email ?? ''} onChange={e => setEmpForm(p => ({ ...p, email: e.target.value }))} disabled={isSavingEmp} />
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
                            value={empForm.salary ?? ''}
                            onChange={e => setEmpForm(p => ({ ...p, salary: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                const current = parseFloat(empForm.salary) || 0;
                                setEmpForm(p => ({ ...p, salary: (current + 25000).toString() }));
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                const current = parseFloat(empForm.salary) || 0;
                                if (current >= 25000) {
                                  setEmpForm(p => ({ ...p, salary: (current - 25000).toString() }));
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
                          {empForm.employee_picture_url && (
                            <div style={{ marginBottom: '10px' }}>
                              <img
                                src={getProfilePicUrl(empForm.employee_picture_url) || ''}
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
                          {!empForm.employee_picture_url && (
                            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '6px' }}>
                              {lang === 'ar' ? 'يجب رفع صورة للموظف قبل الحفظ.' : 'A photo must be uploaded before saving.'}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                          <button type="button" onClick={() => { setEmpFormMode(null); setEditingEmp(null); setEmpForm({}); }} className="btn-secondary" style={{ padding: '10px 24px' }}>
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSavingEmp || isUploadingEmpPhoto}
                            style={{ padding: '10px 28px', fontWeight: 700 }}
                          >
                            {isSavingEmp ? '...' : (lang === 'ar' ? 'حفظ الموظف' : 'Save Employee')}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Edit Form Panel (Spacious layout, pushes table down) */}
                  {empFormMode === 'EDIT' && (
                    <div className="glass-panel" style={{ padding: '28px', marginBottom: '30px' }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 700 }}>
                        {lang === 'ar' ? 'تعديل بيانات الموظف' : 'Edit Employee Details'}
                      </h3>
                      
                      {editingEmp && (
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px', padding: '12px 20px', background: 'hsl(var(--bg-tertiary))', borderRadius: '10px', border: '1px solid hsl(var(--border-color))' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'hsla(var(--accent-blue), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid hsla(var(--accent-blue), 0.2)', overflow: 'hidden' }}>
                              {empForm.employee_picture_url ? <img src={getProfilePicUrl(empForm.employee_picture_url) || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(var(--accent-blue))' }}>{editingEmp.username || '—'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>ID: #{editingEmp.employee_id}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleSaveEmp}>
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
                              <input type="text" className="form-input" required value={empForm.arabic_first_name ?? ''} onChange={e => setEmpForm(p => ({ ...p, arabic_first_name: e.target.value }))} disabled={isSavingEmp} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'الاسم الأوسط (عربي) *' : 'Arabic Middle Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empForm.arabic_middle_name ?? ''} onChange={e => setEmpForm(p => ({ ...p, arabic_middle_name: e.target.value }))} disabled={isSavingEmp} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'اسم العائلة (عربي) *' : 'Arabic Last Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empForm.arabic_last_name ?? ''} onChange={e => setEmpForm(p => ({ ...p, arabic_last_name: e.target.value }))} disabled={isSavingEmp} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                  {lang === 'ar' ? 'الجنس *' : 'Gender *'}
                                </label>
                                <select className="form-input" required value={empForm.gender ?? ''} onChange={e => setEmpForm(p => ({ ...p, gender: e.target.value }))} disabled={isSavingEmp}>
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
                                  type={empForm.date_of_birth ? 'date' : 'text'}
                                  lang="en"
                                  placeholder={lang === 'ar' ? 'يوم,شهر,سنة' : 'dd/mm/year'}
                                  onFocus={(e) => { e.target.type = 'date'; }}
                                  onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                  className="form-input"
                                  required
                                  value={empForm.date_of_birth ?? ''}
                                  onChange={e => setEmpForm(p => ({ ...p, date_of_birth: e.target.value }))}
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
                              <input type="text" className="form-input" required value={empForm.english_first_name ?? ''} onChange={e => setEmpForm(p => ({ ...p, english_first_name: e.target.value }))} disabled={isSavingEmp} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'الاسم الأوسط (إنجليزي) *' : 'English Middle Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empForm.english_middle_name ?? ''} onChange={e => setEmpForm(p => ({ ...p, english_middle_name: e.target.value }))} disabled={isSavingEmp} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'اسم العائلة (إنجليزي) *' : 'English Last Name *'}
                              </label>
                              <input type="text" className="form-input" required value={empForm.english_last_name ?? ''} onChange={e => setEmpForm(p => ({ ...p, english_last_name: e.target.value }))} disabled={isSavingEmp} />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '5px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'رقم الهاتف *' : 'Phone Number *'}
                              </label>
                              <input type="tel" className="form-input" required placeholder={lang === 'ar' ? 'مثال: +966500000000' : 'e.g. +966500000000'} value={empForm.phone_number ?? ''} onChange={e => setEmpForm(p => ({ ...p, phone_number: e.target.value }))} disabled={isSavingEmp} />
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
                                <select className="form-input" required value={empForm.employment_type ?? ''} onChange={e => setEmpForm(p => ({ ...p, employment_type: e.target.value }))} disabled={isSavingEmp}>
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
                                  value={empForm.salary ?? ''}
                                  onChange={e => setEmpForm(p => ({ ...p, salary: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      const current = parseFloat(empForm.salary) || 0;
                                      setEmpForm(p => ({ ...p, salary: (current + 25000).toString() }));
                                    } else if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      const current = parseFloat(empForm.salary) || 0;
                                      if (current >= 25000) {
                                        setEmpForm(p => ({ ...p, salary: (current - 25000).toString() }));
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
                              <input type="email" className="form-input" required value={empForm.email ?? ''} onChange={e => setEmpForm(p => ({ ...p, email: e.target.value }))} disabled={isSavingEmp} />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', fontWeight: 600 }}>
                                {lang === 'ar' ? 'صورة الموظف' : 'Employee Photo'}
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
                              setEditingEmp(null);
                              setEmpForm({});
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

                  {/* Employees Table Grid */}
                  <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    {isLoadingEmps ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <div style={{ width: '30px', height: '30px', border: '3px solid hsla(var(--accent-blue), 0.1)', borderTopColor: 'hsl(var(--accent-blue))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      </div>
                    ) : employees.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'hsl(var(--text-muted))' }}>{lang === 'ar' ? 'لا يوجد موظفون مضافون' : 'No employees found.'}</div>
                    ) : (
                      <div className="table-scroll-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                          <thead>
                            <tr style={{ background: 'hsla(var(--bg-tertiary), 0.5)', borderBottom: '1px solid hsl(var(--border-color))' }}>
                              {[lang === 'ar' ? 'الاسم' : 'Name', lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address', lang === 'ar' ? 'الوظيفة' : 'Job Type', lang === 'ar' ? 'اللقب' : 'Title', lang === 'ar' ? 'الراتب' : 'Salary', lang === 'ar' ? 'الإجراءات' : 'Actions'].map((h, i) => (
                                <th key={i} style={{ padding: '14px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {employees.map((emp: any) => (
                              <tr key={emp.employee_id} style={{ borderBottom: '1px solid hsla(var(--border-color), 0.5)' }}>
                                <td style={{ padding: '14px 16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                                    <div onClick={() => { const u = getProfilePicUrl(emp.employee_picture_url); if (u) setEmpLightbox(u); }} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'hsla(var(--accent-blue), 0.1)', border: '1px solid hsla(var(--accent-blue), 0.2)', overflow: 'hidden', cursor: emp.employee_picture_url ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {emp.employee_picture_url ? <img src={getProfilePicUrl(emp.employee_picture_url) || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                                    </div>
                                    <span style={{ fontWeight: 600, color: 'hsl(var(--accent-blue))' }}>{emp.english_first_name} {emp.english_last_name}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'hsl(var(--accent-blue))' }}>{emp.email}</td>
                                <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'hsl(var(--accent-blue))' }}>{emp.employment_type}</td>
                                <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--accent-blue))' }}>{emp.title || (lang === 'ar' ? 'لا يوجد' : 'none')}</td>
                                <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 600, color: 'hsl(var(--accent-blue))' }}>{emp.salary != null ? Number(emp.salary).toLocaleString('en-US') : '—'}</td>
                                <td style={{ padding: '14px 16px' }}>
                                  <div style={{ display: 'flex', gap: '6px', flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                                    <button onClick={() => openEdit(emp)} className="btn-secondary animate-hover" style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--accent-blue))', borderColor: 'hsla(var(--accent-blue), 0.3)', cursor: 'pointer' }}>{lang === 'ar' ? 'تعديل' : 'Edit'}</button>
                                    <button onClick={() => alert(lang === 'ar' ? 'هذه الصلاحية للمدير فقط' : 'This functionality is hospital director only')} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--danger))', borderColor: 'hsla(var(--danger), 0.3)' }}>{lang === 'ar' ? 'حذف' : 'Delete'}</button>
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
              )}

              {/* HR Manager: Departments Management Section */}
              {activeSection === 'departments-management' && user.isHRManager && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                      {lang === 'ar' ? 'إدارة الأقسام' : 'Departments Management'}
                    </h2>
                    <p style={{ color: 'hsl(var(--text-secondary))' }}>
                      {lang === 'ar' 
                        ? 'عرض الأقسام الطبية وتعيين الموظفين.' 
                        : 'View hospital departments and manage personnel assignment.'}
                    </p>
                  </div>

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
                              <th style={{ padding: '12px', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', width: '100px' }}>{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
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
                                      onClick={() => openDeptModal(dept.departmentId, dept.name, 'VIEW_EMPLOYEES')}
                                      style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-blue))', cursor: 'pointer', padding: '4px' }}
                                      title={lang === 'ar' ? 'عرض الموظفين والمدير' : 'View Employees'}
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
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

                  {/* Department Requests Section */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: 700 }}>
                      {lang === 'ar' ? 'طلبات الأقسام' : 'Department Requests'}
                    </h3>
                    {dbDepartments.filter(d => d.requestedCount && d.requestedCount > 0).length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '30px 20px',
                        color: 'hsl(var(--text-muted))',
                        background: 'hsla(var(--bg-tertiary), 0.3)',
                        borderRadius: '8px',
                        border: '1px dashed hsla(var(--border-color), 0.6)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <span style={{ fontSize: '1.8rem' }}>🏢</span>
                        <span style={{ fontSize: '0.85rem' }}>
                          {lang === 'ar' ? 'لا توجد طلبات أقسام معلقة حالياً.' : 'No pending department requests.'}
                        </span>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-muted))' }}>
                              <th style={{ padding: '12px' }}>{lang === 'ar' ? 'القسم' : 'Department'}</th>
                              <th style={{ padding: '12px' }}>{lang === 'ar' ? 'عدد الموظفين المطلوبين' : 'Requested Count'}</th>
                              <th style={{ padding: '12px' }}>{lang === 'ar' ? 'السبب' : 'Reason'}</th>
                              <th style={{ padding: '12px', width: '150px' }}>{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dbDepartments.filter(d => d.requestedCount && d.requestedCount > 0).map((dept) => (
                              <tr key={dept.id} style={{ borderBottom: '1px solid hsla(var(--border-color), 0.5)' }}>
                                <td style={{ padding: '12px', fontWeight: 600 }}>{dept.name}</td>
                                <td style={{ padding: '12px', color: 'hsl(var(--danger))', fontWeight: 700 }}>
                                  {dept.requestedCount} {lang === 'ar' ? (dept.requestedCount === 1 ? 'موظف' : 'موظفين') : (dept.requestedCount === 1 ? 'employee' : 'employees')}
                                </td>
                                <td style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>
                                  {dept.requestedReason || '—'}
                                </td>
                                <td style={{ padding: '12px' }}>
                                  <button
                                    onClick={() => handleClearRequest(dept.departmentId)}
                                    className="btn-primary"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                                  >
                                    {lang === 'ar' ? 'إنهاء الطلب' : 'Done Request'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* My Department Page */}
              {activeSection === 'my-department' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                        {lang === 'ar' ? '🏢 قسمي' : '🏢 My Department'}
                      </h2>
                      <p style={{ color: 'hsl(var(--text-secondary))' }}>
                        {lang === 'ar' ? 'عرض تفاصيل قسمك الحالي والموظفين.' : 'View details of your assigned department and current staff.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowRequestStaffModal(true)}
                      className="btn-primary"
                      style={{ padding: '10px 20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: '#ffffff' }}>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      {lang === 'ar' ? 'طلب موظفين' : 'Request Employees'}
                    </button>
                  </div>

                  {isLoadingMyDept ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                      {lang === 'ar' ? 'جاري تحميل تفاصيل القسم...' : 'Loading department details...'}
                    </div>
                  ) : (
                    <>
                      {/* Department Info Panel */}
                      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '4px' }}>
                              {lang === 'ar' ? 'اسم القسم' : 'Department Name'}
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'hsl(var(--accent-blue))' }}>
                              {dbDepartments.find(d => d.departmentId === empProfile?.department_id)?.name || (lang === 'ar' ? 'غير معين' : 'Unassigned')}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '4px' }}>
                              {lang === 'ar' ? 'عدد الموظفين' : 'Staff Count'}
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'hsl(var(--accent-teal))' }}>
                              {myDeptEmployees.length} {lang === 'ar' ? 'موظف' : 'employees'}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '4px' }}>
                              {lang === 'ar' ? 'طلب موظفين نشط' : 'Active Staff Request'}
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
                              {(() => {
                                const reqCount = dbDepartments.find(d => d.departmentId === empProfile?.department_id)?.requestedCount;
                                return reqCount ? (
                                  <span style={{ color: 'hsl(var(--warning))' }}>
                                    {reqCount} {lang === 'ar' ? (reqCount === 1 ? 'موظف مطلوب' : 'موظفين مطلوبين') : (reqCount === 1 ? 'employee requested' : 'employees requested')}
                                  </span>
                                ) : (
                                  <span style={{ color: 'hsl(var(--success))' }}>{lang === 'ar' ? 'لا يوجد طلبات' : 'No active requests'}</span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Employees List */}
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
                          {lang === 'ar' ? '👥 الموظفون في هذا القسم' : '👥 Staff Registry'}
                        </h3>
                        <div className="glass-panel table-container" style={{ padding: '8px 0', border: '1px solid hsl(var(--border-color))' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-muted))', textAlign: isRtl ? 'right' : 'left' }}>
                                <th style={{ padding: '12px 18px' }}>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                                <th style={{ padding: '12px 18px' }}>{lang === 'ar' ? 'المسمى الوظيفي' : 'Title'}</th>
                                <th style={{ padding: '12px 18px' }}>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                                <th style={{ padding: '12px 18px' }}>{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {myDeptEmployees.length === 0 ? (
                                <tr>
                                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                                    {lang === 'ar' ? 'لا يوجد موظفون في هذا القسم حالياً.' : 'No employees in this department yet.'}
                                  </td>
                                </tr>
                              ) : (
                                myDeptEmployees.map((emp) => (
                                  <tr key={emp.employee_id} style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
                                    <td style={{ padding: '12px 18px', fontWeight: 600 }}>
                                      {lang === 'ar' 
                                        ? `${emp.arabic_first_name} ${emp.arabic_last_name}` 
                                        : `${emp.english_first_name} ${emp.english_last_name}`}
                                    </td>
                                    <td style={{ padding: '12px 18px', color: 'hsl(var(--text-secondary))' }}>
                                      {emp.title || (lang === 'ar' ? 'موظف' : 'Staff')}
                                    </td>
                                    <td style={{ padding: '12px 18px', color: 'hsl(var(--text-secondary))' }}>{emp.email}</td>
                                    <td style={{ padding: '12px 18px', color: 'hsl(var(--text-secondary))' }}>{emp.phone_number || '—'}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Department Schedule Coming Soon */}
              {activeSection === 'department-schedule' && (
                <div className="glass-panel" style={{ padding: '50px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
                    {lang === 'ar' ? 'جدول القسم' : 'Department Schedule'}
                  </h2>
                  <p style={{ color: 'hsl(var(--text-secondary))' }}>
                    {lang === 'ar' ? 'هذه الميزة ستكون متاحة قريباً.' : 'This feature is coming soon.'}
                  </p>
                </div>
              )}

              {/* Department Attendance Coming Soon */}
              {activeSection === 'department-attendance' && (
                <div className="glass-panel" style={{ padding: '50px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏱️</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
                    {lang === 'ar' ? 'حضور القسم' : 'Department Attendance'}
                  </h2>
                  <p style={{ color: 'hsl(var(--text-secondary))' }}>
                    {lang === 'ar' ? 'هذه الميزة ستكون متاحة قريباً.' : 'This feature is coming soon.'}
                  </p>
                </div>
              )}
            </>
          )}

        </main>
      </div>

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

      {/* HR Manager: Department Staff Management Modal */}
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
                  {deptModalMode === 'VIEW_EMPLOYEES' && (lang === 'ar' ? `موظفو قسم ${activeDeptName}` : `Employees in ${activeDeptName}`)}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
                  {deptModalMode === 'ADD_EMPLOYEES' && (lang === 'ar' ? 'اختر الموظفين غير المعينين لإضافتهم إلى هذا القسم' : 'Select unassigned employees to assign to this department')}
                  {deptModalMode === 'VIEW_EMPLOYEES' && (lang === 'ar' ? 'عرض موظفي القسم الحاليين' : 'View current department employees')}
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
                              <img src={getProfilePicUrl(emp.employee_picture_url) || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

      {/* Unsaved Changes Custom Modal */}
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

      {/* Request Staff Modal */}
      {showRequestStaffModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div className="glass-panel modal-content" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {lang === 'ar' ? 'طلب موظفين جديد' : 'Request New Employees'}
              </h3>
              <button 
                onClick={() => setShowRequestStaffModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '6px' }}>
                  {lang === 'ar' ? 'عدد الموظفين المطلوبين' : 'Number of wanted employees'}
                </label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  className="form-input"
                  value={wantedCount}
                  onChange={e => setWantedCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '6px' }}>
                  {lang === 'ar' ? 'السبب (اختياري)' : 'Reason for request (optional)'}
                </label>
                <textarea 
                  rows={4}
                  className="form-input"
                  placeholder={lang === 'ar' ? 'اكتب سبب طلب الموظفين...' : 'Write reason for the staff request...'}
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowRequestStaffModal(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px' }}
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingRequest}
                  className="btn-primary"
                  style={{ padding: '10px 18px' }}
                >
                  {isSubmittingRequest ? (lang === 'ar' ? 'جارٍ الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال الطلب' : 'Send Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
