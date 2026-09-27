import { useEffect, useState } from "react";
import { Card, Button, Input, Modal, Loading, Empty } from "../components/ui";
import { Plus } from "lucide-react";
import { apiError } from "../api/http";
export default function Simple({ title, api, fields, readOnly = false, note }) {
  const [d, setD] = useState(),
    [open, setOpen] = useState(false),
    [err, setErr] = useState("");
  /* const load = () =>
    api
      .list({ page: 1, limit: 100 })
      .then(setD)
      .catch((e) => setErr(apiError(e)));
  useEffect(load, []); */
  useEffect(() => {
  const load = async () => {
    try {
      setErr(null);

      const data = await api.list({
        page: 1,
        limit: 100,
      });

      setD(data);
    } catch (e) {
      setErr(apiError(e));
    }
  };

  load();
}, []);
  async function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      p = {};
    fields.forEach(([k]) => {
      const v = f.get(k);
      p[k] = ["amount", "openingBalance"].includes(k) ? Number(v) : v;
    });
    try {
      await api.create(p);
      setOpen(false);
      load();
    } catch (e) {
      setErr(apiError(e));
    }
  }
  const rows =
    d?.data?.suppliers || d?.data?.expenses || d?.data?.purchases || [];
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-brand">
            Operations
          </p>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {!readOnly && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} />
            Add {title.slice(0, -1).toLowerCase()}
          </Button>
        )}
      </header>
      {note && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          {note}
        </div>
      )}
      {err && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}
      <Card className="overflow-hidden">
        {!d ? (
          <Loading />
        ) : !rows.length ? (
          <Empty title={`No ${title.toLowerCase()} yet`} />
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  {fields.length ? (
                    fields.map(([k, l]) => (
                      <th key={k} className="px-4 py-3">
                        {l}
                      </th>
                    ))
                  ) : (
                    <th className="px-4 py-3">Record</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r._id || i} className="border-t">
                    {fields.length ? (
                      fields.map(([k]) => (
                        <td key={k} className="px-4 py-3">
                          {String(r[k] ?? "—")}
                        </td>
                      ))
                    ) : (
                      <td className="px-4 py-3">{r.invoiceNumber || r._id}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`New ${title.slice(0, -1)}`}
      >
        <form onSubmit={save} className="space-y-4">
          {fields.map(([k, l]) => (
            <Input
              key={k}
              label={l}
              name={k}
              type={
                ["amount", "openingBalance"].includes(k) ? "number" : "text"
              }
              required={
                k === "name" || k === "title" || k === "phone" || k === "amount"
              }
            />
          ))}
          <Button>{`Create ${title.slice(0, -1).toLowerCase()}`}</Button>
        </form>
      </Modal>
    </div>
  );
}
