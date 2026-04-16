import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.resolve(__dirname, '../penra.sqlite')
export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'client')),
  company TEXT,
  client_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  services TEXT NOT NULL,
  status TEXT NOT NULL,
  subscription_plan TEXT NOT NULL,
  monthly_price REAL NOT NULL,
  next_renewal TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_name TEXT,
  name TEXT NOT NULL,
  phone_number TEXT,
  twilio_number_sid TEXT,
  voice TEXT,
  sector TEXT,
  language TEXT,
  status TEXT NOT NULL,
  system_prompt TEXT,
  tone TEXT,
  calls_this_month INTEGER NOT NULL DEFAULT 0,
  calls_total INTEGER NOT NULL DEFAULT 0,
  last_activity TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS business_configs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  company_name TEXT,
  address TEXT,
  hours_json TEXT NOT NULL,
  services_json TEXT NOT NULL,
  prices_json TEXT NOT NULL,
  faq_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ig_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  client_id TEXT,
  ig_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_pic_url TEXT,
  followers INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TEXT,
  connected_at TEXT NOT NULL,
  disconnected_at TEXT
);

CREATE TABLE IF NOT EXISTS ig_automations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  ig_account_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  post_url TEXT NOT NULL,
  trigger_keyword TEXT NOT NULL,
  dm_message TEXT NOT NULL,
  webhook_url TEXT,
  make_scenario_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  comments_seen INTEGER NOT NULL DEFAULT 0,
  dms_sent INTEGER NOT NULL DEFAULT 0,
  last_event_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  from_number TEXT,
  to_number TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  transcription TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS call_ai_sessions (
  call_sid TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  closer_id TEXT NOT NULL,
  closer_name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  deal_amount REAL NOT NULL,
  rate REAL NOT NULL,
  commission_amount REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  webhook_url TEXT,
  calendly_url TEXT,
  twilio_token TEXT,
  eleven_labs_key TEXT,
  default_system_prompt TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  client_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS processed_webhooks (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  event_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  UNIQUE(source, event_key)
);

CREATE TABLE IF NOT EXISTS outbound_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  client_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`)
