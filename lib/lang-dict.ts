export type Lang = 'es' | 'en';

export type DictKey =
  | 'nav.welcome'
  | 'nav.dashboard'
  | 'nav.rrhh'
  | 'nav.qa_reports'
  | 'nav.it_manager'
  | 'nav.it_users'
  | 'nav.ide'
  | 'nav.agenda'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.create'
  | 'common.back'
  | 'common.loading'
  | 'common.search'
  | 'common.confirm'
  | 'common.close'
  | 'common.yes'
  | 'common.no'
  | 'common.save_changes'
  | 'common.new_record'
  | 'common.logout'
  | 'common.settings'
  | 'dashboard.title'
  | 'dashboard.welcome'
  | 'dashboard.rrhh'
  | 'dashboard.rrhh_sub'
  | 'dashboard.qa_reports'
  | 'dashboard.qa_reports_sub'
  | 'dashboard.it_manager'
  | 'dashboard.it_manager_sub'
  | 'dashboard.agenda'
  | 'dashboard.agenda_sub'
  | 'dashboard.settings'
  | 'dashboard.settings_sub'
  | 'lang.spanish'
  | 'lang.english'
  | 'lang.translate_to'
  | 'lang.current_lang'
  | 'rrhh.title'
  | 'rrhh.catalog'
  | 'rrhh.catalog_title'
  | 'rrhh.catalog_sub'
  | 'rrhh.birthdays'
  | 'rrhh.birthdays_sub'
  | 'rrhh.clock'
  | 'rrhh.clock_sub'
  | 'rrhh.permissions'
  | 'rrhh.permissions_sub'
  | 'rrhh.attendance'
  | 'rrhh.attendance_sub'
  | 'rrhh.active'
  | 'rrhh.inactive'
  | 'rrhh.new_employee'
  | 'rrhh.catalog_active'
  | 'rrhh.catalog_inactive'
  | 'rrhh.no_employees_active'
  | 'rrhh.no_employees_inactive'
  | 'rrhh.birthdays_month'
  | 'rrhh.birthdays_all'
  | 'qa.title'
  | 'qa.weekly_report'
  | 'qa.monthly_report'
  | 'qa.weekly_registry'
  | 'qa.kpi_reports'
  | 'qa.data_extractor'
  | 'it.title'
  | 'it.support_queue'
  | 'it.user_management'
  | 'it.internal_chat'
  | 'it.visual_ide'
  | 'it.new_user'
  | 'agenda.title'
  | 'agenda.notes'
  | 'agenda.history'
  | 'agenda.task_summary'
  | 'ide.run'
  | 'ide.save'
  | 'ide.new_file'
  | 'ide.new_folder'
  | 'ide.file_tree'
  | 'ide.preview'
  | 'ide.ai_assistant'
  | 'chat.title'
  | 'chat.new_group'
  | 'chat.send'
  | 'chat.type_message'
  | 'permiso.title'
  | 'permiso.approve'
  | 'permiso.reject'
  | 'permiso.pending'
  | 'empleado.names'
  | 'empleado.lastnames'
  | 'empleado.cedula'
  | 'empleado.area'
  | 'empleado.position'
  | 'empleado.address'
  | 'empleado.phone'
  | 'empleado.active'
  | 'empleado.inactive'
  | 'empleado.photo'
  | 'usuario.username'
  | 'usuario.role'
  | 'usuario.pin'
  | 'usuario.active'
  | 'usuario.admin'
  | 'usuario.user'
  | 'error.generic'
  | 'error.load_failed'
  | 'error.save_failed'
  | 'success.saved'
  | 'success.deleted'
  | 'filter.all'
  | 'filter.month'
  | 'filter.year'
  | 'export.excel'
  | 'export.pdf'
  | 'alarm.lunch'
  | 'alarm.exit'
  | 'globe.in_english'
  | 'globe.in_spanish';

