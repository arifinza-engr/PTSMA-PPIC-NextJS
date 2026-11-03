import UserManagement from "@/components/UserManagement";

export default function UsersPage() {
  return <div className="mx-auto w-full max-w-6xl"><div className="mb-7"><p className="mb-2 text-sm font-medium text-primary">Administrasi / Akses</p><h1 className="m-0 text-3xl font-bold tracking-tight">Pengguna</h1><p className="mt-2 text-sm text-muted-foreground">Buat akun, tetapkan peran, dan kelola akses aplikasi.</p></div><UserManagement /></div>;
}
