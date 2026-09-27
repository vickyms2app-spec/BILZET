import Simple from "./Simple";
import { expensesApi } from "../api";
export default function Expenses() {
  return (
    <Simple
      title="Expenses"
      api={expensesApi}
      fields={[
        ["title", "Title"],
        ["category", "Category"],
        ["amount", "Amount"],
        ["description", "Description"],
      ]}
    />
  );
}
