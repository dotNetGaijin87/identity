# Local TLS-intercepting root CA

If your machine runs a TLS-intercepting proxy or antivirus (e.g. **Avast Web/Mail
Shield**, Kaspersky, ESET, a corporate Zscaler/Netskope), the npm registry's
certificate inside the Docker build won't chain to a trusted root, and `npm ci`
fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (which npm unhelpfully reports as
`Exit handler never called`).

Drop the interceptor's **root CA** here as one or more `*.crt` files (PEM). The
build concatenates them into `NODE_EXTRA_CA_CERTS` so TLS verification stays **on**
and the chain verifies. These files are git-ignored — each developer provides their
own. An empty folder is a harmless no-op on networks without interception.

## Exporting the CA on Windows (PowerShell)

```powershell
# Find it (here: Avast):
Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root |
  Where-Object { $_.Subject -like '*Avast*' } | Select Subject, Thumbprint

# Export it (DER), then convert to PEM with openssl:
Export-Certificate -Cert Cert:\LocalMachine\Root\<THUMBPRINT> `
  -FilePath proxy-ca.der -Type CERT
# openssl x509 -inform DER -in proxy-ca.der -out admin-console/ca/proxy-ca.crt
```
