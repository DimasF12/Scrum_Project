# Project Resume
## Personal Scrum Progress Tracker

> **Revisi 2** — ditambahkan opsi arsitektur Supabase (cloud) beserta skema SQL, RLS policy, dan strategi migrasi bertahap.

---

### 1. Ringkasan Proyek

| | |
|---|---|
| **Nama Proyek** | Personal Scrum Progress Tracker |
| **Jenis Proyek** | Personal Project / Solo Development |
| **Metodologi** | Scrum (versi sederhana untuk penggunaan individu) |
| **Platform** | Web Application |
| **Tech Stack Utama** | Next.js (App Router), React, TypeScript, Tailwind CSS |
| **Penyimpanan Data** | **Fase 1:** Local Storage · **Fase 2 (opsional):** Supabase (PostgreSQL + Auth) |
| **Status** | Tahap Perencanaan (Planning) |

**Deskripsi Singkat:**
Aplikasi manajemen proyek pribadi yang mengadaptasi metodologi Scrum secara ringkas — memungkinkan pengguna memecah target besar menjadi User Story & Task, mengelola ritme kerja per Sprint, memantau progres lewat papan Kanban visual, dan melacak penyelesaian poin kerja (velocity) tanpa kompleksitas tools enterprise seperti Jira.

---

### 2. Tujuan Proyek

- Memecah target/fitur besar menjadi **User Stories & Tasks** yang terukur.
- Mengatur ritme kerja per periode (**Sprint**, contoh 1–2 minggu).
- Memantau progres harian lewat **papan visual Kanban/Scrum**.
- Melacak **burndown / penyelesaian poin** kerja secara real-time.
- Menyimpan data secara **instan & portabel**, dengan jalur upgrade ke sinkronisasi multi-device bila dibutuhkan.

---

### 3. Ruang Lingkup Modul

| Modul | Fungsi Utama |
|---|---|
| **A. Sprint & Milestone Management** | Kelola sprint aktif (nama, goal, tanggal mulai/berakhir, countdown), switcher antar sprint (Active/Planning/Completed), dan penutupan sprint (Complete Sprint) dengan pemindahan task tersisa. |
| **B. Visual Scrum Board (Kanban)** | 4 kolom status kerja (Backlog/To Do, In Progress, In Review, Done), kartu tugas dengan tag, prioritas berwarna, estimasi poin, sub-task checklist, dan drag-and-drop. |
| **C. Task & Story Detail Manager** | Form create/edit task lengkap (judul, deskripsi, checklist sub-task, tag, estimasi, prioritas) dengan konfirmasi hapus. |
| **D. Personal Velocity & Progress Dashboard** | Progress bar sprint, statistik poin (total/selesai/sisa), dan visualisasi distribusi status (donut/bar chart). |
| **E. Local Data & Backup (Settings)** | Auto-sync penyimpanan, export/import JSON, preload sample data, dan reset data. |
| **F. Auth & Sync** *(hanya jika pakai Supabase)* | Login/logout, session handling, proteksi route, dan sinkronisasi data antar device. |

---

### 4. Perbandingan Arsitektur: Local Storage vs Supabase

| Aspek | Local Storage | Supabase |
|---|---|---|
| **Effort awal** | Rendah | +30–40% (mayoritas di auth, RLS, refactor async) |
| **Autentikasi** | Tidak perlu | Wajib (login page, session, middleware) |
| **Keamanan data** | Aman secara default (tidak keluar browser) | Bergantung pada RLS policy yang benar |
| **Multi-device** | Tidak bisa | Ya |
| **Offline** | Jalan penuh | Tidak jalan tanpa internet |
| **Risiko kehilangan data** | Tinggi (clear cache = hilang) | Rendah |
| **SSR hydration mismatch** | Perlu ditangani manual | Tidak jadi masalah (server component) |
| **Sifat operasi data** | Sinkron & instan | Async (butuh loading state + optimistic update) |
| **Biaya** | Gratis | Gratis di free tier (cukup untuk personal) |