const dict: Record<DictKey, { es: string; en: string }> = {
  // Navigation
  'nav.welcome': { es: 'Bienvenida', en: 'Welcome' },
  'nav.dashboard': { es: 'Panel Principal', en: 'Dashboard' },
  'nav.rrhh': { es: 'RRHH', en: 'HR' },
  'nav.qa_reports': { es: 'QA Reports', en: 'QA Reports' },
  'nav.it_manager': { es: 'IT Manager', en: 'IT Manager' },
  'nav.it_users': { es: 'Usuarios IT', en: 'IT Users' },
  'nav.ide': { es: 'IDE Visual', en: 'Visual IDE' },
  'nav.agenda': { es: 'Agenda', en: 'Agenda' },

  // Common actions
  'common.save': { es: 'Guardar', en: 'Save' },
  'common.cancel': { es: 'Cancelar', en: 'Cancel' },
  'common.delete': { es: 'Eliminar', en: 'Delete' },
  'common.edit': { es: 'Editar', en: 'Edit' },
  'common.create': { es: 'Crear', en: 'Create' },
  'common.back': { es: 'Regresar', en: 'Back' },
  'common.loading': { es: 'Cargando...', en: 'Loading...' },
  'common.search': { es: 'Buscar', en: 'Search' },
  'common.confirm': { es: 'Confirmar', en: 'Confirm' },
  'common.close': { es: 'Cerrar', en: 'Close' },
  'common.yes': { es: 'Sí', en: 'Yes' },
  'common.no': { es: 'No', en: 'No' },
  'common.save_changes': { es: 'Guardar Cambios', en: 'Save Changes' },
  'common.new_record': { es: 'Nuevo', en: 'New' },
  'common.logout': { es: 'Salir', en: 'Logout' },
  'common.settings': { es: 'Configuración', en: 'Settings' },

  // Dashboard
  'dashboard.title': { es: 'Sistema Compacto de trabajo (Panel de control)', en: 'Compact Work System (Control Panel)' },
  'dashboard.welcome': { es: 'Bienvenido', en: 'Welcome' },
  'dashboard.rrhh': { es: 'RRHH', en: 'HR' },
  'dashboard.rrhh_sub': { es: 'Recursos Humanos', en: 'Human Resources' },
  'dashboard.qa_reports': { es: 'QA Reports', en: 'QA Reports' },
  'dashboard.qa_reports_sub': { es: 'Reportes de calidad', en: 'Quality Reports' },
  'dashboard.it_manager': { es: 'IT Manager', en: 'IT Manager' },
  'dashboard.it_manager_sub': { es: 'Gestión de TI', en: 'IT Management' },
  'dashboard.agenda': { es: 'Agenda', en: 'Agenda' },
  'dashboard.agenda_sub': { es: 'Notas diarias y agenda personal', en: 'Daily notes and personal agenda' },
  'dashboard.settings': { es: 'Configuración', en: 'Settings' },
  'dashboard.settings_sub': { es: 'Ajustes del sistema', en: 'System settings' },

  // Language
  'lang.spanish': { es: 'Español', en: 'Spanish' },
  'lang.english': { es: 'Inglés', en: 'English' },
  'lang.translate_to': { es: 'Traducir página a', en: 'Translate page to' },
  'lang.current_lang': { es: 'Idioma actual', en: 'Current language' },

  // RRHH
  'rrhh.title': { es: 'Recursos Humanos', en: 'Human Resources' },
  'rrhh.catalog': { es: 'Catálogo de Personal', en: 'Employee Catalog' },
  'rrhh.catalog_title': { es: 'Catálogo', en: 'Catalog' },
  'rrhh.catalog_sub': { es: 'Empleados', en: 'Employees' },
  'rrhh.birthdays': { es: 'Cumpleañeros', en: 'Birthdays' },
  'rrhh.birthdays_sub': { es: 'Este mes', en: 'This month' },
  'rrhh.clock': { es: 'Reloj Checador', en: 'Time Clock' },
  'rrhh.clock_sub': { es: 'Entrada / Salida', en: 'Check-in / Check-out' },
  'rrhh.permissions': { es: 'Permisos', en: 'Permissions' },
  'rrhh.permissions_sub': { es: 'Solicitudes', en: 'Requests' },
  'rrhh.attendance': { es: 'Asistencia', en: 'Attendance' },
  'rrhh.attendance_sub': { es: 'Registro diario', en: 'Daily record' },
  'rrhh.active': { es: 'Activos', en: 'Active' },
  'rrhh.inactive': { es: 'Inactivos', en: 'Inactive' },
  'rrhh.new_employee': { es: 'Nuevo Empleado', en: 'New Employee' },
  'rrhh.catalog_active': { es: 'Catálogo de Personal Activo', en: 'Active Employee Catalog' },
  'rrhh.catalog_inactive': { es: 'Catálogo de Personal Inactivos', en: 'Inactive Employee Catalog' },
  'rrhh.no_employees_active': { es: 'No hay empleados registrados', en: 'No employees registered' },
  'rrhh.no_employees_inactive': { es: 'No hay empleados inactivos', en: 'No inactive employees' },
  'rrhh.birthdays_month': { es: 'Cumpleañeros del Mes', en: 'Month Birthdays' },
  'rrhh.birthdays_all': { es: 'Todos los Cumpleañeros del Año', en: 'All Birthdays of the Year' },

  // QA Reports
  'qa.title': { es: 'Reportes de Calidad', en: 'Quality Reports' },
  'qa.weekly_report': { es: 'Reporte Semanal', en: 'Weekly Report' },
  'qa.monthly_report': { es: 'Reporte Mensual', en: 'Monthly Report' },
  'qa.weekly_registry': { es: 'Registro Semanal', en: 'Weekly Registry' },
  'qa.kpi_reports': { es: 'KPI Reports', en: 'KPI Reports' },
  'qa.data_extractor': { es: 'Extractor de Datos', en: 'Data Extractor' },

  // IT Manager
  'it.title': { es: 'Gestión de TI', en: 'IT Management' },
  'it.support_queue': { es: 'Solicitudes de Soporte', en: 'Support Queue' },
  'it.user_management': { es: 'Gestión de Usuarios', en: 'User Management' },
  'it.internal_chat': { es: 'Chat Interno', en: 'Internal Chat' },
  'it.visual_ide': { es: 'IDE Visual', en: 'Visual IDE' },
  'it.new_user': { es: 'Nuevo Usuario', en: 'New User' },

  // Agenda
  'agenda.title': { es: 'Agenda', en: 'Agenda' },
  'agenda.notes': { es: 'Notas', en: 'Notes' },
  'agenda.history': { es: 'Historial', en: 'History' },
  'agenda.task_summary': { es: 'Resumen de Tareas', en: 'Task Summary' },

  // IDE
  'ide.run': { es: 'Ejecutar', en: 'Run' },
  'ide.save': { es: 'Guardar', en: 'Save' },
  'ide.new_file': { es: 'Agregar archivo', en: 'Add file' },
  'ide.new_folder': { es: 'Agregar carpeta', en: 'Add folder' },
  'ide.file_tree': { es: 'Archivos', en: 'Files' },
  'ide.preview': { es: 'Vista Previa', en: 'Preview' },
  'ide.ai_assistant': { es: 'Asistente AI', en: 'AI Assistant' },

  // Chat
  'chat.title': { es: 'Chat Interno', en: 'Internal Chat' },
  'chat.new_group': { es: 'Nuevo grupo', en: 'New group' },
  'chat.send': { es: 'Enviar', en: 'Send' },
  'chat.type_message': { es: 'Escribe un mensaje...', en: 'Type a message...' },

  // Permissions
  'permiso.title': { es: 'Permisos', en: 'Permissions' },
  'permiso.approve': { es: 'Aprobar', en: 'Approve' },
  'permiso.reject': { es: 'Rechazar', en: 'Reject' },
  'permiso.pending': { es: 'Pendiente', en: 'Pending' },

  // Employee fields
  'empleado.names': { es: 'Nombre(s)', en: 'Name(s)' },
  'empleado.lastnames': { es: 'Apellidos', en: 'Last Names' },
  'empleado.cedula': { es: 'Cédula', en: 'ID Number' },
  'empleado.area': { es: 'Área', en: 'Area' },
  'empleado.position': { es: 'Cargo', en: 'Position' },
  'empleado.address': { es: 'Dirección', en: 'Address' },
  'empleado.phone': { es: 'Teléfono', en: 'Phone' },
  'empleado.active': { es: 'Activo', en: 'Active' },
  'empleado.inactive': { es: 'Inactivo', en: 'Inactive' },
  'empleado.photo': { es: 'Foto', en: 'Photo' },

  // User fields
  'usuario.username': { es: 'Usuario', en: 'Username' },
  'usuario.role': { es: 'Rol', en: 'Role' },
  'usuario.pin': { es: 'PIN', en: 'PIN' },
  'usuario.active': { es: 'Activo', en: 'Active' },
  'usuario.admin': { es: 'Admin', en: 'Admin' },
  'usuario.user': { es: 'Usuario', en: 'User' },

  // Messages
  'error.generic': { es: 'Ocurrió un error.', en: 'An error occurred.' },
  'error.load_failed': { es: 'Error al cargar datos.', en: 'Failed to load data.' },
  'error.save_failed': { es: 'Error al guardar.', en: 'Failed to save.' },
  'success.saved': { es: 'Guardado correctamente.', en: 'Saved successfully.' },
  'success.deleted': { es: 'Eliminado correctamente.', en: 'Deleted successfully.' },

  // Filters
  'filter.all': { es: 'Todos', en: 'All' },
  'filter.month': { es: 'Mes', en: 'Month' },
  'filter.year': { es: 'Año', en: 'Year' },

  // Export
  'export.excel': { es: 'Exportar a Excel', en: 'Export to Excel' },
  'export.pdf': { es: 'Exportar a PDF', en: 'Export to PDF' },

  // Alarms
  'alarm.lunch': { es: 'Hora de comida', en: 'Lunch time' },
  'alarm.exit': { es: 'Hora de salida', en: 'Exit time' },

  // Globe
  'globe.in_english': { es: 'En inglés', en: 'In English' },
  'globe.in_spanish': { es: 'En español', en: 'In Spanish' },
};

export function t(key: DictKey, lang: Lang): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang];
}

export default dict;
