# Nginx TLS certificates

[English](README.md) | [简体中文](README.zh-CN.md)

Mount this directory as the Nginx SSL certificate directory.

After you add your own domain certificates, filenames must match `nginx.conf`:

- `example.com_bundle.crt`
- `example.com.key`

Do not commit private keys (see the repo-root `.gitignore`).
