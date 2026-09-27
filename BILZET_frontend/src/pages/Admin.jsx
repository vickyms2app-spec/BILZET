import { useEffect, useState } from "react";
import { usersApi } from "../api";
import { Card, Loading, Empty } from "../components/ui";
export default function Admin() {
  const [d, setD] = useState();
/*   useEffect(
    () =>
      usersApi
        .list()
        .then(setD)
        .catch(() => {}),
    [],
  ); */
  useEffect(() => {
  const loadUsers = async () => {
    try {
      const data = await usersApi.list();
      setD(data);
    } catch (e) {
      console.error("Failed to load users:", e);
    }
  };

  loadUsers();
}, []);
  
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase text-brand">
          Administration
        </p>
        <h1 className="text-2xl font-bold">Users</h1>
      </header>
      <Card className="overflow-hidden">
        {!d ? (
          <Loading />
        ) : !d.users?.length ? (
          <Empty title="No users" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {d.users.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="px-4 py-3 font-semibold">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">
                    {u.isActive ? "Active" : "Inactive"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