**Catatan penting:** perubahan terbesar secara kode bukan di database, melainkan di **sifat operasi data yang jadi async**. Drag-and-drop Kanban wajib memakai *optimistic update* agar kartu tidak terasa "nyangkut" saat digeser, plus mekanisme rollback bila request gagal.

---

### 5. Skema Data

#### 5.1 TypeScript Interface (berlaku untuk kedua arsitektur)

```typescript
Sprint        → id, name, goal, startDate, endDate, status
TaskItem      → id, sprintId, title, description, status, priority,
                storyPoints, tags[], subtasks[], createdAt, updatedAt
SubTask       → id, title, isCompleted
ScrumProjectState → projectName, activeSprintId, sprints[], tasks[]
```

**Enum Kunci:**
- `Priority`: urgent · high · medium · low
- `TaskStatus`: backlog · todo · in_progress · review · done

#### 5.2 Skema SQL Supabase (PostgreSQL)

```sql
-- =========================================
-- ENUM TYPES
-- =========================================
create type task_priority as enum ('urgent', 'high', 'medium', 'low');
create type task_status   as enum ('backlog', 'todo', 'in_progress', 'review', 'done');
create type sprint_status as enum ('planning', 'active', 'completed');

-- =========================================
-- PROJECTS
-- =========================================
create table projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- =========================================
-- SPRINTS
-- =========================================
create table sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  goal        text,
  start_date  date not null,
  end_date    date not null,
  status      sprint_status not null default 'planning',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sprint_date_valid check (end_date >= start_date)
);

-- =========================================
-- TASKS
-- =========================================
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  sprint_id    uuid references sprints(id) on delete set null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  status       task_status   not null default 'backlog',
  priority     task_priority not null default 'medium',
  story_points smallint not null default 1,
  tags         text[] not null default '{}',
  position     integer not null default 0,   -- urutan kartu dalam kolom
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =========================================
-- SUBTASKS
-- =========================================
create table subtasks (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  is_completed boolean not null default false,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

-- =========================================
-- INDEXES
-- =========================================
create index idx_sprints_project  on sprints(project_id);
create index idx_tasks_sprint     on tasks(sprint_id);
create index idx_tasks_user       on tasks(user_id);
create index idx_subtasks_task    on subtasks(task_id);
```

**Catatan desain:**

- `sprint_id` pada tabel `tasks` sengaja **nullable** dengan `on delete set null` — task yang belum masuk sprint manapun berarti berada di *Product Backlog*. Ini juga membuat fitur "Complete Sprint" cukup mengosongkan `sprint_id` untuk memindahkan task tersisa ke backlog.
- Kolom `user_id` **sengaja diduplikasi** di setiap tabel meskipun bisa ditelusuri lewat relasi. Tujuannya agar RLS policy cukup satu baris dan tidak perlu subquery — jauh lebih cepat dan jauh lebih kecil peluang salah tulis.
- `subtasks` dibuat tabel tersendiri (bukan kolom JSONB) supaya centang sub-task bisa di-update satu baris saja tanpa menulis ulang seluruh array. Ini penting karena checklist adalah interaksi yang paling sering dipakai.
- `tags` tetap memakai tipe array PostgreSQL (`text[]`) karena hanya dibaca-tulis utuh bersama task-nya.
- `position` diperlukan agar urutan kartu hasil drag-and-drop bisa dipertahankan.

#### 5.3 Row Level Security (RLS)

> **PERINGATAN:** Tanpa RLS aktif, seluruh tabel dapat dibaca dan ditulis siapa saja yang tahu URL project Supabase-mu. Ini kesalahan paling umum dan paling fatal saat pertama kali memakai Supabase.

```sql
-- Aktifkan RLS di semua tabel
alter table projects enable row level security;
alter table sprints  enable row level security;
alter table tasks    enable row level security;
alter table subtasks enable row level security;

-- Policy: user hanya bisa mengakses barisnya sendiri
create policy "own_projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_sprints" on sprints
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_subtasks" on subtasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Penjelasan `using` vs `with check`:**
- `using` → menyaring baris mana yang boleh **dibaca / di-update / dihapus**.
- `with check` → memvalidasi baris baru saat **insert / update**, mencegah user menyisipkan data atas nama `user_id` orang lain.

Keduanya harus ada. Kalau hanya `using`, user masih bisa melakukan insert dengan `user_id` sembarangan.

#### 5.4 Trigger `updated_at` Otomatis

```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();
create trigger trg_sprints_updated  before update on sprints
  for each row execute function set_updated_at();
