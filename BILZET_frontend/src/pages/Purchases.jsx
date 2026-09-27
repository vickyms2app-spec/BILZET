import Simple from "./Simple";
import { purchasesApi } from "../api";
export default function Purchases() {
  return (
    <Simple
      title="Purchases"
      api={purchasesApi}
      fields={[]}
      readOnly
      note="Purchase records are shown from the real backend. Purchase creation needs supplier + item line data and is intentionally kept out of the generic form."
    />
  );
}
