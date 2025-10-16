export const DATA_DIR = "data";
export const GOOGLE_DATA_FILE = `${DATA_DIR}/google_data.json`;
export const ADMIN_DATA_FILE = `${DATA_DIR}/admin_data.json`;
export const MODIFIED_SHIFTS_FILE = `${DATA_DIR}/modified_shifts.json`;
export const GOOGLE_LINKS_FILE = `${DATA_DIR}/google_links.json`;
export const SCHEDULE_REQUESTS_FILE = `${DATA_DIR}/schedule_requests.json`;
export const ADMIN_USERS_FILE = `${DATA_DIR}/admin_users.json`;
export const SETTINGS_FILE = `${DATA_DIR}/settings.json`;
export const ROSTER_TEMPLATES_DIR = `${DATA_DIR}/roster_templates`;

export const SHIFT_MAP: Record<string,string> = {
  M2:"8 AM – 5 PM",
  M3:"9 AM – 6 PM",
  M4:"10 AM – 7 PM",
  D1:"12 PM – 9 PM",
  D2:"1 PM – 10 PM",
  DO:"OFF",
  SL:"Sick Leave",
  CL:"Casual Leave",
  EL:"Emergency Leave",
  HL:"Holiday Leave",
  "":"N/A"
};

export const VALID_SHIFT_CODES = ['M2', 'M3', 'M4', 'D1', 'D2', 'DO', 'SL', 'CL', 'EL', 'HL'];

export const ADMIN_SESSION_COOKIE = "admin_session_v1";