create trigger trg_tasks_updated    before update on tasks
  for each row execute function set_updated_at();
```

---

### 6. Rencana Teknologi & UI

- **Framework:** Next.js (App Router, React, TypeScript)
- **Styling:** Tailwind CSS, terinspirasi gaya Linear / Modern Developer Dashboard
  - Dark mode elegan dengan kontras tajam
  - Micro-interactions & hover glow
  - Tipografi bersih (Inter / sans-serif)
- **State Management:**
  - *Fase 1:* React State + Custom Hook dengan persistensi localStorage (aman dari SSR hydration mismatch)
  - *Fase 2:* Supabase client + optimistic update pada operasi Kanban
- **Auth (Fase 2):** Supabase Auth — cukup satu provider (Email Magic Link atau GitHub OAuth) karena pemakaian solo

---

### 7. Strategi Migrasi Bertahap (Rekomendasi)

Agar tidak terkunci pada satu pilihan, seluruh operasi data **diabstraksi ke satu file** sejak awal, misalnya `lib/store.ts`:

```typescript
// lib/store.ts — satu-satunya file yang tahu data disimpan di mana
export async function getSprints(): Promise<Sprint[]>
export async function createTask(input: NewTask): Promise<TaskItem>
export async function updateTask(id: string, patch: Partial<TaskItem>): Promise<TaskItem>
export async function deleteTask(id: string): Promise<void>
// ...dst
```

**Kunci utamanya:** buat semua fungsi ini `async` **sejak Fase 1**, walaupun implementasinya hanya membaca localStorage secara sinkron. Dengan begitu, komponen UI sudah terbiasa menangani `await`, loading state, dan error handling sejak awal.

| Fase | Isi | Hasil |
|---|---|---|
| **Fase 1** | Implementasi `store.ts` dengan localStorage | Aplikasi berfungsi penuh, cepat selesai |
| **Fase 2** | Ganti **isi** `store.ts` dengan Supabase client + tambah modul Auth | Komponen UI tidak perlu disentuh sama sekali |

> **Keputusan langsung ke Supabase** tetap masuk akal bila kamu sudah tahu dari sekarang akan mengakses dari lebih dari satu device. Migrasi di belakang selalu lebih mahal daripada perkiraan awal.

---

### 8. Keputusan Terbuka (Perlu Ditentukan)

| # | Pertanyaan | Opsi |
|---|---|---|
| 1 | Alur kolom status Kanban sudah cukup? | 4 kolom standar **vs** tambahan kolom (misal: Blocked/Pending) |
| 2 | Sistem estimasi tugas | Story Points (Fibonacci: 1,2,3,5,8) **vs** Estimasi Jam (1h, 2h, 4h) |
| 3 | Tema tampilan default | Dark Theme (Linear/GitHub Projects style) **vs** Light Theme |
| 4 | **Arsitektur penyimpanan** | Local Storage dulu (bertahap) **vs** langsung Supabase |
| 5 | *(jika Supabase)* Metode login | Email Magic Link **vs** GitHub OAuth |

> **Catatan:** Poin 1–4 sebaiknya diputuskan sebelum masuk tahap eksekusi agar arsitektur komponen tidak perlu banyak revisi di tengah jalan.

---

### 9. Status & Langkah Selanjutnya

- [x] Perancangan arsitektur & modul fitur
- [x] Skema data (TypeScript interfaces)
- [x] Skema SQL Supabase + RLS policy
- [x] Strategi migrasi bertahap
- [ ] Finalisasi keputusan pada open question di atas
- [ ] Setup project Next.js + struktur folder
- [ ] Implementasi `lib/store.ts` sebagai data layer
- [ ] Implementasi modul bertahap (urutan disarankan: E → A → B → C → D → F)