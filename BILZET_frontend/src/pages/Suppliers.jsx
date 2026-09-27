import Simple from "./Simple";
import { suppliersApi } from "../api";
export default function Suppliers() {
  return (
    <Simple
      title="Suppliers"
      api={suppliersApi}
      fields={[
        ["name", "Name"],
        ["phone", "Phone"],
        ["email", "Email"],
        ["gstin", "GSTIN"],
        ["openingBalance", "Opening balance"],
      ]}
    />
  );
}
