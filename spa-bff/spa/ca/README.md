# Local TLS-intercepting root CA

Same purpose as `admin-console/ca/`: if your machine runs a TLS-intercepting proxy
or antivirus (e.g. **Avast Web/Mail Shield**), the npm registry's certificate inside
the Docker build won't chain to a trusted root and `npm ci` fails with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` (reported by npm as `Exit handler never called`).

Drop the interceptor's **root CA** here as one or more `*.crt` files (PEM). The build
adds them to `NODE_EXTRA_CA_CERTS` so TLS verification stays **on**. These files are
git-ignored; an empty folder is a harmless no-op on normal networks.

See `admin-console/ca/README.md` for the PowerShell export steps.
