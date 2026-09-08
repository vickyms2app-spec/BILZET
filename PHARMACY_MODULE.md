# BILZET V10.2 Pharmacy Workspace

Pharmacy is a dedicated workspace selected by the registered `business_type`. It is not the normal inventory screen with a different theme.

## Pharmacy navigation
Pharmacy Home, New Medicine Bill, Medicine Master, Purchase Inward, Batch Stock, Expiry, Rx/H1 Register, Returns, Sales & Reports, Plan & Usage, Support and Pharmacy Settings.

## Pharmacy identity
Pharmacy Settings can save the pharmacy logo, pharmacy name, Door/Site No., street/area, city/town, state, PIN, phone, email, GSTIN, two drug licence numbers, invoice prefix, footer, responsible pharmacist name/registration and near-expiry threshold. These details are included in medicine invoice identity.

## Medicine master
Medicine stores brand, generic/salt, strength, dosage form, manufacturer, HSN, GST rate, drug class, pack label, base units per pack, packs per box, barcode, rack and loose-sale flag.

Edit is supported. Delete is safe: an unused medicine is removed permanently; a medicine referenced by stock/purchases/sales is archived so old bill history is not corrupted. Archived medicines can be restored. Pack conversion is locked once stock exists.

## Purchase inward / edit
Every inward creates a batch with mandatory batch number and expiry. Purchase entries can be corrected later: supplier, supplier invoice, batch, expiry, manufacturing month, purchased/free packs, MRP, purchase rate, selling rate and inward date. Quantity reductions that would erase already sold/returned stock are blocked. Duplicate medicine+batch+expiry inward is blocked.

## Batch / expiry management
Batch Stock and Expiry screens provide Edit. Batch number, expiry, manufacturing month, MRP, purchase/selling rates and status can be corrected. Status can be Saleable, Quarantine or Blocked. Expired, quarantined and blocked batches are not eligible for sale. Quantity correction belongs to Purchase Inward Edit.

## FEFO / units
Eligible batches are sorted by earliest expiry. Stock is kept in base units to support Pack/Strip/Bottle, Box and Loose Unit sales.

## Prescription records
Rx/H/H1 lines require patient and prescriber name/address before save. H1 lines create H1 register records with drug, batch, expiry and quantity. Schedule X is deliberately blocked in this core build until a stricter reviewed workflow is implemented.

## Returns
Customer returns are logged to Quarantine and are not automatically restored to saleable stock. Supplier returns reduce saleable batch stock and create a return log.

Before marketing BILZET as legally compliant for a specific pharmacy, have the deployed workflow and current regulatory requirements reviewed by the pharmacy's licensed pharmacist/compliance professional.
